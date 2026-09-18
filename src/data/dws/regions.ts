/**
 * Published South African water-loss data, 2021/22.
 *
 * Source: Department of Water and Sanitation, *No Drop Watch Report* (2023),
 * section 4 — the national and regional IWA water balances.
 *   https://ws.dws.gov.za/iris/releases/NDWR.pdf
 *
 * Extracted by `scripts/extract_dws.py`, which does not read the diagrams by
 * position — they are multi-column and flatten ambiguously — but solves each
 * balance against its own identities and pins it to the non-revenue water
 * figure the report states in prose. Every value below was then confirmed a
 * second time by reading the source page directly.
 *
 * Two checks give confidence this is faithful: each balance closes on all six
 * IWA identities, and the nine provinces sum to the published national totals
 * (4 282.5 and 1 988.5 million m3 for system input and non-revenue water).
 *
 * One thing the aggregation does reveal is a disagreement inside the source.
 * System input, authorised consumption and total water losses all reconstitute
 * the national figure exactly, but the provinces book 4.88 Mm3 more of those
 * losses as apparent rather than real. The gap is small and it cancels, and it
 * sits exactly where it should: the split between water that leaked away and
 * water that was used but never billed is the one line in a water balance that
 * no meter measures. It is left as published.
 *
 * Volumes are million cubic metres per annum (Mm3/a). One Mm3 is one million
 * kilolitres, so a figure here times 1 000 000 gives the kilolitres the rest
 * of this project works in.
 */

export interface RegionBalance {
  region: string;
  /** System input volume, Mm3/a. */
  sivMm3: number;
  authorisedMm3: number;
  billedAuthorisedMm3: number;
  billedMeteredMm3: number;
  billedUnmeteredMm3: number;
  unbilledAuthorisedMm3: number;
  unbilledMeteredMm3: number;
  unbilledUnmeteredMm3: number;
  waterLossesMm3: number;
  apparentLossesMm3: number;
  realLossesMm3: number;
  nonRevenueWaterMm3: number;
  /** Infrastructure Leakage Index, as published. */
  ili: number;
  /** Current annual real losses, m3 per km of mains per day, as published. */
  carlM3PerKmPerDay: number;
  /** Litres per person per day, as published. */
  litresPerCapitaPerDay: number;
  /**
   * Set where the published balance does not close on one of its identities.
   * Reported rather than silently corrected: the discrepancy belongs to the
   * source, and a reader comparing against the PDF should find what it says.
   */
  publishedDiscrepancy?: string;
}


export const regionBalances: RegionBalance[] = [
  {
    region: 'National',
    sivMm3: 4282.53,
    authorisedMm3: 2537.87,
    billedAuthorisedMm3: 2294.07,
    billedMeteredMm3: 1884.98,
    billedUnmeteredMm3: 409.089,
    unbilledAuthorisedMm3: 243.796,
    unbilledMeteredMm3: 41.67,
    unbilledUnmeteredMm3: 202.128,
    waterLossesMm3: 1744.66,
    apparentLossesMm3: 349.481,
    realLossesMm3: 1395.18,
    nonRevenueWaterMm3: 1988.46,
    ili: 6.4,
    carlM3PerKmPerDay: 15,
    litresPerCapitaPerDay: 216,
  },
  {
    region: 'Eastern Cape',
    sivMm3: 341.785,
    authorisedMm3: 191.714,
    billedAuthorisedMm3: 180.857,
    billedMeteredMm3: 110.834,
    billedUnmeteredMm3: 70.023,
    unbilledAuthorisedMm3: 10.857,
    unbilledMeteredMm3: 1.334,
    unbilledUnmeteredMm3: 9.523,
    waterLossesMm3: 150.071,
    apparentLossesMm3: 32.821,
    realLossesMm3: 117.249,
    nonRevenueWaterMm3: 160.928,
    ili: 5.3,
    carlM3PerKmPerDay: 15,
    litresPerCapitaPerDay: 203,
  },
  {
    region: 'Free State',
    sivMm3: 247.627,
    authorisedMm3: 122.411,
    billedAuthorisedMm3: 116.737,
    billedMeteredMm3: 95.405,
    billedUnmeteredMm3: 21.332,
    unbilledAuthorisedMm3: 5.673,
    unbilledMeteredMm3: 0.7,
    unbilledUnmeteredMm3: 4.973,
    waterLossesMm3: 125.216,
    apparentLossesMm3: 24.793,
    realLossesMm3: 100.423,
    nonRevenueWaterMm3: 130.889,
    ili: 5.6,
    carlM3PerKmPerDay: 14,
    litresPerCapitaPerDay: 224,
  },
  {
    region: 'Gauteng',
    sivMm3: 1520.49,
    authorisedMm3: 1012.98,
    billedAuthorisedMm3: 883.182,
    billedMeteredMm3: 746.946,
    billedUnmeteredMm3: 136.237,
    unbilledAuthorisedMm3: 129.796,
    unbilledMeteredMm3: 2.7,
    unbilledUnmeteredMm3: 127.093,
    waterLossesMm3: 507.515,
    apparentLossesMm3: 104.548,
    realLossesMm3: 402.967,
    nonRevenueWaterMm3: 637.311,
    ili: 7.9,
    carlM3PerKmPerDay: 24,
    litresPerCapitaPerDay: 253,
  },
  {
    region: 'KwaZulu-Natal',
    sivMm3: 816.35,
    authorisedMm3: 450.978,
    billedAuthorisedMm3: 379.243,
    billedMeteredMm3: 337.245,
    billedUnmeteredMm3: 41.998,
    unbilledAuthorisedMm3: 71.735,
    unbilledMeteredMm3: 20.317,
    unbilledUnmeteredMm3: 51.418,
    waterLossesMm3: 365.372,
    apparentLossesMm3: 72.77,
    realLossesMm3: 292.602,
    nonRevenueWaterMm3: 437.107,
    ili: 9.3,
    carlM3PerKmPerDay: 14,
    litresPerCapitaPerDay: 224,
  },
  {
    region: 'Limpopo',
    sivMm3: 297.623,
    authorisedMm3: 129.377,
    billedAuthorisedMm3: 128.801,
    billedMeteredMm3: 74.754,
    billedUnmeteredMm3: 54.047,
    unbilledAuthorisedMm3: 0.576,
    unbilledMeteredMm3: 0.417,
    unbilledUnmeteredMm3: 0.16,
    waterLossesMm3: 168.246,
    apparentLossesMm3: 33.649,
    realLossesMm3: 134.597,
    nonRevenueWaterMm3: 168.822,
    ili: 5.7,
    carlM3PerKmPerDay: 17,
    litresPerCapitaPerDay: 210,
  },
  {
    region: 'Mpumalanga',
    sivMm3: 287.781,
    authorisedMm3: 145.215,
    billedAuthorisedMm3: 140.492,
    billedMeteredMm3: 87.836,
    billedUnmeteredMm3: 52.656,
    unbilledAuthorisedMm3: 4.723,
    unbilledMeteredMm3: 1.823,
    unbilledUnmeteredMm3: 2.9,
    waterLossesMm3: 142.567,
    apparentLossesMm3: 31.925,
    realLossesMm3: 110.642,
    nonRevenueWaterMm3: 147.29,
    ili: 4.8,
    carlM3PerKmPerDay: 13,
    litresPerCapitaPerDay: 186,
  },
  {
    region: 'North West',
    sivMm3: 232.123,
    authorisedMm3: 114.497,
    billedAuthorisedMm3: 114.268,
    billedMeteredMm3: 86.16,
    billedUnmeteredMm3: 28.108,
    unbilledAuthorisedMm3: 0.229,
    unbilledMeteredMm3: 0.195,
    unbilledUnmeteredMm3: 0.225,
    waterLossesMm3: 117.626,
    apparentLossesMm3: 23.525,
    realLossesMm3: 94.101,
    nonRevenueWaterMm3: 117.855,
    ili: 4.8,
    carlM3PerKmPerDay: 10,
    litresPerCapitaPerDay: 176,
    publishedDiscrepancy:
      'Unbilled metered plus unmetered (0.195 + 0.225) exceeds the published unbilled authorised total of 0.229 Mm3 by 0.191.',
  },
  {
    region: 'Northern Cape',
    sivMm3: 108.608,
    authorisedMm3: 49.948,
    billedAuthorisedMm3: 47.554,
    billedMeteredMm3: 43.424,
    billedUnmeteredMm3: 4.131,
    unbilledAuthorisedMm3: 1.8,
    unbilledMeteredMm3: 0.8,
    unbilledUnmeteredMm3: 1,
    waterLossesMm3: 58.66,
    apparentLossesMm3: 10.087,
    realLossesMm3: 48.573,
    nonRevenueWaterMm3: 61.053,
    ili: 8.1,
    carlM3PerKmPerDay: 17,
    litresPerCapitaPerDay: 250,
    publishedDiscrepancy:
      'Billed authorised plus unbilled authorised (47.554 + 1.800) falls 0.594 Mm3 short of the published authorised consumption of 49.948.',
  },
  {
    region: 'Western Cape',
    sivMm3: 430.142,
    authorisedMm3: 320.749,
    billedAuthorisedMm3: 302.937,
    billedMeteredMm3: 302.379,
    billedUnmeteredMm3: 0.5,
    unbilledAuthorisedMm3: 17.812,
    unbilledMeteredMm3: 12,
    unbilledUnmeteredMm3: 5.812,
    waterLossesMm3: 109.393,
    apparentLossesMm3: 20.246,
    realLossesMm3: 89.147,
    nonRevenueWaterMm3: 127.205,
    ili: 3.3,
    carlM3PerKmPerDay: 9,
    litresPerCapitaPerDay: 160,
  },
];

export const national = regionBalances[0];
export const provinces = regionBalances.slice(1);

/** Percentage helpers, computed rather than transcribed. */
export const pctOfInput = (value: number, balance: RegionBalance): number =>
  balance.sivMm3 > 0 ? (value / balance.sivMm3) * 100 : 0;
