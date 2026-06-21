import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import BottomNav from '../components/BottomNav';

export default function LaporanWarga() {
  const navigate = useNavigate();
  const [laporanList, setLaporanList] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [isPengurus] = useState(() => localStorage.getItem('isPengurus') === 'true');
  const [editingId, setEditingId] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editRespons, setEditRespons] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const records = await pb.collection('lapor').getFullList({
          expand: 'warga,warga.user'
        });
        records.sort((a, b) => new Date(b.created) - new Date(a.created));
        setLaporanList(records);
      } catch (e) {
        console.warn("Error fetching data:", e);
      }
    };
    if (pb.authStore.isValid) fetchData();
  }, []);

  const handleUpdateReport = async (id) => {
    try {
      const record = await pb.collection('lapor').update(id, {
        status: editStatus,
        respons: editRespons
      });
      // Update local state
      setLaporanList(prev => prev.map(item => item.id === id ? { ...item, ...record } : item));
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update report:", err);
      alert("Gagal mengupdate laporan.");
    }
  };

  return (
    <div className="page-padded">
      {/* Header */}
      <div className="header-green">
        <div className="header-row">
          <div>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, fontWeight: 500 }}>Warga P2S</div>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Laporan Warga</div>
          </div>
          <button 
            onClick={() => navigate(-1)} 
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Kembali
          </button>
        </div>
      </div>

      <div className="page-content" style={{ marginTop: -20 }}>
        <div className="flex-col" style={{ gap: 12 }}>
          {laporanList.length === 0 ? (
            <div className="card text-center" style={{ padding: 40, color: '#8A9991' }}>
              Belum ada laporan dari warga.
            </div>
          ) : (
            laporanList.map(item => (
              <div key={item.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  {item.foto && (
                    <img 
                      src={`/api/files/${item.collectionId}/${item.id}/${item.foto}`} 
                      alt="Laporan" 
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }}
                      onClick={() => setPreviewImage(`/api/files/${item.collectionId}/${item.id}/${item.foto}`)}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1B211E', marginBottom: 4 }}>
                      {item.expand?.warga?.expand?.user?.name || 'Warga'} — No. {item.expand?.warga?.no_rumah}
                    </div>
                    <p style={{ fontSize: 12, color: '#6B7B72', marginBottom: 8, lineHeight: 1.4 }}>
                      {item.keterangan}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={`badge ${item.status === 'Selesai' ? 'badge-success' : 'badge-warning'}`}>
                        {item.status || 'Menunggu Konfirmasi'}
                      </span>
                      <span style={{ fontSize: 11, color: '#8A9991' }}>
                        {new Date(item.created).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    {item.respons && (
                      <div style={{ marginTop: 12, padding: 12, background: '#F8FAFC', borderRadius: 8, borderLeft: '3px solid #15935A' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#15935A', marginBottom: 4 }}>Respons Pengurus:</div>
                        <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>{item.respons}</div>
                      </div>
                    )}

                    {isPengurus && editingId !== item.id && (
                      <button 
                        onClick={() => {
                          setEditingId(item.id);
                          setEditStatus(item.status || 'Menunggu Konfirmasi');
                          setEditRespons(item.respons || '');
                        }}
                        style={{ marginTop: 12, padding: '6px 12px', background: '#E2E8F0', color: '#475569', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Edit / Tanggapi
                      </button>
                    )}

                    {isPengurus && editingId === item.id && (
                      <div style={{ marginTop: 12, padding: 12, background: '#F1F5F9', borderRadius: 8 }}>
                        <div style={{ marginBottom: 8 }}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Status</label>
                          <select 
                            value={editStatus} 
                            onChange={e => setEditStatus(e.target.value)}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12 }}
                          >
                            <option value="Menunggu Konfirmasi">Menunggu Konfirmasi</option>
                            <option value="Diproses">Diproses</option>
                            <option value="Selesai">Selesai</option>
                            <option value="Ditolak">Ditolak</option>
                          </select>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Tanggapan</label>
                          <textarea 
                            value={editRespons} 
                            onChange={e => setEditRespons(e.target.value)}
                            placeholder="Tulis tanggapan untuk warga..."
                            style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12, minHeight: 60, resize: 'vertical' }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button 
                            onClick={() => handleUpdateReport(item.id)}
                            style={{ padding: '6px 12px', background: '#15935A', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', flex: 1 }}
                          >
                            Simpan
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            style={{ padding: '6px 12px', background: '#E2E8F0', color: '#475569', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Full-screen Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.93)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 12,
            animation: 'fadeIn 0.15s ease'
          }}>
          <button
            onClick={() => setPreviewImage(null)}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(255,255,255,0.18)',
              border: 'none', borderRadius: '50%',
              width: 44, height: 44,
              color: '#fff', fontSize: 22,
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              zIndex: 10000
            }}>✕</button>
          <img
            src={previewImage}
            alt="Preview Laporan"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }}
          />
        </div>
      )}

      <BottomNav />
    </div>
  );
}
