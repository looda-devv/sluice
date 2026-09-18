import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNetwork } from '../state/network-context';
import { projectDrawdown, projectWithLeakageReduction } from '../engine';
import { Meter, Panel, Stat } from '../components/ui';
import { DrawdownChart } from '../components/charts';
import { formatDays, formatNumber, formatPct, formatVolume } from '../lib/format';

const STATUS_TONE = {
  recovering: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  stable: 'border-flow-400/30 bg-flow-400/10 text-flow-200',
  declining: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  critical: 'border-loss-400/40 bg-loss-400/10 text-loss-300',
} as const;

/**
 * How long the reservoirs last, and what fixing the leak buys.
 *
 * The countdown runs to the level at which the reservoir can no longer hold up
 * system pressure — not to empty. That distinction is the whole reason a
 * suburb's taps run dry while the reservoir still has water in it, and it is
 * why the high-lying streets always go first.
 */
export default function Reservoirs() {
  const { reservoirs } = useNetwork();
  const [reductionPct, setReductionPct] = useState(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Reservoirs and drawdown
        </h1>
        <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-silt-400">
          A service reservoir is a buffer, not a supply. While overnight inflow roughly
          matches daily draw, nobody knows it exists. Once draw exceeds inflow the buffer
          erodes a little each day, and the failure arrives abruptly.
        </p>
      </div>

      <Panel
        title="Leak reduction scenario"
        subtitle="Applied to every reservoir below"
      >
        <div className="px-5 py-5">
          <div className="flex flex-wrap items-center gap-4">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={reductionPct}
              onChange={(e) => setReductionPct(Number(e.target.value))}
              aria-label="Share of leakage recovered"
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-emerald-400"
            />
            <span className="readout w-24 text-right text-[15px] text-emerald-300">
              {reductionPct}% fixed
            </span>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-silt-400">
            Water recovered from a leak reduces demand kilolitre for kilolitre, which is
            what makes leak reduction compete with building new supply — and it is
            available now, rather than after a decade of construction.
          </p>
        </div>
      </Panel>

      <div className="space-y-4">
        {reservoirs.map(({ reservoir, zones, demandKlDay, leakageKlDay }) => {
          const projection = projectDrawdown(reservoir, demandKlDay, 30);
          const scenario = projectWithLeakageReduction(
            reservoir,
            demandKlDay,
            leakageKlDay,
            reductionPct / 100,
            30,
          );

          return (
            <Panel key={reservoir.id}>
              <header className="panel-head flex-wrap">
                <div>
                  <h2 className="flex items-center gap-3 text-[13px] font-semibold text-white">
                    {reservoir.name}
                    <span className={`chip ${STATUS_TONE[projection.status]}`}>
                      {projection.status}
                    </span>
                  </h2>
                  <p className="mt-0.5 text-[11px] text-silt-500">
                    Feeds {zones.map((z) => z.dma.code).join(', ')} ·{' '}
                    {formatVolume(reservoir.capacityKl)} capacity
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {zones.map((z) => (
                    <Link
                      key={z.dma.id}
                      to={`/zones/${z.dma.id}`}
                      className="chip border-white/10 text-silt-400 transition-colors hover:border-flow-400/40 hover:text-flow-200"
                    >
                      {z.dma.code}
                    </Link>
                  ))}
                </div>
              </header>

              <div className="grid gap-0 xl:grid-cols-[1fr_1.4fr]">
                <div className="divide-y divide-white/[0.05] border-b border-white/[0.05] xl:border-b-0 xl:border-r">
                  <div className="grid grid-cols-2 divide-x divide-white/[0.05]">
                    <Stat
                      label="Current level"
                      value={formatPct(projection.currentLevelPct, 0)}
                      tone={projection.status === 'critical' ? 'loss' : 'flow'}
                      hint={formatVolume(reservoir.currentVolumeKl)}
                    />
                    <Stat
                      label="Time to pressure failure"
                      value={formatDays(projection.daysToCritical)}
                      tone={
                        projection.daysToCritical === null
                          ? 'good'
                          : projection.daysToCritical < 21
                            ? 'loss'
                            : 'warn'
                      }
                      hint={`Critical at ${formatPct(reservoir.criticalLevelPct, 0)} of capacity`}
                    />
                  </div>

                  <div className="px-5 py-4">
                    <BalanceRow
                      label="Bulk inflow"
                      value={`+${formatNumber(projection.inflowKlDay)} kL/d`}
                      tone="flow"
                    />
                    <BalanceRow
                      label="Zone demand"
                      value={`−${formatNumber(projection.demandKlDay)} kL/d`}
                    />
                    <BalanceRow
                      label="of which leakage"
                      value={`−${formatNumber(leakageKlDay)} kL/d`}
                      tone="loss"
                      indent
                    />
                    <div className="mt-3 border-t border-white/[0.06] pt-3">
                      <BalanceRow
                        label="Net"
                        value={`${projection.netKlDay >= 0 ? '+' : '\u2212'}${formatNumber(
                          Math.abs(projection.netKlDay),
                        )} kL/d`}
                        tone={projection.netKlDay >= 0 ? 'good' : 'loss'}
                        emphasis
                      />
                    </div>
                    <Meter
                      value={projection.currentLevelPct}
                      max={100}
                      tone={projection.status === 'critical' ? 'loss' : 'flow'}
                      className="mt-4"
                    />
                  </div>

                  <div className="px-5 py-4">
                    <p className="text-[12px] leading-relaxed text-silt-400">
                      {scenario.daysToCritical === null && projection.daysToCritical !== null ? (
                        <>
                          Recovering <span className="text-emerald-300">{reductionPct}%</span> of
                          this reservoir's leakage turns a countdown of{' '}
                          {formatDays(projection.daysToCritical)} into a stable reservoir.
                        </>
                      ) : scenario.daysToCritical !== null && projection.daysToCritical !== null ? (
                        <>
                          Recovering <span className="text-emerald-300">{reductionPct}%</span> of
                          the leakage extends the countdown from{' '}
                          {formatDays(projection.daysToCritical)} out to{' '}
                          <span className="text-emerald-300">
                            {formatDays(scenario.daysToCritical)}
                          </span>
                          .
                        </>
                      ) : (
                        <>
                          This reservoir is holding its level. The leakage still costs money
                          every day — it is simply not yet costing the suburb its pressure.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <DrawdownChart
                    projection={projection}
                    scenario={reductionPct > 0 ? scenario : undefined}
                    capacityKl={reservoir.capacityKl}
                  />
                  <p className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-5 pb-4 font-mono text-[10px] text-silt-500">
                    <span className="flex items-center gap-2">
                      <span className="h-0.5 w-5 bg-flow-300" /> current trajectory
                    </span>
                    {reductionPct > 0 && (
                      <span className="flex items-center gap-2">
                        <span className="h-0.5 w-5 bg-emerald-400" /> with {reductionPct}% of
                        the leak fixed
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

function BalanceRow({
  label,
  value,
  tone,
  emphasis,
  indent,
}: {
  label: string;
  value: string;
  tone?: 'flow' | 'loss' | 'good';
  emphasis?: boolean;
  indent?: boolean;
}) {
  const toneClass = tone
    ? { flow: 'text-flow-200', loss: 'text-loss-300', good: 'text-emerald-300' }[tone]
    : 'text-silt-200';

  return (
    <div className={`flex items-baseline justify-between gap-4 py-1 ${indent ? 'pl-4' : ''}`}>
      <span
        className={`text-[12px] ${emphasis ? 'font-medium text-white' : 'text-silt-400'}`}
      >
        {label}
      </span>
      <span className={`readout text-[12px] ${toneClass}`}>{value}</span>
    </div>
  );
}
