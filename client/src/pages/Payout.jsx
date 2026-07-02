import { useState, useEffect, useRef } from 'react';
import { pb, API_URL } from '../lib/pocketbase';

export default function Payout() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [isPengurus, setIsPengurus] = useState(() => localStorage.getItem('isPengurus') === 'true');

  // Form pengajuan
  const [showForm, setShowForm] = useState(false);
  const [nominal, setNominal] = useState('');
  const [jenis, setJenis] = useState('Bank');
  const [bank, setBank] = useState('');
  const [noRekening, setNoRekening] = useState('');
  const [atasNama, setAtasNama] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [lampiranFile, setLampiranFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Detail payout
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Approval
  const [approveKeterangan, setApproveKeterangan] = useState('');
  const [approveFile, setApproveFile] = useState(null);
  const [approving, setApproving] = useState(false);
  const [rejectKeterangan, setRejectKeterangan] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const rupiah = (n) => { const v = n || 0; return 'Rp ' + v.toLocaleString('id-ID'); };

  // Fetch payouts
  useEffect(() => {
    const fetchPayouts = async () => {
      setLoading(true);
      try {
        const userId = pb.authStore.model.id;
        const w = await pb.collection('warga').getFirstListItem(`user="${userId}"`);
        const isPengurusDb = w.pengurus || false;
        setIsPengurus(isPengurusDb);

        let records = [];
        if (isPengurusDb) {
          records = await pb.collection('payout').getFullList({
            sort: '-tanggal_diajukan',
            expand: 'warga,warga.user',
          });
        } else {
          records = await pb.collection('payout').getFullList({
            filter: `warga="${w.id}"`,
            sort: '-tanggal_diajukan',
            expand: 'warga,warga.user',
          });
        }
        setPayouts(records);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    if (pb.authStore.isValid) fetchPayouts();
  }, []);

  // Submit new payout
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nominal || nominal < 1000) return alert('Nominal minimal Rp 1.000');
    if (!bank.trim()) return alert('Nama bank/wallet diperlukan');
    if (!noRekening.trim()) return alert('No rekening diperlukan');
    if (!atasNama.trim()) return alert('Atas nama diperlukan');

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('nominal', nominal);
      formData.append('jenis', jenis);
      formData.append('bank', bank.trim());
      formData.append('no_rekening', noRekening.trim());
      formData.append('atas_nama', atasNama.trim());
      if (keterangan.trim()) formData.append('keterangan_warga', keterangan.trim());
      if (lampiranFile) formData.append('lampiran_warga', lampiranFile);

      const res = await fetch(`${API_URL}/v1/payout/submit`, {
        method: 'POST',
        headers: { 'Authorization': pb.authStore.token },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      // Refresh list
      const w = await pb.collection('warga').getFirstListItem(`user="${pb.authStore.model.id}"`);
      const newRecords = await pb.collection('payout').getFullList({
        filter: `warga="${w.id}"`,
        sort: '-tanggal_diajukan',
        expand: 'warga,warga.user',
      });
      setPayouts(newRecords);

      // Reset form
      setShowForm(false);
      setNominal('');
      setBank('');
      setNoRekening('');
      setAtasNama('');
      setKeterangan('');
      setLampiranFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      alert('Gagal mengajukan: ' + e.message);
    }
    setSubmitting(false);
  };

  // Approve payout
  const handleApprove = async (payoutId) => {
    setApproving(true);
    try {
      const res = await fetch(`${API_URL}/v1/payout/${payoutId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': pb.authStore.token,
        },
        body: JSON.stringify({
          keterangan_pengurus: approveKeterangan.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      const records = await pb.collection('payout').getFullList({
        sort: '-tanggal_diajukan',
        expand: 'warga,warga.user',
      });
      setPayouts(records);
      setSelectedPayout(null);
      setApproveKeterangan('');
      alert('Payout disetujui!');
    } catch (e) {
      alert('Gagal: ' + e.message);
    }
    setApproving(false);
  };

  // Reject payout
  const handleReject = async (payoutId) => {
    if (!rejectKeterangan.trim()) return alert('Alasan penolakan diperlukan');

    setRejecting(true);
    try {
      const res = await fetch(`${API_URL}/v1/payout/${payoutId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': pb.authStore.token,
        },
        body: JSON.stringify({
          keterangan_pengurus: rejectKeterangan.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      const records = await pb.collection('payout').getFullList({
        sort: '-tanggal_diajukan',
        expand: 'warga,warga.user',
      });
      setPayouts(records);
      setSelectedPayout(null);
      setRejectKeterangan('');
      alert('Payout ditolak!');
    } catch (e) {
      alert('Gagal: ' + e.message);
    }
    setRejecting(false);
  };

  // Bayar payout
  const handleBayar = async (payoutId) => {
    setApproving(true);
    try {
      const formData = new FormData();
      if (approveKeterangan.trim()) formData.append('keterangan_pengurus', approveKeterangan.trim());
      if (approveFile) formData.append('lampiran_pengurus', approveFile);

      const res = await fetch(`${API_URL}/v1/payout/${payoutId}/bayar`, {
        method: 'POST',
        headers: { 'Authorization': pb.authStore.token },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      const records = await pb.collection('payout').getFullList({
        sort: '-tanggal_diajukan',
        expand: 'warga,warga.user',
      });
      setPayouts(records);
      setSelectedPayout(null);
      setApproveKeterangan('');
      setApproveFile(null);
      alert('Payout dibayarkan! Kas otomatis terupdate.');
    } catch (e) {
      alert('Gagal: ' + e.message);
    }
    setApproving(false);
  };

  const statusBadge = (status) => {
    switch (status) {
      case 'Menunggu Konfirmasi': return 'badge-warning';
      case 'Disetujui': return 'badge-primary';
      case 'Ditolak': return 'badge-danger';
      case 'Dibayar': return 'badge-success';
      default: return 'badge-default';
    }
  };

  const statusLabel = (status) => {
    switch (status) {
      case 'Menunggu Konfirmasi': return '🕐 Menunggu';
      case 'Disetujui': return '✅ Disetujui';
      case 'Ditolak': return '❌ Ditolak';
      case 'Dibayar': return '💰 Dibayar';
      default: return status;
    }
  };

  const filters = [
    { key: 'all', label: 'Semua' },
    { key: 'Menunggu Konfirmasi', label: 'Menunggu' },
    { key: 'Disetujui', label: 'Disetujui' },
    { key: 'Ditolak', label: 'Ditolak' },
    { key: 'Dibayar', label: 'Dibayar' },
  ];

  const filtered = filter === 'all' ? payouts : payouts.filter(p => p.status === filter);

  return (
    <div className="page-padded">
      <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Pembayaran Dana</h2>
        {!isPengurus && (
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              background: showForm ? '#E8E5E4' : '#15935A',
              color: showForm ? '#6B7B72' : '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {showForm ? '✕ Batal' : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Ajukan
              </>
            )}
          </button>
        )}
      </div>

      {/* Form Pengajuan */}
      {showForm && !isPengurus && (
        <form onSubmit={handleSubmit} className="card" style={{ margin: '16px 0', padding: 20, border: '1.5px solid #15935A', background: '#F8FDFA' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#15935A' }}>Pengajuan Pembayaran Baru</h3>

          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#3A453F', display: 'block', marginBottom: 4 }}>Nominal *</label>
              <input type="number" min="1000" step="1000" value={nominal} onChange={e => setNominal(e.target.value)} placeholder="Rp 0" required
                style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #DFE5E1', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#3A453F', display: 'block', marginBottom: 4 }}>Jenis *</label>
                <select value={jenis} onChange={e => setJenis(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #DFE5E1', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', outline: 'none', appearance: 'none', background: '#fff' }}
                >
                  <option value="Bank">Bank</option>
                  <option value="E-Wallet">E-Wallet</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#3A453F', display: 'block', marginBottom: 4 }}>Nama Bank/Wallet *</label>
                <input type="text" value={bank} onChange={e => setBank(e.target.value)} placeholder="BCA, Mandiri, GoPay..." required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #DFE5E1', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#3A453F', display: 'block', marginBottom: 4 }}>No Rekening / Wallet ID *</label>
              <input type="text" value={noRekening} onChange={e => setNoRekening(e.target.value)} placeholder="1234567890" required
                style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #DFE5E1', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#3A453F', display: 'block', marginBottom: 4 }}>Atas Nama *</label>
              <input type="text" value={atasNama} onChange={e => setAtasNama(e.target.value)} placeholder="Nama pemilik rekening" required
                style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #DFE5E1', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#3A453F', display: 'block', marginBottom: 4 }}>Keterangan (opsional)</label>
              <textarea value={keterangan} onChange={e => setKeterangan(e.target.value)} placeholder="Alasan pengajuan... (contoh: Pembelian alat kebersihan)"
                rows={3}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #DFE5E1', fontSize: 14, fontWeight: 500, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#0F1A14', display: 'block', marginBottom: 6 }}>
                📎 Upload Lampiran  <span style={{ fontWeight: 400, color: '#8A9991' }}>(opsional)</span>
              </label>
              <div style={{ fontSize: 11, color: '#8A9991', marginBottom: 6 }}>Foto nota / bukti pengeluaran (maks 5MB, format JPG/PNG/PDF)</div>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: lampiranFile ? '2px solid #15935A' : '2px dashed #15935A',
                  borderRadius: 12, padding: 24, textAlign: 'center', cursor: 'pointer',
                  background: lampiranFile ? '#F0FBF4' : '#FAFCFA',
                  transition: 'all 0.2s',
                }}
              >
                <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => setLampiranFile(e.target.files[0])} />
                {lampiranFile ? (
                  <div style={{ color: '#15935A', fontWeight: 700, fontSize: 14 }}>
                    <div style={{ fontSize: 32, marginBottom: 4 }}>📄</div>
                    {lampiranFile.name}
                    <div style={{ fontSize: 11, fontWeight: 400, marginTop: 4, color: '#6B7B72' }}>Klik untuk ganti file</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 36, marginBottom: 6 }}>📤</div>
                    <div style={{ color: '#15935A', fontWeight: 700, fontSize: 14 }}>Klik untuk upload file</div>
                    <div style={{ color: '#8A9991', fontSize: 12, marginTop: 4 }}>Tap di area ini untuk pilih file</div>
                  </div>
                )}
              </div>
            </div>

            <button type="submit" disabled={submitting}
              style={{
                background: '#15935A', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 20px',
                fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', opacity: submitting ? 0.6 : 1,
                marginTop: 4,
              }}
            >
              {submitting ? 'Mengirim...' : 'Ajukan Pembayaran'}
            </button>
          </div>
        </form>
      )}

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
        <div className="card-green">
          <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 600 }}>Total diajukan</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{rupiah(payouts.reduce((s, p) => s + (p.nominal || 0), 0))}</div>
          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{payouts.length} pengajuan</div>
        </div>
        <div className="card" style={{ padding: 14, border: '1.5px solid #E6EBE7' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7B72' }}>Menunggu</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#E68A2E', marginTop: 4 }}>
            {payouts.filter(p => p.status === 'Menunggu Konfirmasi').length}
          </div>
          <div style={{ fontSize: 11, color: '#8A9991', marginTop: 2 }}>perlu dicek</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ overflowX: 'auto', display: 'flex', gap: 8, marginTop: 20, paddingBottom: 4 }}>
        {filters.map((f) => (
          <button key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              flex: 'none',
              border: filter === f.key ? '1.5px solid #15935A' : '1.5px solid #E6EBE7',
              background: filter === f.key ? '#E8F5EE' : '#fff',
              color: filter === f.key ? '#15935A' : '#6B7B72',
              padding: '9px 14px', borderRadius: 20, fontSize: 13,
              fontWeight: filter === f.key ? 700 : 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >{f.label}</button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#8A9991', fontSize: 14 }}>Memuat...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#8A9991', fontSize: 14 }}>
          {filter === 'all' ? 'Belum ada pengajuan pembayaran' : `Tidak ada pengajuan dengan status "${filter}"`}
          {!isPengurus && !showForm && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
              <div style={{ fontSize: 48, opacity: 0.3 }}>📋</div>
              <button onClick={() => setShowForm(true)}
                style={{ background: '#15935A', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 28px', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 4px 12px rgba(21,147,90,0.3)' }}
              >+ Ajukan Pembayaran Baru</button>
              <div style={{ fontSize: 12, color: '#8A9991' }}>Isi data rekening & upload bukti</div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14, paddingBottom: 80 }}>
          {filtered.map((p) => (
            <div key={p.id} className="card" style={{ padding: 14, cursor: 'pointer', border: selectedPayout?.id === p.id ? '1.5px solid #15935A' : '1.5px solid #E6EBE7' }}
              onClick={() => setSelectedPayout(selectedPayout?.id === p.id ? null : p)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0F1A14' }}>{rupiah(p.nominal)}</div>
                  <div style={{ fontSize: 12, color: '#6B7B72', marginTop: 2 }}>{p.bank} • {p.no_rekening} • {p.atas_nama}</div>
                  {p.expand?.warga?.expand?.user?.name && isPengurus && (
                    <div style={{ fontSize: 12, color: '#8A9991', marginTop: 2 }}>
                      {p.expand.warga.expand.user.name} ({p.expand.warga.no_rumah})
                    </div>
                  )}
                </div>
                <span className={`badge ${statusBadge(p.status)}`} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, whiteSpace: 'nowrap' }}>
                  {statusLabel(p.status)}
                </span>
              </div>
              {p.keterangan_warga && (
                <div style={{ fontSize: 12, color: '#3A453F', marginTop: 8, padding: '8px 10px', background: '#F4F6F4', borderRadius: 8 }}>
                  💬 {p.keterangan_warga}
                </div>
              )}
              <div style={{ fontSize: 11, color: '#A6B0AA', marginTop: 8 }}>
                {new Date(p.tanggal_diajukan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>

              {/* Expanded detail */}
              {selectedPayout?.id === p.id && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #E6EBE7' }}>
                  {/* Info rekening */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                    <div><span style={{ color: '#6B7B72' }}>Jenis:</span></div><div style={{ fontWeight: 600 }}>{p.jenis}</div>
                    <div><span style={{ color: '#6B7B72' }}>Bank/Wallet:</span></div><div style={{ fontWeight: 600 }}>{p.bank}</div>
                    <div><span style={{ color: '#6B7B72' }}>No Rekening:</span></div><div style={{ fontWeight: 600 }}>{p.no_rekening}</div>
                    <div><span style={{ color: '#6B7B72' }}>Atas Nama:</span></div><div style={{ fontWeight: 600 }}>{p.atas_nama}</div>
                  </div>

                  {/* Lampiran warga */}
                  {p.lampiran_warga && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 12, color: '#6B7B72', marginBottom: 4 }}>Lampiran warga:</div>
                      <a href={pb.files?.getUrl?.(p, p.lampiran_warga) || `${API_URL}/api/files/payout/${p.id}/${p.lampiran_warga}`} target="_blank" rel="noopener noreferrer"
                        style={{ color: '#15935A', fontSize: 13, fontWeight: 600, textDecoration: 'underline' }}
                      >📎 Lihat file</a>
                    </div>
                  )}

                  {/* Keterangan pengurus */}
                  {p.keterangan_pengurus && (
                    <div style={{ fontSize: 12, color: '#3A453F', marginTop: 10, padding: '8px 10px', background: isPengurus ? '#E8F5EE' : '#FFF8E6', borderRadius: 8 }}>
                      {isPengurus ? '✏️ ' : '📝 '} Pengurus: {p.keterangan_pengurus}
                    </div>
                  )}

                  {/* Lampiran pengurus */}
                  {p.lampiran_pengurus && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 12, color: '#6B7B72', marginBottom: 4 }}>Bukti bayar dari pengurus:</div>
                      <a href={pb.files?.getUrl?.(p, p.lampiran_pengurus) || `${API_URL}/api/files/payout/${p.id}/${p.lampiran_pengurus}`} target="_blank" rel="noopener noreferrer"
                        style={{ color: '#15935A', fontSize: 13, fontWeight: 600, textDecoration: 'underline' }}
                      >📎 Lihat bukti transfer</a>
                    </div>
                  )}

                  {/* Tanggal */}
                  <div style={{ marginTop: 10, fontSize: 11, color: '#A6B0AA' }}>
                    Diajukan: {new Date(p.tanggal_diajukan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {p.tanggal_disetujui && <> | Disetujui: {new Date(p.tanggal_disetujui).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</>}
                    {p.tanggal_dibayar && <> | Dibayar: {new Date(p.tanggal_dibayar).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</>}
                  </div>

                  {/* Actions (Pengurus only) */}
                  {isPengurus && p.status === 'Menunggu Konfirmasi' && (
                    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Approve */}
                      <div style={{ background: '#F8FDFA', borderRadius: 12, padding: 14, border: '1px solid #15935A' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#15935A', marginBottom: 8 }}>✅ Setujui & bayar nanti</div>
                        <input type="text" placeholder="Catatan (opsional)" value={approveKeterangan} onChange={e => setApproveKeterangan(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #DFE5E1', fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 8 }}
                        />
                        <button onClick={() => handleApprove(p.id)} disabled={approving}
                          style={{ background: '#15935A', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', opacity: approving ? 0.6 : 1, width: '100%' }}
                        >{approving ? 'Memproses...' : 'Setujui'}</button>
                      </div>

                      {/* Reject */}
                      <div style={{ background: '#FFF5F4', borderRadius: 12, padding: 14, border: '1px solid #C24A4A' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#C24A4A', marginBottom: 8 }}>❌ Tolak</div>
                        <input type="text" placeholder="Alasan penolakan (wajib)" value={rejectKeterangan} onChange={e => setRejectKeterangan(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #DFE5E1', fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 8 }}
                        />
                        <button onClick={() => handleReject(p.id)} disabled={rejecting || !rejectKeterangan.trim()}
                          style={{ background: '#C24A4A', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', opacity: (rejecting || !rejectKeterangan.trim()) ? 0.6 : 1, width: '100%' }}
                        >{rejecting ? 'Memproses...' : 'Tolak'}</button>
                      </div>
                    </div>
                  )}

                  {/* Bayar (Pengurus: setelah disetujui) */}
                  {isPengurus && p.status === 'Disetujui' && (
                    <div style={{ marginTop: 14, background: '#F0F7FF', borderRadius: 12, padding: 14, border: '1px solid #2563EB' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#2563EB', marginBottom: 8 }}>💰 Bayarkan</div>
                      <input type="text" placeholder="Catatan pembayaran (opsional)" value={approveKeterangan} onChange={e => setApproveKeterangan(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #DFE5E1', fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 8 }}
                      />
                      <div style={{ border: '1.5px dashed #BFDBFE', borderRadius: 10, padding: 12, textAlign: 'center', cursor: 'pointer', marginBottom: 8, background: '#fff' }}
                        onClick={() => document.getElementById('bayar-file-' + p.id)?.click()}
                      >
                        <input id={'bayar-file-' + p.id} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => setApproveFile(e.target.files[0])} />
                        {approveFile ? <span style={{ color: '#2563EB', fontWeight: 600, fontSize: 13 }}>📎 {approveFile.name}</span> : <span style={{ color: '#6B7B72', fontSize: 13 }}>Upload bukti transfer (opsional)</span>}
                      </div>
                      <button onClick={() => handleBayar(p.id)} disabled={approving}
                        style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', opacity: approving ? 0.6 : 1, width: '100%' }}
                      >{approving ? 'Memproses...' : 'Konfirmasi Bayar'}</button>
                      <div style={{ fontSize: 11, color: '#6B7B72', marginTop: 6, textAlign: 'center' }}>
                        ⚡ Saldo KAS akan otomatis berkurang
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}