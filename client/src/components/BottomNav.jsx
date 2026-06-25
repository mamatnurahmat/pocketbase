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
    path: '/lapor',
    label: 'Lapor',
    icon: (c) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M4 14V6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V14C20 15.1046 19.1046 16 18 16H8L4 20V14Z" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="10" r="1" fill={c}/>
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

const scurityTabs = [
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
    path: '/lapor',
    label: 'Lapor',
    icon: (c) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M4 14V6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V14C20 15.1046 19.1046 16 18 16H8L4 20V14Z" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="10" r="1" fill={c}/>
      </svg>
    ),
  },
  {
    path: '/warga',
    label: 'Warga',
    icon: (c) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="9" cy="7" r="4" stroke={c} strokeWidth="1.8"/>
      </svg>
    ),
  },
  {
    path: '/laporan-scurity',
    label: 'Lap. Scurity',
    icon: (c) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
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
  const isScurity = localStorage.getItem('isScurity') === 'true';
  const activeTabs = isScurity ? scurityTabs : tabs;

  return (
    <nav className="bottom-nav">
      {activeTabs.map((tab) => {
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
    </nav>
  );
}
