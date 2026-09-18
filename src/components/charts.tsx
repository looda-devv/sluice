import { useId } from 'react';
import type { WaterBalance } from '../engine';
import type { DrawdownProjection } from '../engine';
import { formatDays, formatNumber, formatPct, formatVolume } from '../lib/format';

/** A bare trend line, for a figure that only needs a direction. */
export function Sparkline({
  values,
  tone = 'flow',
  height = 34,
}: {
  values: number[];
  tone?: 'flow' | 'loss';
  height?: number;
}) {
  if (values.length < 2) return null;

  const W = 120;
  const min = Math.min(...values);
  const max = Math.max(...values);
  // A flat series would otherwise divide by zero and collapse to the top edge.
  const span = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = height - 3 - ((v - min) / span) * (height - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const stroke = tone === 'loss' ? 'rgb(255 122 92)' : 'rgb(103 214 245)';

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface Segment {
  label: string;
  value: number;
  colour: string;
  note?: string;
}

/**
 * The IWA balance as a proportional bar.
 *
 * The balance is usually drawn as a nested table, which is accurate and almost
 * impossible to read quickly. Rendering it to scale makes one thing obvious at
 * a glance: how much of the bar is the municipality's revenue, and how much of
 * it is water it paid to treat and pump and will never be paid for.
 */
export function BalanceBar({ balance }: { balance: WaterBalance }) {
  const segments: Segment[] = [
    {
      label: 'Billed authorised',
      value: balance.billedAuthorisedKl,
      colour: 'bg-flow-400',
      note: 'Revenue water — the only part that is paid for',
    },
    {
      label: 'Unbilled authorised',
      value: balance.unbilledAuthorisedKl,
      colour: 'bg-flow-600',
      note: 'Municipal buildings, standpipes, firefighting, mains flushing',
    },
    {
      label: 'Apparent losses',
      value: balance.apparentLossesKl,
      colour: 'bg-amber-500',
      note: 'Illegal connections and meter under-registration — lost at retail tariff',
    },
    {
      label: 'Real losses',
      value: balance.realLossesKl,
      colour: 'bg-loss-500',
      note: 'Water that never reached anybody — leaks, bursts, reservoir overflow',
    },
  ];

  const total = balance.systemInputKl || 1;

  return (
    <div className="px-5 py-5">
      <div className="flex h-11 w-full overflow-hidden rounded-md border border-white/10">
        {segments.map((s) => (
          <div
            key={s.label}
            className={`${s.colour} relative transition-[width] duration-700 ease-out`}
            style={{ width: `${(s.value / total) * 100}%` }}
            title={`${s.label}: ${formatVolume(s.value)} (${formatPct((s.value / total) * 100)})`}
          />
        ))}
      </div>

      {/* The bracket underneath is doing real work: non-revenue water is not a
          segment of the bar, it is everything except the first one. */}
      <div className="mt-1.5 flex w-full">
        <div style={{ width: `${(balance.billedAuthorisedKl / total) * 100}%` }} />
        <div
          className="border-l border-r border-t border-loss-400/40 pt-1"
          style={{ width: `${(balance.nonRevenueWaterKl / total) * 100}%` }}
        >
          <p className="text-center font-mono text-[9px] uppercase tracking-[0.14em] text-loss-300">
            Non-revenue {formatPct(balance.nonRevenueWaterPct)}
          </p>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        {segments.map((s) => (
          <div key={s.label} className="flex gap-3">
            <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-sm ${s.colour}`} />
            <div className="min-w-0">
              <dt className="flex items-baseline gap-2">
                <span className="text-[12px] font-medium text-silt-200">{s.label}</span>
                <span className="readout text-[12px] text-white">
                  {formatPct((s.value / total) * 100)}
                </span>
              </dt>
              <dd className="mt-0.5 text-[11px] leading-relaxed text-silt-500">
                {formatVolume(s.value)}
                {s.note && <> · {s.note}</>}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Reservoir volume projected forward, against the level at which the zone
 * loses pressure.
 *
 * Two traces where a scenario is supplied: what happens if nothing changes,
 * and what happens if the leak is cut. The gap between them is the argument
 * for funding the repair.
 */
export function DrawdownChart({
  projection,
  scenario,
  capacityKl,
}: {
  projection: DrawdownProjection;
  scenario?: DrawdownProjection;
  capacityKl: number;
}) {
  const gradientId = useId();
  const W = 640;
  const H = 210;
  const PAD = { top: 14, right: 14, bottom: 28, left: 52 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const days = projection.series.length - 1;
  const x = (day: number) => PAD.left + (day / days) * plotW;
  const y = (v: number) => PAD.top + plotH - (v / capacityKl) * plotH;

  const toPoints = (series: number[]) =>
    series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  const criticalY = y(projection.criticalVolumeKl);

  return (
    <figure className="px-3 pb-3 pt-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Reservoir projection over ${days} days. ${
          projection.daysToCritical === null
            ? 'Level is stable or recovering.'
            : `Critical level reached in ${formatDays(projection.daysToCritical)}.`
        }`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(34 189 232)" stopOpacity="0.26" />
            <stop offset="100%" stopColor="rgb(34 189 232)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line
              x1={PAD.left}
              y1={y(capacityKl * f)}
              x2={PAD.left + plotW}
              y2={y(capacityKl * f)}
              stroke="rgba(255,255,255,0.05)"
            />
            <text
              x={PAD.left - 9}
              y={y(capacityKl * f) + 3.5}
              textAnchor="end"
              className="fill-silt-500 font-mono text-[9px]"
            >
              {formatNumber(f * 100, 0)}%
            </text>
          </g>
        ))}

        {/* Below this line the reservoir can no longer hold the zone's pressure. */}
        <rect
          x={PAD.left}
          y={criticalY}
          width={plotW}
          height={Math.max(0, PAD.top + plotH - criticalY)}
          fill="rgba(239,82,48,0.10)"
        />
        <line
          x1={PAD.left}
          y1={criticalY}
          x2={PAD.left + plotW}
          y2={criticalY}
          stroke="rgb(239 82 48)"
          strokeWidth="1"
          strokeDasharray="5 4"
        />
        <text
          x={PAD.left + 6}
          y={criticalY - 5}
          className="fill-loss-300 font-mono text-[8px] uppercase tracking-[0.16em]"
        >
          Pressure failure
        </text>

        <polygon
          points={`${PAD.left},${PAD.top + plotH} ${toPoints(projection.series)} ${
            PAD.left + plotW
          },${PAD.top + plotH}`}
          fill={`url(#${gradientId})`}
        />

        {scenario && (
          <polyline
            points={toPoints(scenario.series)}
            fill="none"
            stroke="rgb(52 211 153)"
            strokeWidth="2"
            strokeDasharray="5 4"
          />
        )}

        <polyline
          points={toPoints(projection.series)}
          fill="none"
          stroke="rgb(103 214 245)"
          strokeWidth="2"
        />

        {[0, Math.floor(days / 2), days].map((d) => (
          <text
            key={d}
            x={x(d)}
            y={H - 9}
            textAnchor={d === 0 ? 'start' : d === days ? 'end' : 'middle'}
            className="fill-silt-500 font-mono text-[9px]"
          >
            {d === 0 ? 'today' : `day ${d}`}
          </text>
        ))}
      </svg>
    </figure>
  );
}
