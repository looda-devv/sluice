import type { Dma } from '../types';

/**
 * Infrastructure Leakage Index — the only fair way to compare two networks.
 *
 * Ranking zones by "percentage of water lost" quietly punishes whoever serves
 * the poorest area: a zone where people use very little water will show a
 * terrible loss percentage from a modest leak, while a high-consumption suburb
 * hides the same leak inside a big denominator. Percentage compares losses to
 * demand, when the thing that actually drives leakage is the network — how much
 * pipe there is, how many connections hang off it, and how hard the water is
 * being pushed through it.
 *
 * The ILI fixes this by comparing a zone's real losses against the losses that
 * zone would still have if it were run to a technical ideal:
 *
 *   ILI = CARL / UARL
 *
 * UARL (Unavoidable Annual Real Losses, litres/day), the IWA formula:
 *
 *   UARL = (18 x Lm + 0.8 x Nc + 25 x Lp) x P
 *
 *     Lm = mains length, km
 *     Nc = number of service connections
 *     Lp = total length of private pipe, boundary to meter, km
 *     P  = average operating pressure, metres of head
 *
 * An ILI of 1 means the network leaks as little as physically achievable; the
 * remaining losses are background seepage no crew could find. An ILI of 12
 * means twelve times that — and, importantly, says so regardless of whether the
 * zone is a low-income township or a golf estate.
 */

export interface IliResult {
  /** Current Annual Real Losses expressed as a daily rate, litres/day. */
  carlLitresDay: number;
  /** Unavoidable Annual Real Losses, litres/day. */
  uarlLitresDay: number;
  /** CARL / UARL. Dimensionless. */
  ili: number;
  /** World Bank Institute performance band for developing countries. */
  band: IliBand;
  bandLabel: string;
  /**
   * Real losses per connection per day, litres — the secondary indicator the
   * IWA recommends alongside ILI, and the one that speaks to a councillor.
   */
  litresPerConnectionPerDay: number;
}

export type IliBand = 'A' | 'B' | 'C' | 'D';

/**
 * World Bank Institute banding for developing countries. The thresholds are
 * deliberately more forgiving than the developed-country scale — a category A
 * here is 1-4, not 1-2.
 */
const BANDS: { band: IliBand; max: number; label: string }[] = [
  { band: 'A', max: 4, label: 'Further loss reduction may be uneconomic' },
  { band: 'B', max: 8, label: 'Potential for marked improvement' },
  { band: 'C', max: 16, label: 'Poor — tolerable only if water is plentiful and cheap' },
  { band: 'D', max: Infinity, label: 'Very inefficient — an urgent reduction programme is warranted' },
];

/**
 * Unavoidable Annual Real Losses for a zone, litres/day.
 *
 * Returns 0 for a zone with no pressure: an unpressurised main does not leak,
 * and the multiply would otherwise produce a divide-by-zero ILI downstream.
 */
export function calculateUarl(dma: Dma): number {
  const privatePipeKm = (dma.connections * dma.privatePipeMetresPerConnection) / 1000;
  return (
    (18 * dma.mainsLengthKm + 0.8 * dma.connections + 25 * privatePipeKm) *
    dma.averagePressureM
  );
}

/**
 * Score a zone's real losses against its unavoidable minimum.
 *
 * `realLossesKlDay` is the daily real-loss volume in kilolitres — normally the
 * MNF-derived leakage estimate, or the real-losses line of the water balance
 * divided by the days in the period.
 */
export function calculateIli(dma: Dma, realLossesKlDay: number): IliResult {
  const carlLitresDay = realLossesKlDay * 1000;
  const uarlLitresDay = calculateUarl(dma);
  const ili = uarlLitresDay > 0 ? carlLitresDay / uarlLitresDay : 0;
  const match = BANDS.find((b) => ili < b.max) ?? BANDS[BANDS.length - 1];

  return {
    carlLitresDay,
    uarlLitresDay,
    ili,
    band: match.band,
    bandLabel: match.label,
    litresPerConnectionPerDay:
      dma.connections > 0 ? carlLitresDay / dma.connections : 0,
  };
}

/**
 * Real losses a zone could realistically shed, kL/day.
 *
 * Driving losses to UARL is not a goal any utility should budget for — the last
 * increment costs more than the water. `targetIli` sets a credible ceiling
 * instead (3 is a defensible target for a municipal system in reasonable
 * repair), and anything above it is recoverable volume.
 */
export function recoverableLossesKlDay(
  dma: Dma,
  realLossesKlDay: number,
  targetIli = 3,
): number {
  const uarlKlDay = calculateUarl(dma) / 1000;
  return Math.max(0, realLossesKlDay - targetIli * uarlKlDay);
}
