import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import {
  Activity,
  Building2,
  Droplets,
  GitPullRequestArrow,
  Map,
  Sigma,
  Waves,
} from 'lucide-react';
import { NetworkProvider } from './state/NetworkProvider';
import National from './pages/National';
import ProvinceDetail from './pages/ProvinceDetail';
import Municipalities from './pages/Municipalities';
import Overview from './pages/Overview';
import ZoneDetail from './pages/ZoneDetail';
import Balance from './pages/Balance';
import Queue from './pages/Queue';
import Reservoirs from './pages/Reservoirs';
import Method from './pages/Method';

/**
 * Two halves, kept visibly apart.
 *
 * "Published" is the Department of Water and Sanitation's own data, unmodified.
 * "Leak detection" is a worked example on modelled telemetry, because the
 * hourly bulk-meter readings the method needs are internal to a municipality
 * and are not published by anyone. Blurring the two would be the easiest way
 * to make this project dishonest, so the navigation separates them and every
 * modelled page says so at the top.
 */
const NAV_PUBLISHED = [
  { to: '/', label: 'National', icon: Map, end: true },
  { to: '/municipalities', label: 'Municipalities', icon: Building2 },
];

const NAV_MODELLED = [
  { to: '/leak-detection', label: 'Control room', icon: Activity, end: true },
  { to: '/leak-detection/queue', label: 'Repair queue', icon: GitPullRequestArrow },
  { to: '/leak-detection/reservoirs', label: 'Reservoirs', icon: Waves },
];

export default function App() {
  return (
    <NetworkProvider>
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-abyss-950/85 backdrop-blur">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-5 gap-y-3 px-5 py-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-md border border-flow-400/30 bg-flow-400/10">
                <Droplets className="h-4 w-4 text-flow-300" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold leading-none tracking-tight text-white">Sluice</p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-silt-500">
                  South African water loss
                </p>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-4" aria-label="Sections">
              <NavGroup label="Published" items={NAV_PUBLISHED} />
              <span className="hidden h-5 w-px bg-white/10 sm:block" aria-hidden="true" />
              <NavGroup label="Worked example" items={NAV_MODELLED} />
              <span className="hidden h-5 w-px bg-white/10 sm:block" aria-hidden="true" />
              <NavLink
                to="/method"
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
              >
                <Sigma className="h-3.5 w-3.5" aria-hidden="true" />
                Method &amp; sources
              </NavLink>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-5 py-7">
          <Routes>
            <Route path="/" element={<National />} />
            <Route path="/provinces/:region" element={<ProvinceDetail />} />
            <Route path="/municipalities" element={<Municipalities />} />

            <Route path="/leak-detection" element={<Overview />} />
            <Route path="/leak-detection/zones/:dmaId" element={<ZoneDetail />} />
            <Route path="/leak-detection/balance" element={<Balance />} />
            <Route path="/leak-detection/queue" element={<Queue />} />
            <Route path="/leak-detection/reservoirs" element={<Reservoirs />} />

            <Route path="/method" element={<Method />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="mx-auto max-w-[1400px] px-5 pb-10 pt-4">
          <p className="border-t border-white/[0.06] pt-5 text-[11px] leading-relaxed text-silt-500">
            National, provincial and municipal figures are published by the Department of
            Water and Sanitation for 2021/22 and 2023 and are reproduced here unmodified.
            The leak-detection section works on modelled telemetry: the hourly bulk-meter
            readings that minimum night flow analysis requires are internal to each
            municipality and are not published.
          </p>
        </footer>
      </div>
    </NetworkProvider>
  );
}

function NavGroup({
  label,
  items,
}: {
  label: string;
  items: { to: string; label: string; icon: typeof Map; end?: boolean }[];
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="meter-label mr-1 hidden lg:inline">{label}</span>
      {items.map(({ to, label: text, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {text}
        </NavLink>
      ))}
    </div>
  );
}
