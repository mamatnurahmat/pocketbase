import { useState, useEffect, useRef } from 'react';
import { pb, API_URL } from '../lib/pocketbase';
export default function Iuran() {
  const [warga, setWarga] = useState(null);
  const [iuranList, setIuranList] = useState([]);
  const [selectedIurans, setSelectedIurans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadedIuranIds, setLoadedIuranIds] = useState([]);
  const fileInputRef = useRef(null);

  // ponytail: PocketBase v0.39 rejects balance=0, use 0.01 as sentinel; mask to 0
  const rupiah = (n) => { var v = n || 0; if (v < 1) v = 0; return 'Rp ' + v.toLocaleString('id-ID'); };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userId = pb.authStore.model.id;
        try {
          const w = await pb.collection('warga').getFirstListItem(`user="${userId}"`);
          setWarga(w);
        } catch (err) {
          setMessage({ text: 'Akun belum terhubung dengan data warga.', type: 'error' });
        }
        // Ambil semua iuran
        const iurans = await pb.collection('iuran').getFullList();

        // Ambil tagihan existing warga ini, filter iuran yg sudah ada tagihan
        let availableIurans = iurans;
        if (w?.id) {
          try {
            const existingTagihan = await pb.collection('tagihan').getFullList({
              filter: `warga="${w.id}"`,
            });
            const paidIuranIds = new Set(
              existingTagihan
                .filter(t => t.iuran)
                .map(t => t.iuran)
            );
            availableIurans = iurans.filter(i => !paidIuranIds.has(i.id));
          } catch (e) {
            console.warn('Gagal cek tagihan existing:', e);
          }
        }

        setIuranList(availableIurans);
        setLoadedIuranIds(availableIurans.map(i => i.id));
      } catch (err) {
        console.error("Failed to fetch data", err);
      }
    };
    if (pb.authStore.isValid) fetchData();
  }, []);

  const handleIuranChange = (id) => {
    setSelectedIurans(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const getSelectedText = () => {
    if (selectedIurans.length === 0) return "Pilih iuran yang dibayar";
    if (selectedIurans.length === 1) {
      const i = iuranList.find(x => x.id === selectedIurans[0]);
      return i ? i.kode : "1 iuran dipilih";
    }
    return `${selectedIurans.length} iuran dipilih`;
  };

  // Filter selectedIurans jika iuran tiba-tiba dihapus dari list
  useEffect(() => {
    setSelectedIurans(prev => prev.filter(id => loadedIuranIds.includes(id)));
  }, [loadedIuranIds]);

  const totalSelected = selectedIurans.reduce((sum, id) => {
    const i = iuranList.find(x => x.id === id);
    return sum + (i?.nominal || 0);
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!warga) return setMessage({ text: 'Data warga tidak ditemukan.', type: 'error' });
    if (selectedIurans.length === 0) return setMessage({ text: 'Pilih minimal satu iuran.', type: 'error' });
    const file = fileInputRef.current?.files[0];
    if (!file) return setMessage({ text: 'Pilih file bukti pembayaran.', type: 'error' });

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const formData = new FormData();
      formData.append('warga_id', warga.id);
      selectedIurans.forEach(id => formData.append('iuran_ids[]', id));
      formData.append('file_bukti', file);

      const res = await fetch(`${API_URL}/v1/iuran/upload-bukti`, {
        method: 'POST',
        headers: { 'Authorization': pb.authStore.token },
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.message || `HTTP ${res.status}`);
      }

      const result = await res.json();

      setMessage({ text: result.message || 'Bukti pembayaran berhasil diupload!', type: 'success' });
      setSelectedIurans([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setMessage({ text: `Gagal upload. ${err.message}`, type: 'error' });
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

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
          {/* Iuran Selector */}
          <div className="form-group">
            <label>Iuran yang dibayar</label>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              disabled={iuranList.length === 0}
              style={{
                width: '100%',
                height: 54,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
                background: '#fff',
                border: '1.5px solid #E6EBE7',
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 600,
                color: selectedIurans.length > 0 ? '#0F1A14' : '#8A9991',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <span>{getSelectedText()}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 5l7 7-7 7" stroke="#A6B0AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {selectedIurans.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: '#15935A' }}>
                Total: {rupiah(totalSelected)}
              </div>
            )}
          </div>

          {/* File Input */}
          <div className="form-group">
            <label>File bukti (Gambar / PDF)</label>
            <input
              type="file"
              ref={fileInputRef}
              className="form-control"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              required
              style={{ padding: '14px 16px', height: 'auto' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !warga || selectedIurans.length === 0}
          >
            {loading ? 'Mengupload...' : 'Upload bukti pembayaran'}
          </button>
        </form>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Pilih Iuran</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <div style={{ padding: '0 20px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setSelectedIurans(iuranList.map(i => i.id))}
                style={{
                  flex: 'none',
                  border: selectedIurans.length === iuranList.length ? '1.5px solid #15935A' : '1.5px solid #E6EBE7',
                  background: selectedIurans.length === iuranList.length ? '#E8F5EE' : '#fff',
                  color: selectedIurans.length === iuranList.length ? '#15935A' : '#6B7B72',
                  padding: '8px 16px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {selectedIurans.length === iuranList.length ? '✓ Semua' : '☐ Pilih Semua'}
              </button>
              {selectedIurans.length > 0 && selectedIurans.length < iuranList.length && (
                <button
                  type="button"
                  onClick={() => setSelectedIurans([])}
                  style={{
                    flex: 'none',
                    border: '1.5px solid #E8E5E4',
                    background: '#fff',
                    color: '#B04141',
                    padding: '8px 16px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  ✕ Hapus Semua
                </button>
              )}
            </div>
            <div className="modal-body">
              {iuranList.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#8A9991', fontSize: 13 }}>
                  Semua iuran sudah dibayar atau menunggu konfirmasi.
                </div>
              ) : (
                iuranList.map((iuran) => {
                const checked = selectedIurans.includes(iuran.id);
                return (
                  <label
                    key={iuran.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      cursor: 'pointer',
                      marginBottom: 10,
                      padding: '14px 16px',
                      background: checked ? '#E8F5EE' : '#fff',
                      border: checked ? '1.5px solid #15935A' : '1.5px solid #E6EBE7',
                      borderRadius: 16,
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleIuranChange(iuran.id)}
                      style={{ display: 'none' }}
                    />
                    <span style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      border: checked ? 'none' : '2px solid #D5DCD7',
                      background: checked ? '#15935A' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {checked && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: '#0F1A14' }}>{iuran.kode}</span>
                      <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: '#8A9991' }}>
                        {rupiah(iuran.nominal)} {iuran.keterangan && `· ${iuran.keterangan}`}
                      </span>
                    </span>
                  </label>
                );
              }))}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => setIsModalOpen(false)}
              >
                Selesai ({selectedIurans.length} dipilih)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
