import type { Assumptions, Dma, FlowReading } from '../types';

/**
 * Minimum Night Flow (MNF) analysis.
 *
 * The technique every water utility leans on, and the reason DMAs exist at all.
 * Between roughly 02:00 and 04:00 almost nobody is using water, so whatever is
 * still moving through the bulk meter is mostly running into the ground. Measure
 * the flow in that window, subtract a modest allowance for the people genuinely
 * awake, and what remains is the zone's leakage rate.
 *
 * Scaling that hourly rate to a daily volume is not a flat multiply by 24:
 * leakage is pressure-driven, and pressure sags during the day when demand
 * rises, so a leak passes less water at noon than at 03:00. The Night-Day
 * Factor is the hours-per-day equivalent that corrects for this — typically
 * 20-24 rather than 24.
 */

/** Hours treated as the night window. 02:00 and 03:00 readings. */
export const MNF_WINDOW_HOURS = [2, 3] as const;

export interface NightFlowResult {
  /** Lowest hourly inflow observed in the night window, kL/h. */
  minimumNightFlowKlh: number;
  /** Hour at which that minimum occurred. */
  minimumHour: number;
  /** Allowance for genuine night-time consumption, kL/h. */
  legitimateNightUseKlh: number;
  /** MNF less legitimate use — the leakage rate, kL/h. Never negative. */
  netNightFlowKlh: number;
  /** Net night flow scaled by the Night-Day Factor, kL/day. */
  dailyLeakageKl: number;
  /** Total metered inflow across the day, kL. */
  dailyInflowKl: number;
  /** Daily leakage as a percentage of daily inflow. */
  leakagePctOfInflow: number;
  /** Mean pressure across the night window, metres. */
  nightPressureM: number;
  /**
   * Set when the day's true lowest flow falls outside the night window, which
   * means the window is not measuring what the method assumes it is. Null on a
   * normal domestic zone.
   */
  windowCaveat: WindowCaveat | null;
}

export interface WindowCaveat {
  /** Hour at which the day's real minimum occurred. */
  actualMinimumHour: number;
  actualMinimumKlh: number;
  /** How far above the day's true minimum the night-window figure sits, percent. */
  overstatementPct: number;
  message: string;
}

/**
 * How far below the night-window minimum the day's true minimum must sit before
 * it is worth saying so. Below this, it is noise in the trace.
 */
const CAVEAT_THRESHOLD_PCT = 5;

/**
 * Run an MNF analysis over one day of hourly telemetry.
 *
 * Readings need not be complete or ordered; only the night-window hours are
 * required. Throws if the window is missing entirely, because silently
 * returning zero leakage would read as a healthy zone rather than a broken
 * logger — the most dangerous failure mode this tool could have.
 */
export function analyseNightFlow(
  dma: Dma,
  readings: FlowReading[],
  assumptions: Assumptions,
): NightFlowResult {
  const nightReadings = readings.filter((r) =>
    (MNF_WINDOW_HOURS as readonly number[]).includes(r.hour),
  );

  if (nightReadings.length === 0) {
    throw new Error(
      `No telemetry in the 02:00-04:00 window for DMA ${dma.code}; cannot estimate leakage.`,
    );
  }

  const minimum = nightReadings.reduce((lowest, r) =>
    r.inflowKlh < lowest.inflowKlh ? r : lowest,
  );

  // 1.7 l/connection/h is the IWA domestic default: the cistern refilling
  // after a 3am visit to the bathroom, spread across the whole zone.
  const legitimateNightUseKlh =
    (dma.connections * assumptions.legitimateNightUseLPerConnPerHour) / 1000;

  const netNightFlowKlh = Math.max(0, minimum.inflowKlh - legitimateNightUseKlh);
  const dailyLeakageKl = netNightFlowKlh * assumptions.nightDayFactor;

  const dailyInflowKl = readings.reduce((sum, r) => sum + r.inflowKlh, 0);
  const nightPressureM =
    nightReadings.reduce((sum, r) => sum + r.pressureM, 0) / nightReadings.length;

  return {
    windowCaveat: detectWindowCaveat(readings, minimum),
    minimumNightFlowKlh: minimum.inflowKlh,
    minimumHour: minimum.hour,
    legitimateNightUseKlh,
    netNightFlowKlh,
    dailyLeakageKl,
    dailyInflowKl,
    leakagePctOfInflow: dailyInflowKl > 0 ? (dailyLeakageKl / dailyInflowKl) * 100 : 0,
    nightPressureM,
  };
}

/**
 * Check whether the night window is actually catching the quiet part of the day.
 *
 * The 02:00-04:00 convention encodes an assumption about domestic behaviour,
 * and it does not hold everywhere. An industrial zone's demand collapses when
 * the last shift ends, not at 3am, so its true minimum can land in the early
 * evening — and the night-window reading then contains a full shift's worth of
 * nothing plus leakage at its highest pressure of the day, which reads as a
 * bigger leak than the zone has.
 *
 * Rather than silently widening the window (which would break the comparison
 * between zones) or reporting a number that is quietly wrong, the analysis
 * says so and leaves the judgement to whoever is reading it.
 */
function detectWindowCaveat(
  readings: FlowReading[],
  windowMinimum: FlowReading,
): WindowCaveat | null {
  const dayMinimum = readings.reduce((m, r) => (r.inflowKlh < m.inflowKlh ? r : m));
  if ((MNF_WINDOW_HOURS as readonly number[]).includes(dayMinimum.hour)) return null;
  if (dayMinimum.inflowKlh <= 0) return null;

  const overstatementPct =
    ((windowMinimum.inflowKlh - dayMinimum.inflowKlh) / dayMinimum.inflowKlh) * 100;
  if (overstatementPct < CAVEAT_THRESHOLD_PCT) return null;

  const hh = String(dayMinimum.hour).padStart(2, '0');
  return {
    actualMinimumHour: dayMinimum.hour,
    actualMinimumKlh: dayMinimum.inflowKlh,
    overstatementPct,
    message:
      `Lowest flow of the day falls at ${hh}:00, outside the 02:00-04:00 window. ` +
      'This zone is likely non-domestic, and the leakage estimate is probably overstated.',
  };
}

/**
 * Pressure-leakage relationship: L1/L0 = (P1/P0)^N1.
 *
 * Halving pressure does not halve leakage — the exponent N1 governs how much
 * you actually get back, and it depends on what the leaks are. Rigid mains
 * behave like orifices (N1 ~ 0.5); plastic pipe and joints flex open under
 * pressure, so their leakage climbs closer to linearly or worse (N1 up to 1.5).
 * A mixed municipal network sits around 1.0, which is the default here.
 *
 * This is what makes pressure management the cheapest intervention available:
 * no excavation, and the saving lands across every undetected leak at once.
 */
export function leakageAfterPressureChange(
  currentLeakageKlDay: number,
  currentPressureM: number,
  targetPressureM: number,
  n1 = 1.0,
): number {
  if (currentPressureM <= 0) return currentLeakageKlDay;
  const ratio = Math.max(0, targetPressureM) / currentPressureM;
  return currentLeakageKlDay * Math.pow(ratio, n1);
}
