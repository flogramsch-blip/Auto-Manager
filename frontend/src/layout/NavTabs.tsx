import { NavLink } from 'react-router-dom';

const NAV = [
  { to: '/', label: 'Übersicht', icon: '🚗', end: true },
  { to: '/kalender', label: 'Kalender', icon: '📅' },
  { to: '/zeitstrahl', label: 'Zeitstrahl', icon: '⏱' },
  { to: '/buchen', label: 'Buchen', icon: '🔧' },
  { to: '/kosten', label: 'Kosten', icon: '€' },
  { to: '/werkstaetten', label: 'Werkstätten', icon: '🏠' },
];

export function TabBar() {
  return (
    <div className="tabbar">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}

export function BottomNav() {
  return (
    <nav className="botnav">
      {NAV.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'on' : '')}>
          <span className="i">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
