import { Link } from 'react-router-dom';
import { ArrowUpRight, ExternalLink } from 'lucide-react';
import { national, provinces } from '../data/dws/regions';
import { householdsSuppliedForAYear, randValueOfMm3, toEngineBalance } from '../data/dws/adapt';
import { useNetwork } from '../state/network-context';
import { BENCHMARKS } from '../engine';
import { Meter, Panel, Stat } from '../components/ui';
import { BalanceBar } from '../components/charts';
import { formatNumber, formatPct, formatRand } from '../lib/format';

/**
 * The national picture, from the published balance.
 *
 * Everything here is the Department of Water and Sanitation's own 2021/22
 * figures run through this project's engine — no modelling, no estimation.
 */
export default function National() {
  const { assumptions } = useNetwork();
  const balance = toEngineBalance(national);
  const lossValue = randValueOfMm3(national.realLossesMm3, assumptions.bulkWaterCostRandPerKl);
  const nrwValue = randValueOfMm3(national.nonRevenueWaterMm3, assumptions.bulkWaterCostRandPerKl);
  const households = householdsSuppliedForAYear(national.realLossesMm3);

  const ranked = [...provinces].sort(
    (a, b) =>
      b.nonRevenueWaterMm3 / b.sivMm3 - a.nonRevenueWaterMm3 / a.sivMm3,
  );
  const worstIli = Math.max(...provinces.map((p) => p.ili));

  // The comparison below is the clearest illustration of why ILI exists, so it
  // reads from the data rather than repeating figures that could drift out of
  // step with the table above it.
  const withPct = (name: string) => {
    const p = provinces.find((x) => x.region === name)!;
    return { ...p, nrwPct: (p.nonRevenueWaterMm3 / p.sivMm3) * 100 };
  };
  const lp = withPct('Limpopo');
  const gt = withPct('Gauteng');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">
          South Africa, 2021/22
        </h1>
        <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-silt-400">
          The national water balance as published by the Department of Water and Sanitation,
          run through this project's engine. Nearly half the drinking water the country
          treats and pumps is never paid for, and most of that never reaches anybody at all.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Panel>
          <Stat
            label="Non-revenue water"
            value={formatPct(balance.nonRevenueWaterPct)}
            size="lg"
            tone="loss"
            hint={
              <>
                {formatNumber(national.nonRevenueWaterMm3)} million m³ a year, against a
                global average nearer {formatPct(BENCHMARKS.globalAverageNrwPct, 0)}.
              </>
            }
          />
        </Panel>
        <Panel>
          <Stat
            label="Real losses"
            value={formatNumber(national.realLossesMm3)}
            unit="Mm³ / yr"
            size="lg"
            tone="loss"
            hint={
              <>
                Water that never reached a customer — enough to supply{' '}
                <span className="text-silt-300">
                  {formatNumber(households / 1_000_000, 1)} million households
                </span>{' '}
                for a year.
              </>
            }
          />
        </Panel>
        <Panel>
          <Stat
            label="Value of the leak"
            value={formatRand(lossValue)}
            unit="/ yr"
            size="lg"
            tone="loss"
            hint={
              <>
                At {formatRand(assumptions.bulkWaterCostRandPerKl, { compact: false, decimals: 2 })} per
                kilolitre. All non-revenue water is worth {formatRand(nrwValue)}.
              </>
            }
          />
        </Panel>
        <Panel>
          <Stat
            label="Infrastructure Leakage Index"
            value={formatNumber(national.ili, 1)}
            size="lg"
            tone="warn"
            hint={
              <>
                {national.carlM3PerKmPerDay} m³ lost per km of mains per day, at{' '}
                {national.litresPerCapitaPerDay} l/person/day consumed — against a world
                average near {BENCHMARKS.worldLitresPerCapitaPerDay}.
              </>
            }
          />
        </Panel>
      </div>

      <Panel
        title="National IWA water balance"
        subtitle="Department of Water and Sanitation, No Drop Watch Report, 2021/22 · million m³ per year"
      >
        <BalanceBar balance={balance} />
      </Panel>

      <Panel
        title="Provinces by non-revenue water"
        subtitle="The percentage and the index disagree, and the index is the one to trust"
      >
        <div className="hidden px-5 py-2.5 md:grid md:grid-cols-[1.6fr_1fr_1fr_1.2fr_0.9fr] md:gap-4 md:border-b md:border-white/[0.06]">
          {['Province', 'Non-revenue', 'Real losses', 'ILI', 'l/p/d'].map((h) => (
            <span key={h} className="meter-label">
              {h}
            </span>
          ))}
        </div>

        {ranked.map((p) => {
          const nrwPct = (p.nonRevenueWaterMm3 / p.sivMm3) * 100;
          return (
            <Link
              key={p.region}
              to={`/provinces/${encodeURIComponent(p.region)}`}
              className="data-row grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_1.2fr_0.9fr]"
            >
              <p className="col-span-2 flex items-center gap-2 font-medium text-white md:col-span-1">
                {p.region}
                <ArrowUpRight className="h-3.5 w-3.5 text-silt-600" aria-hidden="true" />
              </p>

              <div>
                <p className="readout text-[13px] text-loss-300">{formatPct(nrwPct, 1)}</p>
                <p className="text-[11px] text-silt-500">
                  {formatNumber(p.nonRevenueWaterMm3)} Mm³
                </p>
              </div>

              <p className="readout text-[13px]">
                {formatNumber(p.realLossesMm3)}
                <span className="ml-1 font-normal text-silt-600">Mm³</span>
              </p>

              <div className="flex items-center gap-3">
                <span className="readout w-8 shrink-0 text-[13px]">
                  {formatNumber(p.ili, 1)}
                </span>
                <Meter
                  value={p.ili}
                  max={worstIli}
                  tone={p.ili > 7 ? 'loss' : p.ili > 4 ? 'warn' : 'good'}
                />
              </div>

              <p className="readout text-[13px]">{p.litresPerCapitaPerDay}</p>
            </Link>
          );
        })}
      </Panel>

      <Panel title="What the ranking hides" subtitle="Why this dashboard leads with the index">
        <div className="space-y-3 px-5 py-5 text-[12px] leading-relaxed text-silt-400">
          <p>
            Limpopo loses a larger share of its water than Gauteng —{' '}
            <span className="text-loss-300">{formatPct(lp.nrwPct)}</span> against{' '}
            <span className="text-loss-300">{formatPct(gt.nrwPct)}</span> — and on that
            number alone it looks like the worse-run province. It is not. Limpopo's
            Infrastructure Leakage Index is{' '}
            <span className="text-silt-200">{formatNumber(lp.ili, 1)}</span> against
            Gauteng's <span className="text-silt-200">{formatNumber(gt.ili, 1)}</span>:
            relative to the network it has to keep watertight, Limpopo leaks materially less.
          </p>
          <p>
            The difference is consumption. Gauteng uses {gt.litresPerCapitaPerDay} litres per
            person per day and Limpopo {lp.litresPerCapitaPerDay}, so the same leak hides
            inside a bigger denominator on the Highveld. A percentage measures loss against
            demand; the index measures it against pipe length, connection count and pressure
            — the things that actually determine how much a network leaks.
          </p>
          <p className="text-silt-500">
            This matters for where money goes. Ranked by percentage, the provinces that serve
            the poorest and most sparsely connected populations look worst and attract the
            intervention. Ranked by index, the money follows the leaks.
          </p>
        </div>
      </Panel>

      <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-silt-500">
        <span>Source:</span>
        <a
          href="https://ws.dws.gov.za/iris/releases/NDWR.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-flow-300 underline underline-offset-4 hover:text-flow-200"
        >
          DWS No Drop Watch Report
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
        <a
          href="https://ws.dws.gov.za/iris/releases/ND_2023_Report.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-flow-300 underline underline-offset-4 hover:text-flow-200"
        >
          DWS 2023 No Drop Report
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </p>
    </div>
  );
}
