import { useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';
import BottomNav from '../components/BottomNav';

export default function Lampiran() {
  const [lampiranList, setLampiranList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPengurus, setIsPengurus] = useState(() => localStorage.getItem('isPengurus') === 'true');
  const [modePengurus, setModePengurus] = useState(() => {
    if (localStorage.getItem('isPengurus') !== 'true') return false;
    const saved = localStorage.getItem('modePengurus');
    // Default ON untuk pengurus, kecuali pernah di-toggle manual
    return saved === null ? true : saved === 'true';
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [confirmApproveId, setConfirmApproveId] = useState(null);

  useEffect(() => {
    localStorage.setItem('modePengurus', modePengurus);
  }, [modePengurus]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const userId = pb.authStore.model.id;
        const warga = await pb.collection('warga').getFirstListItem(`user="${userId}"`);
        const isPengurusDb = warga.pengurus || false;
        setIsPengurus(isPengurusDb);
        localStorage.setItem('isPengurus', isPengurusDb ? 'true' : 'false');

        let records = [];
        if (isPengurusDb && modePengurus) {
          records = await pb.collection('lampiran').getFullList({
            expand: 'warga,warga.user,iuran'
          });
        } else {
          records = await pb.collection('lampiran').getFullList({
            filter: `warga="${warga.id}"`,
            expand: 'warga,warga.user,iuran'
          });
        }

        records.sort((a, b) => new Date(b.created) - new Date(a.created));
        setLampiranList(records);
      } catch (e) {
        console.warn('Error fetching lampiran:', e);
      }
      setLoading(false);
    };

    if (pb.authStore.isValid) fetchData();
  }, [modePengurus]);

  const handleApprove = async () => {
    if (!confirmApproveId) return;
    try {
      await pb.collection('lampiran').update(confirmApproveId, {
        approval: true
      });
      setLampiranList(prev => prev.map(t => t.id === confirmApproveId ? { ...t, approval: true } : t));
      setConfirmApproveId(null);
    } catch (e) {
      console.error(e);
      alert('Gagal menyetujui lampiran: ' + e.message);
      setConfirmApproveId(null);
    }
  };

  const getFileUrl = (record) => {
    if (!record.file_bukti) return null;
    // Build relative URL — works for both dev proxy and production
    return `/api/files/${record.collectionId}/${record.id}/${record.file_bukti}`;
  };

  const isImage = (filename) => {
    if (!filename) return false;
    return /\.(jpg|jpeg|png|webp)$/i.test(filename);
  };

  const isPdf = (filename) => {
    if (!filename) return false;
    return /\.pdf$/i.test(filename);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="page-padded">
      <div style={{ padding: '16px 20px 0' }}>
        <h2>Lampiran {modePengurus && isPengurus && <span style={{ fontSize: 14, color: '#15935A', fontWeight: 600 }}>(Mode Pengurus)</span>}</h2>
      </div>

      <div className="page-content" style={{ marginTop: 16 }}>
        {/* Toggle Mode Pengurus */}
        {isPengurus && (
          <div className="card" style={{
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            background: modePengurus ? '#E8F5EE' : '#fff',
            border: modePengurus ? '1.5px solid #15935A' : 'none'
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: modePengurus ? '#15935A' : '#3A453F' }}>Mode Pengurus</div>
              <div style={{ fontSize: 12, color: modePengurus ? '#0C6B40' : '#8A9991' }}>Tampilkan semua lampiran warga</div>
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

        {/* List */}
        <div className="section-title" style={{ marginBottom: 12 }}>
          {!loading && `${lampiranList.length} Lampiran ditemukan`}
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: 20, color: '#8A9991' }}>Memuat data...</p>
        ) : lampiranList.length === 0 ? (
          <div className="card text-center" style={{ padding: 32 }}>
            <p style={{ color: '#8A9991' }}>Belum ada lampiran.</p>
          </div>
        ) : (
          <div className="flex-col gap-sm">
            {lampiranList.map((item) => {
              const fileUrl = getFileUrl(item);
              const img = isImage(item.file_bukti);
              const pdf = isPdf(item.file_bukti);
              const iuranData = item.expand?.iuran;
              const iuranArray = Array.isArray(iuranData) ? iuranData : iuranData ? [iuranData] : [];

              return (
                <div key={item.id} className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #E6EBE7' }}>
                  {/* Image Preview */}
                  {img && fileUrl && (
                    <div
                      onClick={() => setPreviewImage(fileUrl)}
                      style={{
                        width: '100%',
                        height: 190,
                        overflow: 'hidden',
                        cursor: 'zoom-in',
                        background: '#f0f4f1',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                      <img
                        src={fileUrl}
                        alt="Bukti Pembayaran"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div style={{
                        position: 'absolute', bottom: 8, right: 8,
                        background: 'rgba(0,0,0,0.55)', borderRadius: 8,
                        padding: '4px 10px', color: '#fff', fontSize: 11, fontWeight: 600
                      }}>
                        🔍 Perbesar
                      </div>
                    </div>
                  )}

                  {/* PDF */}
                  {pdf && fileUrl && (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 8, height: 80, background: '#FFF3F0',
                        color: '#D0401A', fontWeight: 700, fontSize: 14, textDecoration: 'none'
                      }}>
                      📄 Buka PDF
                    </a>
                  )}

                  {/* No file */}
                  {!fileUrl && (
                    <div style={{
                      height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: '#F7F9F7', color: '#A6B0AA', fontSize: 13
                    }}>
                      Tidak ada file
                    </div>
                  )}

                  {/* Info */}
                  <div style={{ padding: '12px 14px' }}>
                    {/* Warga info (mode pengurus) */}
                    {modePengurus && isPengurus && item.expand?.warga && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        marginBottom: 8, padding: '6px 10px',
                        background: '#E8F5EE', borderRadius: 8
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="8" r="3.5" stroke="#15935A" strokeWidth="2"/>
                          <path d="M5 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" stroke="#15935A" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#15935A' }}>
                          {item.expand.warga.expand?.user?.name || 'Warga'} — No. {item.expand.warga.no_rumah}
                        </span>
                      </div>
                    )}

                    {/* Iuran tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {iuranArray.length > 0 ? iuranArray.map(i => (
                        <span key={i.id} style={{
                          background: '#E8F5EE', color: '#15935A',
                          border: '1px solid #B8DDC8', fontSize: 11,
                          borderRadius: 20, padding: '3px 9px', fontWeight: 600
                        }}>
                          {i.kode}
                        </span>
                      )) : (
                        <span style={{ color: '#8A9991', fontSize: 12, fontStyle: 'italic' }}>Tidak ada iuran</span>
                      )}
                    </div>

                    {/* Status & Date */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`badge ${item.approval ? 'badge-success' : 'badge-warning'}`}>
                          {item.approval ? '✅ Disetujui' : '⏳ Menunggu'}
                        </span>
                        {modePengurus && !item.approval && (
                          <button 
                            className="btn" 
                            style={{ background: '#15935A', color: '#fff', fontSize: 11, padding: '4px 10px', height: 'auto', borderRadius: 8 }}
                            onClick={(e) => { e.stopPropagation(); setConfirmApproveId(item.id); }}
                          >
                            Setujui
                          </button>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: '#8A9991' }}>
                        {formatDate(item.created)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
          {/* Close button */}
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
              fontFamily: 'inherit', zIndex: 10000
            }}>
            ✕
          </button>
          <img
            src={previewImage}
            alt="Preview Lampiran"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '100%',
              maxHeight: '90vh',
              borderRadius: 12,
              objectFit: 'contain',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5)'
            }}
          />
        </div>
      )}

      {/* Modal Confirm Approve */}
      {confirmApproveId && (
        <div className="modal-overlay" onClick={() => setConfirmApproveId(null)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20
        }}>
          <div 
            style={{ 
              background: '#fff', padding: 24, borderRadius: 12, width: '100%', maxWidth: 320, 
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)', textAlign: 'center' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: 18, color: '#1B211E' }}>Konfirmasi</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: 14, color: '#6B7B72', lineHeight: 1.5 }}>
              Tandai lampiran ini sebagai Disetujui?
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => setConfirmApproveId(null)}
                style={{ 
                  flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #E6EBE7', 
                  background: '#fff', color: '#6B7B72', fontSize: 14, fontWeight: 600, cursor: 'pointer' 
                }}
              >
                Batal
              </button>
              <button 
                onClick={() => handleApprove()}
                style={{ 
                  flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', 
                  background: '#15935A', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' 
                }}
              >
                Ya, Setujui
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
