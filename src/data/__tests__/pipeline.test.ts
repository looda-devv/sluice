import { describe, expect, it } from 'vitest';
import {
  analyseNightFlow,
  buildWaterBalance,
  combineWaterBalances,
  projectDrawdown,
  projectWithLeakageReduction,
} from '../../engine';
import { defaultAssumptions, dmas, reservoirs } from '../network';
import { generateBilling, generateTelemetry, trueLeakageKlDay } from '../telemetry';

/**
 * End-to-end check against a known answer.
 *
 * The generator injects a leak of a known size into each zone, then hides it
 * inside a realistic demand curve. These tests assert that the minimum night
 * flow analysis finds it again. That is the one claim this whole project rests
 * on, and it is only testable because the data is synthetic — on a real
 * network nobody knows the true leakage, which is precisely why the method
 * exists.
 */
describe('leak detection recovers the injected leak', () => {
  const telemetry = generateTelemetry(14);

  it.each(dmas.map((d) => [d.code, d.id] as const))(
    'estimates %s within 12%% of its true leakage',
    (_code, dmaId) => {
      const dma = dmas.find((d) => d.id === dmaId)!;
      const day = telemetry.filter((t) => t.dmaId === dmaId).at(-1)!;

      const result = analyseNightFlow(dma, day.readings, defaultAssumptions);
      const truth = trueLeakageKlDay(dmaId);
      const errorPct = Math.abs((result.dailyLeakageKl - truth) / truth) * 100;

      expect(errorPct).toBeLessThan(12);
    },
  );

  it('produces a stable network on every run', () => {
    const a = generateTelemetry(3);
    const b = generateTelemetry(3);

    expect(a).toEqual(b);
  });

  it('puts the deep trough where the analysis expects it, on domestic zones', () => {
    // Northfields is the exception and is excluded deliberately: it is an
    // industrial zone whose demand collapses at knock-off time rather than at
    // 3am. The next test asserts the analysis notices that for itself.
    for (const dma of dmas.filter((d) => d.id !== 'dma-northfields')) {
      const day = telemetry.filter((t) => t.dmaId === dma.id).at(-1)!;
      const lowest = day.readings.reduce((m, r) => (r.inflowKlh < m.inflowKlh ? r : m));

      expect([2, 3]).toContain(lowest.hour);
    }
  });

  it('flags the industrial zone instead of quietly overstating its leak', () => {
    const day = telemetry.filter((t) => t.dmaId === 'dma-northfields').at(-1)!;
    const dma = dmas.find((d) => d.id === 'dma-northfields')!;

    const result = analyseNightFlow(dma, day.readings, defaultAssumptions);

    expect(result.windowCaveat).not.toBeNull();
    expect(result.windowCaveat!.actualMinimumHour).toBeGreaterThan(12);
    expect(result.windowCaveat!.message).toMatch(/non-domestic/);
  });

  it('raises no caveat on an ordinary domestic zone', () => {
    const day = telemetry.filter((t) => t.dmaId === 'dma-kgotso').at(-1)!;
    const dma = dmas.find((d) => d.id === 'dma-kgotso')!;

    expect(analyseNightFlow(dma, day.readings, defaultAssumptions).windowCaveat).toBeNull();
  });
});

describe('the generated network is internally consistent', () => {
  const telemetry = generateTelemetry(14);
  const billing = generateBilling(telemetry);

  const balanceFor = (dmaId: string) => {
    const input = telemetry
      .filter((t) => t.dmaId === dmaId)
      .reduce((sum, d) => sum + d.readings.reduce((s, r) => s + r.inflowKlh, 0), 0);
    return buildWaterBalance(input, billing.find((b) => b.dmaId === dmaId)!);
  };

  it('never bills more than the bulk meter measured', () => {
    for (const dma of dmas) {
      const b = balanceFor(dma.id);
      expect(b.billedAuthorisedKl).toBeLessThanOrEqual(b.systemInputKl);
      expect(b.realLossesKl).toBeGreaterThan(0);
    }
  });

  it('lands the municipality in the range South African metros actually report', () => {
    const municipal = combineWaterBalances(dmas.map((d) => balanceFor(d.id)));

    // National non-revenue water sits near 47% (DWS No Drop, 2023) and the
    // metros straddle it — Tshwane materially better, eThekwini materially
    // worse. A demo network outside 25-55% would be making a claim about
    // South African water that is not true.
    expect(municipal.nonRevenueWaterPct).toBeGreaterThan(25);
    expect(municipal.nonRevenueWaterPct).toBeLessThan(55);
  });
});

describe('the reservoirs are sized against the demand beneath them', () => {
  const telemetry = generateTelemetry(14);

  const dailyDemand = (reservoirId: string) =>
    dmas
      .filter((d) => d.reservoirId === reservoirId)
      .reduce((sum, d) => {
        const day = telemetry.filter((t) => t.dmaId === d.id).at(-1)!;
        return sum + day.readings.reduce((s, r) => s + r.inflowKlh, 0);
      }, 0);

  it('holds roughly two days of draw, as a service reservoir should', () => {
    for (const reservoir of reservoirs) {
      const daysOfStorage = reservoir.capacityKl / dailyDemand(reservoir.id);

      expect(daysOfStorage).toBeGreaterThan(1.4);
      expect(daysOfStorage).toBeLessThan(2.6);
    }
  });

  it('gives the three reservoirs genuinely different situations', () => {
    const statuses = reservoirs.map(
      (r) => projectDrawdown(r, dailyDemand(r.id)).status,
    );

    expect(new Set(statuses).size).toBe(3);
  });

  it('lets leak recovery alone rescue Northcrest, with no extra bulk water', () => {
    const northcrest = reservoirs.find((r) => r.id === 'res-northcrest')!;
    const demand = dailyDemand(northcrest.id);
    const leakage = dmas
      .filter((d) => d.reservoirId === northcrest.id)
      .reduce((sum, d) => {
        const day = telemetry.filter((t) => t.dmaId === d.id).at(-1)!;
        return sum + analyseNightFlow(d, day.readings, defaultAssumptions).dailyLeakageKl;
      }, 0);

    const doNothing = projectDrawdown(northcrest, demand);
    const halfFixed = projectWithLeakageReduction(northcrest, demand, leakage, 0.5);

    expect(doNothing.daysToCritical).not.toBeNull();
    expect(doNothing.daysToCritical!).toBeLessThan(14);
    expect(halfFixed.daysToCritical).toBeNull();
  });
});
