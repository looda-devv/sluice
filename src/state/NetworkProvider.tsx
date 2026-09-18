import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  analyseNightFlow,
  buildWaterBalance,
  calculateIli,
  combineWaterBalances,
} from '../engine';
import { defaultAssumptions, dmas, dmaProfiles, reservoirs } from '../data/network';
import { generateBilling, generateTelemetry } from '../data/telemetry';
import type { Assumptions, Repair } from '../types';
import { NetworkContext, type NetworkContextValue } from './network-context';
import type { ReservoirAnalysis, ZoneAnalysis } from './types';

const TELEMETRY_DAYS = 14;
const STORAGE_KEY = 'sluice.v1';

interface PersistedState {
  assumptions: Assumptions;
  repairs: Repair[];
}

/**
 * Telemetry and billing are generated once for the life of the page.
 *
 * They are deterministic, so regenerating would produce identical data — but
 * doing it inside a render would rebuild fourteen days of readings for ten
 * zones on every keystroke in the assumptions panel.
 */
const telemetry = generateTelemetry(TELEMETRY_DAYS);
const billing = generateBilling(telemetry);

function loadPersisted(): PersistedState {
  const fallback: PersistedState = { assumptions: defaultAssumptions, repairs: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      // Merged rather than replaced, so a stored object written by an older
      // version that lacks a field still yields a complete set of assumptions.
      assumptions: { ...defaultAssumptions, ...(parsed.assumptions ?? {}) },
      repairs: Array.isArray(parsed.repairs) ? parsed.repairs : [],
    };
  } catch {
    // A private window, cleared site data, or a browser refusing storage. The
    // dashboard works fine on defaults; it just will not remember.
    return fallback;
  }
}

function persist(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* Storage is a convenience here, never a dependency. */
  }
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [persisted, setPersisted] = useState<PersistedState>(loadPersisted);
  const { assumptions, repairs } = persisted;

  const update = useCallback((next: PersistedState) => {
    setPersisted(next);
    persist(next);
  }, []);

  const setAssumptions = useCallback(
    (next: Assumptions) => update({ ...persisted, assumptions: next }),
    [persisted, update],
  );

  const resetAssumptions = useCallback(
    () => update({ ...persisted, assumptions: defaultAssumptions }),
    [persisted, update],
  );

  const addRepair = useCallback(
    (repair: Omit<Repair, 'id'>) =>
      update({
        ...persisted,
        repairs: [
          { ...repair, id: `rep-${Date.now().toString(36)}` },
          ...persisted.repairs,
        ],
      }),
    [persisted, update],
  );

  const removeRepair = useCallback(
    (id: string) =>
      update({ ...persisted, repairs: persisted.repairs.filter((r) => r.id !== id) }),
    [persisted, update],
  );

  /**
   * The whole derived model, rebuilt when the assumptions or the repair log
   * change. Everything downstream reads from here, so a zone's leakage figure
   * is computed exactly once and cannot drift between two views of it.
   */
  const zones = useMemo<ZoneAnalysis[]>(() => {
    return dmas.map((dma) => {
      const days = telemetry.filter((t) => t.dmaId === dma.id);
      const latestDay = days[days.length - 1];
      const nightFlow = analyseNightFlow(dma, latestDay.readings, assumptions);

      // A repair is credited as a permanent reduction in the zone's night flow —
      // which is exactly how it is verified in the field: re-run the step test
      // after the work and measure how far the MNF dropped.
      const repairReductionKlh = repairs
        .filter((r) => r.dmaId === dma.id)
        .reduce((sum, r) => sum + r.mnfReductionKlh, 0);

      const effectiveNetNightFlowKlh = Math.max(
        0,
        nightFlow.netNightFlowKlh - repairReductionKlh,
      );
      const effectiveLeakageKlDay = effectiveNetNightFlowKlh * assumptions.nightDayFactor;
      const repairSavingKlDay = nightFlow.dailyLeakageKl - effectiveLeakageKlDay;

      const periodInputKl = days.reduce(
        (sum, day) => sum + day.readings.reduce((s, r) => s + r.inflowKlh, 0),
        0,
      );

      const profile = dmaProfiles.find((p) => p.dmaId === dma.id);

      return {
        dma,
        latestDay,
        nightFlow,
        effectiveLeakageKlDay,
        repairSavingKlDay,
        ili: calculateIli(dma, effectiveLeakageKlDay),
        balance: buildWaterBalance(
          periodInputKl,
          billing.find((b) => b.dmaId === dma.id)!,
        ),
        dailyInputKl: nightFlow.dailyInflowKl,
        dailyLossValueRand: effectiveLeakageKlDay * assumptions.bulkWaterCostRandPerKl,
        litresPerCapitaPerDay: profile?.litresPerCapitaPerDay ?? 0,
        leakageTrend: days.map((day) => {
          const raw = analyseNightFlow(dma, day.readings, assumptions);
          return Math.max(0, raw.netNightFlowKlh - repairReductionKlh) *
            assumptions.nightDayFactor;
        }),
      };
    });
  }, [assumptions, repairs]);

  const reservoirAnalyses = useMemo<ReservoirAnalysis[]>(
    () =>
      reservoirs.map((reservoir) => {
        const fed = zones.filter((z) => z.dma.reservoirId === reservoir.id);
        return {
          reservoir,
          zones: fed,
          demandKlDay: fed.reduce((sum, z) => sum + z.dailyInputKl, 0),
          leakageKlDay: fed.reduce((sum, z) => sum + z.effectiveLeakageKlDay, 0),
        };
      }),
    [zones],
  );

  const value = useMemo<NetworkContextValue>(() => {
    const totalLeakageKlDay = zones.reduce((s, z) => s + z.effectiveLeakageKlDay, 0);
    return {
      zones,
      reservoirs: reservoirAnalyses,
      municipalBalance: combineWaterBalances(zones.map((z) => z.balance)),
      totalDailyInputKl: zones.reduce((s, z) => s + z.dailyInputKl, 0),
      totalLeakageKlDay,
      totalDailyLossRand: totalLeakageKlDay * assumptions.bulkWaterCostRandPerKl,
      repairs,
      assumptions,
      setAssumptions,
      resetAssumptions,
      addRepair,
      removeRepair,
      getZone: (dmaId: string) => zones.find((z) => z.dma.id === dmaId),
    };
  }, [
    zones,
    reservoirAnalyses,
    repairs,
    assumptions,
    setAssumptions,
    resetAssumptions,
    addRepair,
    removeRepair,
  ]);

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}
