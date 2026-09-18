import type { ReactNode } from 'react';
import type { IliBand } from '../engine';

/** A framed block of instrument readings. */
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <header className="panel-head">
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold tracking-wide text-white">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[11px] text-silt-500">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/** One headline figure, with its unit and an optional comparison beneath. */
export function Stat({
  label,
  value,
  unit,
  hint,
  tone = 'neutral',
  size = 'md',
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: ReactNode;
  tone?: 'neutral' | 'flow' | 'loss' | 'warn' | 'good';
  size?: 'md' | 'lg';
}) {
  const toneClass = {
    neutral: 'text-white',
    flow: 'text-flow-200',
    loss: 'text-loss-300',
    warn: 'text-amber-300',
    good: 'text-emerald-300',
  }[tone];

  return (
    <div className="px-5 py-4">
      <p className="meter-label">{label}</p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span
          className={`readout ${toneClass} ${size === 'lg' ? 'text-3xl' : 'text-2xl'}`}
        >
          {value}
        </span>
        {unit && <span className="font-mono text-[11px] text-silt-500">{unit}</span>}
      </p>
      {hint && <p className="mt-1.5 text-[11px] leading-relaxed text-silt-500">{hint}</p>}
    </div>
  );
}

/** The ILI performance band, as a coloured stamp. */
export function BandChip({ band, className = '' }: { band: IliBand; className?: string }) {
  return (
    <span className={`chip band-${band} ${className}`}>
      Band {band}
    </span>
  );
}

/** A labelled horizontal meter. */
export function Meter({
  value,
  max,
  tone = 'flow',
  className = '',
}: {
  value: number;
  max: number;
  tone?: 'flow' | 'loss' | 'warn' | 'good';
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const bar = {
    flow: 'bg-flow-400',
    loss: 'bg-loss-400',
    warn: 'bg-amber-400',
    good: 'bg-emerald-400',
  }[tone];

  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06] ${className}`}>
      <div
        className={`h-full rounded-full ${bar} transition-[width] duration-700 ease-out`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Empty-state copy, used where a list can legitimately be empty. */
export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="px-5 py-10 text-center text-[13px] text-silt-500">{children}</p>
  );
}
