import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { noDropBand, wsas, type NoDropBand, type Province } from '../data/dws/wsa';
import { provinces } from '../data/dws/regions';
import { Empty, Meter, Panel, Stat } from '../components/ui';
import { BAND_TONE } from '../components/bands';
import { formatNumber, formatPct } from '../lib/format';

const BANDS: NoDropBand[] = ['Excellent', 'Good', 'Average', 'Poor', 'No submission'];

/**
 * Every water services authority in the country, with its regulatory score.
 *
 * There are 144 of these, not 257. Only a Water Services Authority is legally
 * responsible for supplying water and therefore has a water balance to report;
 * in most rural districts the district municipality holds that duty for all
 * the local municipalities inside it. A list of every municipality would be
 * longer and would mean less.
 */
export default function Municipalities() {
  const [query, setQuery] = useState('');
  const [province, setProvince] = useState<'All' | Province>('All');
  const [band, setBand] = useState<'All' | NoDropBand>('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return wsas
      .filter((w) => province === 'All' || w.province === province)
      .filter((w) => band === 'All' || noDropBand(w.noDropScore) === band)
      .filter((w) => !q || w.name.toLowerCase().includes(q))
      .sort((a, b) => (b.noDropScore ?? -1) - (a.noDropScore ?? -1));
  }, [query, province, band]);

  const counts = useMemo(
    () =>
      BANDS.reduce<Record<string, number>>((acc, b) => {
        acc[b] = wsas.filter((w) => noDropBand(w.noDropScore) === b).length;
        return acc;
      }, {}),
    [],
  );

  const assessed = wsas.length - counts['No submission'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Water services authorities
        </h1>
        <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-silt-400">
          All {wsas.length} municipalities legally responsible for supplying water in South
          Africa, with the score each received in the 2023 No Drop assessment — the
          regulator's audit of how well a municipality manages what it loses.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Panel>
          <Stat label="Authorities" value={String(wsas.length)} hint="Across nine provinces" />
        </Panel>
        <Panel>
          <Stat
            label="Assessed"
            value={String(assessed)}
            tone="flow"
            hint={`${formatPct((assessed / wsas.length) * 100, 0)} of the country`}
          />
        </Panel>
        <Panel>
          <Stat
            label="Scored below 50%"
            value={String(counts.Poor)}
            tone="loss"
            hint="Poor performance on water loss management"
          />
        </Panel>
        <Panel>
          <Stat
            label="Did not submit"
            value={String(counts['No submission'])}
            tone="warn"
            hint="No audit information provided to the regulator"
          />
        </Panel>
      </div>

      <div className="flex flex-col gap-4 border-y border-white/10 py-4 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={province}
            onChange={(e) => setProvince(e.target.value as 'All' | Province)}
            className="field w-auto cursor-pointer"
            aria-label="Filter by province"
          >
            <option value="All">All provinces</option>
            {provinces.map((p) => (
              <option key={p.region} value={p.region}>
                {p.region}
              </option>
            ))}
          </select>

          <select
            value={band}
            onChange={(e) => setBand(e.target.value as 'All' | NoDropBand)}
            className="field w-auto cursor-pointer"
            aria-label="Filter by performance band"
          >
            <option value="All">All bands</option>
            {BANDS.map((b) => (
              <option key={b} value={b}>
                {b} ({counts[b]})
              </option>
            ))}
          </select>
        </div>

        <div className="group relative w-full lg:ml-auto lg:w-64">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2
                       text-silt-500 transition-colors group-focus-within:text-flow-300"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search municipality"
            aria-label="Search municipality"
            className="field pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-silt-500 hover:text-flow-300"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <p className="meter-label shrink-0">
          {filtered.length} of {wsas.length}
        </p>
      </div>

      <Panel>
        {filtered.length === 0 ? (
          <Empty>Nothing matches that. Try a different province or clear the search.</Empty>
        ) : (
          filtered.map((w) => {
            const b = noDropBand(w.noDropScore);
            return (
              <div
                key={w.name}
                className="data-row grid-cols-[1fr_auto] md:grid-cols-[2.2fr_1fr_1fr_auto]"
              >
                <p className="min-w-0 truncate font-medium text-white">{w.name}</p>

                <Link
                  to={`/provinces/${encodeURIComponent(w.province)}`}
                  className="hidden text-[12px] text-silt-400 transition-colors hover:text-flow-200 md:block"
                >
                  {w.province}
                </Link>

                <div className="hidden md:block">
                  {w.noDropScore !== null ? (
                    <Meter
                      value={w.noDropScore}
                      max={100}
                      tone={w.noDropScore >= 80 ? 'good' : w.noDropScore >= 50 ? 'warn' : 'loss'}
                    />
                  ) : (
                    <span className="text-[11px] text-silt-600">not assessed</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="readout w-11 text-right text-[13px]">
                    {w.noDropScore !== null ? `${formatNumber(w.noDropScore)}%` : '—'}
                  </span>
                  <span className={`chip shrink-0 ${BAND_TONE[b]}`}>{b}</span>
                </div>
              </div>
            );
          })
        )}
      </Panel>

      <p className="text-[11px] leading-relaxed text-silt-500">
        A score of "—" means the municipality submitted no audit information, which is not
        the same as scoring zero and is not charted as though it were. Overstrand's 101% is
        as published: the scorecard awards bonus points.
      </p>
    </div>
  );
}
