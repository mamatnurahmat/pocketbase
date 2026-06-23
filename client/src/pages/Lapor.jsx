import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import BottomNav from '../components/BottomNav';

export default function Lapor() {
  const navigate = useNavigate();
  const [warga, setWarga] = useState(null);
  const [isScurity] = useState(() => localStorage.getItem('isScurity') === 'true');
  const [jenis, setJenis] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchWarga = async () => {
      try {
        const userId = pb.authStore.model.id;
        const w = await pb.collection('warga').getFirstListItem(`user="${userId}"`);
        setWarga(w);
      } catch (e) {
        console.warn("Warga not found:", e);
      }
    };
    if (pb.authStore.isValid) fetchWarga();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!foto) return setMessage({ type: 'error', text: 'Mohon sertakan foto laporan.' });

    setLoading(true);
    setMessage(null);

    try {
      if (isScurity) {
        const formData = new FormData();
        const keteranganFinal = jenis === 'lainnya' ? keterangan : jenis;
        formData.append('jenis', jenis);
        formData.append('keterangan', keteranganFinal);
        formData.append('foto', foto);
        formData.append('dibuat_oleh', pb.authStore.model.id);
        await pb.collection('laporan_scurity').create(formData);
      } else {
        const formData = new FormData();
        if (warga) formData.append('warga', warga.id);
        formData.append('keterangan', keterangan);
        formData.append('foto', foto);
        formData.append('status', 'Menunggu Konfirmasi');

        const laporRecord = await pb.collection('lapor').create(formData);
        
        try {
          const previewText = keterangan.length > 50 ? keterangan.substring(0, 47) + '...' : keterangan;
          const logDetail = `Tujuan Koleksi: lapor\nID Record: ${laporRecord.id}\nOleh: ${warga ? 'Warga ' + warga.no_rumah : pb.authStore.model?.name}\nWaktu: ${new Date().toLocaleString('id-ID')}\nKeterangan: Laporan - ${previewText}`;
          
          await pb.collection('aktivitas_warga').create({
            warga: warga.id,
            aktivitas: 'Membuat Laporan',
            detail: logDetail
          });
        } catch (logErr) {
          console.warn('Gagal mencatat log aktivitas:', logErr);
        }
      }

      setMessage({ type: 'success', text: 'Laporan berhasil dikirim!' });
      setJenis('');
      setKeterangan('');
      setFoto(null);
      setPreview(null);
      
      // Navigate to dashboard or somewhere else if desired
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Gagal mengirim laporan.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-padded">
      {/* Header */}
      <div className="header-green">
        <div className="header-row">
          <div>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, fontWeight: 500 }}>Warga P2S</div>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Lapor</div>
          </div>
          <div className="avatar avatar-green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 14V6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V14C20 15.1046 19.1046 16 18 16H8L4 20V14Z" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="10" r="1" fill="#fff"/>
            </svg>
          </div>
        </div>
      </div>

      <div className="page-content" style={{ marginTop: -20 }}>
        <div className="card" style={{ padding: '24px 20px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F1A14', marginBottom: 8 }}>Form Laporan</h2>
          <p style={{ fontSize: 13, color: '#6B7B72', lineHeight: 1.5, marginBottom: 20 }}>
            Sampaikan keluhan atau informasi. Sertakan foto yang jelas.
          </p>

          {message && (
            <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: 20 }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex-col" style={{ gap: 20 }}>
            <div className="form-group">
              <label>Foto (Kamera / Galeri)</label>
              <div 
                style={{ 
                  border: '2px dashed #E2E8F0', borderRadius: 12, padding: preview ? 8 : 30, 
                  textAlign: 'center', background: '#F8FAFC', position: 'relative', overflow: 'hidden'
                }}
              >
                {preview ? (
                  <div style={{ position: 'relative' }}>
                    <img src={preview} alt="Preview" style={{ width: '100%', borderRadius: 8, maxHeight: 300, objectFit: 'cover' }} />
                    <button 
                      type="button" onClick={() => { setFoto(null); setPreview(null); }}
                      style={{
                        position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', border: 'none', 
                        color: '#fff', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer'
                      }}
                    >✕</button>
                  </div>
                ) : (
                  <>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 12px' }}>
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="13" r="4" stroke="#94A3B8" strokeWidth="2"/>
                    </svg>
                    <div style={{ fontSize: 14, color: '#475569', fontWeight: 500 }}>Ketuk untuk Ambil Foto</div>
                  </>
                )}
                <input 
                  type="file" accept="image/*" capture="environment" onChange={handleFileChange}
                  style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    opacity: 0, cursor: 'pointer', display: preview ? 'none' : 'block'
                  }}
                />
              </div>
            </div>

            <div className="form-group">
              {isScurity ? (
                <>
                  <label>Jenis Laporan</label>
                  <select
                    className="form-control"
                    value={jenis}
                    onChange={(e) => { setJenis(e.target.value); setKeterangan(''); }}
                    required
                  >
                    <option value="">-- Pilih --</option>
                    <option value="absen">Absen</option>
                    <option value="patroli">Patroli</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                  {jenis === 'lainnya' && (
                    <textarea
                      className="form-control" style={{ minHeight: 100, resize: 'vertical', marginTop: 10 }}
                      placeholder="Deskripsikan laporan Anda di sini..."
                      value={keterangan} onChange={(e) => setKeterangan(e.target.value)} required
                    />
                  )}
                </>
              ) : (
                <>
                  <label>Keterangan Laporan</label>
                  <textarea
                    className="form-control" style={{ minHeight: 120, resize: 'vertical' }}
                    placeholder="Deskripsikan laporan Anda di sini..."
                    value={keterangan} onChange={(e) => setKeterangan(e.target.value)} required
                  />
                </>
              )}
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading || (isScurity ? !jenis : !keterangan) || !foto}>
              {loading ? 'Mengirim...' : 'Kirim Laporan'}
            </button>
          </form>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
