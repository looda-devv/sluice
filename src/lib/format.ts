/** Number and unit formatting, in South African conventions. */

const numberFormat = new Intl.NumberFormat('en-ZA');

export const formatNumber = (value: number, decimals = 0): string =>
  new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

/**
 * Rand, abbreviated once the figure stops being readable.
 *
 * A dashboard showing R 12 483 921 forces the reader to count digits before
 * they can react to it; R 12.5m does not.
 */
export function formatRand(value: number, opts: { compact?: boolean } = {}): string {
  const { compact = true } = opts;
  const abs = Math.abs(value);

  if (compact && abs >= 1_000_000) return `R ${formatNumber(value / 1_000_000, 1)}m`;
  if (compact && abs >= 10_000) return `R ${numberFormat.format(Math.round(value / 1000))}k`;
  return `R ${numberFormat.format(Math.round(value))}`;
}

/**
 * Volume, scaled to the unit that reads best.
 *
 * Kilolitres are the working unit of municipal water, but a metro moves tens
 * of thousands of them a day, and megalitres are how bulk supply is actually
 * discussed.
 */
export function formatVolume(kl: number, decimals?: number): string {
  if (Math.abs(kl) >= 10_000) return `${formatNumber(kl / 1000, decimals ?? 1)} Ml`;
  return `${formatNumber(kl, decimals ?? 0)} kL`;
}

export const formatPct = (value: number, decimals = 1): string =>
  `${formatNumber(value, decimals)}%`;

/** Hour of day as a 24-hour clock reading. */
export const formatHour = (hour: number): string =>
  `${String(hour).padStart(2, '0')}:00`;

/**
 * Days as something a person can act on.
 *
 * "83 days" is a planning horizon; "9 days" is an emergency. Rounding hides
 * that difference at the bottom of the range, so short counts keep a decimal.
 */
export function formatDays(days: number | null): string {
  if (days === null) return 'stable';
  if (days < 1) return 'under a day';
  if (days < 10) return `${formatNumber(days, 1)} days`;
  if (days > 365) return 'over a year';
  return `${Math.round(days)} days`;
}

/** Litres per person per day, the figure the public understands. */
export const formatLpcd = (litres: number): string => `${Math.round(litres)} l/p/d`;

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
