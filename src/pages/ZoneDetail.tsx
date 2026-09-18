import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Gauge } from 'lucide-react';
import { useNetwork } from '../state/network-context';
import { calculateUarl, leakageAfterPressureChange, recoverableLossesKlDay } from '../engine';
import { BandChip, Meter, Panel, Stat } from '../components/ui';
import { FlowProfileChart } from '../components/FlowProfileChart';
import { Sparkline } from '../components/charts';
import {
  formatDate,
  formatHour,
  formatLpcd,
  formatNumber,
  formatPct,
  formatRand,
  formatVolume,
} from '../lib/format';

export default function ZoneDetail() {
  const { dmaId = '' } = useParams();
  const { getZone, assumptions } = useNetwork();
  const zone = getZone(dmaId);

  const [targetPressure, setTargetPressure] = useState<number | null>(null);

  if (!zone) {
    return (
      <Panel>
        <p className="px-5 py-10 text-center text-[13px] text-silt-400">
          No zone with that code.{' '}
          <Link to="/leak-detection" className="text-flow-300 underline underline-offset-4">
            Back to the control room
          </Link>
          .
        </p>
      </Panel>
    );
  }

  const { dma, nightFlow, ili, balance, effectiveLeakageKlDay, repairSavingKlDay } = zone;
  const uarlKlDay = calculateUarl(dma) / 1000;
  const recoverable = recoverableLossesKlDay(dma, effectiveLeakageKlDay);
  const pressure = targetPressure ?? dma.averagePressureM;
  const pressureScenarioKlDay = leakageAfterPressureChange(
    effectiveLeakageKlDay,
    dma.averagePressureM,
    pressure,
  );
  const pressureSaving = effectiveLeakageKlDay - pressureScenarioKlDay;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/leak-detection"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase
                     tracking-[0.16em] text-silt-500 transition-colors hover:text-flow-300"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden="true" />
          Control room
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-xl font-semibold tracking-tight text-white">
              <span className="font-mono text-[13px] text-flow-300">{dma.code}</span>
              {dma.name}
              <BandChip band={ili.band} />
            </h1>
            <p className="mt-1.5 text-[13px] text-silt-400">
              {dma.area} · {formatNumber(dma.connections)} connections ·{' '}
              {formatNumber(dma.population)} residents · {formatNumber(dma.mainsLengthKm, 1)} km
              of mains laid around {dma.infrastructureYear}
            </p>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-silt-500">
            Telemetry {formatDate(zone.latestDay.date)}
          </p>
        </div>
      </div>

      {nightFlow.windowCaveat && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
          <p className="text-[12px] leading-relaxed text-amber-100/90">
            {nightFlow.windowCaveat.message} The night reading sits{' '}
            {formatPct(nightFlow.windowCaveat.overstatementPct, 0)} above the day's true
            minimum of {formatNumber(nightFlow.windowCaveat.actualMinimumKlh, 1)} kL/h at{' '}
            {formatHour(nightFlow.windowCaveat.actualMinimumHour)}.
          </p>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Panel
          title="Bulk meter, last 24 hours"
          subtitle="The shaded band is leakage — it never goes home"
        >
          <FlowProfileChart readings={zone.latestDay.readings} analysis={nightFlow} />
        </Panel>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Panel title="Night flow analysis" subtitle="How the leak was measured">
            <dl className="divide-y divide-white/[0.05]">
              <Row
                term="Minimum night flow"
                detail={`lowest reading at ${formatHour(nightFlow.minimumHour)}`}
                value={`${formatNumber(nightFlow.minimumNightFlowKlh, 1)} kL/h`}
              />
              <Row
                term="Legitimate night use"
                detail={`${formatNumber(
                  assumptions.legitimateNightUseLPerConnPerHour,
                  1,
                )} l/conn/h allowance`}
                value={`− ${formatNumber(nightFlow.legitimateNightUseKlh, 1)} kL/h`}
              />
              <Row
                term="Net night flow"
                detail="the leakage rate"
                value={`${formatNumber(nightFlow.netNightFlowKlh, 1)} kL/h`}
                emphasis
              />
              <Row
                term="Night-Day Factor"
                detail="hours/day equivalent, corrected for pressure"
                value={`× ${formatNumber(assumptions.nightDayFactor, 1)}`}
              />
              <Row
                term="Daily leakage"
                detail={
                  repairSavingKlDay > 0
                    ? `after ${formatVolume(repairSavingKlDay)}/d credited to repairs`
                    : 'at current pressure'
                }
                value={formatVolume(effectiveLeakageKlDay)}
                emphasis
                tone="loss"
              />
            </dl>
          </Panel>

          <Panel title="Benchmark" subtitle="Losses against this network's unavoidable minimum">
            <div className="grid grid-cols-2 divide-x divide-white/[0.05]">
              <Stat label="ILI" value={formatNumber(ili.ili, 1)} hint={ili.bandLabel} />
              <Stat
                label="Per connection"
                value={formatNumber(ili.litresPerConnectionPerDay)}
                unit="l/conn/d"
              />
            </div>
            <div className="border-t border-white/[0.05] px-5 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="meter-label">Unavoidable minimum</span>
                <span className="readout text-[12px]">{formatVolume(uarlKlDay, 1)}/d</span>
              </div>
              <Meter
                value={uarlKlDay}
                max={Math.max(effectiveLeakageKlDay, uarlKlDay)}
                tone="good"
                className="mt-2"
              />
              <p className="mt-2.5 text-[11px] leading-relaxed text-silt-500">
                {recoverable > 0 ? (
                  <>
                    <span className="text-silt-300">{formatVolume(recoverable)}/day</span> sits
                    above a realistic target of ILI 3 — that is the volume worth sending a
                    crew after, worth{' '}
                    {formatRand(
                      recoverable * 365 * assumptions.bulkWaterCostRandPerKl,
                    )}{' '}
                    a year.
                  </>
                ) : (
                  <>
                    This zone is already close to what its pipes, pressure and connection
                    count make unavoidable. Further reduction would cost more than the water.
                  </>
                )}
              </p>
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Pressure scenario"
          subtitle="The cheapest intervention, modelled before anybody digs"
          className="lg:col-span-2"
        >
          <div className="px-5 py-5">
            <p className="text-[12px] leading-relaxed text-silt-400">
              Leakage is pressure-driven, so dropping the head reduces every undetected
              leak in the zone at once — no excavation, no finding anything. The
              relationship is <span className="font-mono text-silt-300">L₁/L₀ = (P₁/P₀)^N1</span>,
              with N1 near 1.0 for a mixed network. Below about 25 m the zone can no longer
              serve its high-lying properties, which is the floor on this slider.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Gauge className="h-4 w-4 shrink-0 text-flow-300" aria-hidden="true" />
              <input
                type="range"
                min={25}
                max={Math.round(dma.averagePressureM)}
                step={1}
                value={Math.round(pressure)}
                onChange={(e) => setTargetPressure(Number(e.target.value))}
                aria-label="Target zone pressure in metres of head"
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/10
                           accent-flow-400"
              />
              <span className="readout w-20 text-right text-[15px]">
                {Math.round(pressure)} m
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <ScenarioFigure
                label="Leakage after"
                value={formatVolume(pressureScenarioKlDay)}
                unit="/ day"
              />
              <ScenarioFigure
                label="Water recovered"
                value={formatVolume(pressureSaving)}
                unit="/ day"
                tone="good"
              />
              <ScenarioFigure
                label="Saved per year"
                value={formatRand(pressureSaving * 365 * assumptions.bulkWaterCostRandPerKl)}
                tone="good"
              />
            </div>

            {targetPressure !== null && (
              <button
                type="button"
                onClick={() => setTargetPressure(null)}
                className="btn-ghost mt-5"
              >
                Reset to current pressure
              </button>
            )}
          </div>
        </Panel>

        <Panel title="Reporting period" subtitle="Balance for the last 14 days">
          <dl className="divide-y divide-white/[0.05]">
            <Row term="System input" value={formatVolume(balance.systemInputKl)} />
            <Row term="Billed authorised" value={formatVolume(balance.billedAuthorisedKl)} />
            <Row term="Apparent losses" value={formatVolume(balance.apparentLossesKl)} />
            <Row term="Real losses" value={formatVolume(balance.realLossesKl)} tone="loss" />
            <Row
              term="Non-revenue water"
              value={formatPct(balance.nonRevenueWaterPct)}
              emphasis
              tone="loss"
            />
          </dl>
          <div className="border-t border-white/[0.05] px-5 py-4">
            <p className="meter-label">Leakage, 14-day trend</p>
            <div className="mt-2">
              <Sparkline values={zone.leakageTrend} tone="loss" height={40} />
            </div>
            <p className="mt-2 text-[11px] text-silt-500">
              {formatLpcd(zone.litresPerCapitaPerDay)} domestic use ·{' '}
              {formatNumber(dma.averagePressureM)} m average head
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Row({
  term,
  detail,
  value,
  emphasis,
  tone,
}: {
  term: string;
  detail?: string;
  value: string;
  emphasis?: boolean;
  tone?: 'loss';
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-5 py-2.5">
      <dt className="min-w-0">
        <span
          className={`text-[12px] ${emphasis ? 'font-medium text-white' : 'text-silt-300'}`}
        >
          {term}
        </span>
        {detail && <span className="block text-[11px] text-silt-500">{detail}</span>}
      </dt>
      <dd
        className={`readout shrink-0 text-[13px] ${
          tone === 'loss' ? 'text-loss-300' : emphasis ? 'text-white' : 'text-silt-200'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function ScenarioFigure({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: 'good';
}) {
  return (
    <div className="rounded-md border border-white/[0.07] bg-abyss-800/60 px-4 py-3">
      <p className="meter-label">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-1.5">
        <span
          className={`readout text-[17px] ${tone === 'good' ? 'text-emerald-300' : 'text-white'}`}
        >
          {value}
        </span>
        {unit && <span className="font-mono text-[10px] text-silt-500">{unit}</span>}
      </p>
    </div>
  );
}
