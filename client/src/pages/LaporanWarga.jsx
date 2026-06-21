import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import BottomNav from '../components/BottomNav';

// ── Toast untuk notifikasi mobile-native ──
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2800);
    return () => clearTimeout(t);
  }, [onClose]);
  const bg = type === 'success' ? '#15935A' : type === 'error' ? '#C24A4A' : '#1B211E';
  return (
    <div style={{
      position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)',
      zIndex: 99999, background: bg, color: '#fff',
      padding: '14px 24px', borderRadius: 14, fontSize: 14, fontWeight: 600,
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      maxWidth: 360, width: 'calc(100% - 40px)',
      textAlign: 'center', animation: 'fadeIn 0.2s ease',
      backdropFilter: 'blur(8px)',
    }}>
      {message}
    </div>
  );
}

// ── Stat Card ──
function StatCard({ label, count, color, bg }) {
  return (
    <div style={{
      flex: 1, background: bg || '#F0F4F1', borderRadius: 14,
      padding: '12px 10px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || '#15935A', lineHeight: 1.2 }}>{count}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7B72', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ── Status Badge ──
function StatusBadge({ status }) {
  const conf = {
    'Selesai':      { bg: '#E8F5EE', color: '#15935A', icon: '✓' },
    'Diproses':     { bg: '#FBF1DD', color: '#C8821A', icon: '⟳' },
    'Ditolak':      { bg: '#FBE9E9', color: '#C24A4A', icon: '✕' },
  };
  const s = conf[status] || { bg: '#EEF1EF', color: '#8A9991', icon: '○' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color,
    }}>
      <span style={{ fontSize: 13, lineHeight: 1 }}>{s.icon}</span>
      {status || 'Menunggu'}
    </span>
  );
}

export default function LaporanWarga() {
  const navigate = useNavigate();
  const [laporanList, setLaporanList] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [isPengurus] = useState(() => localStorage.getItem('isPengurus') === 'true');

  // Edit modal state
  const [editModal, setEditModal] = useState(null); // item object or null
  const [editStatus, setEditStatus] = useState('');
  const [editRespons, setEditRespons] = useState('');
  const [saving, setSaving] = useState(false);

  // Toast state
  const [toast, setToast] = useState(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const records = await pb.collection('lapor').getFullList({
          expand: 'warga,warga.user',
          sort: '-created',
        });
        setLaporanList(records);
      } catch (e) {
        console.warn("Error fetching data:", e);
      }
    };
    if (pb.authStore.isValid) fetchData();
  }, []);

  const handleUpdateReport = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      const record = await pb.collection('lapor').update(editModal.id, {
        status: editStatus,
        respons: editRespons,
      });
      setLaporanList(prev => prev.map(item =>
        item.id === editModal.id ? { ...item, ...record } : item
      ));
      setEditModal(null);
      setToast({ message: 'Laporan berhasil diperbarui ✓', type: 'success' });
    } catch (err) {
      console.error("Failed to update report:", err);
      setToast({ message: 'Gagal memperbarui laporan.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (item) => {
    setEditModal(item);
    setEditStatus(item.status || 'Menunggu Konfirmasi');
    setEditRespons(item.respons || '');
    setTimeout(() => textareaRef.current?.focus(), 350);
  };

  // ── Hitung statistik ──
  const stats = {
    total: laporanList.length,
    selesai: laporanList.filter(l => l.status === 'Selesai').length,
    proses: laporanList.filter(l => l.status === 'Diproses' || !l.status || l.status === 'Menunggu Konfirmasi').length,
  };

  return (
    <div className="page-padded" style={{ paddingBottom: 'calc(var(--nav-height) + 16px)' }}>
      {/* Header */}
      <div className="header-green">
        <div className="header-row">
          <div>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 14, fontWeight: 500 }}>Warga P2S</div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Laporan Warga</div>
          </div>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', padding: '8px 16px',
              borderRadius: 20, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', minHeight: 44,
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          >
            ← Kembali
          </button>
        </div>
      </div>

      <div className="page-content" style={{ marginTop: -24 }}>
        {/* Stats row */}
        {laporanList.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <StatCard label="Total" count={stats.total} color="#1B211E" bg="#EFF1F0" />
            <StatCard label="Selesai" count={stats.selesai} color="#15935A" bg="#E8F5EE" />
            <StatCard label="Diproses" count={stats.proses} color="#C8821A" bg="#FBF1DD" />
          </div>
        )}

        {/* List */}
        <div className="flex-col" style={{ gap: 12 }}>
          {laporanList.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 12, padding: '48px 20px', color: '#8A9991', textAlign: 'center',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 20,
                background: '#EFF1F0', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 28, marginBottom: 4,
              }}>📋</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1B211E' }}>
                Belum Ada Laporan
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.5, maxWidth: 260 }}>
                Warga belum mengirim laporan apapun. Laporan akan muncul di sini.
              </div>
            </div>
          ) : (
            laporanList.map(item => (
              <div
                key={item.id}
                className="card"
                style={{
                  padding: 16,
                  borderLeft: item.status === 'Selesai'
                    ? '4px solid #15935A'
                    : item.status === 'Ditolak'
                    ? '4px solid #C24A4A'
                    : '4px solid #C8821A',
                }}
              >
                <div style={{ display: 'flex', gap: 12 }}>
                  {/* Foto */}
                  {item.foto && (
                    <img
                      src={`/api/files/${item.collectionId}/${item.id}/${item.foto}?thumb=160x160`}
                      alt="Laporan"
                      loading="lazy"
                      style={{
                        width: 72, height: 72, objectFit: 'cover', borderRadius: 12,
                        cursor: 'pointer', flexShrink: 0,
                        border: '1px solid #EFF1F0',
                      }}
                      onClick={() => setPreviewImage(
                        `/api/files/${item.collectionId}/${item.id}/${item.foto}`
                      )}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Header info */}
                    <div style={{
                      fontSize: 13, fontWeight: 700, color: '#1B211E', marginBottom: 2,
                      display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
                    }}>
                      <span>{item.expand?.warga?.expand?.user?.name || 'Warga'}</span>
                      <span style={{ color: '#8A9991', fontWeight: 500 }}>
                        · No. {item.expand?.warga?.no_rumah}
                      </span>
                    </div>

                    {/* Keterangan */}
                    <p style={{
                      fontSize: 13, color: '#475569', lineHeight: 1.45,
                      marginBottom: 8, display: '-webkit-box',
                      WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {item.keterangan}
                    </p>

                    {/* Status + date row */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', gap: 8, flexWrap: 'wrap',
                    }}>
                      <StatusBadge status={item.status} />
                      <span style={{ fontSize: 11, color: '#8A9991', whiteSpace: 'nowrap' }}>
                        {item.created ? new Date(item.created).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        }) : '—'}
                      </span>
                    </div>

                    {/* Respons pengurus */}
                    {item.respons && (
                      <div style={{
                        marginTop: 10, padding: '10px 12px',
                        background: '#F8FAFC', borderRadius: 10,
                        borderLeft: '3px solid #15935A',
                      }}>
                        <div style={{
                          fontSize: 10, fontWeight: 700, color: '#15935A',
                          marginBottom: 3, textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}>
                          Tanggapan Pengurus
                        </div>
                        <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.45 }}>
                          {item.respons}
                        </div>
                      </div>
                    )}

                    {/* Tombol Edit (pengurus only) */}
                    {isPengurus && (
                      <button
                        onClick={() => openEdit(item)}
                        style={{
                          marginTop: 10, padding: '8px 14px',
                          background: '#EFF1F0', color: '#1B211E',
                          border: 'none', borderRadius: 10,
                          fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          minHeight: 40, display: 'inline-flex',
                          alignItems: 'center', gap: 6,
                          transition: 'background 0.15s',
                        }}
                        onPointerDown={e => e.currentTarget.style.background = '#E2E8F0'}
                        onPointerUp={e => e.currentTarget.style.background = '#EFF1F0'}
                        onPointerLeave={e => e.currentTarget.style.background = '#EFF1F0'}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M10 1.5L12.5 4L4.5 12H2V9.5L10 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Edit / Tanggapi
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── FULL-SCREEN IMAGE PREVIEW ── */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.94)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <button
            onClick={() => setPreviewImage(null)}
            aria-label="Tutup"
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(255,255,255,0.15)',
              border: 'none', borderRadius: '50%',
              width: 48, height: 48, minHeight: 48,
              color: '#fff', fontSize: 20,
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              zIndex: 10000, backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 4L16 16M16 4L4 16" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <img
            src={previewImage}
            alt="Preview Laporan"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '100%', maxHeight: '88vh', borderRadius: 14,
              objectFit: 'contain', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          />
        </div>
      )}

      {/* ── BOTTOM SHEET EDIT MODAL ── */}
      {editModal && (
        <div className="modal-backdrop" onClick={() => !saving && setEditModal(null)}>
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{
              maxHeight: '70vh',
              animation: 'slideUp 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          >
            <div className="modal-header">
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Edit Laporan</h3>
              <button
                className="close-btn"
                onClick={() => setEditModal(null)}
                disabled={saving}
                style={{ minHeight: 44, minWidth: 44 }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px 20px 8px' }}>
              {/* Info warga */}
              <div style={{
                background: '#F4F6F4', borderRadius: 12, padding: '12px 14px',
                marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: '#15935A', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 14, flexShrink: 0,
                }}>
                  {editModal.expand?.warga?.no_rumah?.slice(-2) || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1B211E' }}>
                    {editModal.expand?.warga?.expand?.user?.name || 'Warga'}
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7B72' }}>
                    No. {editModal.expand?.warga?.no_rumah}
                  </div>
                </div>
                <StatusBadge status={editModal.status} />
              </div>

              {/* Status selector */}
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  fontSize: 12, fontWeight: 700, color: '#475569',
                  display: 'block', marginBottom: 8,
                }}>
                  Status Laporan
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['Menunggu Konfirmasi', 'Diproses', 'Selesai', 'Ditolak'].map(s => (
                    <button
                      key={s}
                      onClick={() => setEditStatus(s)}
                      style={{
                        flex: 1, padding: '10px 6px', minHeight: 44,
                        border: editStatus === s ? '2px solid #15935A' : '1.5px solid #E6EBE7',
                        borderRadius: 12, background: editStatus === s ? '#E8F5EE' : '#fff',
                        color: editStatus === s ? '#15935A' : '#6B7B72',
                        fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        fontFamily: 'inherit', textAlign: 'center',
                        transition: 'all 0.15s', lineHeight: 1.2,
                      }}
                    >
                      {s === 'Menunggu Konfirmasi' ? 'Menunggu' : s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea tanggapan */}
              <div style={{ marginBottom: 12 }}>
                <label style={{
                  fontSize: 12, fontWeight: 700, color: '#475569',
                  display: 'block', marginBottom: 8,
                }}>
                  Tanggapan <span style={{ fontWeight: 400, color: '#8A9991' }}>(opsional)</span>
                </label>
                <textarea
                  ref={textareaRef}
                  value={editRespons}
                  onChange={e => setEditRespons(e.target.value)}
                  placeholder="Tulis tanggapan untuk warga..."
                  rows={3}
                  style={{
                    width: '100%', padding: '12px 14px', minHeight: 80,
                    borderRadius: 12, border: '1.5px solid #E6EBE7',
                    fontSize: 15, fontFamily: 'inherit', color: '#1B211E',
                    background: '#fff', resize: 'none',
                    lineHeight: 1.5,
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#15935A'}
                  onBlur={e => e.target.style.borderColor = '#E6EBE7'}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer" style={{
              display: 'flex', gap: 10, padding: '12px 20px',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 12px)',
            }}>
              <button
                onClick={() => setEditModal(null)}
                disabled={saving}
                className="btn"
                style={{
                  flex: 1, background: '#F0F2F0', color: '#475569',
                  border: 'none', borderRadius: 14, fontSize: 15,
                  fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  minHeight: 50,
                }}
              >
                Batal
              </button>
              <button
                onClick={handleUpdateReport}
                disabled={saving}
                className="btn btn-primary"
                style={{
                  flex: 1.5, borderRadius: 14, fontSize: 15,
                  fontWeight: 700, minHeight: 50,
                  opacity: saving ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8,
                }}
              >
                {saving ? (
                  <>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%',
                      border: '2.5px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      animation: 'spin 0.6s linear infinite',
                      display: 'inline-block',
                    }} />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Perubahan'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>

      <BottomNav />
    </div>
  );
}
