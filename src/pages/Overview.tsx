import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, TrendingDown } from 'lucide-react';
import { useNetwork } from '../state/network-context';
import { BENCHMARKS } from '../engine';
import { BandChip, Meter, Panel, Stat } from '../components/ui';
import { Sparkline } from '../components/charts';
import { ModelledNotice } from '../components/ModelledNotice';
import {
  formatLpcd,
  formatNumber,
  formatPct,
  formatRand,
  formatVolume,
} from '../lib/format';

/**
 * Average household draw, kL/day — a four-person household at the South African
 * average of 218 l/p/d. Used only to restate a loss volume as something a
 * person can picture, never in a calculation that feeds another figure.
 */
const HOUSEHOLD_KL_DAY = (4 * BENCHMARKS.saLitresPerCapitaPerDay) / 1000;

export default function Overview() {
  const {
    zones,
    municipalBalance,
    totalDailyInputKl,
    totalLeakageKlDay,
    totalDailyLossRand,
    reservoirs,
  } = useNetwork();

  const ranked = [...zones].sort(
    (a, b) => b.effectiveLeakageKlDay - a.effectiveLeakageKlDay,
  );
  const worstLeak = ranked[0]?.effectiveLeakageKlDay ?? 1;
  const householdsEquivalent = Math.round(totalLeakageKlDay / HOUSEHOLD_KL_DAY);
  const nrwGapToNational = municipalBalance.nonRevenueWaterPct - BENCHMARKS.saNationalNrwPct;
  const caveated = zones.filter((z) => z.nightFlow.windowCaveat);

  return (
    <div className="space-y-6">
      <ModelledNotice />

      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">Control room</h1>
        <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-silt-400">
          Ten metered zones, one municipality. Every figure below starts from the same
          place: what the bulk meters recorded between 02:00 and 04:00, when almost nobody
          was using water and almost everything still moving was running into the ground.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Panel className="lg:col-span-1">
          <Stat
            label="Non-revenue water"
            value={formatPct(municipalBalance.nonRevenueWaterPct)}
            size="lg"
            tone={municipalBalance.nonRevenueWaterPct > 40 ? 'loss' : 'warn'}
            hint={
              <>
                {nrwGapToNational < 0
                  ? `${formatPct(Math.abs(nrwGapToNational), 0)} better than the national
                     figure of ${formatPct(BENCHMARKS.saNationalNrwPct)}`
                  : `${formatPct(nrwGapToNational, 0)} worse than the national figure of
                     ${formatPct(BENCHMARKS.saNationalNrwPct)}`}
                , against a global average nearer {formatPct(BENCHMARKS.globalAverageNrwPct, 0)}.
              </>
            }
          />
        </Panel>

        <Panel>
          <Stat
            label="Real losses"
            value={formatVolume(totalLeakageKlDay)}
            unit="/ day"
            size="lg"
            tone="loss"
            hint={
              <>
                Enough to supply about{' '}
                <span className="text-silt-300">
                  {formatNumber(householdsEquivalent)} households
                </span>{' '}
                for a day.
              </>
            }
          />
        </Panel>

        <Panel>
          <Stat
            label="Cost of the leak"
            value={formatRand(totalDailyLossRand)}
            unit="/ day"
            size="lg"
            tone="loss"
            hint={<>{formatRand(totalDailyLossRand * 365)} a year at the bulk water cost.</>}
          />
        </Panel>

        <Panel>
          <Stat
            label="System input"
            value={formatVolume(totalDailyInputKl)}
            unit="/ day"
            size="lg"
            tone="flow"
            hint={
              <>
                Across {zones.length} district metered areas serving{' '}
                {formatNumber(zones.reduce((s, z) => s + z.dma.population, 0))} people.
              </>
            }
          />
        </Panel>
      </div>

      {caveated.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"
            aria-hidden="true"
          />
          <p className="text-[12px] leading-relaxed text-amber-100/90">
            <span className="font-medium">Night-window caveat: </span>
            {caveated.map((z) => z.dma.code).join(', ')}{' '}
            {caveated.length === 1 ? 'has' : 'have'} the lowest flow of the day outside the
            02:00–04:00 window, so the standard method probably overstates the leak there.
            Non-domestic zones do not go quiet when the suburbs do.
          </p>
        </div>
      )}

      <Panel
        title="Zones by real loss"
        subtitle="Volume tells you the size of the problem; the band tells you whether it can be fixed"
      >
        <div className="hidden px-5 py-2.5 md:grid md:grid-cols-[2.1fr_1fr_1fr_0.9fr_1.1fr] md:gap-4 md:border-b md:border-white/[0.06]">
          {['Zone', 'Real loss', 'Cost / year', 'ILI', '14-day trend'].map((h) => (
            <span key={h} className="meter-label">
              {h}
            </span>
          ))}
        </div>

        {ranked.map((zone) => {
          const trendDelta =
            zone.leakageTrend.length > 1
              ? zone.leakageTrend[zone.leakageTrend.length - 1] - zone.leakageTrend[0]
              : 0;

          return (
            <Link
              key={zone.dma.id}
              to={`/leak-detection/zones/${zone.dma.id}`}
              className="data-row grid-cols-2 md:grid-cols-[2.1fr_1fr_1fr_0.9fr_1.1fr]"
            >
              <div className="col-span-2 min-w-0 md:col-span-1">
                <p className="flex items-center gap-2 font-medium text-white">
                  <span className="font-mono text-[11px] text-flow-300">
                    {zone.dma.code}
                  </span>
                  {zone.dma.name}
                  <ArrowUpRight
                    className="h-3.5 w-3.5 text-silt-600"
                    aria-hidden="true"
                  />
                </p>
                <p className="mt-0.5 truncate text-[11px] text-silt-500">
                  {zone.dma.area} · {formatNumber(zone.dma.connections)} connections ·{' '}
                  {formatLpcd(zone.litresPerCapitaPerDay)}
                </p>
              </div>

              <div>
                <p className="readout text-[13px] text-loss-300">
                  {formatVolume(zone.effectiveLeakageKlDay)}
                  <span className="ml-1 font-normal text-silt-600">/d</span>
                </p>
                <Meter
                  value={zone.effectiveLeakageKlDay}
                  max={worstLeak}
                  tone="loss"
                  className="mt-1.5"
                />
              </div>

              <p className="readout text-[13px]">
                {formatRand(zone.dailyLossValueRand * 365)}
              </p>

              <div className="flex items-center gap-2">
                <span className="readout text-[13px]">{formatNumber(zone.ili.ili, 1)}</span>
                <BandChip band={zone.ili.band} />
              </div>

              <div className="flex items-center gap-2">
                <div className="w-16 shrink-0">
                  <Sparkline values={zone.leakageTrend} tone="loss" />
                </div>
                {trendDelta < -1 && (
                  <TrendingDown
                    className="h-3.5 w-3.5 text-emerald-400"
                    aria-label="falling"
                  />
                )}
              </div>
            </Link>
          );
        })}
      </Panel>

      <div className="grid gap-4 md:grid-cols-3">
        {reservoirs.map(({ reservoir, demandKlDay }) => {
          const levelPct = (reservoir.currentVolumeKl / reservoir.capacityKl) * 100;
          const net = reservoir.bulkInflowKlDay - demandKlDay;
          return (
            <Panel key={reservoir.id}>
              <div className="px-5 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[13px] font-medium text-white">{reservoir.name}</p>
                  <span className="readout text-[15px]">{formatPct(levelPct, 0)}</span>
                </div>
                <Meter
                  value={levelPct}
                  max={100}
                  tone={levelPct < reservoir.criticalLevelPct + 15 ? 'loss' : 'flow'}
                  className="mt-3"
                />
                <p className="mt-2.5 font-mono text-[10px] text-silt-500">
                  {net >= 0 ? '+' : '\u2212'}
                  {formatNumber(Math.abs(net))} kL/day net
                </p>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
