import { useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';

export default function Rekon() {
  const [isPengurus, setIsPengurus] = useState(() => localStorage.getItem('isPengurus') === 'true');
  const [rekonList, setRekonList] = useState([]);
  const [mutasiFiles, setMutasiFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [tagihanBelum, setTagihanBelum] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  // Form state
  const [formTgl, setFormTgl] = useState('');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formKodeIPL, setFormKodeIPL] = useState(''); // pilihan tagihan IPL belum dilaporkan
  const [formDebet, setFormDebet] = useState('');
  const [formKredit, setFormKredit] = useState('');

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

        // Files mutasi
        const files = await pb.collection('file_mutasi').getFullList({ sort: '-created' });
        files.sort((a, b) => new Date(b.created) - new Date(a.created));
        setMutasiFiles(files);
        if (files.length > 0) setSelectedFile(files[0]);

        // Rekon records
        const rekon = await pb.collection('rekon').getFullList({ sort: '-created', expand: 'file_mutasi,tagihan,warga' });
        rekon.sort((a, b) => new Date(b.created) - new Date(a.created));
        setRekonList(rekon);

        // Tagihan belum lunas (IPL) utk pilihan — semua warga utk pengurus
        const tagihan = await pb.collection('tagihan').getFullList({
          filter: `status_pembayaran != "Lunas"`,
          expand: 'warga,warga.user,iuran'
        });
        tagihan.sort((a, b) => (a.expand?.warga?.no_rumah || '').localeCompare(b.expand?.warga?.no_rumah || ''));
        setTagihanBelum(tagihan);
      } catch (e) {
        console.warn('Error fetch rekon:', e);
      }
      setLoading(false);
    };
    if (pb.authStore.isValid) fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const tagihanId = formKodeIPL || '';
      const keterangan = tagihanId
        ? (tagihanBelum.find(t => t.id === tagihanId)?.keterangan || formKeterangan || 'IPL warga')
        : (formKeterangan || 'Transaksi rekon');
      const data = {
        no_urut: rekonList.length + 1,
        tanggal_posting: formTgl ? new Date(formTgl).toISOString() : null,
        keterangan: keterangan,
        keterangan_bebas: formKeterangan,
        mutasi_debet: formDebet ? parseInt(formDebet) : 0,
        mutasi_kredit: formKredit ? parseInt(formKredit) : 0,
        saldo_akhir: 0,
        file_mutasi: selectedFile?.id || '',
        tagihan: tagihanId || '',
      };
      const rec = await pb.collection('rekon').create(data);
      setMsg('✅ Rekon berhasil disimpan');
      setFormTgl(''); setFormKeterangan(''); setFormKodeIPL(''); setFormDebet(''); setFormKredit('');
      setRekonList(prev => [rec, ...prev]);
    } catch (ex) {
      console.error(ex);
      setErr(ex.message || 'Gagal menyimpan');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus rekon ini?')) return;
    try {
      await pb.collection('rekon').delete(id);
      setRekonList(prev => prev.filter(r => r.id !== id));
    } catch (ex) {
      alert('Gagal hapus: ' + ex.message);
    }
  };

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
        <p style={{ margin: '4px 0 0', color: '#6B7B72', fontSize: 12 }}>Cocokkan transaksi mutasi dengan tagihan per warga</p>
      </div>

      {/* Form Rekon */}
      <form onSubmit={handleSubmit} className="card" style={{ margin: '16px 20px 0', padding: 16 }}>
        <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>➕ Tambah Rekon</h4>

        <label style={{ fontSize: 11, color: '#6B7B72', fontWeight: 600 }}>Tanggal</label>
        <input
          type="date" value={formTgl} onChange={(e) => setFormTgl(e.target.value)}
          style={{ width: '100%', padding: 10, border: '1.5px solid #E6EBE7', borderRadius: 10, fontSize: 13, margin: '4px 0 10px', fontFamily: 'inherit' }}
        />

        <label style={{ fontSize: 11, color: '#6B7B72', fontWeight: 600 }}>Pilih IPL Warga (belum dilaporkan)</label>
        <select
          value={formKodeIPL} onChange={(e) => setFormKodeIPL(e.target.value)}
          style={{ width: '100%', padding: 10, border: '1.5px solid #E6EBE7', borderRadius: 10, fontSize: 13, margin: '4px 0 10px', fontFamily: 'inherit', background: '#fff' }}
        >
          <option value="">— Pilih tagihan IPL —</option>
          {tagihanBelum.map((t) => (
            <option key={t.id} value={t.id}>
              {t.expand?.warga?.no_rumah || '?'} · {t.expand?.warga?.user?.name || ''} · Rp {(t.nominal || 0).toLocaleString('id-ID')}
            </option>
          ))}
        </select>

        <label style={{ fontSize: 11, color: '#6B7B72', fontWeight: 600 }}>Atau Keterangan Bebas (free text)</label>
        <textarea
          value={formKeterangan} onChange={(e) => setFormKeterangan(e.target.value)}
          placeholder="Contoh: IPL C09 Juli 2026 / Pembayaran via transfer / dll"
          rows={2}
          style={{ width: '100%', padding: 10, border: '1.5px solid #E6EBE7', borderRadius: 10, fontSize: 13, margin: '4px 0 10px', fontFamily: 'inherit', resize: 'vertical' }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label style={{ fontSize: 11, color: '#6B7B72', fontWeight: 600 }}>Debet (keluar)</label>
            <input
              type="number" value={formDebet} onChange={(e) => setFormDebet(e.target.value)}
              placeholder="0"
              style={{ width: '100%', padding: 10, border: '1.5px solid #E6EBE7', borderRadius: 10, fontSize: 13, margin: '4px 0 10px', fontFamily: 'inherit' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#6B7B72', fontWeight: 600 }}>Kredit (masuk)</label>
            <input
              type="number" value={formKredit} onChange={(e) => setFormKredit(e.target.value)}
              placeholder="0"
              style={{ width: '100%', padding: 10, border: '1.5px solid #E6EBE7', borderRadius: 10, fontSize: 13, margin: '4px 0 10px', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        <button
          type="submit" disabled={saving}
          style={{
            width: '100%', background: saving ? '#A8C9B8' : '#15935A', color: '#fff',
            border: 'none', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 700,
            cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit'
          }}
        >
          {saving ? 'Menyimpan...' : 'Simpan Rekon'}
        </button>
        {msg && <div style={{ marginTop: 10, fontSize: 12, color: '#15935A', fontWeight: 600 }}>{msg}</div>}
        {err && <div style={{ marginTop: 10, fontSize: 12, color: '#C24A4A', fontWeight: 600 }}>❌ {err}</div>}
      </form>

      {/* List Rekon */}
      <div style={{ marginTop: 20, padding: '0 20px' }}>
        <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>📋 Data Rekon ({rekonList.length})</h4>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#8A9991', fontSize: 13 }}>Memuat...</div>
        ) : rekonList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#8A9991', fontSize: 13 }}>
            Belum ada data rekon
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rekonList.map((r) => (
              <div key={r.id} className="card" style={{ padding: 14, border: '1.5px solid #E6EBE7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F1A14' }}>
                      {r.keterangan || 'Tanpa keterangan'}
                    </div>
                    {r.keterangan_bebas && r.keterangan_bebas !== r.keterangan && (
                      <div style={{ fontSize: 11, color: '#6B7B72', marginTop: 2 }}>✏️ {r.keterangan_bebas}</div>
                    )}
                    <div style={{ fontSize: 11, color: '#A6B0AA', marginTop: 2 }}>
                      {r.tanggal_posting ? new Date(r.tanggal_posting).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      {' · '}{r.file_mutasi ? (r.expand?.file_mutasi?.bulan || 'file mutasi') : 'manual'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {r.mutasi_kredit > 0 && (
                      <div style={{ fontWeight: 800, fontSize: 13, color: '#15935A' }}>+{rupiah(r.mutasi_kredit)}</div>
                    )}
                    {r.mutasi_debet > 0 && (
                      <div style={{ fontWeight: 800, fontSize: 13, color: '#C24A4A' }}>-{rupiah(r.mutasi_debet)}</div>
                    )}
                    <button
                      onClick={() => handleDelete(r.id)}
                      style={{ background: 'none', border: 'none', color: '#C24A4A', fontSize: 11, cursor: 'pointer', marginTop: 6, fontFamily: 'inherit' }}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
