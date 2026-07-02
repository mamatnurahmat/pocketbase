import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { pb, API_URL } from '../lib/pocketbase';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}h lalu`;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function activityIcon(aktivitas) {
  const a = (aktivitas || '').toLowerCase();
  if (a.includes('upload') || a.includes('bayar'))
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="13" rx="3" stroke="#15935A" strokeWidth="1.8"/><path d="M3 10h18" stroke="#15935A" strokeWidth="1.8"/><path d="M7 15h4" stroke="#15935A" strokeWidth="1.8" strokeLinecap="round"/></svg>;
  if (a.includes('tagihan'))
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="3" stroke="#C8821A" strokeWidth="1.8"/><path d="M8 8h8M8 12h8M8 16h5" stroke="#C8821A" strokeWidth="1.8" strokeLinecap="round"/></svg>;
  if (a.includes('topup') || a.includes('transfer'))
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12l7-7 7 7" stroke="#15935A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#15935A" strokeWidth="1.8"/><path d="M12 8v4l3 2" stroke="#15935A" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}

function activityColor(aktivitas) {
  const a = (aktivitas || '').toLowerCase();
  if (a.includes('upload') || a.includes('bayar')) return '#E8F5EE';
  if (a.includes('tagihan')) return '#FBF1DD';
  if (a.includes('topup') || a.includes('transfer')) return '#E0F2FE';
  return '#F0F0F0';
}

export default function Notifikasi() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('aktivitas');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchAktivitas = async (pageNum, append) => {
    setLoading(true);
    setError('');
    try {
      const token = pb.authStore.token;
      const res = await fetch(`${API_URL}/v1/aktivitas?page=${pageNum}&perPage=30`, {
        headers: { Authorization: token },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const newItems = data.items || [];
      setItems(prev => append ? [...prev, ...newItems] : newItems);
      setTotal(data.total || 0);
      setHasMore(newItems.length >= 30);
    } catch (e) {
      console.error('Gagal ambil aktivitas:', e);
      setError('Gagal memuat data');
      if (!append) setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'aktivitas') {
      setItems([]);
      setPage(1);
      fetchAktivitas(1, false);
    }
  }, [tab]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchAktivitas(next, true);
  };

  const handleRefresh = () => {
    setPage(1);
    fetchAktivitas(1, false);
  };

  return (
    <div className="page-padded">
      {/* Header */}
      <div className="header-green">
        <div className="header-row">
          <button className="btn-icon" onClick={() => navigate(-1)} style={{ color: '#fff', border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Notifikasi</div>
          <button className="btn-icon" onClick={handleRefresh} style={{ color: '#fff', border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="notif-tabs">
        <button className={`notif-tab ${tab === 'aktivitas' ? 'active' : ''}`} onClick={() => setTab('aktivitas')}>Aktivitas</button>
        <button className={`notif-tab ${tab === 'pesan' ? 'active' : ''}`} onClick={() => setTab('pesan')}>Pesan & Informasi</button>
      </div>

      {/* Content */}
      <div className="page-content" style={{ marginTop: 0 }}>
        {tab === 'aktivitas' && (
          <>
            {loading && items.length === 0 ? (
              <div className="notif-loading">Memuat...</div>
            ) : error ? (
              <div className="notif-empty">
                <p style={{ color: '#C24A4A' }}>{error}</p>
                <button className="btn btn-outline" onClick={handleRefresh} style={{ marginTop: 12 }}>Coba lagi</button>
              </div>
            ) : items.length === 0 ? (
              <div className="notif-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
                  <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke="#6B7B72" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M13.7 21a2 2 0 01-3.4 0" stroke="#6B7B72" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <p>Belum ada aktivitas</p>
              </div>
            ) : (
              <>
                {total > 0 && <div className="notif-count">{total} aktivitas</div>}
                <div className="notif-list">
                  {items.map((item) => (
                    <div key={item.id} className="notif-card">
                      <div className="notif-card-icon" style={{ background: activityColor(item.aktivitas) }}>
                        {activityIcon(item.aktivitas)}
                      </div>
                      <div className="notif-card-body">
                        <div className="notif-card-title">{item.aktivitas}</div>
                        <div className="notif-card-meta">
                          {item.warga_label && <span className="notif-card-warga">{item.warga_label}</span>}
                          <span className="notif-card-time">{timeAgo(item.created)}</span>
                        </div>
                        {item.detail && Object.keys(item.detail).length > 0 && (
                          <div className="notif-card-detail">
                            {item.detail.Keterangan && <div className="notif-detail-ket">{item.detail.Keterangan}</div>}
                            {item.detail['Oleh'] && <div className="notif-detail-oleh">{item.detail['Oleh']}</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {hasMore && (
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <button className="btn btn-outline" onClick={loadMore} disabled={loading}>
                      {loading ? 'Memuat...' : 'Muat lebih banyak'}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === 'pesan' && (
          <div className="notif-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
              <path d="M4 14V6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V14C20 15.1046 19.1046 16 18 16H8L4 20V14Z" stroke="#6B7B72" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>Belum ada pesan</p>
          </div>
        )}
      </div>
    </div>
  );
}