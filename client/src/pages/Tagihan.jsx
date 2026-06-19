import { useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';
import BottomNav from '../components/BottomNav';

export default function Tagihan() {
  const [tagihan, setTagihan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const [isPengurus, setIsPengurus] = useState(false);
  const [modePengurus, setModePengurus] = useState(() => {
    return localStorage.getItem('modePengurus') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('modePengurus', modePengurus);
  }, [modePengurus]);

  const rupiah = (n) => 'Rp ' + (n || 0).toLocaleString('id-ID');

  useEffect(() => {
    const fetchTagihan = async () => {
      setLoading(true);
      try {
        const userId = pb.authStore.model.id;
        try {
          const w = await pb.collection('warga').getFirstListItem(`user="${userId}"`);
          setIsPengurus(w.pengurus || false);
          
          let records = [];
          if (w.pengurus && modePengurus) {
            records = await pb.collection('tagihan').getFullList({ 
              expand: 'iuran,warga,warga.user'
            });
          } else {
            records = await pb.collection('tagihan').getFullList({ 
              filter: `warga="${w.id}"`,
              expand: 'iuran,warga,warga.user'
            });
          }
          
          // Sort client-side by created descending
          records.sort((a, b) => new Date(b.created) - new Date(a.created));
          setTagihan(records);
        } catch (e) {
          // Warga not linked or no tagihan
          console.warn(e);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    if (pb.authStore.isValid) fetchTagihan();
  }, [modePengurus]);

  const handleApprove = async (id) => {
    if (!window.confirm('Tandai tagihan ini menjadi Lunas?')) return;
    try {
      await pb.collection('tagihan').update(id, {
        status_pembayaran: 'Lunas'
      });
      setTagihan(prev => prev.map(t => t.id === id ? { ...t, status_pembayaran: 'Lunas' } : t));
    } catch (e) {
      alert('Gagal menyetujui tagihan: ' + e.message);
    }
  };

  const filtered = filter === 'all' ? tagihan : tagihan.filter(t => t.status_pembayaran === filter);
  const totalUnpaid = tagihan.filter(t => t.status_pembayaran !== 'Lunas').reduce((s, t) => s + (t.nominal || 0), 0);

  const statusBadge = (status) => {
    if (status === 'Lunas') return 'badge-success';
    if (status === 'Menunggu Konfirmasi') return 'badge-warning';
    return 'badge-danger';
  };

  const filters = [
    { key: 'all', label: 'Semua' },
    { key: 'Belum Dibayar', label: 'Belum Bayar' },
    { key: 'Menunggu Konfirmasi', label: 'Menunggu' },
    { key: 'Lunas', label: 'Lunas' },
  ];

  return (
    <div className="page-padded">
      <div style={{ padding: '16px 20px 0' }}>
        <h2>Tagihan {modePengurus && '(Mode Pengurus)'}</h2>
      </div>

      <div className="page-content" style={{ marginTop: 16 }}>
        {/* Toggle Mode Pengurus */}
        {isPengurus && (
          <div className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, background: modePengurus ? '#E8F5EE' : '#fff', border: modePengurus ? '1.5px solid #15935A' : 'none' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: modePengurus ? '#15935A' : '#3A453F' }}>Mode Pengurus</div>
              <div style={{ fontSize: 12, color: modePengurus ? '#0C6B40' : '#8A9991' }}>Tampilkan semua tagihan warga</div>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={modePengurus} 
                onChange={(e) => setModePengurus(e.target.checked)} 
              />
              <span className="slider round"></span>
            </label>
          </div>
        )}

        {/* Summary */}
        <div className="card-green">
          <div style={{ fontSize: 13, opacity: 0.8, fontWeight: 600 }}>Total {modePengurus && 'semua warga '}belum dibayar</div>
          <div className="rupiah" style={{ marginTop: 6, fontSize: 28, fontWeight: 800 }}>{rupiah(totalUnpaid)}</div>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
            {tagihan.filter(t => t.status_pembayaran !== 'Lunas').length} tagihan aktif
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 20 }}>
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                border: filter === f.key ? '1.5px solid #15935A' : '1.5px solid #E6EBE7',
                background: filter === f.key ? '#E8F5EE' : '#fff',
                color: filter === f.key ? '#15935A' : '#6B7B72',
                padding: '9px 14px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: filter === f.key ? 700 : 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="mt-3 section-title">Daftar tagihan {modePengurus && 'Warga'}</div>
        {loading ? (
          <p style={{ textAlign: 'center', padding: 20 }}>Memuat data...</p>
        ) : filtered.length === 0 ? (
          <div className="card text-center" style={{ padding: 32 }}>
            <p style={{ color: '#8A9991' }}>Belum ada tagihan.</p>
          </div>
        ) : (
          <div className="flex-col gap-sm">
            {filtered.map((t) => (
              <div key={t.id} className="list-card" style={{ cursor: 'default' }}>
                <div className="list-icon" style={{ background: '#E8F5EE' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <rect x="4" y="3" width="16" height="18" rx="3" stroke="#15935A" strokeWidth="1.8"/>
                    <path d="M8 8h8M8 12h8M8 16h5" stroke="#15935A" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="list-body">
                  <span className="list-title">
                    {modePengurus && t.expand?.warga 
                      ? `${t.expand.warga.expand?.user?.name || 'Warga'} - ${t.expand?.iuran?.kode || '-'}` 
                      : t.expand?.iuran?.kode || '-'}
                  </span>
                  <span className="list-sub">
                    {modePengurus && t.expand?.warga 
                      ? `No. Rumah: ${t.expand.warga.no_rumah}` 
                      : (t.jatuh_tempo ? new Date(t.jatuh_tempo).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="list-amount">{rupiah(t.nominal)}</span>
                  <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span className={`badge ${statusBadge(t.status_pembayaran)}`}>
                      {t.status_pembayaran}
                    </span>
                    {modePengurus && t.status_pembayaran !== 'Lunas' && (
                      <button 
                        className="btn" 
                        style={{ background: '#15935A', color: '#fff', fontSize: 11, padding: '4px 10px', height: 'auto', borderRadius: 8 }}
                        onClick={(e) => { e.stopPropagation(); handleApprove(t.id); }}
                      >
                        Setujui
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
