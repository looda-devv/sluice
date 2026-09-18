/**
 * Domain types for Sluice.
 *
 * Units are stated on every field and never mixed: volumes are in kilolitres
 * (kL = m³, the unit South African municipal bills and bulk meters use),
 * instantaneous flow is in kL/h, pressure is in metres of head (m), and money
 * is in rand. Anything that departs from that says so in its name.
 */

/** A District Metered Area: a hydraulically discrete zone fed by one bulk meter. */
export interface Dma {
  id: string;
  name: string;
  /** Municipality-facing zone code, as it would appear on a telemetry panel. */
  code: string;
  /** Suburb / area description, for the humans reading the report. */
  area: string;
  /** Number of billed service connections in the zone. */
  connections: number;
  /** Resident population served (used for per-capita consumption). */
  population: number;
  /** Total length of distribution mains, km. */
  mainsLengthKm: number;
  /**
   * Mean length of private pipework between the property boundary and the
   * customer meter, metres per connection. Feeds the UARL calculation.
   */
  privatePipeMetresPerConnection: number;
  /** Average zone pressure, metres of head. */
  averagePressureM: number;
  /** Year the bulk of the reticulation was laid — a proxy for asset condition. */
  infrastructureYear: number;
  /** Reservoir this DMA draws from. */
  reservoirId: string;
}

/** One hour of bulk-inlet telemetry for a DMA. */
export interface FlowReading {
  /** Hour of day, 0-23. */
  hour: number;
  /** Measured inflow through the bulk meter, kL/h. */
  inflowKlh: number;
  /** Zone pressure at the average zone point, metres. */
  pressureM: number;
}

/** A day of telemetry for one DMA. */
export interface DmaDay {
  dmaId: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  readings: FlowReading[];
}

/** Billing and authorised-use figures for a DMA over a reporting month. */
export interface BillingRecord {
  dmaId: string;
  /** Billing period, YYYY-MM. */
  period: string;
  /** Metered consumption actually invoiced, kL. */
  billedMeteredKl: number;
  /** Authorised use that is billed but not metered (e.g. flat-rate), kL. */
  billedUnmeteredKl: number;
  /** Authorised use that is metered but not billed (e.g. municipal buildings), kL. */
  unbilledMeteredKl: number;
  /** Authorised use neither metered nor billed (firefighting, mains flushing), kL. */
  unbilledUnmeteredKl: number;
  /** Estimated unauthorised consumption — illegal connections, tampering, kL. */
  unauthorisedKl: number;
  /** Estimated loss to customer meter under-registration and data handling, kL. */
  meterInaccuracyKl: number;
}

/** A service reservoir feeding one or more DMAs. */
export interface Reservoir {
  id: string;
  name: string;
  /** Full supply capacity, kL. */
  capacityKl: number;
  /** Current stored volume, kL. */
  currentVolumeKl: number;
  /** Contracted bulk inflow from the water board, kL/day. */
  bulkInflowKlDay: number;
  /**
   * Level below which the reservoir can no longer maintain system pressure —
   * the point at which taps in the high-lying parts of the zone run dry.
   */
  criticalLevelPct: number;
}

/** A logged intervention against a DMA. */
export interface Repair {
  id: string;
  dmaId: string;
  /** ISO date the work was completed. */
  date: string;
  type: RepairType;
  /** Cost of the intervention, rand. */
  costRand: number;
  /** Measured reduction in minimum night flow after the work, kL/h. */
  mnfReductionKlh: number;
  note: string;
}

export type RepairType =
  | 'Mains burst'
  | 'Service connection leak'
  | 'Pressure management'
  | 'Meter replacement'
  | 'Illegal connection removal'
  | 'Reservoir overflow control';

/** Tariff and cost assumptions, editable by the user. */
export interface Assumptions {
  /** Cost of bulk potable water, rand per kL. */
  bulkWaterCostRandPerKl: number;
  /**
   * Legitimate night use allowance, litres per connection per hour. The IWA
   * default is 1.7 l/conn/h for domestic use during the 02:00-04:00 window.
   */
  legitimateNightUseLPerConnPerHour: number;
  /**
   * Night-Day Factor: hours-per-day equivalent used to scale an hourly night
   * leakage rate to a daily volume. Lower than 24 because leakage falls with
   * daytime pressure drop. Typical range 20-24.
   */
  nightDayFactor: number;
}
