import { useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';
export default function LaporanScurity() {
  const [laporanList, setLaporanList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const records = await pb.collection('laporan_scurity').getFullList({
          sort: '-created',
          expand: 'dibuat_oleh'
        });
        setLaporanList(records);
      } catch (e) {
        console.error('Gagal fetch laporan scurity:', e);
      } finally {
        setLoading(false);
      }
    };
    if (pb.authStore.isValid) fetchData();
  }, []);

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const labelJenis = {
    absen: 'Absen',
    patroli: 'Patroli',
    lainnya: 'Lainnya'
  };

  const colorJenis = {
    absen: { bg: '#E8F5EE', color: '#15935A' },
    patroli: { bg: '#E3F2FD', color: '#1976D2' },
    lainnya: { bg: '#FFF3E0', color: '#E65100' }
  };

  return (
    <div className="page-padded" style={{ paddingBottom: 'calc(var(--nav-height) + 16px)' }}>
      <div className="header-green">
        <div className="header-row">
          <div>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, fontWeight: 500 }}>Warga P2S</div>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Laporan Scurity</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              background: 'rgba(255,255,255,0.15)', borderRadius: 12,
              padding: '8px 14px', textAlign: 'center'
            }}>
              <div style={{ color: '#fff', fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>{laporanList.length}</div>
              <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 10, fontWeight: 600 }}>Total</div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-content" style={{ marginTop: -20 }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '3px solid #E6EBE7', borderTopColor: '#15935A',
              animation: 'spin 0.7s linear infinite',
            }} />
            <span style={{ fontSize: 13, color: '#8A9991', fontWeight: 600 }}>Memuat...</span>
          </div>
        )}

        {!loading && laporanList.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '48px 20px', color: '#8A9991', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: '#EFF1F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1B211E' }}>Belum Ada Laporan</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, maxWidth: 260 }}>Belum ada laporan keamanan yang tercatat.</div>
          </div>
        )}

        {!loading && laporanList.length > 0 && (
          <div className="flex-col" style={{ gap: 12 }}>
            {laporanList.map((l) => {
              const jc = colorJenis[l.jenis] || { bg: '#EFF1F0', color: '#1B211E' };
              return (
                <div key={l.id} className="card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{
                      background: jc.bg, color: jc.color,
                      padding: '4px 12px', borderRadius: 12,
                      fontSize: 12, fontWeight: 700
                    }}>
                      {labelJenis[l.jenis] || l.jenis}
                    </span>
                    <span style={{ fontSize: 11, color: '#8A9991', marginLeft: 'auto' }}>
                      {formatDate(l.created)}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: '#1B211E', lineHeight: 1.5 }}>
                    {l.keterangan}
                  </div>
                  {l.expand?.dibuat_oleh && (
                    <div style={{ fontSize: 11, color: '#8A9991', marginTop: 8 }}>
                      Oleh: {l.expand.dibuat_oleh.name || l.expand.dibuat_oleh.email}
                    </div>
                  )}
                  {l.foto && (
                    <img
                      src={pb.files.getUrl(l, l.foto)}
                      alt="laporan"
                      style={{ width: '100%', borderRadius: 10, marginTop: 10, maxHeight: 200, objectFit: 'cover' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}