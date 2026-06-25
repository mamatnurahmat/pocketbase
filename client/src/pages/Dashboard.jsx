import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
export default function Dashboard() {
  const navigate = useNavigate();
  const user = pb.authStore.model;
  const [warga, setWarga] = useState(null);
  const [tagihan, setTagihan] = useState([]);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat pagi';
    if (h < 15) return 'Selamat siang';
    if (h < 18) return 'Selamat sore';
    return 'Selamat malam';
  };

  const rupiah = (n) => 'Rp ' + (n || 0).toLocaleString('id-ID');

  const statusBadge = (status) => {
    if (status === 'Lunas') return 'badge-success';
    if (status === 'Menunggu Konfirmasi') return 'badge-warning';
    return 'badge-danger';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userId = pb.authStore.model.id;
        try {
          const w = await pb.collection('warga').getFirstListItem(`user="${userId}"`);
          setWarga(w);
          localStorage.setItem('isPengurus', w.pengurus ? 'true' : 'false');
          // Fetch tagihan for this warga
          try {
            const isPengurusMode = localStorage.getItem('modePengurus') === null ? true : localStorage.getItem('modePengurus') === 'true';
            let t = [];
            if (w.pengurus && isPengurusMode) {
                t = await pb.collection('tagihan').getFullList({ expand: 'iuran' });
            } else {
                t = await pb.collection('tagihan').getFullList({ 
                  filter: `warga="${w.id}"`,
                  expand: 'iuran'
                });
            }
            setTagihan(t);
          } catch (e) { console.warn("Tagihan fetch:", e); }
        } catch (e) { console.warn("Warga not found:", e); }
      } catch (e) { console.error(e); }
    };
    if (pb.authStore.isValid) fetchData();
  }, []);

  const unpaid = tagihan.filter(t => t.status_pembayaran !== 'Lunas');
  const totalUnpaid = unpaid.reduce((sum, t) => sum + (t.nominal || 0), 0);
  
  const now = new Date();
  const isCurrentMonth = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const unpaidThisMonth = tagihan.filter(t => t.status_pembayaran !== 'Lunas' && isCurrentMonth(t.jatuh_tempo)).length;
  const lunasThisMonth = tagihan.filter(t => t.status_pembayaran === 'Lunas' && isCurrentMonth(t.jatuh_tempo)).length;
  
  const isScurity = localStorage.getItem('isScurity') === 'true';
  const displayName = user?.name || user?.username?.replace('hp_', '') || 'Warga';

  return (
    <div className="page-padded">
      {/* Green Header */}
      <div className="header-green">
        <div className="header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="avatar avatar-green">{getInitials(displayName)}</div>
            <div>
              <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, fontWeight: 500 }}>{getGreeting()},</div>
              <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{displayName}</div>
            </div>
          </div>
          <div className="avatar avatar-green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.7 21a2 2 0 01-3.4 0" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </div>

      <div className="page-content" style={{ marginTop: -44 }}>
        {!isScurity && (
          <>
            {/* Tagihan Card */}
            <div className="dashboard-cards">
            <div className="card" style={{ boxShadow: '0 10px 30px -12px rgba(15,26,20,.18)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#6B7B72', fontWeight: 600 }}>
                  Total tagihan {warga?.pengurus && (localStorage.getItem('modePengurus') === null || localStorage.getItem('modePengurus') === 'true') && localStorage.getItem('isPengurus') === 'true' ? 'semua warga ' : ''}belum dibayar
                </span>
                {unpaid.length > 0 && (
                  <span className="badge badge-warning">{unpaid.length} tagihan</span>
                )}
              </div>
              <div className="rupiah" style={{ marginTop: 10, fontSize: 30, fontWeight: 800 }}>
                {rupiah(totalUnpaid)}
              </div>
              <button
                className="btn btn-primary"
                style={{ marginTop: 16 }}
                onClick={() => navigate('/tagihan')}
              >
                Lihat tagihan
              </button>
            </div>

            {/* Summary Laporan */}
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
              <div className="card text-center" style={{ padding: '16px 12px' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#E53935' }}>{unpaidThisMonth}</div>
                <div style={{ fontSize: 12, color: '#6B7B72', marginTop: 4 }}>Belum Bayar (Bulan Ini)</div>
              </div>
              <div className="card text-center" style={{ padding: '16px 12px' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#15935A' }}>{lunasThisMonth}</div>
                <div style={{ fontSize: 12, color: '#6B7B72', marginTop: 4 }}>Lunas (Bulan Ini)</div>
              </div>
            </div>
          </div>
          </>
        )}

        {/* Quick Actions */}
        <div className="card mt-3" style={{ padding: '18px 8px' }}>
          <div className="quick-actions">
            {localStorage.getItem('isScurity') === 'true' ? (
              <>
                <button className="quick-action" onClick={() => navigate('/warga')}>
                  <span className="quick-action-icon" style={{ background: '#E3F2FD' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#1976D2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="9" cy="7" r="4" stroke="#1976D2" strokeWidth="1.8"/>
                      <path d="M23 21v-2a4 4 0 00-3-3.87" stroke="#1976D2" strokeWidth="1.8" strokeLinecap="round"/>
                      <path d="M16 3.13a4 4 0 010 7.75" stroke="#1976D2" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <span>Warga</span>
                </button>
                <button className="quick-action" onClick={() => navigate('/laporan-scurity')}>
                  <span className="quick-action-icon" style={{ background: '#F3E5F5' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#7B1FA2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span>Lap. Scurity</span>
                </button>
              </>
            ) : (
              <>
                <button className="quick-action" onClick={() => navigate('/iuran')}>
                  <span className="quick-action-icon" style={{ background: '#E8F5EE' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="6" width="18" height="13" rx="3" stroke="#15935A" strokeWidth="1.8"/>
                      <path d="M3 10h18" stroke="#15935A" strokeWidth="1.8"/>
                      <path d="M7 15h4" stroke="#15935A" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <span>Upload Bukti</span>
                </button>
                <button className="quick-action" onClick={() => navigate('/laporan-warga')}>
                  <span className="quick-action-icon" style={{ background: '#FCE4EC' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M8 12h8m-8-4h8m-8 8h4" stroke="#D81B60" strokeWidth="1.8" strokeLinecap="round"/>
                      <rect x="4" y="4" width="16" height="16" rx="3" stroke="#D81B60" strokeWidth="1.8"/>
                    </svg>
                  </span>
                  <span>Lap. Warga</span>
                </button>
                <button className="quick-action" onClick={() => navigate('/warga')}>
                  <span className="quick-action-icon" style={{ background: '#E3F2FD' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#1976D2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="9" cy="7" r="4" stroke="#1976D2" strokeWidth="1.8"/>
                      <path d="M23 21v-2a4 4 0 00-3-3.87" stroke="#1976D2" strokeWidth="1.8" strokeLinecap="round"/>
                      <path d="M16 3.13a4 4 0 010 7.75" stroke="#1976D2" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <span>Warga</span>
                </button>
                <button className="quick-action" onClick={() => navigate('/laporan-scurity')}>
                  <span className="quick-action-icon" style={{ background: '#F3E5F5' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#7B1FA2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span>Lap. Scurity</span>
                </button>
                <button className="quick-action" onClick={() => navigate('/lampiran')}>
                  <span className="quick-action-icon" style={{ background: '#FEF3E2' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="#C8821A" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span>Lampiran</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Info Warga */}
        {!isScurity && warga && (
          <div className="mt-3">
            <div className="section-title">Info warga</div>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="list-icon" style={{ background: '#E8F5EE' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M3 11.5L12 4l9 7.5" stroke="#15935A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 10.5V20h14v-9.5" stroke="#15935A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="list-body">
                <span className="list-title">No. Rumah: {warga.no_rumah}</span>
                <span className="list-sub">HP: {warga.no_wa || (user?.username?.startsWith('hp_') ? user.username.replace('hp_', '') : '-')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Recent Tagihan */}
        {!isScurity && unpaid.length > 0 && (
          <div className="mt-3">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className="section-title" style={{ margin: 0 }}>Tagihan aktif</span>
              <button onClick={() => navigate('/tagihan')} style={{ border: 'none', background: 'none', color: '#15935A', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Lihat semua</button>
            </div>
            <div className="flex-col gap-sm">
              {unpaid.slice(0, 3).map((t) => (
                <div key={t.id} className="list-card">
                  <div className="list-icon" style={{ background: '#E8F5EE' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <rect x="4" y="3" width="16" height="18" rx="3" stroke="#15935A" strokeWidth="1.8"/>
                      <path d="M8 8h8M8 12h8M8 16h5" stroke="#15935A" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="list-body">
                    <span className="list-title">{t.expand?.iuran?.kode || '-'}</span>
                    <span className="list-sub">{t.jatuh_tempo ? new Date(t.jatuh_tempo).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 'auto' }}>
                    <span className="list-amount">{rupiah(t.nominal)}</span>
                    <span className={`badge ${statusBadge(t.status_pembayaran)}`} style={{ marginTop: 4, display: 'inline-block' }}>
                      {t.status_pembayaran === 'Menunggu Konfirmasi' ? 'Menunggu' : t.status_pembayaran}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
