import { describe, expect, it } from 'vitest';
import {
  analyseNightFlow,
  buildPriorityQueue,
  buildWaterBalance,
  calculateIli,
  calculateUarl,
  combineWaterBalances,
  leakageAfterPressureChange,
  projectDrawdown,
  projectWithLeakageReduction,
  recoverableLossesKlDay,
} from '../index';
import type { Assumptions, BillingRecord, Dma, FlowReading, Reservoir } from '../../types';
import { formatRand, formatVolume } from '../../lib/format';

const assumptions: Assumptions = {
  bulkWaterCostRandPerKl: 14.5,
  legitimateNightUseLPerConnPerHour: 1.7,
  nightDayFactor: 22,
};

const dma: Dma = {
  id: 'dma-test',
  name: 'Test Zone',
  code: 'TZ-01',
  area: 'Test',
  connections: 2000,
  population: 7200,
  mainsLengthKm: 24,
  privatePipeMetresPerConnection: 10,
  averagePressureM: 55,
  infrastructureYear: 1992,
  reservoirId: 'res-test',
};

/** Flat 100 kL/h all day, so the day totals 2400 kL and the MNF is unambiguous. */
const flatDay = (): FlowReading[] =>
  Array.from({ length: 24 }, (_, hour) => ({ hour, inflowKlh: 100, pressureM: 55 }));

describe('minimum night flow', () => {
  it('subtracts legitimate night use before calling the remainder leakage', () => {
    // 2000 connections x 1.7 l/conn/h = 3400 l/h = 3.4 kL/h of genuine use.
    const result = analyseNightFlow(dma, flatDay(), assumptions);

    expect(result.minimumNightFlowKlh).toBe(100);
    expect(result.legitimateNightUseKlh).toBeCloseTo(3.4, 6);
    expect(result.netNightFlowKlh).toBeCloseTo(96.6, 6);
    // 96.6 kL/h x NDF 22 = 2125.2 kL/day.
    expect(result.dailyLeakageKl).toBeCloseTo(2125.2, 4);
    expect(result.dailyInflowKl).toBe(2400);
  });

  it('takes the lowest reading in the window, not the first', () => {
    const readings = flatDay();
    readings[2].inflowKlh = 80;
    readings[3].inflowKlh = 45;

    const result = analyseNightFlow(dma, readings, assumptions);

    expect(result.minimumNightFlowKlh).toBe(45);
    expect(result.minimumHour).toBe(3);
  });

  it('never reports negative leakage when the zone is genuinely tight', () => {
    const readings = flatDay();
    readings[2].inflowKlh = 1;
    readings[3].inflowKlh = 1;

    const result = analyseNightFlow(dma, readings, assumptions);

    expect(result.netNightFlowKlh).toBe(0);
    expect(result.dailyLeakageKl).toBe(0);
  });

  it('throws rather than reporting a healthy zone when the logger is dead', () => {
    const daytimeOnly = flatDay().filter((r) => r.hour > 6);

    expect(() => analyseNightFlow(dma, daytimeOnly, assumptions)).toThrow(/TZ-01/);
  });

  it('scales leakage by the pressure exponent, not linearly', () => {
    // N1 = 1.0: halving pressure halves leakage.
    expect(leakageAfterPressureChange(1000, 60, 30, 1.0)).toBeCloseTo(500, 6);
    // N1 = 0.5 (rigid mains): the same pressure cut returns far less.
    expect(leakageAfterPressureChange(1000, 60, 30, 0.5)).toBeCloseTo(707.1, 1);
    // N1 = 1.5 (flexible plastic): it returns more.
    expect(leakageAfterPressureChange(1000, 60, 30, 1.5)).toBeCloseTo(353.55, 2);
  });
});

describe('IWA water balance', () => {
  const billing: BillingRecord = {
    dmaId: 'dma-test',
    period: '2026-08',
    billedMeteredKl: 50000,
    billedUnmeteredKl: 2000,
    unbilledMeteredKl: 1500,
    unbilledUnmeteredKl: 500,
    unauthorisedKl: 3000,
    meterInaccuracyKl: 4000,
  };

  it('closes: every kilolitre of input lands in exactly one bucket', () => {
    const b = buildWaterBalance(100000, billing);

    expect(b.authorisedConsumptionKl + b.waterLossesKl).toBeCloseTo(b.systemInputKl, 6);
    expect(b.apparentLossesKl + b.realLossesKl).toBeCloseTo(b.waterLossesKl, 6);
    expect(b.revenueWaterKl + b.nonRevenueWaterKl).toBeCloseTo(b.systemInputKl, 6);
  });

  it('counts unbilled authorised use as non-revenue but not as a loss', () => {
    const b = buildWaterBalance(100000, billing);

    // NRW = input - billed authorised = 100000 - 52000.
    expect(b.nonRevenueWaterKl).toBe(48000);
    expect(b.nonRevenueWaterPct).toBeCloseTo(48, 6);
    // Losses exclude the 2000 kL of authorised-but-unbilled use.
    expect(b.waterLossesKl).toBe(46000);
    expect(b.realLossesKl).toBe(39000);
  });

  it('does not report negative losses when billing exceeds measured input', () => {
    // Over-billing against a faulty bulk meter must not read as negative loss.
    const b = buildWaterBalance(40000, billing);

    expect(b.waterLossesKl).toBe(0);
    expect(b.realLossesKl).toBe(0);
    expect(b.nonRevenueWaterKl).toBe(0);
  });

  it('rolls zones up without double counting', () => {
    const one = buildWaterBalance(100000, billing);
    const combined = combineWaterBalances([one, one]);

    expect(combined.systemInputKl).toBe(200000);
    expect(combined.realLossesKl).toBe(one.realLossesKl * 2);
    expect(combined.nonRevenueWaterPct).toBeCloseTo(one.nonRevenueWaterPct, 6);
  });
});

describe('infrastructure leakage index', () => {
  it('matches the IWA UARL formula worked by hand', () => {
    // Lp = 2000 x 10 m / 1000 = 20 km.
    // (18 x 24 + 0.8 x 2000 + 25 x 20) x 55
    //   = (432 + 1600 + 500) x 55 = 2532 x 55 = 139_260 l/day.
    expect(calculateUarl(dma)).toBeCloseTo(139260, 6);
  });

  it('reports ILI 1 when a zone leaks exactly its unavoidable minimum', () => {
    const result = calculateIli(dma, 139.26);

    expect(result.ili).toBeCloseTo(1, 6);
    expect(result.band).toBe('A');
  });

  it('bands a badly leaking zone as D', () => {
    const result = calculateIli(dma, 139.26 * 20);

    expect(result.ili).toBeCloseTo(20, 6);
    expect(result.band).toBe('D');
  });

  it('does not rank a low-consumption zone as worse than an identical rich one', () => {
    // Same network, same leak; the only difference is how much the residents use.
    // Percentage-of-input would condemn the low-use zone. ILI must not.
    const leak = 400;
    const poorZone = calculateIli(dma, leak);
    const richZone = calculateIli({ ...dma, population: 20000 }, leak);

    expect(poorZone.ili).toBeCloseTo(richZone.ili, 6);
  });

  it('counts only the loss above the target as worth chasing', () => {
    // UARL is 139.26 kL/day; at target ILI 3 the floor is 417.78 kL/day.
    expect(recoverableLossesKlDay(dma, 600, 3)).toBeCloseTo(182.22, 4);
    expect(recoverableLossesKlDay(dma, 300, 3)).toBe(0);
  });
});

describe('reservoir drawdown', () => {
  const reservoir: Reservoir = {
    id: 'res-test',
    name: 'Test Reservoir',
    capacityKl: 20000,
    currentVolumeKl: 12000,
    bulkInflowKlDay: 9000,
    criticalLevelPct: 15,
  };

  it('counts down to the pressure-failure level, not to empty', () => {
    // Critical volume = 3000 kL. Net = -1000 kL/day. (12000-3000)/1000 = 9 days.
    const p = projectDrawdown(reservoir, 10000);

    expect(p.criticalVolumeKl).toBe(3000);
    expect(p.netKlDay).toBe(-1000);
    expect(p.daysToCritical).toBeCloseTo(9, 6);
    expect(p.status).toBe('critical');
  });

  it('reports no countdown for a recovering reservoir', () => {
    const p = projectDrawdown(reservoir, 8000);

    expect(p.daysToCritical).toBeNull();
    expect(p.status).toBe('recovering');
  });

  it('clamps the trace at capacity so overflow is not stored', () => {
    const p = projectDrawdown({ ...reservoir, currentVolumeKl: 19500 }, 1000, 10);

    expect(Math.max(...p.series)).toBe(20000);
  });

  it('converts leakage recovered into days bought', () => {
    const base = projectDrawdown(reservoir, 10000);
    // Halving 2000 kL/day of leakage removes 1000 kL/day of demand, which is
    // exactly the deficit — the reservoir should stop falling.
    const fixed = projectWithLeakageReduction(reservoir, 10000, 2000, 0.5);

    expect(base.daysToCritical).toBeCloseTo(9, 6);
    expect(fixed.netKlDay).toBe(0);
    expect(fixed.daysToCritical).toBeNull();
  });
});

describe('repair prioritisation', () => {
  const small: Dma = {
    ...dma,
    id: 'small',
    code: 'SM-01',
    connections: 900,
    mainsLengthKm: 9,
  };

  it('ranks by payback, so a big leak in a big zone does not automatically win', () => {
    // The large zone loses more water outright, but costs far more to survey.
    const queue = buildPriorityQueue(
      [dma, small],
      { [dma.id]: 700, small: 600 },
      assumptions,
    );

    expect(queue[0].dma.id).toBe('small');
    expect(queue[0].rank).toBe(1);
    expect(queue[0].paybackMonths).toBeLessThan(queue[1].paybackMonths!);
  });

  it('sorts zones with nothing left to recover to the bottom', () => {
    const queue = buildPriorityQueue(
      [dma, small],
      { [dma.id]: 100, small: 600 },
      assumptions,
    );

    expect(queue[1].dma.id).toBe(dma.id);
    expect(queue[1].recoverableKlDay).toBe(0);
    expect(queue[1].paybackMonths).toBeNull();
    expect(queue[1].recommendedAction).toMatch(/Monitor/);
  });

  it('skips zones with no telemetry rather than assuming they are healthy', () => {
    const queue = buildPriorityQueue([dma, small], { small: 600 }, assumptions);

    expect(queue).toHaveLength(1);
    expect(queue[0].dma.id).toBe('small');
  });

  it('recommends pressure management before excavation on an over-pressured zone', () => {
    const highPressure = { ...small, averagePressureM: 82 };
    const queue = buildPriorityQueue([highPressure], { small: 600 }, assumptions);

    expect(queue[0].recommendedAction).toMatch(/pressure-reducing valve/);
  });
});

describe('formatting across six orders of magnitude', () => {
  // en-ZA groups thousands with a non-breaking space and uses a comma for the
  // decimal, which is correct South African usage. Writing an ordinary space
  // in these expectations produces a failure whose diff looks identical to
  // the eye, so the separator is spelled out.
  const NB = '\u00a0';

  it('scales volume to the unit that reads best', () => {
    expect(formatVolume(450)).toBe('450 kL');
    expect(formatVolume(24_000)).toBe('24,0 Ml');
    // The national real-loss figure: 1 395 million m3 a year.
    expect(formatVolume(1_395_183_000)).toBe(`1${NB}395,2 Mm³`);
  });

  it('carries rand into billions rather than printing thousands of millions', () => {
    expect(formatRand(8_400)).toBe(`R 8${NB}400`);
    expect(formatRand(288_000)).toBe('R 288k');
    expect(formatRand(5_400_000)).toBe('R 5,4m');
    expect(formatRand(20_230_153_500)).toBe('R 20,2bn');
  });

  it('keeps the cents on a tariff', () => {
    expect(formatRand(14.5, { compact: false, decimals: 2 })).toBe('R 14,50');
  });
});
