import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { pb } from '../lib/pocketbase';

const allItems = [
  {
    label: 'Beranda', path: '/dashboard',
    icon: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 11l9-7 9 7" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 10v9h14v-9" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
  {
    label: 'Tagihan', path: '/tagihan',
    icon: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="3" stroke={c} strokeWidth="1.9"/><path d="M8 8h8M8 12h8M8 16h5" stroke={c} strokeWidth="1.9" strokeLinecap="round"/></svg>,
  },
  {
    label: 'Upload Bukti', path: '/iuran',
    icon: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="13" rx="3" stroke={c} strokeWidth="1.8"/><path d="M3 10h18" stroke={c} strokeWidth="1.8"/><path d="M7 15h4" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></svg>,
  },
  {
    label: 'Lapor', path: '/lapor',
    icon: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 14V6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V14C20 15.1046 19.1046 16 18 16H8L4 20V14Z" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="10" r="1" fill={c}/></svg>,
  },
  {
    label: 'Lap. Warga', path: '/laporan-warga',
    icon: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M8 12h8m-8-4h8m-8 8h4" stroke={c} strokeWidth="1.8" strokeLinecap="round"/><rect x="4" y="4" width="16" height="16" rx="3" stroke={c} strokeWidth="1.8"/></svg>,
  },
  {
    label: 'Lap. Scurity', path: '/laporan-scurity',
    icon: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
  {
    label: 'Warga', path: '/warga',
    icon: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke={c} strokeWidth="1.8"/><path d="M23 21v-2a4 4 0 00-3-3.87" stroke={c} strokeWidth="1.8" strokeLinecap="round"/><path d="M16 3.13a4 4 0 010 7.75" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></svg>,
  },
  {
    label: 'Lampiran', path: '/lampiran',
    icon: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
  {
    label: 'Profil', path: '/profil',
    icon: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.5" stroke={c} strokeWidth="1.9"/><path d="M5 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" stroke={c} strokeWidth="1.9" strokeLinecap="round"/></svg>,
  },
];

const scurityItems = allItems.filter(i =>
  ['/dashboard', '/lapor', '/laporan-warga', '/warga', '/laporan-scurity', '/profil'].includes(i.path)
);

export default function Sidebar({ open, onClose, persistent }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isScurity = localStorage.getItem('isScurity') === 'true';
  const items = isScurity ? scurityItems : allItems;

  const handleNav = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {open && !persistent && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'sidebar--open' : ''} ${persistent ? 'sidebar--persistent' : ''}`} style={persistent ? { display: 'flex' } : undefined}>
        <div className="sidebar-header">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M3 11.5L12 4l9 7.5" stroke="#15935A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5 10.5V20h14v-9.5" stroke="#15935A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 20v-5h4v5" stroke="#15935A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>Warga P2S</span>
          <button className="sidebar-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#6B7B72" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>
        <nav className="sidebar-nav">
          {items.map((item) => {
            const active = location.pathname === item.path;
            const color = active ? '#15935A' : '#6B7B72';
            return (
              <button
                key={item.path}
                className={`sidebar-item ${active ? 'sidebar-item--active' : ''}`}
                onClick={() => handleNav(item.path)}
              >
                <span className="sidebar-item-icon" style={{ color }}>{item.icon(color)}</span>
                <span style={{ color }}>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <button className="sidebar-item" onClick={() => { pb.authStore.clear(); navigate('/login'); onClose(); }}>
            <span className="sidebar-item-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="#C24A4A" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
            <span style={{ color: '#C24A4A' }}>Keluar</span>
          </button>
        </div>
      </aside>
    </>
  );
}
