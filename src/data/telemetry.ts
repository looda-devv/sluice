import type { BillingRecord, DmaDay, FlowReading } from '../types';
import { dmaProfiles, dmas, type DmaProfile } from './network';
import type { Dma } from '../types';

/**
 * Synthetic bulk-meter telemetry.
 *
 * Everything here is generated from a fixed seed, so the dashboard shows the
 * same network on every load and the numbers in the README stay true. The
 * generator is built to reproduce the two features the analysis depends on:
 *
 *   - a diurnal demand curve with a deep trough at 02:00-04:00, which is what
 *     makes minimum night flow a usable proxy for leakage at all; and
 *   - pressure that sags under daytime demand, which drags leakage down with
 *     it and is the reason a flat x24 scaling of night flow overstates the
 *     daily loss.
 *
 * Because leakage is injected explicitly, the true answer is known — which is
 * what lets `verifyRecovery` below check that the MNF method recovers it.
 */

/** Deterministic PRNG. Small, fast, and good enough for shaping noise. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Diurnal pattern for *consumption alone*, as a multiple of average hourly use.
 *
 * Two peaks — before work and after it — with the evening the taller of the
 * two, and a trough at 03:00 down near 4% of average. That trough is much
 * deeper than the one seen on a bulk meter, and deliberately so: a metered
 * inflow trace never falls that far because leakage is holding it up, and
 * leakage is added separately below. Building the curve the other way round —
 * taking a published inflow profile and treating it as demand — double-counts
 * the leak and is the single easiest way to get this wrong.
 *
 * Calibration target: at 03:00 this should land near the 1.7 l/connection/h
 * that the IWA legitimate-night-use allowance assumes, since that allowance is
 * what the analysis will subtract back off.
 */
const DIURNAL = [
  0.28, 0.12, 0.05, 0.04, 0.08, 0.35, 1.20, 1.85, 1.70, 1.35, 1.15, 1.08,
  1.12, 1.05, 1.02, 1.10, 1.30, 1.68, 1.88, 1.72, 1.35, 0.98, 0.68, 0.42,
];

const DIURNAL_MEAN = DIURNAL.reduce((a, b) => a + b, 0) / DIURNAL.length;

/** Working-hours window over which non-domestic demand is spread. */
const COMMERCIAL_HOURS = { start: 7, end: 18 };

/**
 * Pressure response to demand.
 *
 * Head falls as the system works harder. A 1.7x peak-hour demand pulls the
 * zone roughly 18% below its average pressure; the small hours sit above it.
 */
function pressureAt(averagePressureM: number, demandMultiple: number): number {
  return averagePressureM * (1 - 0.18 * (demandMultiple - 1));
}

/** Generate one day of hourly readings for a zone. */
export function generateDay(dma: Dma, profile: DmaProfile, seed: number): FlowReading[] {
  const rand = mulberry32(seed);

  const domesticKlDay = (dma.population * profile.litresPerCapitaPerDay) / 1000;
  const averageDomesticKlh = domesticKlDay / 24;
  const commercialHours = COMMERCIAL_HOURS.end - COMMERCIAL_HOURS.start;
  const commercialKlh = profile.nonDomesticKlDay / commercialHours;

  return DIURNAL.map((raw, hour) => {
    const multiple = raw / DIURNAL_MEAN;

    // Domestic draw follows the curve; a little noise keeps the trace from
    // looking synthetic, and keeps the MNF from landing on a suspiciously
    // round number.
    const jitter = 0.96 + rand() * 0.08;
    const domestic = averageDomesticKlh * multiple * jitter;

    const commercial =
      hour >= COMMERCIAL_HOURS.start && hour < COMMERCIAL_HOURS.end
        ? commercialKlh * (0.9 + rand() * 0.2)
        : 0;

    // Leakage is pressure-driven, so it moves with head rather than staying
    // flat: highest in the quiet hours, lowest at peak demand.
    const pressureM = pressureAt(dma.averagePressureM, multiple);
    const leakage =
      profile.baseLeakageKlh * Math.pow(pressureM / dma.averagePressureM, 1.0);

    return {
      hour,
      inflowKlh: Number((domestic + commercial + leakage).toFixed(2)),
      pressureM: Number(pressureM.toFixed(1)),
    };
  });
}

/** ISO date string `daysAgo` days before the reference date. */
function isoDate(daysAgo: number, reference = new Date('2026-09-18T00:00:00Z')): string {
  const d = new Date(reference);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/**
 * A rolling window of telemetry for every zone, newest last.
 *
 * The seed folds in the day index so consecutive days differ, and the zone
 * index so two zones never share a trace.
 */
export function generateTelemetry(days = 14): DmaDay[] {
  const out: DmaDay[] = [];

  dmas.forEach((dma, zoneIndex) => {
    const profile = dmaProfiles.find((p) => p.dmaId === dma.id);
    if (!profile) return;

    for (let day = days - 1; day >= 0; day -= 1) {
      out.push({
        dmaId: dma.id,
        date: isoDate(day),
        readings: generateDay(dma, profile, zoneIndex * 1013 + day * 7919 + 17),
      });
    }
  });

  return out;
}

/**
 * Billing figures consistent with the generated telemetry.
 *
 * Derived from the same volumes the meters saw rather than invented
 * separately, so the water balance closes against real system input instead of
 * quietly hiding the discrepancy in the real-losses residual.
 */
export function generateBilling(telemetry: DmaDay[], period = '2026-09'): BillingRecord[] {
  return dmas.map((dma) => {
    const profile = dmaProfiles.find((p) => p.dmaId === dma.id)!;
    const days = telemetry.filter((t) => t.dmaId === dma.id);
    const systemInputKl = days.reduce(
      (sum, day) => sum + day.readings.reduce((s, r) => s + r.inflowKlh, 0),
      0,
    );

    const unauthorisedKl = systemInputKl * profile.unauthorisedRate;
    const leakageKl = profile.baseLeakageKlh * 24 * days.length;

    // What is left after the leak and the illegal connections is what reached
    // a paying customer — less whatever their meter failed to register.
    const reachedCustomersKl = Math.max(0, systemInputKl - unauthorisedKl - leakageKl);
    const meterInaccuracyKl = reachedCustomersKl * profile.meterInaccuracyRate;
    const measuredAtCustomerKl = reachedCustomersKl - meterInaccuracyKl;

    // Municipal buildings, parks and standpipes: metered, authorised, unbilled.
    const unbilledMeteredKl = measuredAtCustomerKl * 0.018;
    // Firefighting and mains flushing: authorised, and nobody measures it.
    const unbilledUnmeteredKl = systemInputKl * 0.006;
    const billedUnmeteredKl = measuredAtCustomerKl * 0.012;

    const billedMeteredKl = Math.max(
      0,
      measuredAtCustomerKl - unbilledMeteredKl - billedUnmeteredKl,
    );

    const round = (n: number) => Number(n.toFixed(1));

    return {
      dmaId: dma.id,
      period,
      billedMeteredKl: round(billedMeteredKl),
      billedUnmeteredKl: round(billedUnmeteredKl),
      unbilledMeteredKl: round(unbilledMeteredKl),
      unbilledUnmeteredKl: round(unbilledUnmeteredKl),
      unauthorisedKl: round(unauthorisedKl),
      meterInaccuracyKl: round(meterInaccuracyKl),
    };
  });
}

/** The true injected leakage for a zone, kL/day — the answer the MNF method is trying to find. */
export function trueLeakageKlDay(dmaId: string): number {
  const profile = dmaProfiles.find((p) => p.dmaId === dmaId);
  return profile ? profile.baseLeakageKlh * 24 : 0;
}
