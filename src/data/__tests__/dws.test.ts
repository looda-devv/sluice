import { describe, expect, it } from 'vitest';
import { national, provinces, regionBalances } from '../dws/regions';
import { noDropBand, wsas } from '../dws/wsa';
import { buildWaterBalance, calculateIli } from '../../engine';

/**
 * Guards on the published data.
 *
 * These are not testing arithmetic — they are testing that the figures
 * transcribed out of two government PDFs are the figures the PDFs contain. A
 * silent corruption here would be invisible in the interface and would make
 * every downstream number wrong while looking entirely plausible, which is the
 * failure mode this project exists to avoid.
 */
describe('published water balances', () => {
  const near = (a: number, b: number, tol = 0.06) => Math.abs(a - b) <= tol;

  it.each(regionBalances.map((r) => [r.region, r] as const))(
    '%s closes on the IWA identities',
    (_name, b) => {
      expect(near(b.authorisedMm3 + b.waterLossesMm3, b.sivMm3)).toBe(true);
      expect(near(b.apparentLossesMm3 + b.realLossesMm3, b.waterLossesMm3)).toBe(true);
      expect(near(b.sivMm3 - b.billedAuthorisedMm3, b.nonRevenueWaterMm3)).toBe(true);
      expect(near(b.billedMeteredMm3 + b.billedUnmeteredMm3, b.billedAuthorisedMm3)).toBe(true);
    },
  );

  it('only tolerates the two identity gaps the source itself contains', () => {
    const flagged = regionBalances.filter((b) => b.publishedDiscrepancy);

    expect(flagged.map((b) => b.region)).toEqual(['North West', 'Northern Cape']);

    for (const b of regionBalances) {
      const authGap = Math.abs(b.billedAuthorisedMm3 + b.unbilledAuthorisedMm3 - b.authorisedMm3);
      const unbilledGap = Math.abs(b.unbilledMeteredMm3 + b.unbilledUnmeteredMm3 - b.unbilledAuthorisedMm3);
      if (!b.publishedDiscrepancy) {
        expect(authGap).toBeLessThan(0.06);
        expect(unbilledGap).toBeLessThan(0.06);
      }
    }
  });

  it('sums the provinces to the published national totals', () => {
    // The strongest single check available: nine independently extracted
    // balances reconstituting the national one. System input, non-revenue
    // water, total losses and authorised consumption all agree to the third
    // decimal, which is not something a mis-transcription would do.
    const sum = (f: (b: typeof national) => number) =>
      provinces.reduce((s, p) => s + f(p), 0);

    // Relative agreement, not decimal places: the published figures are given
    // to three decimals and carry their own rounding, so the meaningful claim
    // is that nine separately extracted balances land on the national total to
    // within a thousandth of a percent.
    const agrees = (got: number, want: number) => Math.abs(got - want) / want < 0.00001;

    expect(agrees(sum((b) => b.sivMm3), national.sivMm3)).toBe(true);
    expect(agrees(sum((b) => b.nonRevenueWaterMm3), national.nonRevenueWaterMm3)).toBe(true);
    expect(agrees(sum((b) => b.waterLossesMm3), national.waterLossesMm3)).toBe(true);
    expect(agrees(sum((b) => b.authorisedMm3), national.authorisedMm3)).toBe(true);
  });

  it('carries the source\'s own disagreement about the apparent/real split', () => {
    // Total losses aggregate exactly, but the provinces book 4.88 Mm3 more of
    // them as apparent than the national balance does. That is the source
    // disagreeing with itself, and it lands precisely where you would expect:
    // the division between water that leaked and water that was used but never
    // billed is the most estimated quantity in any water balance, and the only
    // one here not measured by a meter.
    const realGap =
      provinces.reduce((s, p) => s + p.realLossesMm3, 0) - national.realLossesMm3;
    const apparentGap =
      provinces.reduce((s, p) => s + p.apparentLossesMm3, 0) - national.apparentLossesMm3;

    expect(realGap).toBeCloseTo(-4.88, 1);
    expect(apparentGap).toBeCloseTo(4.88, 1);
    // The two gaps cancel, which is why total losses still agree.
    expect(realGap + apparentGap).toBeCloseTo(0, 2);
  });

  it('reproduces the headline figures the report is known for', () => {
    // 46.4% non-revenue water nationally, ILI 6.4, 216 l/c/d for 2021/22.
    const nrwPct = (national.nonRevenueWaterMm3 / national.sivMm3) * 100;

    expect(nrwPct).toBeCloseTo(46.4, 1);
    expect(national.ili).toBe(6.4);
    expect(national.litresPerCapitaPerDay).toBe(216);
    expect(provinces).toHaveLength(9);
  });

  it('keeps Western Cape best and KwaZulu-Natal worst on ILI, as published', () => {
    const byIli = [...provinces].sort((a, b) => a.ili - b.ili);

    expect(byIli[0].region).toBe('Western Cape');
    expect(byIli[0].ili).toBe(3.3);
    expect(byIli[byIli.length - 1].region).toBe('KwaZulu-Natal');
    expect(byIli[byIli.length - 1].ili).toBe(9.3);
  });

  it('feeds the project engine without reshaping the numbers', () => {
    // The engine works in kilolitres; a published Mm3 figure is 1e6 of them.
    // If this drifts, every rand value in the interface is out by 10^6.
    const toKl = (mm3: number) => mm3 * 1_000_000;
    const b = buildWaterBalance(toKl(national.sivMm3), {
      dmaId: 'national',
      period: '2021-22',
      billedMeteredKl: toKl(national.billedMeteredMm3),
      billedUnmeteredKl: toKl(national.billedUnmeteredMm3),
      unbilledMeteredKl: toKl(national.unbilledMeteredMm3),
      unbilledUnmeteredKl: toKl(national.unbilledUnmeteredMm3),
      unauthorisedKl: 0,
      meterInaccuracyKl: toKl(national.apparentLossesMm3),
    });

    expect(b.nonRevenueWaterPct).toBeCloseTo(46.4, 1);
    expect(b.realLossesKl / 1_000_000).toBeCloseTo(national.realLossesMm3, 0);
  });
});

describe('water services authorities', () => {
  it('covers all 144 WSAs, uniquely', () => {
    expect(wsas).toHaveLength(144);
    expect(new Set(wsas.map((w) => w.name)).size).toBe(144);
  });

  it('matches the province counts the report publishes', () => {
    const counts = wsas.reduce<Record<string, number>>((acc, w) => {
      acc[w.province] = (acc[w.province] ?? 0) + 1;
      return acc;
    }, {});

    expect(counts).toEqual({
      'Eastern Cape': 14,
      'Free State': 19,
      Gauteng: 9,
      'KwaZulu-Natal': 14,
      Limpopo: 10,
      Mpumalanga: 17,
      'North West': 10,
      'Northern Cape': 26,
      'Western Cape': 25,
    });
  });

  it('reproduces the report\'s own table of top scorers', () => {
    const top = wsas
      .filter((w) => w.noDropScore !== null)
      .sort((a, b) => b.noDropScore! - a.noDropScore!)
      .slice(0, 4);

    expect(top.map((w) => [w.name, w.noDropScore])).toEqual([
      ['Overstrand Local Municipality', 101],
      ['City of Cape Town', 92],
      ['Midvaal Local Municipality', 91],
      ['Swartland Local Municipality', 91],
    ]);
  });

  it('matches the published band counts', () => {
    const band = (b: string) => wsas.filter((w) => noDropBand(w.noDropScore) === b).length;

    expect(band('Excellent')).toBe(4);
    expect(band('Good')).toBe(8);
    expect(band('Average')).toBe(43);
    expect(band('No submission')).toBe(30);
  });

  it('never treats a non-submitting municipality as scoring zero', () => {
    const unscored = wsas.filter((w) => w.noDropScore === null);

    expect(unscored.length).toBeGreaterThan(0);
    expect(wsas.some((w) => w.noDropScore === 0)).toBe(false);
  });

  it('benchmarks a province on its network, not its consumption', () => {
    // Guards the reason ILI exists: Limpopo loses a larger share of its water
    // than Gauteng (56.7% vs 41.9%) while running a materially better network
    // (ILI 5.7 vs 7.9). A percentage ranking inverts the two.
    const lp = provinces.find((p) => p.region === 'Limpopo')!;
    const gt = provinces.find((p) => p.region === 'Gauteng')!;

    const lpNrwPct = (lp.nonRevenueWaterMm3 / lp.sivMm3) * 100;
    const gtNrwPct = (gt.nonRevenueWaterMm3 / gt.sivMm3) * 100;

    expect(lpNrwPct).toBeGreaterThan(gtNrwPct);
    expect(lp.ili).toBeLessThan(gt.ili);
  });
});

describe('the engine is unchanged by real inputs', () => {
  it('scores a real network the same way it scores a modelled one', () => {
    const result = calculateIli(
      {
        id: 'x', name: 'x', code: 'X', area: '', connections: 2000, population: 7000,
        mainsLengthKm: 24, privatePipeMetresPerConnection: 10, averagePressureM: 55,
        infrastructureYear: 1990, reservoirId: 'r',
      },
      139.26,
    );

    expect(result.ili).toBeCloseTo(1, 4);
  });
});
