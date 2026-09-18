import { useId } from 'react';
import type { NightFlowResult } from '../engine';
import type { FlowReading } from '../types';
import { formatHour, formatNumber } from '../lib/format';

const W = 760;
const H = 280;
const PAD = { top: 18, right: 16, bottom: 34, left: 52 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

/**
 * The bulk meter's day, drawn so the leak is visible rather than inferred.
 *
 * The chart's whole argument is the shaded band along the bottom. Total inflow
 * rises and falls with the city waking and going to bed, but that band — the
 * estimated leakage — never leaves. At 03:00 it is almost the entire trace,
 * which is what makes the small hours the right time to measure it, and what
 * a table of daily totals can never show.
 */
export function FlowProfileChart({
  readings,
  analysis,
}: {
  readings: FlowReading[];
  analysis: NightFlowResult;
}) {
  const gradientId = useId();
  const sorted = [...readings].sort((a, b) => a.hour - b.hour);
  const peak = Math.max(...sorted.map((r) => r.inflowKlh));
  // Headroom above the peak so the curve does not graze the top edge.
  const yMax = peak * 1.12;

  const x = (hour: number) => PAD.left + (hour / 23) * PLOT_W;
  const y = (value: number) => PAD.top + PLOT_H - (value / yMax) * PLOT_H;

  const line = sorted.map((r) => `${x(r.hour)},${y(r.inflowKlh)}`).join(' ');
  const area = `${PAD.left},${PAD.top + PLOT_H} ${line} ${PAD.left + PLOT_W},${
    PAD.top + PLOT_H
  }`;

  // Leakage is pressure-driven, so it tracks the measured pressure rather than
  // sitting flat: highest when the mains are quiet and hard, lowest at peak draw.
  const leakageAt = (r: FlowReading) =>
    analysis.nightPressureM > 0
      ? analysis.netNightFlowKlh * (r.pressureM / analysis.nightPressureM)
      : analysis.netNightFlowKlh;

  const leakLine = sorted.map((r) => `${x(r.hour)},${y(leakageAt(r))}`).join(' ');
  const leakArea = `${PAD.left},${PAD.top + PLOT_H} ${leakLine} ${PAD.left + PLOT_W},${
    PAD.top + PLOT_H
  }`;

  const ticks = Array.from({ length: 5 }, (_, i) => (yMax / 4) * i);

  return (
    <figure className="px-3 pb-2 pt-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={
          `24-hour inflow profile. Minimum night flow of ` +
          `${formatNumber(analysis.minimumNightFlowKlh, 1)} kilolitres per hour at ` +
          `${formatHour(analysis.minimumHour)}, of which ` +
          `${formatNumber(analysis.netNightFlowKlh, 1)} is estimated leakage.`
        }
      >
        <defs>
          <linearGradient id={`${gradientId}-flow`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(34 189 232)" stopOpacity="0.30" />
            <stop offset="100%" stopColor="rgb(34 189 232)" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={`${gradientId}-leak`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(255 122 92)" stopOpacity="0.38" />
            <stop offset="100%" stopColor="rgb(255 122 92)" stopOpacity="0.10" />
          </linearGradient>
        </defs>

        {/* Horizontal rules and their labels. */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              y1={y(t)}
              x2={PAD.left + PLOT_W}
              y2={y(t)}
              stroke="rgba(255,255,255,0.055)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 10}
              y={y(t) + 3.5}
              textAnchor="end"
              className="fill-silt-500 font-mono text-[9px]"
            >
              {formatNumber(t, 0)}
            </text>
          </g>
        ))}

        {/* The measurement window, called out behind the trace. */}
        <rect
          x={x(2) - PLOT_W / 46}
          y={PAD.top}
          width={(PLOT_W / 23) * 1 + (PLOT_W / 46) * 2}
          height={PLOT_H}
          fill="rgba(34,189,232,0.07)"
          stroke="rgba(34,189,232,0.22)"
          strokeDasharray="3 3"
          strokeWidth="1"
        />
        <text
          x={x(2.5)}
          y={PAD.top + 12}
          textAnchor="middle"
          className="fill-flow-300 font-mono text-[8px] uppercase tracking-[0.16em]"
        >
          MNF window
        </text>

        <polygon points={area} fill={`url(#${gradientId}-flow)`} />
        <polygon points={leakArea} fill={`url(#${gradientId}-leak)`} />

        <polyline
          points={leakLine}
          fill="none"
          stroke="rgb(255 122 92)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        <polyline
          points={line}
          fill="none"
          stroke="rgb(103 214 245)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Where the reading was taken. */}
        <circle
          cx={x(analysis.minimumHour)}
          cy={y(analysis.minimumNightFlowKlh)}
          r="4"
          fill="rgb(5 9 15)"
          stroke="rgb(103 214 245)"
          strokeWidth="2"
        />

        {/* Hour axis, every four hours. */}
        {sorted
          .filter((r) => r.hour % 4 === 0)
          .map((r) => (
            <text
              key={r.hour}
              x={x(r.hour)}
              y={H - 12}
              textAnchor="middle"
              className="fill-silt-500 font-mono text-[9px]"
            >
              {formatHour(r.hour)}
            </text>
          ))}
      </svg>

      <figcaption className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1.5 px-2 pb-1">
        <Key colour="bg-flow-300" label="Metered inflow" />
        <Key colour="bg-loss-400" label="Estimated leakage" dashed />
        <span className="ml-auto font-mono text-[10px] text-silt-500">
          kL/h · {formatHour(analysis.minimumHour)} minimum
        </span>
      </figcaption>
    </figure>
  );
}

function Key({ colour, label, dashed }: { colour: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-2 font-mono text-[10px] text-silt-400">
      <span
        className={`h-0.5 w-5 ${colour} ${dashed ? 'opacity-80' : ''}`}
        style={dashed ? { maskImage: 'repeating-linear-gradient(90deg,#000 0 4px,transparent 4px 7px)' } : undefined}
      />
      {label}
    </span>
  );
}
