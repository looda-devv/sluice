import { buildWaterBalance, type WaterBalance } from '../../engine';
import type { RegionBalance } from './regions';

/**
 * Feed a published regional balance through the project's own engine.
 *
 * The point is that nothing special happens to real data. The same
 * `buildWaterBalance` that closes a modelled zone closes the Department of
 * Water and Sanitation's national balance, and the same ILI code scores both.
 * Converting here rather than reimplementing the arithmetic for "real" figures
 * keeps a single definition of non-revenue water in the codebase.
 *
 * The one thing that must not drift is units: the engine works in kilolitres
 * and the published figures are million cubic metres, which is a factor of a
 * million. A mistake here would make every rand figure in the interface wrong
 * by six orders of magnitude while still looking like a plausible number.
 */
export const MM3_TO_KL = 1_000_000;

export function toEngineBalance(region: RegionBalance): WaterBalance {
  const kl = (mm3: number) => mm3 * MM3_TO_KL;

  return buildWaterBalance(kl(region.sivMm3), {
    dmaId: region.region,
    period: '2021-22',
    billedMeteredKl: kl(region.billedMeteredMm3),
    billedUnmeteredKl: kl(region.billedUnmeteredMm3),
    unbilledMeteredKl: kl(region.unbilledMeteredMm3),
    unbilledUnmeteredKl: kl(region.unbilledUnmeteredMm3),
    // The published balance reports apparent losses as a single figure rather
    // than splitting theft from meter under-registration, so the whole of it
    // is carried in the meter-inaccuracy term. Real losses then fall out as
    // the residual, exactly as they do in the source.
    unauthorisedKl: 0,
    meterInaccuracyKl: kl(region.apparentLossesMm3),
  });
}

/** Rand value of a volume given in million cubic metres. */
export const randValueOfMm3 = (mm3: number, randPerKl: number): number =>
  mm3 * MM3_TO_KL * randPerKl;

/**
 * Households a volume would supply for a year.
 *
 * A four-person household at the published national 216 litres per person per
 * day. Used only to restate a volume as something a person can picture.
 */
export function householdsSuppliedForAYear(mm3: number, litresPerCapitaPerDay = 216): number {
  const householdKlPerYear = (4 * litresPerCapitaPerDay * 365) / 1000;
  return (mm3 * MM3_TO_KL) / householdKlPerYear;
}
