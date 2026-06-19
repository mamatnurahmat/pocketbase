import { useState, useEffect, useRef } from 'react';
import { pb } from '../lib/pocketbase';
import BottomNav from '../components/BottomNav';

export default function Iuran() {
  const [warga, setWarga] = useState(null);
  const [iuranList, setIuranList] = useState([]);
  const [selectedIurans, setSelectedIurans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const rupiah = (n) => 'Rp ' + (n || 0).toLocaleString('id-ID');

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
        const iurans = await pb.collection('iuran').getFullList();
        setIuranList(iurans);
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
      const generateId = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < 15; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
        return id;
      };
      formData.append('id', generateId());
      formData.append('warga', warga.id);
      formData.append('iuran', JSON.stringify(selectedIurans));
      formData.append('file_bukti', file);
      formData.append('approval', false);

      const lampiranRecord = await pb.collection('lampiran').create(formData);

      const tagihanPromises = selectedIurans.map(iuranId => {
        const iuranData = iuranList.find(x => x.id === iuranId);
        return pb.collection('tagihan').create({
          warga: warga.id,
          jatuh_tempo: new Date().toISOString(),
          nominal: iuranData?.nominal || 0,
          status_pembayaran: "Menunggu Konfirmasi",
          iuran: iuranId
        });
      });
      await Promise.all(tagihanPromises);

      // Tambahkan post ke logs
      try {
        const iuranCodes = selectedIurans.map(id => {
          const iData = iuranList.find(x => x.id === id);
          return iData ? iData.kode : id;
        }).join(', ');
        
        const logDetail = `Tujuan Koleksi: lampiran\nID Record: ${lampiranRecord.id}\nOleh: Warga ${warga.no_rumah}\nWaktu: ${new Date().toLocaleString('id-ID')}\nKeterangan: Iuran ${iuranCodes}`;
        
        await pb.collection('aktivitas_warga').create({
          warga: warga.id,
          aktivitas: 'Upload Bukti Pembayaran',
          detail: logDetail
        });
      } catch (logErr) {
        console.warn("Gagal mencatat log aktivitas:", logErr);
      }

      setMessage({ text: 'Bukti pembayaran berhasil diupload!', type: 'success' });
      setSelectedIurans([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      let detail = '';
      if (err.response?.data) {
        detail = Object.entries(err.response.data).map(([k, v]) => `${k}: ${v.message}`).join(' | ');
      }
      setMessage({ text: `Gagal upload. ${detail}`, type: 'error' });
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
            <div className="modal-body">
              {iuranList.map((iuran) => {
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
              })}
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

      <BottomNav />
    </div>
  );
}
