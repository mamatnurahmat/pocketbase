import { useState, useEffect, useRef } from 'react';
import { pb } from '../lib/pocketbase';

// ── Toast ──
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2800);
    return () => clearTimeout(t);
  }, [onClose]);
  const bg = type === 'success' ? '#15935A' : type === 'error' ? '#C24A4A' : '#1B211E';
  return (
    <div style={{
      position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
      zIndex: 99999, background: bg, color: '#fff',
      padding: '14px 24px', borderRadius: 14, fontSize: 14, fontWeight: 600,
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      maxWidth: 360, width: 'calc(100% - 40px)',
      textAlign: 'center', animation: 'fadeInUp 0.25s ease',
    }}>
      {message}
    </div>
  );
}

const labelJenis = { absen: 'Absen', patroli: 'Patroli', lainnya: 'Lainnya' };
const colorJenis = {
  absen:   { bg: '#E8F5EE', color: '#15935A' },
  patroli: { bg: '#E3F2FD', color: '#1976D2' },
  lainnya: { bg: '#FFF3E0', color: '#E65100' }
};

const formatDate = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

export default function LaporanScurity() {
  const [laporanList, setLaporanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);
  const [toast, setToast] = useState(null);

  // ── Upload form state ──
  const [showForm, setShowForm] = useState(false);
  const [jenis, setJenis] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
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

  useEffect(() => {
    if (pb.authStore.isValid) fetchData();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFoto(file);
      setFotoPreview(URL.createObjectURL(file));
    }
  };

  const resetForm = () => {
    setJenis('');
    setKeterangan('');
    setFoto(null);
    setFotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jenis) return setToast({ message: 'Pilih jenis laporan terlebih dahulu.', type: 'error' });
    if (!foto) return setToast({ message: 'Mohon sertakan foto laporan.', type: 'error' });

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('jenis', jenis);
      const keteranganFinal = jenis === 'lainnya' ? keterangan : labelJenis[jenis] || jenis;
      formData.append('keterangan', keteranganFinal);
      formData.append('foto', foto);
      formData.append('dibuat_oleh', pb.authStore.model.id);

      await pb.collection('laporan_scurity').create(formData);
      setToast({ message: 'Laporan berhasil dikirim! ✓', type: 'success' });
      resetForm();
      setShowForm(false);
      await fetchData(); // refresh list
    } catch (err) {
      console.error('Gagal upload laporan scurity:', err);
      setToast({ message: 'Gagal mengirim laporan. Coba lagi.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Stats ──
  const stats = {
    total: laporanList.length,
    absen: laporanList.filter(l => l.jenis === 'absen').length,
    patroli: laporanList.filter(l => l.jenis === 'patroli').length,
  };

  return (
    <div className="page-padded" style={{ paddingBottom: 'calc(var(--nav-height) + 16px)' }}>
      {/* Header */}
      <div className="header-green">
        <div className="header-row">
          <div>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, fontWeight: 500 }}>Warga P2S</div>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Laporan Scurity</div>
          </div>
          {/* Tombol tambah laporan */}
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              background: showForm ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
              border: '1.5px solid rgba(255,255,255,0.35)',
              color: '#fff', padding: '9px 16px',
              borderRadius: 20, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', minHeight: 44,
              display: 'flex', alignItems: 'center', gap: 6,
              backdropFilter: 'blur(6px)',
            }}
          >
            {showForm ? (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2L12 12M12 2L2 12" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Tutup
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2v10M2 7h10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Tambah
              </>
            )}
          </button>
        </div>

        {/* Stat chips */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {[
            { label: 'Total', val: stats.total, bg: 'rgba(255,255,255,0.18)' },
            { label: 'Absen', val: stats.absen, bg: 'rgba(21,147,90,0.35)' },
            { label: 'Patroli', val: stats.patroli, bg: 'rgba(25,118,210,0.35)' },
          ].map(s => (
            <div key={s.label} style={{
              background: s.bg, borderRadius: 10,
              padding: '6px 12px', textAlign: 'center',
            }}>
              <div style={{ color: '#fff', fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>{s.val}</div>
              <div style={{ color: 'rgba(255,255,255,.75)', fontSize: 10, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="page-content" style={{ marginTop: -20 }}>

        {/* ── FORM UPLOAD LAPORAN ── */}
        {showForm && (
          <div className="card" style={{ padding: '20px', marginBottom: 16, animation: 'fadeInDown 0.25s ease' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F1A14', marginBottom: 16 }}>
              📝 Buat Laporan Baru
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Jenis */}
              <div className="form-group" style={{ margin: 0 }}>
                <label>Jenis Laporan</label>
                <select
                  className="form-control"
                  value={jenis}
                  onChange={(e) => { setJenis(e.target.value); setKeterangan(''); }}
                  required
                >
                  <option value="">-- Pilih Jenis --</option>
                  <option value="absen">Absen</option>
                  <option value="patroli">Patroli</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>

              {/* Keterangan (hanya jika lainnya) */}
              {jenis === 'lainnya' && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Keterangan</label>
                  <textarea
                    className="form-control"
                    style={{ minHeight: 90, resize: 'vertical' }}
                    placeholder="Deskripsikan laporan Anda..."
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Foto */}
              <div className="form-group" style={{ margin: 0 }}>
                <label>Foto Bukti</label>
                <div style={{
                  border: '2px dashed #D1D8D3', borderRadius: 12,
                  padding: fotoPreview ? 8 : 28, textAlign: 'center',
                  background: '#F8FAFC', position: 'relative', overflow: 'hidden',
                  cursor: 'pointer',
                }}>
                  {fotoPreview ? (
                    <div style={{ position: 'relative' }}>
                      <img src={fotoPreview} alt="Preview" style={{
                        width: '100%', borderRadius: 8,
                        maxHeight: 240, objectFit: 'cover'
                      }} />
                      <button
                        type="button"
                        onClick={() => { setFoto(null); setFotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        style={{
                          position: 'absolute', top: 8, right: 8,
                          background: 'rgba(0,0,0,0.55)', border: 'none',
                          color: '#fff', borderRadius: '50%',
                          width: 30, height: 30, cursor: 'pointer',
                          fontSize: 14,
                        }}
                      >✕</button>
                    </div>
                  ) : (
                    <>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 10px', display: 'block' }}>
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="13" r="4" stroke="#94A3B8" strokeWidth="2"/>
                      </svg>
                      <div style={{ fontSize: 14, color: '#475569', fontWeight: 500 }}>Ketuk untuk Ambil Foto</div>
                      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>atau pilih dari galeri</div>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    style={{
                      position: 'absolute', top: 0, left: 0,
                      width: '100%', height: '100%',
                      opacity: 0, cursor: 'pointer',
                      display: fotoPreview ? 'none' : 'block'
                    }}
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || !jenis || !foto || (jenis === 'lainnya' && !keterangan)}
                style={{ minHeight: 50, fontSize: 15, fontWeight: 700 }}
              >
                {submitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%',
                      border: '2.5px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      animation: 'spin 0.6s linear infinite',
                      display: 'inline-block',
                    }} />
                    Mengirim...
                  </span>
                ) : '🚀 Kirim Laporan'}
              </button>
            </form>
          </div>
        )}

        {/* ── LIST LAPORAN ── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '3px solid #E6EBE7', borderTopColor: '#15935A',
              animation: 'spin 0.7s linear infinite',
            }} />
            <span style={{ fontSize: 13, color: '#8A9991', fontWeight: 600 }}>Memuat laporan...</span>
          </div>
        )}

        {!loading && laporanList.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '48px 20px', color: '#8A9991', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: '#EFF1F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🛡️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1B211E' }}>Belum Ada Laporan</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, maxWidth: 260 }}>
              Belum ada laporan keamanan. Tekan <strong>Tambah</strong> untuk membuat laporan baru.
            </div>
          </div>
        )}

        {!loading && laporanList.length > 0 && (
          <div className="flex-col" style={{ gap: 12 }}>
            {laporanList.map((l) => {
              const jc = colorJenis[l.jenis] || { bg: '#EFF1F0', color: '#1B211E' };
              return (
                <div key={l.id} className="card" style={{ padding: '16px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: l.foto ? 12 : 0 }}>
                    {/* Badge Jenis */}
                    <span style={{
                      background: jc.bg, color: jc.color,
                      padding: '5px 12px', borderRadius: 12,
                      fontSize: 12, fontWeight: 700, flexShrink: 0,
                    }}>
                      {labelJenis[l.jenis] || l.jenis}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {l.keterangan && l.jenis === 'lainnya' && (
                        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.45 }}>
                          {l.keterangan}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: '#8A9991', marginTop: 2 }}>
                        {l.expand?.dibuat_oleh?.name || l.expand?.dibuat_oleh?.email || 'Scurity'}
                        &nbsp;·&nbsp;{formatDate(l.created)}
                      </div>
                    </div>
                  </div>

                  {l.foto && (
                    <img
                      src={pb.files.getUrl(l, l.foto, { thumb: '480x360' })}
                      alt="laporan"
                      onClick={() => setPreviewImage(pb.files.getUrl(l, l.foto))}
                      style={{
                        width: '100%', borderRadius: 10,
                        maxHeight: 200, objectFit: 'cover',
                        cursor: 'pointer',
                        border: '1px solid #EFF1F0',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── FULL-SCREEN IMAGE PREVIEW ── */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.94)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16, animation: 'fadeIn 0.15s ease',
          }}
        >
          <button
            onClick={() => setPreviewImage(null)}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(255,255,255,0.15)',
              border: 'none', borderRadius: '50%',
              width: 48, height: 48, color: '#fff', fontSize: 20,
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 4L16 16M16 4L4 16" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <img
            src={previewImage}
            alt="Preview"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '100%', maxHeight: '88vh',
              borderRadius: 14, objectFit: 'contain',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          />
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}