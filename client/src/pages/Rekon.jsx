import { useState, useEffect } from 'react';
import { pb, API_URL } from '../lib/pocketbase';

export default function Rekon() {
  const [isPengurus, setIsPengurus] = useState(() => localStorage.getItem('isPengurus') === 'true');
  const [mutasiFiles, setMutasiFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [rekonList, setRekonList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [detailItem, setDetailItem] = useState(null);

  const rupiah = (n) => { let v = n || 0; if (v < 1 && v > 0) v = 0; return 'Rp ' + v.toLocaleString('id-ID'); };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const userId = pb.authStore.model.id;
        const warga = await pb.collection('warga').getFirstListItem(`user="${userId}"`);
        const isPengurusDb = warga.pengurus || false;
        setIsPengurus(isPengurusDb);
        localStorage.setItem('isPengurus', isPengurusDb ? 'true' : 'false');

        const files = await pb.collection('file_mutasi').getFullList({ sort: '-created' });
        files.sort((a, b) => new Date(b.created) - new Date(a.created));
        setMutasiFiles(files);
        if (files.length > 0) {
          setSelectedFile(files[0]);
          await fetchRekon(files[0].id);
        }
      } catch (e) {
        console.warn('Error fetch rekon:', e);
      }
      setLoading(false);
    };
    if (pb.authStore.isValid) fetchData();
  }, []);

  const fetchRekon = async (fileId, statusFilter = filter) => {
    try {
      const token = pb.authStore.token;
      let url = `${API_URL}/v1/mutasi/rekon/list?file_mutasi_id=${fileId}`;
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const result = await resp.json();
      if (resp.ok) {
        setRekonList(result.items || []);
      } else {
        setRekonList([]);
      }
    } catch (e) {
      console.warn('Error fetch rekon list:', e);
      setRekonList([]);
    }
  };

  const handleSelectFile = (f) => {
    setSelectedFile(f);
    setFilter('ALL');
    fetchRekon(f.id, 'ALL');
  };

  const handleProses = async () => {
    if (!selectedFile) { setErr('Pilih file mutasi dulu'); return; }
    setProcessing(true);
    setMsg(null);
    setErr(null);
    try {
      const token = pb.authStore.token;
      const resp = await fetch(`${API_URL}/v1/mutasi/rekon/proses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_mutasi_id: selectedFile.id }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.message || 'Proses gagal');
      setMsg(`✅ Rekon selesai: ${result.cocok} cocok · ${result.tidak_cocok} tidak cocok · ${result.belum_ada_tagihan} tanpa tagihan`);
      await fetchRekon(selectedFile.id, 'ALL');
    } catch (ex) {
      console.error(ex);
      setErr(ex.message || 'Proses gagal');
    }
    setProcessing(false);
  };

  const statusInfo = (s) => {
    if (s === 'COCOK') return { label: '✅ Cocok', color: '#15935A', bg: '#E8F5EE' };
    if (s === 'TIDAK_COCOK') return { label: '⚠️ Tidak Cocok', color: '#C24A4A', bg: '#FFF5F4' };
    return { label: '➖ Tanpa Tagihan', color: '#8A9991', bg: '#F5F5F5' };
  };

  const filters = [
    { key: 'ALL', label: 'Semua' },
    { key: 'COCOK', label: '✅ Cocok' },
    { key: 'TIDAK_COCOK', label: '⚠️ Tidak' },
    { key: 'BELUM_ADA_TAGIHAN', label: '➖ Tanpa' },
  ];

  if (!isPengurus) {
    return (
      <div className="page-padded" style={{ padding: 40, textAlign: 'center', color: '#8A9991' }}>
        <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 10 }}>🔒</div>
        <h3 style={{ color: '#0F1A14' }}>Hanya untuk Pengurus</h3>
        <p style={{ fontSize: 13 }}>Fitur rekon hanya tersedia untuk mode pengurus.</p>
      </div>
    );
  }

  return (
    <div className="page-padded" style={{ paddingBottom: 40 }}>
      <div style={{ padding: '16px 20px 0' }}>
        <h2 style={{ margin: 0 }}>Rekon Mutasi</h2>
        <p style={{ margin: '4px 0 0', color: '#6B7B72', fontSize: 12 }}>
          Cocokkan transaksi mutasi bank (sumber valid) dengan tagihan aplikasi per warga
        </p>
      </div>

      {/* File selector + Proses */}
      <div style={{ margin: '16px 20px 0' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
          {mutasiFiles.map((f) => (
            <button key={f.id} onClick={() => handleSelectFile(f)}
              style={{
                flex: 'none', border: selectedFile?.id === f.id ? '1.5px solid #15935A' : '1.5px solid #E6EBE7',
                background: selectedFile?.id === f.id ? '#E8F5EE' : '#fff',
                color: selectedFile?.id === f.id ? '#15935A' : '#6B7B72',
                padding: '8px 14px', borderRadius: 20, fontSize: 11, fontWeight: selectedFile?.id === f.id ? 700 : 600,
                cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >{f.bulan || f.nama_file}</button>
          ))}
        </div>

        <button
          onClick={handleProses} disabled={processing}
          style={{
            width: '100%', background: processing ? '#A8C9B8' : '#5E35B1', color: '#fff',
            border: 'none', borderRadius: 12, padding: '12px', fontSize: 13, fontWeight: 700,
            cursor: processing ? 'default' : 'pointer', fontFamily: 'inherit', marginTop: 4,
          }}
        >
          {processing ? '⏳ Memproses rekon...' : '⚡ Proses Rekon (cocokkan mutasi ↔ tagihan)'}
        </button>
        {msg && <div style={{ marginTop: 10, fontSize: 12, color: '#15935A', fontWeight: 600 }}>{msg}</div>}
        {err && <div style={{ marginTop: 10, fontSize: 12, color: '#C24A4A', fontWeight: 600 }}>❌ {err}</div>}
      </div>

      {/* Filter status */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, padding: '0 20px', overflowX: 'auto' }}>
        {filters.map((f) => (
          <button key={f.key} onClick={() => { setFilter(f.key); fetchRekon(selectedFile?.id, f.key); }}
            style={{
              flex: 'none', border: filter === f.key ? '1.5px solid #15935A' : '1.5px solid #E6EBE7',
              background: filter === f.key ? '#E8F5EE' : '#fff',
              color: filter === f.key ? '#15935A' : '#6B7B72',
              padding: '8px 14px', borderRadius: 20, fontSize: 11, fontWeight: filter === f.key ? 700 : 600,
              cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >{f.label}</button>
        ))}
      </div>

      {/* Hasil Rekon */}
      <div style={{ marginTop: 16, padding: '0 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#8A9991', fontSize: 13 }}>Memuat...</div>
        ) : rekonList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#8A9991', fontSize: 13 }}>
            Belum ada data rekon — klik "Proses Rekon" untuk mencocokkan
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 480 }}>
              <thead>
                <tr style={{ background: '#F5FAF7', color: '#0F1A14' }}>
                  <th style={{ padding: '8px 6px', textAlign: 'center', borderBottom: '1px solid #E6EBE7', fontWeight: 700 }}>No</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', borderBottom: '1px solid #E6EBE7', fontWeight: 700 }}>Rumah</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', borderBottom: '1px solid #E6EBE7', fontWeight: 700 }}>Masuk</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', borderBottom: '1px solid #E6EBE7', fontWeight: 700 }}>Keluar</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', borderBottom: '1px solid #E6EBE7', fontWeight: 700 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rekonList.map((r) => {
                  const st = statusInfo(r.status);
                  return (
                    <tr key={r.id} onClick={() => setDetailItem(r)}
                      style={{ borderBottom: '1px solid #F0F3F1', cursor: 'pointer' }}>
                      <td style={{ padding: '7px 6px', textAlign: 'center', color: '#6B7B72' }}>{r.no_urut}</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 700, color: '#0F1A14' }}>
                        {r.expand?.warga?.no_rumah || '-'}
                      </td>
                      <td style={{ padding: '7px 6px', textAlign: 'right', color: '#15935A', whiteSpace: 'nowrap' }}>
                        {r.mutasi_kredit ? rupiah(r.mutasi_kredit) : '-'}
                      </td>
                      <td style={{ padding: '7px 6px', textAlign: 'right', color: '#C24A4A', whiteSpace: 'nowrap' }}>
                        {r.mutasi_debet ? rupiah(r.mutasi_debet) : '-'}
                      </td>
                      <td style={{ padding: '7px 6px', textAlign: 'center' }}>
                        <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 8, fontWeight: 700, color: st.color, background: st.bg, whiteSpace: 'nowrap' }}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Popup Detail */}
      {detailItem && (
        <div className="modal-overlay" onClick={() => setDetailItem(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 420, borderRadius: 16, padding: 20, background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Detail Rekon #{detailItem.no_urut}</h3>
              <button onClick={() => setDetailItem(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6B7B72', fontFamily: 'inherit' }}>✕</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 12, padding: '6px 14px', borderRadius: 10, fontWeight: 700, color: statusInfo(detailItem.status).color, background: statusInfo(detailItem.status).bg }}>
                {statusInfo(detailItem.status).label}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '8px 12px', fontSize: 12.5 }}>
              <span style={{ color: '#6B7B72' }}>Rumah</span>
              <span style={{ fontWeight: 700, color: '#0F1A14' }}>{detailItem.expand?.warga?.no_rumah || '-'}</span>

              <span style={{ color: '#6B7B72' }}>Nama Warga</span>
              <span style={{ fontWeight: 600, color: '#0F1A14' }}>{detailItem.expand?.warga?.expand?.user?.name || '-'}</span>

              <span style={{ color: '#6B7B72' }}>Tanggal</span>
              <span style={{ fontWeight: 600 }}>{detailItem.tanggal_posting ? new Date(detailItem.tanggal_posting).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>

              <span style={{ color: '#6B7B72' }}>Masuk</span>
              <span style={{ fontWeight: 700, color: '#15935A' }}>{detailItem.mutasi_kredit ? rupiah(detailItem.mutasi_kredit) : '-'}</span>

              <span style={{ color: '#6B7B72' }}>Keluar</span>
              <span style={{ fontWeight: 700, color: '#C24A4A' }}>{detailItem.mutasi_debet ? rupiah(detailItem.mutasi_debet) : '-'}</span>

              <span style={{ color: '#6B7B72' }}>Saldo</span>
              <span style={{ fontWeight: 600 }}>{rupiah(detailItem.saldo_akhir)}</span>

              <span style={{ color: '#6B7B72' }}>Tagihan</span>
              <span style={{ fontWeight: 600 }}>{detailItem.tagihan ? detailItem.expand?.tagihan?.id?.slice(0, 12) || 'Ada tagihan' : 'Tidak ada'}</span>
            </div>

            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #E6EBE7' }}>
              <div style={{ fontSize: 11, color: '#6B7B72', fontWeight: 600, marginBottom: 4 }}>Keterangan</div>
              <div style={{ fontSize: 12, color: '#0F1A14', lineHeight: 1.5, wordBreak: 'break-word' }}>{detailItem.keterangan || '-'}</div>
            </div>

            <button onClick={() => setDetailItem(null)}
              style={{ width: '100%', marginTop: 16, background: '#15935A', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
