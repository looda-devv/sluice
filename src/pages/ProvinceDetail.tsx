import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { national, provinces } from '../data/dws/regions';
import { randValueOfMm3, toEngineBalance } from '../data/dws/adapt';
import { noDropBand, wsas, type Province } from '../data/dws/wsa';
import { useNetwork } from '../state/network-context';
import { Meter, Panel, Stat } from '../components/ui';
import { BalanceBar } from '../components/charts';
import { formatNumber, formatPct, formatRand } from '../lib/format';
import { BAND_TONE } from '../components/bands';

export default function ProvinceDetail() {
  const { region = '' } = useParams();
  const { assumptions } = useNetwork();
  const province = provinces.find((p) => p.region === decodeURIComponent(region));

  if (!province) {
    return (
      <Panel>
        <p className="px-5 py-10 text-center text-[13px] text-silt-400">
          No province by that name.{' '}
          <Link to="/" className="text-flow-300 underline underline-offset-4">
            Back to the national view
          </Link>
          .
        </p>
      </Panel>
    );
  }

  const balance = toEngineBalance(province);
  const authorities = wsas.filter((w) => w.province === (province.region as Province));
  const shareOfNational = (province.sivMm3 / national.sivMm3) * 100;
  const scored = authorities.filter((w) => w.noDropScore !== null);
  const unscored = authorities.length - scored.length;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase
                     tracking-[0.16em] text-silt-500 transition-colors hover:text-flow-300"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden="true" />
          National
        </Link>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-white">
          {province.region}
        </h1>
        <p className="mt-1.5 text-[13px] text-silt-400">
          {authorities.length} water services authorities ·{' '}
          {formatPct(shareOfNational, 1)} of national system input ·{' '}
          {province.litresPerCapitaPerDay} litres per person per day
        </p>
      </div>

      {province.publishedDiscrepancy && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
          <p className="text-[12px] leading-relaxed text-amber-100/90">
            <span className="font-medium">Published balance does not close: </span>
            {province.publishedDiscrepancy} Carried through as printed rather than corrected.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Panel>
          <Stat
            label="Non-revenue water"
            value={formatPct(balance.nonRevenueWaterPct)}
            tone="loss"
            hint={`${formatNumber(province.nonRevenueWaterMm3)} Mm³ a year`}
          />
        </Panel>
        <Panel>
          <Stat
            label="Real losses"
            value={formatNumber(province.realLossesMm3)}
            unit="Mm³ / yr"
            tone="loss"
            hint={`Worth ${formatRand(
              randValueOfMm3(province.realLossesMm3, assumptions.bulkWaterCostRandPerKl),
            )} at the bulk water cost`}
          />
        </Panel>
        <Panel>
          <Stat
            label="ILI"
            value={formatNumber(province.ili, 1)}
            tone={province.ili > 7 ? 'loss' : province.ili > 4 ? 'warn' : 'good'}
            hint={`${province.carlM3PerKmPerDay} m³ per km of mains per day`}
          />
        </Panel>
        <Panel>
          <Stat
            label="System input"
            value={formatNumber(province.sivMm3)}
            unit="Mm³ / yr"
            tone="flow"
            hint={`${formatPct(shareOfNational, 1)} of the national total`}
          />
        </Panel>
      </div>

      <Panel
        title={`${province.region} water balance`}
        subtitle="2021/22, million m³ per year"
      >
        <BalanceBar balance={balance} />
      </Panel>

      <Panel
        title="Water services authorities"
        subtitle={
          unscored > 0
            ? `${scored.length} assessed in the 2023 No Drop cycle · ${unscored} did not submit`
            : `All ${authorities.length} assessed in the 2023 No Drop cycle`
        }
      >
        {[...authorities]
          .sort((a, b) => (b.noDropScore ?? -1) - (a.noDropScore ?? -1))
          .map((w) => {
            const band = noDropBand(w.noDropScore);
            return (
              <div
                key={w.name}
                className="data-row grid-cols-[1fr_auto] md:grid-cols-[2fr_1fr_auto]"
              >
                <p className="min-w-0 truncate font-medium text-white">{w.name}</p>
                <div className="hidden md:block">
                  {w.noDropScore !== null ? (
                    <Meter
                      value={w.noDropScore}
                      max={100}
                      tone={
                        w.noDropScore >= 80 ? 'good' : w.noDropScore >= 50 ? 'warn' : 'loss'
                      }
                    />
                  ) : (
                    <span className="text-[11px] text-silt-600">no data submitted</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="readout w-11 text-right text-[13px]">
                    {w.noDropScore !== null ? `${w.noDropScore}%` : '—'}
                  </span>
                  <span className={`chip shrink-0 ${BAND_TONE[band]}`}>{band}</span>
                </div>
              </div>
            );
          })}
      </Panel>
    </div>
  );
}
