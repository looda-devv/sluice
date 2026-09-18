import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, Plus, Trash2, Wrench } from 'lucide-react';
import { useNetwork } from '../state/network-context';
import { buildPriorityQueue } from '../engine';
import { BandChip, Empty, Panel, Stat } from '../components/ui';
import { formatDate, formatNumber, formatRand, formatVolume } from '../lib/format';
import type { RepairType } from '../types';
import { ModelledNotice } from '../components/ModelledNotice';

const REPAIR_TYPES: RepairType[] = [
  'Mains burst',
  'Service connection leak',
  'Pressure management',
  'Meter replacement',
  'Illegal connection removal',
  'Reservoir overflow control',
];

/**
 * Which zone the crew goes to on Monday.
 *
 * Ranked by payback rather than by volume lost, which reorders the list
 * substantially. A large zone can leak a great deal and still sit close to its
 * unavoidable minimum — there is nothing left in it to find — while a small
 * zone at ILI 12 is full of leaks a crew could walk onto in a morning, and
 * costs a fraction as much to survey.
 */
export default function Queue() {
  const { zones, assumptions, repairs, addRepair, removeRepair } = useNetwork();
  const [showForm, setShowForm] = useState(false);

  const queue = useMemo(
    () =>
      buildPriorityQueue(
        zones.map((z) => z.dma),
        Object.fromEntries(zones.map((z) => [z.dma.id, z.effectiveLeakageKlDay])),
        assumptions,
      ),
    [zones, assumptions],
  );

  /**
   * A zone whose night-flow reading is unreliable produces an unreliable rank.
   * The caveat is raised during the analysis, and it has to travel with the
   * number — a queue that quietly sorts an industrial zone to the top on an
   * overstated leak sends a crew to the wrong place.
   */
  const caveatFor = (dmaId: string) =>
    zones.find((z) => z.dma.id === dmaId)?.nightFlow.windowCaveat ?? null;

  const actionable = queue.filter((e) => e.paybackMonths !== null);
  const flagged = queue.filter((e) => caveatFor(e.dma.id));
  const programmeCost = actionable.reduce((s, e) => s + e.interventionCostRand, 0);
  const programmeReturn = actionable.reduce((s, e) => s + e.annualRecoverableRand, 0);
  const recoverableVolume = actionable.reduce((s, e) => s + e.recoverableKlDay, 0);

  return (
    <div className="space-y-6">
      <ModelledNotice />

      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">Repair queue</h1>
        <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-silt-400">
          Ordered by payback, not by volume. What matters is the loss sitting{' '}
          <em className="not-italic text-silt-300">above</em> a realistic target — the part
          a crew can actually recover — valued against what it costs to go and find it.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Panel>
          <Stat
            label="Programme cost"
            value={formatRand(programmeCost)}
            hint={`${actionable.length} zones worth intervening in`}
          />
        </Panel>
        <Panel>
          <Stat
            label="Annual return"
            value={formatRand(programmeReturn)}
            tone="good"
            hint={`${formatVolume(recoverableVolume)}/day of recoverable water`}
          />
        </Panel>
        <Panel>
          <Stat
            label="Programme payback"
            value={
              programmeReturn > 0
                ? `${formatNumber((programmeCost / programmeReturn) * 12, 1)} months`
                : '—'
            }
            tone="good"
            hint="Before any water is augmented from a new source"
          />
        </Panel>
      </div>

      {flagged.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"
            aria-hidden="true"
          />
          <p className="text-[12px] leading-relaxed text-amber-100/90">
            <span className="font-medium">Ranking caveat: </span>
            {flagged.map((e) => e.dma.code).join(', ')} sit
            {flagged.length === 1 ? 's' : ''} in this queue on a night-flow reading the
            analysis has flagged as probably overstated. Confirm with a step test before
            committing a crew — the position may not be earned.
          </p>
        </div>
      )}

      <Panel
        title="Priority order"
        subtitle="Cheapest recovery first"
      >
        <div className="hidden px-5 py-2.5 lg:grid lg:grid-cols-[0.3fr_2fr_0.8fr_1fr_1fr_0.9fr] lg:gap-4 lg:border-b lg:border-white/[0.06]">
          {['#', 'Zone and recommended action', 'ILI', 'Recoverable', 'Cost', 'Payback'].map(
            (h) => (
              <span key={h} className="meter-label">
                {h}
              </span>
            ),
          )}
        </div>

        {queue.map((entry) => (
          <div
            key={entry.dma.id}
            className="data-row lg:grid-cols-[0.3fr_2fr_0.8fr_1fr_1fr_0.9fr]"
          >
            <span className="readout text-[13px] text-silt-500">
              {entry.paybackMonths === null ? '—' : entry.rank}
            </span>

            <div className="min-w-0">
              <Link
                to={`/leak-detection/zones/${entry.dma.id}`}
                className="font-medium text-white transition-colors hover:text-flow-200"
              >
                <span className="mr-2 font-mono text-[11px] text-flow-300">
                  {entry.dma.code}
                </span>
                {entry.dma.name}
              </Link>
              <p className="mt-0.5 text-[11px] leading-relaxed text-silt-500">
                {entry.recommendedAction}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="readout text-[13px]">{formatNumber(entry.ili.ili, 1)}</span>
              <BandChip band={entry.ili.band} />
              {caveatFor(entry.dma.id) && (
                <span
                  title={caveatFor(entry.dma.id)!.message}
                  className="text-amber-300"
                  aria-label="Leakage estimate may be overstated for this zone"
                >
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              )}
            </div>

            <div>
              <p className="readout text-[13px] text-flow-200">
                {formatVolume(entry.recoverableKlDay)}
                <span className="ml-1 font-normal text-silt-600">/d</span>
              </p>
              <p className="text-[11px] text-silt-500">
                {formatRand(entry.annualRecoverableRand)}/yr
              </p>
            </div>

            <p className="readout text-[13px]">{formatRand(entry.interventionCostRand)}</p>

            <p
              className={`readout text-[13px] ${
                entry.paybackMonths === null
                  ? 'text-silt-600'
                  : entry.paybackMonths < 12
                    ? 'text-emerald-300'
                    : 'text-amber-300'
              }`}
            >
              {entry.paybackMonths === null
                ? 'no case'
                : `${formatNumber(entry.paybackMonths, 1)} mo`}
            </p>
          </div>
        ))}
      </Panel>

      <Panel
        title="Completed work"
        subtitle="Logged repairs are credited against the zone's night flow"
        action={
          <button type="button" onClick={() => setShowForm((v) => !v)} className="btn-ghost">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Log a repair
          </button>
        }
      >
        {showForm && <RepairForm onDone={() => setShowForm(false)} onSubmit={addRepair} />}

        {repairs.length === 0 ? (
          <Empty>
            Nothing logged yet. Record a completed repair and the zone's leakage, ILI and
            cost figures will move to match — which is how the work gets verified in the
            field: re-run the step test, and see how far the night flow dropped.
          </Empty>
        ) : (
          repairs.map((repair) => {
            const zone = zones.find((z) => z.dma.id === repair.dmaId);
            return (
              <div
                key={repair.id}
                className="data-row grid-cols-[auto_1fr_auto] md:grid-cols-[auto_2fr_1fr_1fr_auto]"
              >
                <span className="grid h-7 w-7 place-items-center rounded-md border border-emerald-400/25 bg-emerald-400/10">
                  <Check className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
                </span>

                <div className="min-w-0">
                  <p className="font-medium text-white">{repair.type}</p>
                  <p className="mt-0.5 truncate text-[11px] text-silt-500">
                    {zone?.dma.code ?? repair.dmaId} · {formatDate(repair.date)}
                    {repair.note && ` · ${repair.note}`}
                  </p>
                </div>

                <p className="readout text-[13px] text-emerald-300">
                  −{formatNumber(repair.mnfReductionKlh, 1)} kL/h
                  <span className="block text-[10px] font-normal text-silt-500">
                    {formatVolume(repair.mnfReductionKlh * 24)}/day recovered
                  </span>
                </p>

                <p className="readout hidden text-[13px] md:block">
                  {formatRand(repair.costRand)}
                </p>

                <button
                  type="button"
                  onClick={() => removeRepair(repair.id)}
                  aria-label={`Remove ${repair.type} at ${zone?.dma.code ?? repair.dmaId}`}
                  className="text-silt-600 transition-colors hover:text-loss-400"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            );
          })
        )}
      </Panel>
    </div>
  );
}

function RepairForm({
  onSubmit,
  onDone,
}: {
  onSubmit: ReturnType<typeof useNetwork>['addRepair'];
  onDone: () => void;
}) {
  const { zones } = useNetwork();
  const [dmaId, setDmaId] = useState(zones[0]?.dma.id ?? '');
  const [type, setType] = useState<RepairType>(REPAIR_TYPES[0]);
  const [mnfReduction, setMnfReduction] = useState('2.5');
  const [cost, setCost] = useState('18000');
  const [note, setNote] = useState('');

  const reduction = Number(mnfReduction);
  const zone = zones.find((z) => z.dma.id === dmaId);
  // A repair cannot recover more than the zone was losing in the first place;
  // accepting a larger figure would drive the night flow negative.
  const ceiling = zone?.nightFlow.netNightFlowKlh ?? 0;
  const tooLarge = reduction > ceiling;
  const valid = dmaId && reduction > 0 && !tooLarge && Number(cost) >= 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSubmit({
          dmaId,
          type,
          date: new Date().toISOString().slice(0, 10),
          costRand: Number(cost),
          mnfReductionKlh: reduction,
          note: note.trim(),
        });
        onDone();
      }}
      className="grid gap-4 border-b border-white/[0.06] bg-abyss-800/40 px-5 py-5 md:grid-cols-2 xl:grid-cols-3"
    >
      <label className="block">
        <span className="meter-label">Zone</span>
        <select
          value={dmaId}
          onChange={(e) => setDmaId(e.target.value)}
          className="field mt-1.5 cursor-pointer"
        >
          {zones.map((z) => (
            <option key={z.dma.id} value={z.dma.id}>
              {z.dma.code} — {z.dma.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="meter-label">Work done</span>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as RepairType)}
          className="field mt-1.5 cursor-pointer"
        >
          {REPAIR_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="meter-label">Night flow reduction, kL/h</span>
        <input
          type="number"
          step="0.1"
          min="0"
          value={mnfReduction}
          onChange={(e) => setMnfReduction(e.target.value)}
          className="field mt-1.5"
          aria-describedby="mnf-help"
        />
        <span id="mnf-help" className="mt-1 block text-[10px] text-silt-500">
          {tooLarge
            ? `More than the zone's measured net night flow of ${formatNumber(ceiling, 1)} kL/h`
            : `Measured on the step test after the work. Zone is losing ${formatNumber(ceiling, 1)} kL/h.`}
        </span>
      </label>

      <label className="block">
        <span className="meter-label">Cost, rand</span>
        <input
          type="number"
          min="0"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          className="field mt-1.5"
        />
      </label>

      <label className="block md:col-span-2 xl:col-span-1">
        <span className="meter-label">Note</span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="150 mm AC main, corner of Voortrekker"
          className="field mt-1.5"
        />
      </label>

      <div className="flex items-end gap-2 md:col-span-2 xl:col-span-3">
        <button type="submit" disabled={!valid} className="btn-primary">
          <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
          Record repair
        </button>
        <button type="button" onClick={onDone} className="btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}
