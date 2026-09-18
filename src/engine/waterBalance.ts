import type { BillingRecord } from '../types';

/**
 * The IWA standard water balance.
 *
 * Every kilolitre entering the system lands in exactly one bucket, and the
 * buckets nest:
 *
 *   System Input
 *   ├── Authorised Consumption
 *   │   ├── Billed Authorised      → Revenue Water
 *   │   │   ├── billed metered
 *   │   │   └── billed unmetered
 *   │   └── Unbilled Authorised    ┐
 *   │       ├── unbilled metered   │
 *   │       └── unbilled unmetered │
 *   └── Water Losses               ├─→ Non-Revenue Water
 *       ├── Apparent Losses        │
 *       │   ├── unauthorised consumption
 *       │   └── metering inaccuracy
 *       └── Real Losses            ┘
 *
 * The distinction that matters operationally is apparent vs real. Apparent
 * losses are water that reached a customer but was never paid for — a billing
 * and enforcement problem, and expensive because it is lost at retail tariff.
 * Real losses are water that never reached anyone — a pipes problem, valued at
 * the cost of production. Confusing the two sends a repair crew to fix a
 * revenue collection failure.
 */

export interface WaterBalance {
  systemInputKl: number;
  billedMeteredKl: number;
  billedUnmeteredKl: number;
  billedAuthorisedKl: number;
  unbilledMeteredKl: number;
  unbilledUnmeteredKl: number;
  unbilledAuthorisedKl: number;
  authorisedConsumptionKl: number;
  unauthorisedKl: number;
  meterInaccuracyKl: number;
  apparentLossesKl: number;
  realLossesKl: number;
  waterLossesKl: number;
  /** Revenue water is exactly the billed authorised consumption. */
  revenueWaterKl: number;
  /** Everything the municipality moved but was not paid for. */
  nonRevenueWaterKl: number;
  nonRevenueWaterPct: number;
  realLossesPct: number;
  apparentLossesPct: number;
}

/**
 * Build the balance from a measured system input and a billing record.
 *
 * Real losses are the residual — the term nobody measures directly. That is
 * both correct (the balance must close) and a warning: every measurement error
 * upstream accumulates here. A real-losses figure is only ever as good as the
 * bulk meter that produced the system input volume.
 */
export function buildWaterBalance(
  systemInputKl: number,
  billing: BillingRecord,
): WaterBalance {
  const billedAuthorisedKl = billing.billedMeteredKl + billing.billedUnmeteredKl;
  const unbilledAuthorisedKl = billing.unbilledMeteredKl + billing.unbilledUnmeteredKl;
  const authorisedConsumptionKl = billedAuthorisedKl + unbilledAuthorisedKl;

  const apparentLossesKl = billing.unauthorisedKl + billing.meterInaccuracyKl;
  const waterLossesKl = Math.max(0, systemInputKl - authorisedConsumptionKl);
  const realLossesKl = Math.max(0, waterLossesKl - apparentLossesKl);

  const nonRevenueWaterKl = Math.max(0, systemInputKl - billedAuthorisedKl);
  const pct = (v: number) => (systemInputKl > 0 ? (v / systemInputKl) * 100 : 0);

  return {
    systemInputKl,
    billedMeteredKl: billing.billedMeteredKl,
    billedUnmeteredKl: billing.billedUnmeteredKl,
    billedAuthorisedKl,
    unbilledMeteredKl: billing.unbilledMeteredKl,
    unbilledUnmeteredKl: billing.unbilledUnmeteredKl,
    unbilledAuthorisedKl,
    authorisedConsumptionKl,
    unauthorisedKl: billing.unauthorisedKl,
    meterInaccuracyKl: billing.meterInaccuracyKl,
    apparentLossesKl,
    realLossesKl,
    waterLossesKl,
    revenueWaterKl: billedAuthorisedKl,
    nonRevenueWaterKl,
    nonRevenueWaterPct: pct(nonRevenueWaterKl),
    realLossesPct: pct(realLossesKl),
    apparentLossesPct: pct(apparentLossesKl),
  };
}

/** Sum several balances into one — used to roll DMAs up to a municipal view. */
export function combineWaterBalances(balances: WaterBalance[]): WaterBalance {
  const zero: BillingRecord = {
    dmaId: 'all',
    period: 'all',
    billedMeteredKl: 0,
    billedUnmeteredKl: 0,
    unbilledMeteredKl: 0,
    unbilledUnmeteredKl: 0,
    unauthorisedKl: 0,
    meterInaccuracyKl: 0,
  };

  const totals = balances.reduce(
    (acc, b) => ({
      systemInput: acc.systemInput + b.systemInputKl,
      billing: {
        ...acc.billing,
        billedMeteredKl: acc.billing.billedMeteredKl + b.billedMeteredKl,
        billedUnmeteredKl: acc.billing.billedUnmeteredKl + b.billedUnmeteredKl,
        unbilledMeteredKl: acc.billing.unbilledMeteredKl + b.unbilledMeteredKl,
        unbilledUnmeteredKl: acc.billing.unbilledUnmeteredKl + b.unbilledUnmeteredKl,
        unauthorisedKl: acc.billing.unauthorisedKl + b.unauthorisedKl,
        meterInaccuracyKl: acc.billing.meterInaccuracyKl + b.meterInaccuracyKl,
      },
    }),
    { systemInput: 0, billing: zero },
  );

  return buildWaterBalance(totals.systemInput, totals.billing);
}

/**
 * Published national benchmarks.
 *
 * Two reporting years appear in this project and they are not interchangeable.
 * The Department of Water and Sanitation's No Drop Watch Report gives a full
 * IWA balance for 2021/22, which is the data the dashboard analyses and which
 * puts non-revenue water at 46.4%. The 2023 No Drop Report assessed 2022/23
 * and put it at 47.4% — a headline figure without a machine-readable balance
 * behind it. Both are cited where they apply; neither is used to stand in for
 * the other.
 *
 * These are reference lines for judging a zone against, never inputs to a
 * calculation.
 */
export const BENCHMARKS = {
  /** 2022/23, DWS No Drop Report 2023 — the most recent published figure. */
  saNationalNrwPct: 47.4,
  /** 2021/22, DWS No Drop Watch Report — the year with a full balance. */
  saNrwPct2021_22: 46.4,
  globalAverageNrwPct: 30,
  /** Best-practice target for a well-run municipal system. */
  targetNrwPct: 15,
  /** SA average, litres/person/day, 2021/22, against a world average near 173. */
  saLitresPerCapitaPerDay: 216,
  worldLitresPerCapitaPerDay: 173,
} as const;
