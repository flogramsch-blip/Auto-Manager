import { Route, Routes } from 'react-router-dom';
import { VehiclesProvider, useVehiclesContext } from './context/VehiclesContext';
import { GCalChip } from './components/GCalChip';
import { NextActionBar } from './components/NextActionBar';
import { TabBar, BottomNav } from './layout/NavTabs';
import { Uebersicht } from './pages/Uebersicht';
import { Kalender } from './pages/Kalender';
import { Zeitstrahl } from './pages/Zeitstrahl';
import { Buchen } from './pages/Buchen';
import { Kosten } from './pages/Kosten';
import { Werkstaetten } from './pages/Werkstaetten';

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

      <Routes>
        <Route path="/" element={<Uebersicht />} />
        <Route path="/kalender" element={<Kalender />} />
        <Route path="/zeitstrahl" element={<Zeitstrahl />} />
        <Route path="/buchen" element={<Buchen />} />
        <Route path="/kosten" element={<Kosten />} />
        <Route path="/werkstaetten" element={<Werkstaetten />} />
      </Routes>

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
