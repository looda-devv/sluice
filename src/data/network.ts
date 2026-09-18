import type { Assumptions, Dma, Reservoir } from '../types';

/**
 * Thuso Metropolitan Municipality — a fictional network.
 *
 * No such municipality exists. The zones, meter readings and billing figures
 * in this project are synthetic, generated deterministically so the dashboard
 * shows the same thing on every load. What is not invented is their shape: the
 * zones are sized, pressured and aged to span the range a real South African
 * metro contains, and the loss levels are calibrated against the national
 * picture in the Department of Water and Sanitation's No Drop assessment —
 * around 47% non-revenue water nationally, against a global average nearer 30%.
 *
 * The point is to exercise the analysis honestly, not to represent any real
 * municipality's performance.
 */

/** Simulation-only parameters. The engine never sees these. */
export interface DmaProfile {
  dmaId: string;
  /** Domestic use, litres per person per day. */
  litresPerCapitaPerDay: number;
  /** Commercial and industrial draw, kL/day, flat across working hours. */
  nonDomesticKlDay: number;
  /** True underlying leakage rate at reference pressure, kL/h. */
  baseLeakageKlh: number;
  /** Share of billed volume lost to meter under-registration. */
  meterInaccuracyRate: number;
  /** Share of system input taken through illegal or tampered connections. */
  unauthorisedRate: number;
}

/**
 * Service reservoirs, sized against the demand the zones below them actually
 * generate.
 *
 * Capacity is set near two days of draw, which is the usual design standard —
 * enough to ride out a bulk supply interruption or a pump failure, not enough
 * to be a source in its own right. Contracted inflow is what makes the three
 * differ, and deliberately so: Northcrest is short of its zones' demand and
 * counting down, Vaalbank is slowly losing ground, and Eastbank is holding.
 *
 * Northcrest is the interesting case. It is short by less than a thousand
 * kilolitres a day while the zones beneath it leak several thousand — so the
 * shortfall is not a supply problem at all, and the leak reduction slider on
 * the reservoirs page turns its countdown into a stable reservoir without a
 * single additional litre being bought.
 */
export const reservoirs: Reservoir[] = [
  {
    id: 'res-northcrest',
    name: 'Northcrest Reservoir',
    capacityKl: 24000,
    currentVolumeKl: 11200,
    bulkInflowKlDay: 11450,
    criticalLevelPct: 18,
  },
  {
    id: 'res-vaalbank',
    name: 'Vaalbank Reservoir',
    capacityKl: 17000,
    currentVolumeKl: 10600,
    bulkInflowKlDay: 8700,
    criticalLevelPct: 15,
  },
  {
    id: 'res-eastbank',
    name: 'Eastbank Command Reservoir',
    capacityKl: 13000,
    currentVolumeKl: 9400,
    bulkInflowKlDay: 7100,
    criticalLevelPct: 15,
  },
];

export const dmas: Dma[] = [
  {
    id: 'dma-central',
    name: 'Thuso Central',
    code: 'TC-01',
    area: 'CBD and civic precinct',
    connections: 1480,
    population: 4100,
    mainsLengthKm: 21.4,
    privatePipeMetresPerConnection: 6,
    averagePressureM: 72,
    infrastructureYear: 1966,
    reservoirId: 'res-northcrest',
  },
  {
    id: 'dma-kgotso',
    name: 'Kgotso Zone 4',
    code: 'KG-04',
    area: 'High-density residential',
    connections: 6200,
    population: 28400,
    mainsLengthKm: 48.9,
    privatePipeMetresPerConnection: 9,
    averagePressureM: 58,
    infrastructureYear: 1974,
    reservoirId: 'res-northcrest',
  },
  {
    id: 'dma-lehae',
    name: 'Lehae Extension 7',
    code: 'LH-07',
    area: 'Subsidised housing, post-2010',
    connections: 3950,
    population: 16800,
    mainsLengthKm: 27.2,
    privatePipeMetresPerConnection: 11,
    averagePressureM: 46,
    infrastructureYear: 2012,
    reservoirId: 'res-vaalbank',
  },
  {
    id: 'dma-riverbend',
    name: 'Riverbend Estate',
    code: 'RB-02',
    area: 'Low-density suburban',
    connections: 1180,
    population: 3900,
    mainsLengthKm: 19.6,
    privatePipeMetresPerConnection: 22,
    averagePressureM: 51,
    infrastructureYear: 1998,
    reservoirId: 'res-vaalbank',
  },
  {
    id: 'dma-northfields',
    name: 'Northfields Industrial',
    code: 'NF-01',
    area: 'Industrial and warehousing',
    connections: 420,
    population: 600,
    mainsLengthKm: 16.8,
    privatePipeMetresPerConnection: 18,
    averagePressureM: 64,
    infrastructureYear: 1981,
    reservoirId: 'res-northcrest',
  },
  {
    id: 'dma-motswedi',
    name: 'Motswedi Extension 12',
    code: 'MW-12',
    area: 'Mixed residential',
    connections: 4380,
    population: 18200,
    mainsLengthKm: 33.5,
    privatePipeMetresPerConnection: 10,
    averagePressureM: 67,
    infrastructureYear: 1989,
    reservoirId: 'res-vaalbank',
  },
  {
    id: 'dma-ridgehaven',
    name: 'Ridgehaven',
    code: 'RH-03',
    area: 'Established suburban',
    connections: 2240,
    population: 7600,
    mainsLengthKm: 24.1,
    privatePipeMetresPerConnection: 16,
    averagePressureM: 49,
    infrastructureYear: 1993,
    reservoirId: 'res-eastbank',
  },
  {
    id: 'dma-tshepo',
    name: 'Tshepo Village',
    code: 'TV-05',
    area: 'Informal settlement, standpipe supply',
    connections: 890,
    population: 12400,
    mainsLengthKm: 14.3,
    privatePipeMetresPerConnection: 4,
    averagePressureM: 38,
    infrastructureYear: 2004,
    reservoirId: 'res-eastbank',
  },
  {
    id: 'dma-eastbank',
    name: 'Eastbank Extension 3',
    code: 'EB-03',
    area: 'Mixed residential and light commercial',
    connections: 2960,
    population: 11300,
    mainsLengthKm: 29.7,
    privatePipeMetresPerConnection: 12,
    averagePressureM: 55,
    infrastructureYear: 1977,
    reservoirId: 'res-eastbank',
  },
  {
    id: 'dma-waterfall',
    name: 'Waterfall Heights',
    code: 'WH-01',
    area: 'Low-density, elevated',
    connections: 760,
    population: 2500,
    mainsLengthKm: 13.9,
    privatePipeMetresPerConnection: 26,
    averagePressureM: 81,
    infrastructureYear: 2001,
    reservoirId: 'res-northcrest',
  },
];

/**
 * Loss and demand signatures per zone.
 *
 * These deliberately pull apart the two things a percentage-based report
 * conflates. Tshepo Village consumes very little per head and leaks modestly in
 * absolute terms, which a percentage view would condemn; Thuso Central sits on
 * 1960s cast iron at 72 m of head and is the genuine problem. The dashboard
 * should be able to tell those two apart.
 */
export const dmaProfiles: DmaProfile[] = [
  { dmaId: 'dma-central', litresPerCapitaPerDay: 190, nonDomesticKlDay: 980, baseLeakageKlh: 58, meterInaccuracyRate: 0.07, unauthorisedRate: 0.04 },
  { dmaId: 'dma-kgotso', litresPerCapitaPerDay: 148, nonDomesticKlDay: 210, baseLeakageKlh: 74, meterInaccuracyRate: 0.09, unauthorisedRate: 0.11 },
  { dmaId: 'dma-lehae', litresPerCapitaPerDay: 132, nonDomesticKlDay: 85, baseLeakageKlh: 21, meterInaccuracyRate: 0.04, unauthorisedRate: 0.06 },
  { dmaId: 'dma-riverbend', litresPerCapitaPerDay: 295, nonDomesticKlDay: 40, baseLeakageKlh: 11, meterInaccuracyRate: 0.03, unauthorisedRate: 0.01 },
  { dmaId: 'dma-northfields', litresPerCapitaPerDay: 110, nonDomesticKlDay: 1240, baseLeakageKlh: 26, meterInaccuracyRate: 0.06, unauthorisedRate: 0.02 },
  { dmaId: 'dma-motswedi', litresPerCapitaPerDay: 165, nonDomesticKlDay: 260, baseLeakageKlh: 58, meterInaccuracyRate: 0.07, unauthorisedRate: 0.05 },
  { dmaId: 'dma-ridgehaven', litresPerCapitaPerDay: 238, nonDomesticKlDay: 150, baseLeakageKlh: 16, meterInaccuracyRate: 0.04, unauthorisedRate: 0.02 },
  { dmaId: 'dma-tshepo', litresPerCapitaPerDay: 62, nonDomesticKlDay: 15, baseLeakageKlh: 9, meterInaccuracyRate: 0.05, unauthorisedRate: 0.09 },
  { dmaId: 'dma-eastbank', litresPerCapitaPerDay: 178, nonDomesticKlDay: 320, baseLeakageKlh: 47, meterInaccuracyRate: 0.08, unauthorisedRate: 0.06 },
  { dmaId: 'dma-waterfall', litresPerCapitaPerDay: 268, nonDomesticKlDay: 30, baseLeakageKlh: 14, meterInaccuracyRate: 0.03, unauthorisedRate: 0.01 },
];

/**
 * Default assumptions.
 *
 * The bulk water cost is an order-of-magnitude figure for potable water bought
 * from a water board and is user-editable, because it is the number that
 * converts every volume on the dashboard into an argument a finance committee
 * will actually respond to.
 *
 * The Night-Day Factor is set to 21 rather than the round 24. Leakage at 03:00
 * runs above its daily average because pressure peaks when demand does not, so
 * scaling the night rate by a full 24 hours overstates the day. 21 is inside
 * the accepted 20-24 band and is what makes the estimate land on the truth for
 * this network; a real utility would derive it from its own pressure record.
 */
export const defaultAssumptions: Assumptions = {
  bulkWaterCostRandPerKl: 14.5,
  legitimateNightUseLPerConnPerHour: 1.7,
  nightDayFactor: 21,
};

export const getDma = (id: string) => dmas.find((d) => d.id === id);
export const getProfile = (id: string) => dmaProfiles.find((p) => p.dmaId === id);
export const getReservoir = (id: string) => reservoirs.find((r) => r.id === id);
