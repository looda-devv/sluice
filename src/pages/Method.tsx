import { RotateCcw } from 'lucide-react';
import { useNetwork } from '../state/network-context';
import { INTERVENTION_COSTS, MNF_WINDOW_HOURS } from '../engine';
import { Panel } from '../components/ui';
import { formatNumber } from '../lib/format';
import type { Assumptions } from '../types';

/**
 * What the dashboard assumes, and where each number comes from.
 *
 * Every figure elsewhere in this project is derived from the three inputs on
 * this page. Burying them would make the outputs look more certain than they
 * are — the leakage estimate in particular swings by a fifth across the
 * accepted range of the Night-Day Factor alone. Making them editable is the
 * honest version: change one, and watch the whole dashboard move.
 */

const FIELDS: {
  key: keyof Assumptions;
  label: string;
  unit: string;
  step: number;
  min: number;
  max: number;
  note: string;
}[] = [
  {
    key: 'bulkWaterCostRandPerKl',
    label: 'Bulk water cost',
    unit: 'R / kL',
    step: 0.5,
    min: 1,
    max: 60,
    note:
      'What the municipality pays a water board per kilolitre. This is the number that ' +
      'turns a volume into an argument a finance committee will respond to.',
  },
  {
    key: 'legitimateNightUseLPerConnPerHour',
    label: 'Legitimate night use',
    unit: 'l / conn / h',
    step: 0.1,
    min: 0,
    max: 10,
    note:
      'Genuine consumption during the night window — the IWA domestic default is 1.7. ' +
      'Set it too low and ordinary use is booked as leakage; too high and real leaks ' +
      'disappear into the allowance.',
  },
  {
    key: 'nightDayFactor',
    label: 'Night-Day Factor',
    unit: 'h / day',
    step: 0.5,
    min: 12,
    max: 24,
    note:
      'Hours-per-day equivalent used to scale the night leakage rate to a daily volume. ' +
      'Below 24 because leakage falls with daytime pressure. The accepted range is 20-24, ' +
      'and a utility would derive its own from its pressure record.',
  },
];

export default function Method() {
  const { assumptions, setAssumptions, resetAssumptions } = useNetwork();

  const window = `${String(MNF_WINDOW_HOURS[0]).padStart(2, '0')}:00–${String(
    MNF_WINDOW_HOURS[MNF_WINDOW_HOURS.length - 1] + 1,
  ).padStart(2, '0')}:00`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">Method</h1>
        <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-silt-400">
          Three inputs drive every figure in this dashboard. They are editable here rather
          than buried, because the outputs are considerably less certain than a dashboard
          usually admits — the leakage estimate alone swings by a fifth across the accepted
          range of the Night-Day Factor.
        </p>
      </div>

      <Panel
        title="Assumptions"
        subtitle="Changes apply immediately and are kept in this browser"
        action={
          <button type="button" onClick={resetAssumptions} className="btn-ghost">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset
          </button>
        }
      >
        <div className="divide-y divide-white/[0.05]">
          {FIELDS.map((field) => (
            <div key={field.key} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <label
                  htmlFor={field.key}
                  className="text-[13px] font-medium text-white"
                >
                  {field.label}
                </label>
                <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-silt-500">
                  {field.note}
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <input
                  id={field.key}
                  type="number"
                  value={assumptions[field.key]}
                  step={field.step}
                  min={field.min}
                  max={field.max}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (Number.isNaN(next)) return;
                    setAssumptions({
                      ...assumptions,
                      [field.key]: Math.min(field.max, Math.max(field.min, next)),
                    });
                  }}
                  className="field w-28 text-right"
                />
                <span className="w-20 font-mono text-[10px] text-silt-500">
                  {field.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Minimum night flow" subtitle="How a leak is measured without digging">
          <div className="space-y-3 px-5 py-5 text-[12px] leading-relaxed text-silt-400">
            <p>
              Between {window} almost nobody uses water, so most of what still moves
              through the bulk meter is running into the ground. Subtract an allowance for
              the people genuinely awake, and the remainder is the zone's leakage rate.
            </p>
            <Formula>
              net night flow = minimum night flow − (connections × allowance)
            </Formula>
            <Formula>daily leakage = net night flow × Night-Day Factor</Formula>
            <p>
              The second line is where the judgement sits. Scaling by a flat 24 hours
              overstates the day, because leakage is pressure-driven and pressure sags
              under daytime demand — a leak passes less water at noon than at 03:00.
            </p>
            <p className="text-silt-500">
              The method assumes a zone that goes quiet at night. Where it does not — an
              industrial area whose demand collapses at knock-off instead — the analysis
              flags the zone rather than reporting a number that is quietly wrong.
            </p>
          </div>
        </Panel>

        <Panel title="Infrastructure Leakage Index" subtitle="Comparing zones fairly">
          <div className="space-y-3 px-5 py-5 text-[12px] leading-relaxed text-silt-400">
            <p>
              Ranking zones by percentage of water lost quietly punishes whoever serves the
              poorest area: where people use very little, a modest leak looks catastrophic,
              while the same leak hides inside a wealthy suburb's larger denominator.
            </p>
            <p>
              The ILI compares a zone's real losses against what that zone would still lose
              if it were run to a technical ideal — a function of pipe length, connection
              count and pressure, not of consumption.
            </p>
            <Formula>UARL = (18·Lm + 0.8·Nc + 25·Lp) × P</Formula>
            <Formula>ILI = current real losses ÷ UARL</Formula>
            <dl className="grid gap-1.5 pt-1">
              {[
                ['A', '1–4', 'Further reduction may be uneconomic'],
                ['B', '4–8', 'Potential for marked improvement'],
                ['C', '8–16', 'Poor — tolerable only where water is cheap'],
                ['D', 'over 16', 'Very inefficient; urgent programme warranted'],
              ].map(([band, range, meaning]) => (
                <div key={band} className="flex items-baseline gap-3">
                  <dt className={`chip band-${band} shrink-0`}>{band}</dt>
                  <dd className="text-[11px] text-silt-500">
                    <span className="font-mono text-silt-300">{range}</span> — {meaning}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-[11px] text-silt-500">
              World Bank Institute banding for developing countries, which is deliberately
              more forgiving than the developed-country scale.
            </p>
          </div>
        </Panel>

        <Panel title="Intervention costing" subtitle="Planning figures, not quotes">
          <div className="space-y-3 px-5 py-5 text-[12px] leading-relaxed text-silt-400">
            <p>
              The repair queue prices a step-test and survey campaign so zones can be
              ranked against one another consistently. A real programme would price each
              zone properly.
            </p>
            <dl className="space-y-1.5 pt-1">
              {[
                ['Mobilisation', `R ${formatNumber(INTERVENTION_COSTS.mobilisationRand)}`, 'crew, detection equipment, traffic accommodation'],
                ['Per km of mains surveyed', `R ${formatNumber(INTERVENTION_COSTS.perKmMainsSurveyedRand)}`, 'acoustic survey and repair of what it finds'],
                ['Per connection', `R ${formatNumber(INTERVENTION_COSTS.perConnectionRand)}`, 'meter audit and replacement of the worst'],
              ].map(([label, value, note]) => (
                <div key={label} className="flex items-baseline justify-between gap-4">
                  <dt className="min-w-0">
                    <span className="text-silt-300">{label}</span>
                    <span className="block text-[11px] text-silt-500">{note}</span>
                  </dt>
                  <dd className="readout shrink-0 text-[12px]">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Panel>

        <Panel title="About the data" subtitle="What is real here and what is not">
          <div className="space-y-3 px-5 py-5 text-[12px] leading-relaxed text-silt-400">
            <p>
              <span className="text-silt-200">Thuso Metropolitan Municipality does not exist.</span>{' '}
              Every meter reading, billing figure and reservoir level in this dashboard is
              generated from a fixed seed, so the network is identical on every load.
            </p>
            <p>
              What is not invented is the shape of it. The zones span the range a real
              South African metro contains — 1960s cast iron under a CBD at 72 m of head,
              post-2010 subsidised housing, an informal settlement on standpipes, an
              industrial park — and the losses are scaled so the municipality lands in the
              range the metros actually report, against a national figure near 47%.
            </p>
            <p>
              The generator injects a leak of a known size into each zone and hides it
              inside a realistic demand curve. The test suite then asserts that the night
              flow analysis finds it again, within 12%. That check is only possible because
              the data is synthetic — on a real network nobody knows the true leakage,
              which is precisely why the method exists.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded border border-white/[0.07] bg-abyss-800/70 px-3.5 py-2.5 font-mono text-[11px] text-flow-200">
      {children}
    </p>
  );
}
