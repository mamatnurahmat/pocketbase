import { useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';

export default function Mutasi() {
  const [isPengurus, setIsPengurus] = useState(() => localStorage.getItem('isPengurus') === 'true');
  const [fileList, setFileList] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [mutasiList, setMutasiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const rupiah = (n) => { let v = n || 0; if (v < 1 && v > 0) v = 0; return 'Rp ' + v.toLocaleString('id-ID'); };

  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      try {
        const userId = pb.authStore.model.id;
        const warga = await pb.collection('warga').getFirstListItem(`user="${userId}"`);
        const isPengurusDb = warga.pengurus || false;
        setIsPengurus(isPengurusDb);
        localStorage.setItem('isPengurus', isPengurusDb ? 'true' : 'false');

        const records = await pb.collection('file_mutasi').getFullList({
          sort: '-created',
          expand: 'uploaded_by'
        });
        records.sort((a, b) => new Date(b.created) - new Date(a.created));
        setFileList(records);

        if (records.length > 0) {
          setSelectedFile(records[0]);
        }
      } catch (e) {
        console.warn('Error fetching file mutasi:', e);
      }
      setLoading(false);
    };

    if (pb.authStore.isValid) fetchFiles();
  }, []);

  useEffect(() => {
    const fetchMutasi = async () => {
      if (!selectedFile) { setMutasiList([]); return; }
      setLoadingDetail(true);
      try {
        const records = await pb.collection('mutasi').getFullList({
          filter: `file_mutasi="${selectedFile.id}"`,
          sort: 'no_urut'
        });
        setMutasiList(records);
      } catch (e) {
        console.warn('Error fetching mutasi:', e);
        setMutasiList([]);
      }
      setLoadingDetail(false);
    };
    if (pb.authStore.isValid && selectedFile) fetchMutasi();
  }, [selectedFile]);

  const getFileUrl = (record) => {
    if (!record.file_pdf) return null;
    return `/api/files/${record.collectionId}/${record.id}/${record.file_pdf}`;
  };

  if (!isPengurus) {
    return (
      <div className="page-padded" style={{ padding: 40, textAlign: 'center', color: '#8A9991' }}>
        <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 10 }}>🔒</div>
        <h3 style={{ color: '#0F1A14' }}>Hanya untuk Pengurus</h3>
        <p style={{ fontSize: 13 }}>Fitur lihat mutasi hanya tersedia untuk mode pengurus.</p>
      </div>
    );
  }

  return (
    <div className="page-padded" style={{ paddingBottom: 40 }}>
      <div style={{ padding: '16px 20px 0' }}>
        <h2 style={{ margin: 0 }}>Mutasi Rekening</h2>
        <p style={{ margin: '4px 0 0', color: '#6B7B72', fontSize: 12 }}>Data mutasi dari file PDF yang diupload</p>
      </div>

      {/* Summary cards */}
      {selectedFile && (
        <div style={{ margin: '16px 20px 0', background: 'linear-gradient(145deg, #147a4a, #0C6B40)', borderRadius: 16, padding: 18, color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>📄 {selectedFile.nama_file}</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                {selectedFile.periode_awal ? new Date(selectedFile.periode_awal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'} — {selectedFile.periode_akhir ? new Date(selectedFile.periode_akhir).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
              </div>
            </div>
            {selectedFile.file_pdf && (
              <a href={getFileUrl(selectedFile)} target="_blank" rel="noreferrer" style={{ background: 'rgba(255,255,255,0.2)', padding: '8px 12px', borderRadius: 10, fontSize: 11, color: '#fff', textDecoration: 'none', fontWeight: 700 }}>
                📥 PDF
              </a>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 8 }}>
              <div style={{ fontSize: 10, opacity: 0.7 }}>Saldo Awal</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{rupiah(selectedFile.saldo_awal)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 8 }}>
              <div style={{ fontSize: 10, opacity: 0.7 }}>Saldo Akhir</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{rupiah(selectedFile.saldo_akhir)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 8 }}>
              <div style={{ fontSize: 10, opacity: 0.7 }}>Total Masuk</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{rupiah(selectedFile.total_kredit)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 8 }}>
              <div style={{ fontSize: 10, opacity: 0.7 }}>Total Keluar</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{rupiah(selectedFile.total_debet)}</div>
            </div>
          </div>
        </div>
      )}

      {/* File list selector */}
      <div style={{ display: 'flex', gap: 8, marginTop: 20, padding: '0 20px', overflowX: 'auto', paddingBottom: 4 }}>
        {fileList.map((f) => (
          <button key={f.id} onClick={() => setSelectedFile(f)}
            style={{
              flex: 'none', border: selectedFile?.id === f.id ? '1.5px solid #15935A' : '1.5px solid #E6EBE7',
              background: selectedFile?.id === f.id ? '#E8F5EE' : '#fff',
              color: selectedFile?.id === f.id ? '#15935A' : '#6B7B72',
              padding: '8px 14px', borderRadius: 20, fontSize: 11, fontWeight: selectedFile?.id === f.id ? 700 : 600,
              cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >{f.nama_file}</button>
        ))}
        {fileList.length === 0 && <span style={{ color: '#8A9991', fontSize: 12 }}>Belum ada file mutasi</span>}
      </div>

      {/* Mutation detail table */}
      <div style={{ marginTop: 16, padding: '0 20px' }}>
        {loading || loadingDetail ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#8A9991', fontSize: 14 }}>Memuat...</div>
        ) : mutasiList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#8A9991', fontSize: 14 }}>
            <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 10 }}>📭</div>
            Belum ada data mutasi
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 600 }}>
              <thead>
                <tr style={{ background: '#F5FAF7', color: '#0F1A14' }}>
                  <th style={{ padding: '8px 6px', textAlign: 'center', borderBottom: '1px solid #E6EBE7', fontWeight: 700 }}>No</th>
                  <th style={{ padding: '8px 6px', textAlign: 'left', borderBottom: '1px solid #E6EBE7', fontWeight: 700 }}>Tanggal</th>
                  <th style={{ padding: '8px 6px', textAlign: 'left', borderBottom: '1px solid #E6EBE7', fontWeight: 700 }}>Keterangan</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', borderBottom: '1px solid #E6EBE7', fontWeight: 700 }}>Debet</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', borderBottom: '1px solid #E6EBE7', fontWeight: 700 }}>Kredit</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', borderBottom: '1px solid #E6EBE7', fontWeight: 700 }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {mutasiList.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #F0F3F1' }}>
                    <td style={{ padding: '7px 6px', textAlign: 'center', color: '#6B7B72' }}>{m.no_urut}</td>
                    <td style={{ padding: '7px 6px', whiteSpace: 'nowrap' }}>
                      {m.tanggal_posting ? new Date(m.tanggal_posting).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-'}
                    </td>
                    <td style={{ padding: '7px 6px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#0F1A14' }}>
                      {m.keterangan}
                    </td>
                    <td style={{ padding: '7px 6px', textAlign: 'right', color: '#C24A4A', whiteSpace: 'nowrap' }}>
                      {m.mutasi_debet ? rupiah(m.mutasi_debet) : '-'}
                    </td>
                    <td style={{ padding: '7px 6px', textAlign: 'right', color: '#15935A', whiteSpace: 'nowrap' }}>
                      {m.mutasi_kredit ? rupiah(m.mutasi_kredit) : '-'}
                    </td>
                    <td style={{ padding: '7px 6px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {rupiah(m.saldo_akhir)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
