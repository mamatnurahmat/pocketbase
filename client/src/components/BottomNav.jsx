import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  {
    path: '/dashboard',
    label: 'Beranda',
    icon: (c) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M3 11l9-7 9 7" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5 10v9h14v-9" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    path: '/iuran',
    label: 'Iuran',
    icon: (c) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="6" width="18" height="13" rx="3" stroke={c} strokeWidth="1.9"/>
        <path d="M3 10h18" stroke={c} strokeWidth="1.9"/>
      </svg>
    ),
  },
  {
    path: '/tagihan',
    label: 'Tagihan',
    icon: (c) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="3" width="16" height="18" rx="3" stroke={c} strokeWidth="1.9"/>
        <path d="M8 8h8M8 12h8M8 16h5" stroke={c} strokeWidth="1.9" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    path: '/profil',
    label: 'Profil',
    icon: (c) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="3.5" stroke={c} strokeWidth="1.9"/>
        <path d="M5 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" stroke={c} strokeWidth="1.9" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="bottom-nav">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        const color = isActive ? '#15935A' : '#A6B0AA';
        return (
          <button
            key={tab.path}
            className="nav-item"
            onClick={() => navigate(tab.path)}
          >
            {tab.icon(color)}
            <span className="nav-label" style={{ color }}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
