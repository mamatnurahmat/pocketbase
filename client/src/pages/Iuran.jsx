import { useState, useEffect, useRef } from 'react';
import { pb, API_URL } from '../lib/pocketbase';
export default function Iuran() {
  const [warga, setWarga] = useState(null);
  const [iuranList, setIuranList] = useState([]);
  const [selectedIurans, setSelectedIurans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [uploadFile, setUploadFile] = useState(null);
  const fileInputRef = useRef(null);

  const rupiah = (n) => { let v = n || 0; if (v < 1) v = 0; return 'Rp ' + v.toLocaleString('id-ID'); };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userId = pb.authStore.model.id;
        let w = null;
        try {
          w = await pb.collection('warga').getFirstListItem(`user="${userId}"`);
          setWarga(w);
        } catch (err) {
          setMessage({ text: 'Akun belum terhubung dengan data warga.', type: 'error' });
        }

        // Ambil semua iuran
        const iurans = await pb.collection('iuran').getFullList({ sort: 'kode' });

        // Filter: sembunyikan iuran yang sudah Lunas atau Menunggu Konfirmasi
        let availableIurans = iurans;
        if (w?.id) {
          try {
            const existingTagihan = await pb.collection('tagihan').getFullList({
              filter: `warga="${w.id}"`,
            });
            const paidIuranIds = new Set(
              existingTagihan
                .filter(t => t.iuran && ['Lunas', 'Menunggu Konfirmasi'].includes(t.status_pembayaran))
                .map(t => t.iuran)
            );
            availableIurans = iurans.filter(i => !paidIuranIds.has(i.id));
          } catch (e) {
            console.warn('Gagal cek tagihan existing:', e);
          }
        }

        setIuranList(availableIurans);
      } catch (err) {
        console.error("Failed to fetch data", err);
      }
    };
    if (pb.authStore.isValid) fetchData();
  }, []);

  const toggleIuran = (id) => {
    setSelectedIurans(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIurans.length === iuranList.length) {
      setSelectedIurans([]);
    } else {
      setSelectedIurans(iuranList.map(i => i.id));
    }
  };

  const totalSelected = selectedIurans.reduce((sum, id) => {
    const i = iuranList.find(x => x.id === id);
    return sum + (i?.nominal || 0);
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!warga) return setMessage({ text: 'Data warga tidak ditemukan.', type: 'error' });
    if (selectedIurans.length === 0) return setMessage({ text: 'Pilih minimal satu iuran.', type: 'error' });
    if (!uploadFile) return setMessage({ text: 'Pilih file bukti pembayaran.', type: 'error' });

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      // Upload langsung ke PocketBase (skip Flask API agar lebih cepat)
      const lampiran = await pb.collection('lampiran').create({
        warga: warga.id,
        iuran: selectedIurans,
        file_bukti: uploadFile,
        approval: false,
      });
      const lampiranId = lampiran.id;

      // Buat tagihan untuk setiap iuran yang dipilih
      let tagihanCount = 0;
      for (const iuranId of selectedIurans) {
        const iuran = iuranList.find(i => i.id === iuranId);
        if (!iuran) continue;

        // Cek apakah sudah ada tagihan untuk iuran ini
        const existing = await pb.collection('tagihan').getFullList({
          filter: `warga="${warga.id}" && iuran="${iuranId}"`,
          perPage: 1,
        });

        if (existing.length > 0) {
          // Update existing
          await pb.collection('tagihan').update(existing[0].id, {
            lampiran: lampiranId,
            status_pembayaran: 'Menunggu Konfirmasi',
          });
        } else {
          // Buat baru
          await pb.collection('tagihan').create({
            warga: warga.id,
            iuran: iuranId,
            nominal: iuran.nominal,
            jatuh_tempo: iuran.jatuh_tempo || new Date().toISOString(),
            status_pembayaran: 'Menunggu Konfirmasi',
            lampiran: lampiranId,
          });
        }
        tagihanCount++;
      }

      // Catat aktivitas
      try {
        const codes = selectedIurans.map(id => {
          const i = iuranList.find(x => x.id === id);
          return i ? i.kode : id;
        }).join(', ');
        await pb.collection('aktivitas_warga').create({
          warga: warga.id,
          aktivitas: 'Upload Bukti Pembayaran',
          detail: `Iuran ${codes} - ID: ${lampiranId}`,
        });
      } catch (_) {}

      setMessage({ text: `Berhasil upload! ${tagihanCount} tagihan dibuat.`, type: 'success' });
      setSelectedIurans([]);
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setMessage({ text: 'Gagal upload. ' + err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-padded">
      <div style={{ padding: '16px 20px 0' }}>
        <h2>Upload Bukti Pembayaran</h2>
      </div>

      <div className="page-content" style={{ marginTop: 16 }}>
        {/* Warga Info */}
        {warga ? (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="list-icon" style={{ background: '#E8F5EE' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M5 12.5l4.5 4.5L19 7" stroke="#15935A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="list-body">
              <span className="list-title">Data warga terhubung</span>
              <span className="list-sub">No. Rumah: {warga.no_rumah}</span>
            </div>
          </div>
        ) : (
          <div className="alert alert-warning">
            ⚠️ Akun belum terhubung data warga. Hubungi admin.
          </div>
        )}

        {message.text && (
          <div className={`alert mt-2 ${message.type === 'error' ? 'alert-error' : 'alert-success'}`}>
            {message.text}
          </div>
        )}

        {/* Summary Card */}
        {iuranList.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
            <div className="card-green" style={{ padding: 14 }}>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 600 }}>Iuran tersedia</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{iuranList.length}</div>
              <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>belum dibayar</div>
            </div>
            <div className="card" style={{ padding: 14, border: '1.5px solid #E6EBE7' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7B72' }}>Total dipilih</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: selectedIurans.length > 0 ? '#15935A' : '#8A9991', marginTop: 4 }}>
                {selectedIurans.length > 0 ? rupiah(totalSelected) : '-'}
              </div>
              <div style={{ fontSize: 11, color: '#8A9991', marginTop: 2 }}>{selectedIurans.length} iuran</div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
          {/* Iuran List - Inline Checkbox */}
          <div className="form-group">
            <label>Pilih Iuran yang Dibayar</label>

            {iuranList.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 30, color: '#8A9991', fontSize: 13 }}>
                <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.4 }}>✅</div>
                Semua iuran sudah dibayar atau menunggu konfirmasi.
              </div>
            ) : (
              <>
                {/* Select All / Deselect All */}
                <button type="button" onClick={selectAll}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 20, border: '1.5px solid #E6EBE7',
                    background: selectedIurans.length === iuranList.length ? '#E8F5EE' : '#fff',
                    color: selectedIurans.length === iuranList.length ? '#15935A' : '#6B7B72',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    marginBottom: 10,
                  }}
                >
                  {selectedIurans.length === iuranList.length ? '✓ Batalkan Semua' : '☐ Pilih Semua'}
                </button>

                {/* Iuran List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {iuranList.map((iuran) => {
                    const checked = selectedIurans.includes(iuran.id);
                    return (
                      <div key={iuran.id} onClick={() => toggleIuran(iuran.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '14px 16px', cursor: 'pointer', borderRadius: 14,
                          background: checked ? '#F0FBF4' : '#fff',
                          border: checked ? '1.5px solid #15935A' : '1.5px solid #E6EBE7',
                          transition: 'all 0.15s',
                        }}
                      >
                        <span style={{
                          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                          border: checked ? 'none' : '2px solid #D5DCD7',
                          background: checked ? '#15935A' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {checked && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                              <path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F1A14' }}>{iuran.kode}</div>
                          <div style={{ fontSize: 12, color: '#6B7B72', marginTop: 2 }}>
                            {rupiah(iuran.nominal)}
                            {iuran.jatuh_tempo && <> · Jatuh: {new Date(iuran.jatuh_tempo).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</>}
                          </div>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: checked ? '#15935A' : '#8A9991' }}>
                          {rupiah(iuran.nominal)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* File Upload - Dropzone */}
          <div className="form-group">
            <label>File Bukti Pembayaran</label>
            <div onClick={() => fileInputRef.current?.click()}
              style={{
                border: uploadFile ? '2px solid #15935A' : '2px dashed #15935A',
                borderRadius: 14, padding: 28, textAlign: 'center', cursor: 'pointer',
                background: uploadFile ? '#F0FBF4' : '#FAFCFA',
                transition: 'all 0.2s',
              }}
            >
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                onChange={e => setUploadFile(e.target.files[0] || null)}
              />
              {uploadFile ? (
                <div>
                  <span style={{ fontSize: 32 }}>📄</span>
                  <div style={{ color: '#15935A', fontWeight: 700, fontSize: 14, marginTop: 4 }}>{uploadFile.name}</div>
                  <div style={{ fontSize: 11, color: '#6B7B72', marginTop: 2 }}>Klik untuk ganti file</div>
                </div>
              ) : (
                <div>
                  <span style={{ fontSize: 36 }}>📤</span>
                  <div style={{ color: '#15935A', fontWeight: 700, fontSize: 14, marginTop: 4 }}>Klik untuk upload file</div>
                  <div style={{ color: '#8A9991', fontSize: 12, marginTop: 4 }}>Format: JPG, PNG, PDF (maks 5MB)</div>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" className="btn btn-primary"
            disabled={loading || !warga || selectedIurans.length === 0 || !uploadFile}
            style={{ width: '100%', opacity: (loading || !warga || selectedIurans.length === 0 || !uploadFile) ? 0.6 : 1 }}
          >
            {loading ? '⏳ Mengupload...' : '📤 Upload Bukti Pembayaran'}
          </button>

          {selectedIurans.length > 0 && uploadFile && (
            <div style={{ textAlign: 'center', fontSize: 11, color: '#6B7B72', marginTop: 8 }}>
              {selectedIurans.length} iuran · Total {rupiah(totalSelected)}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}