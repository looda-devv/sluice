import type { Assumptions, Dma } from '../types';
import { calculateIli, recoverableLossesKlDay, type IliResult } from './ili';

/**
 * Which zone does the crew go to on Monday?
 *
 * The instinct is to send them to the zone losing the most water, and that is
 * usually wrong. A large zone can leak a great deal and still be near its
 * unavoidable minimum, meaning there is nothing left to find; a small zone at
 * ILI 14 is riddled with leaks a crew could walk onto in a morning. What
 * matters is recoverable volume — the loss above a credible target — valued at
 * what the water costs, set against what the intervention costs to run.
 *
 * So the ranking here is payback, not volume.
 */

export interface PriorityEntry {
  dma: Dma;
  ili: IliResult;
  realLossesKlDay: number;
  /** Loss above the target ILI: the volume actually worth chasing, kL/day. */
  recoverableKlDay: number;
  /** Annual rand value of that recoverable volume at the bulk water cost. */
  annualRecoverableRand: number;
  /** Planning estimate for an intervention in this zone, rand. */
  interventionCostRand: number;
  /** Months for the recovered water to pay for the intervention. */
  paybackMonths: number | null;
  /** Suggested first move, given what the zone's numbers look like. */
  recommendedAction: string;
  rank: number;
}

/**
 * Order-of-magnitude planning costs for an active leakage control campaign.
 *
 * These are budgeting figures for a step-test and survey campaign — acoustic
 * survey of the mains, repair of what it turns up, and replacement of the worst
 * customer meters — not a quote. They exist so the tool can rank zones against
 * each other consistently; a real programme would price each zone properly.
 */
export const INTERVENTION_COSTS = {
  perKmMainsSurveyedRand: 4800,
  perConnectionRand: 95,
  /** Fixed mobilisation: crew, leak detection equipment, traffic accommodation. */
  mobilisationRand: 45000,
} as const;

export function estimateInterventionCost(dma: Dma): number {
  return (
    INTERVENTION_COSTS.mobilisationRand +
    dma.mainsLengthKm * INTERVENTION_COSTS.perKmMainsSurveyedRand +
    dma.connections * INTERVENTION_COSTS.perConnectionRand
  );
}

/**
 * Pick the intervention that fits the zone's signature.
 *
 * Three signals separate the cases. High pressure means pressure management is
 * on the table, and it is always the cheapest thing to try first because it
 * needs no excavation and reduces every undetected leak at once. Old
 * infrastructure with a high ILI is a pipe replacement problem that a survey
 * will only keep re-finding. Everything else in a bad band is a straightforward
 * find-and-fix campaign.
 */
function recommendAction(dma: Dma, ili: IliResult): string {
  if (dma.averagePressureM > 60 && ili.ili > 4) {
    return 'Install pressure-reducing valve — zone is over-pressured at ' +
      `${Math.round(dma.averagePressureM)} m`;
  }
  if (dma.infrastructureYear < 1980 && ili.ili > 8) {
    return 'Prioritise mains replacement — reticulation predates 1980 and is past economic repair';
  }
  if (ili.ili > 8) {
    return 'Acoustic leak survey and step test — losses are far above the unavoidable minimum';
  }
  if (ili.litresPerConnectionPerDay > 250) {
    return 'Customer meter audit — per-connection losses suggest under-registration or tampering';
  }
  if (ili.ili > 4) {
    return 'Routine survey on the next maintenance cycle';
  }
  return 'Monitor — further reduction is unlikely to pay for itself';
}

/**
 * Build the ranked repair queue.
 *
 * `realLossesByDma` maps DMA id to its current real-loss rate in kL/day,
 * normally from the MNF analysis. Zones missing a figure are skipped rather
 * than assumed healthy.
 */
export function buildPriorityQueue(
  dmas: Dma[],
  realLossesByDma: Record<string, number>,
  assumptions: Assumptions,
  targetIli = 3,
): PriorityEntry[] {
  const entries = dmas
    .filter((dma) => realLossesByDma[dma.id] !== undefined)
    .map((dma) => {
      const realLossesKlDay = realLossesByDma[dma.id];
      const ili = calculateIli(dma, realLossesKlDay);
      const recoverableKlDay = recoverableLossesKlDay(dma, realLossesKlDay, targetIli);
      const annualRecoverableRand =
        recoverableKlDay * 365 * assumptions.bulkWaterCostRandPerKl;
      const interventionCostRand = estimateInterventionCost(dma);

      // A zone with nothing recoverable has no payback at all, which is not the
      // same as an instant one — hence null rather than 0, so it sorts last.
      const paybackMonths =
        annualRecoverableRand > 0
          ? (interventionCostRand / annualRecoverableRand) * 12
          : null;

      return {
        dma,
        ili,
        realLossesKlDay,
        recoverableKlDay,
        annualRecoverableRand,
        interventionCostRand,
        paybackMonths,
        recommendedAction: recommendAction(dma, ili),
        rank: 0,
      };
    });

  entries.sort((a, b) => {
    if (a.paybackMonths === null && b.paybackMonths === null) return 0;
    if (a.paybackMonths === null) return 1;
    if (b.paybackMonths === null) return -1;
    return a.paybackMonths - b.paybackMonths;
  });

  return entries.map((entry, index) => ({ ...entry, rank: index + 1 }));
}
