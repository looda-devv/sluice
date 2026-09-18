import { useState } from 'react';
import { useNetwork } from '../state/network-context';
import { BENCHMARKS } from '../engine';
import { Panel, Stat } from '../components/ui';
import { BalanceBar } from '../components/charts';
import { formatPct, formatRand, formatVolume } from '../lib/format';
import { ModelledNotice } from '../components/ModelledNotice';

/**
 * The municipal water balance, and the same balance per zone.
 *
 * The split that earns its place here is apparent versus real losses. Both are
 * non-revenue water, and a headline NRW percentage treats them as the same
 * failure — but they are not, and they are not even worth the same money.
 * Apparent losses are water somebody drank and nobody paid for: it is a
 * billing and enforcement problem, and it is lost at the retail tariff. Real
 * losses never reached a customer at all: that is a pipes problem, valued at
 * what it cost to treat and pump. Send the wrong crew and you spend a year
 * excavating a revenue collection failure.
 */
export default function Balance() {
  const { municipalBalance, zones, assumptions } = useNetwork();
  const [selectedId, setSelectedId] = useState<string>('all');

  const selected = zones.find((z) => z.dma.id === selectedId);
  const balance = selected ? selected.balance : municipalBalance;

  // Real losses are valued at what it cost to produce the water; apparent
  // losses at roughly what it would have been billed for. The retail multiple
  // is deliberately conservative — municipal tariffs are steeply blocked, and
  // the top block runs far above this.
  const RETAIL_MULTIPLE = 2.4;
  const realLossValue = balance.realLossesKl * assumptions.bulkWaterCostRandPerKl;
  const apparentLossValue =
    balance.apparentLossesKl * assumptions.bulkWaterCostRandPerKl * RETAIL_MULTIPLE;

  return (
    <div className="space-y-6">
      <ModelledNotice />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Water balance</h1>
          <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-silt-400">
            The IWA standard balance for the last fourteen days. Every kilolitre that
            entered the system lands in exactly one bucket, and the buckets have to sum to
            what the bulk meters measured — which is what makes the real-losses figure a
            residual, and only ever as trustworthy as the meters above it.
          </p>
        </div>

        <label className="flex items-center gap-2.5">
          <span className="meter-label">Scope</span>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="field w-56 cursor-pointer"
          >
            <option value="all">Whole municipality</option>
            {zones.map((z) => (
              <option key={z.dma.id} value={z.dma.id}>
                {z.dma.code} — {z.dma.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Panel
        title={selected ? `${selected.dma.name} — balance` : 'Municipal balance'}
        subtitle="Drawn to scale, because a nested table hides the proportions"
      >
        <BalanceBar balance={balance} />
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Panel>
          <Stat
            label="Non-revenue water"
            value={formatPct(balance.nonRevenueWaterPct)}
            tone="loss"
            hint={`${formatVolume(balance.nonRevenueWaterKl)} over the period`}
          />
        </Panel>
        <Panel>
          <Stat
            label="Real losses"
            value={formatPct(balance.realLossesPct)}
            tone="loss"
            hint={
              <>
                {formatRand(realLossValue)} at the bulk water cost — a pipes problem, and
                the one a repair crew can fix.
              </>
            }
          />
        </Panel>
        <Panel>
          <Stat
            label="Apparent losses"
            value={formatPct(balance.apparentLossesPct)}
            tone="warn"
            hint={
              <>
                Roughly {formatRand(apparentLossValue)} of foregone revenue — meters and
                enforcement, not excavation.
              </>
            }
          />
        </Panel>
        <Panel>
          <Stat
            label="Revenue water"
            value={formatPct(100 - balance.nonRevenueWaterPct)}
            tone="flow"
            hint={`${formatVolume(balance.revenueWaterKl)} actually invoiced`}
          />
        </Panel>
      </div>

      <Panel
        title="Against the national picture"
        subtitle="Department of Water and Sanitation, No Drop assessment"
      >
        <div className="space-y-3 px-5 py-5">
          {[
            {
              label: selected ? selected.dma.name : 'Thuso Metro',
              value: balance.nonRevenueWaterPct,
              tone: 'bg-loss-400',
            },
            {
              label: 'South Africa, national average',
              value: BENCHMARKS.saNationalNrwPct,
              tone: 'bg-amber-400',
            },
            { label: 'Global average', value: BENCHMARKS.globalAverageNrwPct, tone: 'bg-flow-400' },
            { label: 'Well-run system', value: BENCHMARKS.targetNrwPct, tone: 'bg-emerald-400' },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-4">
              <span className="w-52 shrink-0 text-[12px] text-silt-300">{row.label}</span>
              <div className="h-5 flex-1 overflow-hidden rounded bg-white/[0.05]">
                <div
                  className={`h-full ${row.tone} transition-[width] duration-700 ease-out`}
                  style={{ width: `${Math.min(100, (row.value / 60) * 100)}%` }}
                />
              </div>
              <span className="readout w-14 shrink-0 text-right text-[12px]">
                {formatPct(row.value, 0)}
              </span>
            </div>
          ))}
          <p className="pt-2 text-[11px] leading-relaxed text-silt-500">
            South Africa also uses more water per person than it can justify — around{' '}
            {BENCHMARKS.saLitresPerCapitaPerDay} litres per person per day against a world
            average near {BENCHMARKS.worldLitresPerCapitaPerDay}. A large part of that gap
            is not consumption at all. It is this chart.
          </p>
        </div>
      </Panel>
    </div>
  );
}
