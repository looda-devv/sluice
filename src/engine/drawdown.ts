import type { Reservoir } from '../types';

/**
 * Reservoir drawdown projection — the "how many days do we have" question.
 *
 * A service reservoir is a buffer, not a supply. It fills overnight from the
 * bulk system and empties through the day, and as long as the two roughly
 * balance nobody notices it exists. Once daily draw exceeds daily inflow the
 * buffer erodes a little every day, and the failure, when it comes, is abrupt:
 * taps in the high-lying streets of the zone go dry first, because the
 * reservoir stops being able to hold up the pressure head that reaches them.
 *
 * The critical level is therefore not empty. It is the level below which the
 * system can no longer maintain pressure — typically 15-20% of capacity — and
 * it is the number worth counting down to.
 */

export interface DrawdownProjection {
  /** Volume entering the reservoir each day, kL. */
  inflowKlDay: number;
  /** Volume drawn by the zones it feeds each day, kL. */
  demandKlDay: number;
  /** Positive means recovering, negative means drawing down. kL/day. */
  netKlDay: number;
  /** Current fill, percent of capacity. */
  currentLevelPct: number;
  /** Volume at the critical level, kL. */
  criticalVolumeKl: number;
  /**
   * Days until the critical level is reached at the current net rate, or null
   * where the reservoir is stable or recovering.
   */
  daysToCritical: number | null;
  /** Day-by-day volume trace for charting, kL. */
  series: number[];
  status: ReservoirStatus;
}

export type ReservoirStatus = 'recovering' | 'stable' | 'declining' | 'critical';

/**
 * Project a reservoir forward.
 *
 * The trace clamps at both ends: a reservoir cannot store more than its
 * capacity (the excess runs to waste over the overflow, which is itself a real
 * loss) and cannot hold less than nothing.
 */
export function projectDrawdown(
  reservoir: Reservoir,
  demandKlDay: number,
  horizonDays = 30,
): DrawdownProjection {
  const netKlDay = reservoir.bulkInflowKlDay - demandKlDay;
  const criticalVolumeKl = reservoir.capacityKl * (reservoir.criticalLevelPct / 100);
  const currentLevelPct =
    reservoir.capacityKl > 0
      ? (reservoir.currentVolumeKl / reservoir.capacityKl) * 100
      : 0;

  const series: number[] = [];
  let volume = reservoir.currentVolumeKl;
  for (let day = 0; day <= horizonDays; day += 1) {
    series.push(volume);
    volume = Math.min(reservoir.capacityKl, Math.max(0, volume + netKlDay));
  }

  let daysToCritical: number | null = null;
  if (netKlDay < 0 && reservoir.currentVolumeKl > criticalVolumeKl) {
    daysToCritical = (reservoir.currentVolumeKl - criticalVolumeKl) / Math.abs(netKlDay);
  }

  return {
    inflowKlDay: reservoir.bulkInflowKlDay,
    demandKlDay,
    netKlDay,
    currentLevelPct,
    criticalVolumeKl,
    daysToCritical,
    series,
    status: classify(reservoir, netKlDay, criticalVolumeKl, daysToCritical),
  };
}

function classify(
  reservoir: Reservoir,
  netKlDay: number,
  criticalVolumeKl: number,
  daysToCritical: number | null,
): ReservoirStatus {
  if (reservoir.currentVolumeKl <= criticalVolumeKl) return 'critical';
  if (daysToCritical !== null && daysToCritical <= 14) return 'critical';
  if (netKlDay > 0) return 'recovering';
  // Within half a percent of capacity a day either way is measurement noise,
  // not a trend worth alarming on.
  if (Math.abs(netKlDay) < reservoir.capacityKl * 0.005) return 'stable';
  return 'declining';
}

/**
 * The same projection with a share of leakage removed.
 *
 * This is the argument a technical manager has to make to a budget committee:
 * not "the reservoir is emptying", but "fixing this much of the leak buys back
 * this many days". Recovering leakage reduces demand kilolitre for kilolitre,
 * which is what makes it competitive with augmenting supply.
 */
export function projectWithLeakageReduction(
  reservoir: Reservoir,
  demandKlDay: number,
  leakageKlDay: number,
  reductionFraction: number,
  horizonDays = 30,
): DrawdownProjection {
  const saved = leakageKlDay * Math.min(1, Math.max(0, reductionFraction));
  return projectDrawdown(reservoir, Math.max(0, demandKlDay - saved), horizonDays);
}
