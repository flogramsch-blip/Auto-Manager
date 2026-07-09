import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { VehiclesProvider, useVehiclesContext } from './context/VehiclesContext';
import { GCalChip } from './components/GCalChip';
import { NextActionBar } from './components/NextActionBar';
import { TabBar, BottomNav } from './layout/NavTabs';
import { Uebersicht } from './pages/Uebersicht';

// Seltener besuchte Seiten erst laden, wenn sie tatsächlich aufgerufen werden
// (Übersicht bleibt eager, da sie die Standardansicht ist).
const Kalender = lazy(() => import('./pages/Kalender').then((m) => ({ default: m.Kalender })));
const Zeitstrahl = lazy(() => import('./pages/Zeitstrahl').then((m) => ({ default: m.Zeitstrahl })));
const Buchen = lazy(() => import('./pages/Buchen').then((m) => ({ default: m.Buchen })));
const Kosten = lazy(() => import('./pages/Kosten').then((m) => ({ default: m.Kosten })));
const Werkstaetten = lazy(() => import('./pages/Werkstaetten').then((m) => ({ default: m.Werkstaetten })));

function Shell() {
  const { vehicles, loading } = useVehiclesContext();
  const openWarnings = vehicles.reduce(
    (n, v) => n + v.items.filter((i) => i.status === 'overdue' || i.status === 'due_soon').length,
    0
  );

  return (
    <div className="app">
      <div className="wf-top">
        <div>
          <div className="wf-ttl">Meine Fahrzeuge</div>
          <div className="wf-sub">
            {loading ? '// lädt…' : `// ${vehicles.length} Fahrzeuge · ${openWarnings} offene Warnungen`}
          </div>
        </div>
        <div className="row">
          <GCalChip />
        </div>
      </div>

      <NextActionBar />
      <TabBar />

      <Suspense fallback={<div className="wf-body"><span className="mono">lädt…</span></div>}>
        <Routes>
          <Route path="/" element={<Uebersicht />} />
          <Route path="/kalender" element={<Kalender />} />
          <Route path="/zeitstrahl" element={<Zeitstrahl />} />
          <Route path="/buchen" element={<Buchen />} />
          <Route path="/kosten" element={<Kosten />} />
          <Route path="/werkstaetten" element={<Werkstaetten />} />
        </Routes>
      </Suspense>

      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <VehiclesProvider>
      <Shell />
    </VehiclesProvider>
  );
}
