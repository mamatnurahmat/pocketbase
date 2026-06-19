import { useState, useEffect, useRef } from 'react';
import { pb } from '../lib/pocketbase';

export default function LampiranForm({ onSuccess }) {
  const [warga, setWarga] = useState(null);
  const [iuranList, setIuranList] = useState([]);
  const [selectedIurans, setSelectedIurans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Warga for current user
        const userId = pb.authStore.model.id;
        try {
          const wargaRecord = await pb.collection('warga').getFirstListItem(`user="${userId}"`);
          setWarga(wargaRecord);
        } catch (err) {
          console.warn("Warga record not found for this user:", err);
          setMessage({ text: 'Data warga belum terdaftar untuk user ini.', type: 'error' });
        }

        // 2. Fetch available Iuran (no sort by created since field doesn't exist)
        const iurans = await pb.collection('iuran').getFullList();
        setIuranList(iurans);
      } catch (err) {
        console.error("Failed to fetch data", err);
      }
    };

    if (pb.authStore.isValid) {
      fetchData();
    }
  }, []);

  const handleIuranChange = (e) => {
    const value = e.target.value;
    if (e.target.checked) {
      setSelectedIurans([...selectedIurans, value]);
    } else {
      setSelectedIurans(selectedIurans.filter((id) => id !== value));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!warga) {
      return setMessage({ text: 'Data warga tidak ditemukan. Tidak dapat mengupload lampiran.', type: 'error' });
    }
    if (selectedIurans.length === 0) {
      return setMessage({ text: 'Silakan pilih minimal satu iuran.', type: 'error' });
    }

    const file = fileInputRef.current?.files[0];
    if (!file) {
      return setMessage({ text: 'Silakan pilih file bukti (Gambar/PDF).', type: 'error' });
    }

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const formData = new FormData();
      
      // PocketBase requires a 15-character alphanumeric ID when it is explicitly defined in schema
      const generateId = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < 15; i++) {
          id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
      };
      const lampiranId = generateId();
      formData.append('id', lampiranId);

      formData.append('warga', warga.id);
      
      // Append each iuran ID separately so PocketBase parses it as a relation array
      selectedIurans.forEach(id => formData.append('iuran', id));
      
      formData.append('file_bukti', file);
      formData.append('approval', false);

      await pb.collection('lampiran').create(formData);
      
      // Relasikan lampiran dengan tagihan milik warga tersebut menggunakan ID yang disimpan di memory
      for (const iuranId of selectedIurans) {
        let tagihanRecord = null;
        try {
          tagihanRecord = await pb.collection('tagihan').getFirstListItem(`warga="${warga.id}" && iuran="${iuranId}"`);
        } catch (e) {
          // Tagihan tidak ditemukan, akan dibuat baru di bawah
        }

        if (tagihanRecord) {
          // Update tagihan yang sudah ada
          await pb.collection('tagihan').update(tagihanRecord.id, {
            lampiran: lampiranId,
            status_pembayaran: 'Menunggu Konfirmasi'
          });
        } else {
          // Buat tagihan baru dengan format ID: no_rumah + kode_iuran (semua lowercase)
          // contoh: a01iuranipl26bln03
          const iuranData = iuranList.find(i => i.id === iuranId);
          const tagihanId = `${warga.no_rumah.toLowerCase()}${iuranId}`;
          await pb.collection('tagihan').create({
            id: tagihanId,
            warga: warga.id,
            iuran: iuranId,
            nominal: iuranData ? iuranData.nominal : 0,
            jatuh_tempo: new Date().toISOString(),
            status_pembayaran: 'Menunggu Konfirmasi',
            lampiran: lampiranId
          });
        }
      }
      
      setMessage({ text: 'Lampiran berhasil diupload!', type: 'success' });
      
      setSelectedIurans([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      // Callback ke parent jika ada
      if (typeof onSuccess === 'function') {
        setTimeout(() => onSuccess(), 1200);
      }

    } catch (err) {
      console.error("Upload error:", err.response);
      let errorDetail = '';
      if (err.response?.data) {
        const details = Object.entries(err.response.data).map(([key, val]) => `${key}: ${val.message}`);
        errorDetail = details.join(' | ');
      }
      setMessage({ text: `Gagal mengupload lampiran. ${errorDetail}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Helper to format selected iurans text
  const getSelectedIuransText = () => {
    if (selectedIurans.length === 0) return "Belum ada iuran dipilih";
    if (selectedIurans.length === 1) {
      const iuran = iuranList.find(i => i.id === selectedIurans[0]);
      return iuran ? iuran.kode : "1 Iuran dipilih";
    }
    return `${selectedIurans.length} Iuran dipilih`;
  };

  return (
    <div className="glass-panel" style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(0,0,0,0.2)' }}>
      <h3 style={{ marginBottom: '1.5rem' }}>Upload Bukti Pembayaran (Lampiran)</h3>
      
      {message.text && (
        <div className={message.type === 'error' ? 'error-message' : 'success-message'} style={{
          background: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
          color: message.type === 'error' ? '#fca5a5' : '#86efac',
          padding: '0.75rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          border: `1px solid ${message.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`
        }}>
          {message.text}
        </div>
      )}

      {warga ? (
        <p style={{ marginBottom: '1rem', color: '#a3a3a3', fontSize: '0.9rem' }}>
          Terhubung dengan data Warga No Rumah: <strong>{warga.no_rumah}</strong>
        </p>
      ) : (
        <p style={{ marginBottom: '1rem', color: '#fca5a5', fontSize: '0.9rem' }}>
          ⚠️ Akun ini belum terhubung dengan data Warga. Minta Admin untuk menautkan ID User Anda ke tabel Warga terlebih dahulu.
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label>Iuran yang Dibayar</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              flex: 1,
              padding: '0.75rem 1rem',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              color: selectedIurans.length > 0 ? '#f8fafc' : '#94a3b8'
            }}>
              {getSelectedIuransText()}
            </div>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={() => setIsModalOpen(true)}
              style={{ width: 'auto', padding: '0.75rem 1.5rem' }}
              disabled={iuranList.length === 0}
            >
              Pilih Iuran
            </button>
          </div>
          {iuranList.length === 0 && (
            <p style={{ color: '#666', fontStyle: 'italic', marginTop: '0.5rem', fontSize: '0.9rem' }}>
              Tidak ada tagihan iuran tersedia.
            </p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="file_bukti">File Bukti (Gambar / PDF)</label>
          <input
            type="file"
            id="file_bukti"
            ref={fileInputRef}
            className="form-control"
            accept="image/jpeg, image/png, image/webp, application/pdf"
            required
            style={{ padding: '0.5rem' }}
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={loading || !warga || selectedIurans.length === 0} 
          style={{ width: '100%' }}
        >
          {loading ? 'Mengupload...' : 'Upload Lampiran'}
        </button>
      </form>

      {/* Modal Popup */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Pilih Iuran</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              {iuranList.map((iuran) => (
                <label key={iuran.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <input
                    type="checkbox"
                    name="iuran"
                    value={iuran.id}
                    checked={selectedIurans.includes(iuran.id)}
                    onChange={handleIuranChange}
                    style={{ width: '1.25rem', height: '1.25rem', accentColor: '#3b82f6' }}
                  />
                  <span style={{ display: 'flex', flexDirection: 'column' }}>
                    <strong style={{ fontSize: '1.05rem' }}>{iuran.kode}</strong>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                      Rp {iuran.nominal.toLocaleString('id-ID')} {iuran.keterangan && `- ${iuran.keterangan}`}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn" onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-color)' }}>Batal</button>
              <button type="button" className="btn btn-primary" onClick={() => setIsModalOpen(false)} style={{ width: 'auto' }}>Simpan Pilihan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
