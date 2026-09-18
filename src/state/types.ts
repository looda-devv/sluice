import type { IliResult, NightFlowResult, WaterBalance } from '../engine';
import type { Dma, DmaDay, Repair, Reservoir } from '../types';

/** Everything the dashboard knows about one zone, derived in one place. */
export interface ZoneAnalysis {
  dma: Dma;
  /** Most recent day of telemetry. */
  latestDay: DmaDay;
  /** Night-flow analysis of the raw meter trace, before any logged repairs. */
  nightFlow: NightFlowResult;
  /**
   * Leakage after crediting repairs logged against this zone, kL/day. This is
   * the figure the rest of the dashboard works from — logging a repair should
   * visibly move the numbers, because that is the entire point of doing the
   * work.
   */
  effectiveLeakageKlDay: number;
  /** Reduction credited to logged repairs, kL/day. */
  repairSavingKlDay: number;
  ili: IliResult;
  /** Retrospective balance for the reporting period. Repairs do not rewrite it. */
  balance: WaterBalance;
  dailyInputKl: number;
  /** Rand value of a day's real losses at the bulk water cost. */
  dailyLossValueRand: number;
  litresPerCapitaPerDay: number;
  /** Leakage per day across the telemetry window, oldest first, kL/day. */
  leakageTrend: number[];
}

export interface ReservoirAnalysis {
  reservoir: Reservoir;
  zones: ZoneAnalysis[];
  demandKlDay: number;
  leakageKlDay: number;
}

export interface NetworkState {
  zones: ZoneAnalysis[];
  reservoirs: ReservoirAnalysis[];
  /** All zones rolled into one balance. */
  municipalBalance: WaterBalance;
  totalDailyInputKl: number;
  totalLeakageKlDay: number;
  totalDailyLossRand: number;
  repairs: Repair[];
}
