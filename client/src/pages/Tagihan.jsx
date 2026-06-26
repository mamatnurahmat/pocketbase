import { useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';

export default function Tagihan() {
  const [tagihan, setTagihan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedKode, setSelectedKode] = useState('all');
  const [availableKodes, setAvailableKodes] = useState([]);

  const [isPengurus, setIsPengurus] = useState(() => localStorage.getItem('isPengurus') === 'true');
  const [modePengurus, setModePengurus] = useState(() => {
    if (localStorage.getItem('isPengurus') !== 'true') return false;
    const saved = localStorage.getItem('modePengurus');
    // Default ON untuk pengurus, kecuali pernah di-toggle manual
    return saved === null ? true : saved === 'true';
  });
  const [searchRumah, setSearchRumah] = useState('');
  const [confirmApproveId, setConfirmApproveId] = useState(null);
  const [previewFile, setPreviewFile] = useState(null); // { url, name, isImage, isPdf }
  const [lampiranUpload, setLampiranUpload] = useState(null); // tagihan yg perlu lampiran
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    localStorage.setItem('modePengurus', modePengurus);
  }, [modePengurus]);

  // ponytail: PocketBase v0.39 rejects balance=0, use 0.01 as sentinel
  const rupiah = (n) => { var v = n || 0; if (v < 1) v = 0; return 'Rp ' + v.toLocaleString('id-ID'); };

  // Fetch available kode from iuran collection + rumah codes (mode pengurus only)
  useEffect(() => {
    const fetchKodes = async () => {
      try {
        const iuranRecords = await pb.collection('iuran').getFullList({ sort: 'kode' });
        setAvailableKodes(iuranRecords.map(r => r.kode).filter(Boolean));
      } catch (e) { console.error(e); }
    };
    if (pb.authStore.isValid) fetchKodes();
  }, []);

  useEffect(() => {
    const fetchTagihan = async () => {
      setLoading(true);
      try {
        const userId = pb.authStore.model.id;
        try {
          const w = await pb.collection('warga').getFirstListItem(`user="${userId}"`);
          const isPengurusDb = w.pengurus || false;
          setIsPengurus(isPengurusDb);
          localStorage.setItem('isPengurus', isPengurusDb ? 'true' : 'false');
          
          let records = [];
          if (isPengurusDb && modePengurus) {
            records = await pb.collection('tagihan').getFullList({ 
              expand: 'iuran,warga,warga.user,lampiran'
            });
          } else {
            records = await pb.collection('tagihan').getFullList({ 
              filter: `warga="${w.id}"`,
              expand: 'iuran,warga,warga.user,lampiran'
            });
          }
          
          // Sort client-side by created descending
          records.sort((a, b) => new Date(b.created) - new Date(a.created));
          setTagihan(records);
        } catch (e) {
          // Warga not linked or no tagihan
          console.warn(e);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    if (pb.authStore.isValid) fetchTagihan();
  }, [modePengurus]);

  // API approve via subdomain api.sawangan.web.id
  const API_URL = 'https://api.sawangan.web.id';

  const handleApprove = async () => {
    if (!confirmApproveId) return;
    try {
      const res = await fetch(`${API_URL}/v1/tagihan/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': pb.authStore.token,
        },
        body: JSON.stringify({ tagihan_id: confirmApproveId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      const result = await res.json();
      console.log('Approve berhasil:', result.reference_no, 'balance:', result.balance_before, '->', result.balance_after);

      setTagihan(prev => prev.map(t => t.id === confirmApproveId ? { ...t, status_pembayaran: 'Lunas' } : t));
      setConfirmApproveId(null);
    } catch (e) {
      console.error(e);
      alert('Gagal menyetujui tagihan: ' + e.message);
      setConfirmApproveId(null);
    }
  };

  const filtered = tagihan.filter(t => {
    // Status filter
    if (filter !== 'all' && t.status_pembayaran !== filter) return false;
    // Kode filter (iuran relation)
    if (selectedKode !== 'all') {
      if ((t.expand?.iuran?.kode || '-') !== selectedKode) return false;
    }
    // Kode Rumah filter (search by no_rumah) — hanya untuk pengurus
    if (isPengurus && searchRumah.trim()) {
      const q = searchRumah.trim().toLowerCase();
      const rumah = (t.expand?.warga?.no_rumah || '').toLowerCase();
      const nama = (t.expand?.warga?.expand?.user?.name || '').toLowerCase();
      if (!rumah.includes(q) && !nama.includes(q)) return false;
    }
    return true;
  });
  const totalUnpaid = tagihan.filter(t => t.status_pembayaran !== 'Lunas').reduce((s, t) => s + (t.nominal || 0), 0);

  const statusBadge = (status) => {
    if (status === 'Lunas') return 'badge-success';
    if (status === 'Menunggu Konfirmasi') return 'badge-warning';
    return 'badge-danger';
  };

  // PDF Export
  const handleExportPDF = async () => {
    // dynamic load jsPDF + autoTable from CDN
    if (!window.jspdf) {
      try {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
      } catch(e) {
        alert('Gagal memuat library PDF. Periksa koneksi internet.');
        console.error(e);
        return;
      }
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });

    const margin=14, pageW=210, contentW=pageW-margin*2;

    // header
    doc.setFillColor(15,26,20);
    doc.rect(0,0,pageW,28,'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(14);
    doc.setFont('helvetica','bold');
    doc.text('WARGA P2S — RW 04',margin,18);

    // title
    const title = 'Laporan Tagihan' + (modePengurus ? ' (Semua Warga)' : '');
    doc.setTextColor(15,26,20);
    doc.setFontSize(18);
    doc.setFont('helvetica','bold');
    doc.text(title,margin,44);

    // date & filter info
    const now=new Date();
    const dateStr=now.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
    doc.setFontSize(9);
    doc.setTextColor(110,123,114);
    doc.setFont('helvetica','normal');
    let subtitle = 'Dicetak: '+dateStr;
    if (filter !== 'all') subtitle += ' | Status: '+filter;
    if (selectedKode !== 'all') subtitle += ' | Bulan: '+selectedKode;
    doc.text(subtitle,margin,52);

    // build table rows
    const cols = modePengurus 
      ? ['No', 'Warga', 'No. Rumah', 'Bulan Iuran', 'Nominal', 'Status', 'Jatuh Tempo']
      : ['No', 'Bulan Iuran', 'Nominal', 'Status', 'Jatuh Tempo'];
    const rows = filtered.map((t, i) => {
      const base = [
        String(i + 1),
        t.expand?.iuran?.kode || '-',
        rupiah(t.nominal || 0),
        t.status_pembayaran || '-',
        t.jatuh_tempo ? new Date(t.jatuh_tempo).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' }) : '-',
      ];
      if (modePengurus) {
        base.splice(1, 0, t.expand?.warga?.expand?.user?.name || 'Warga', t.expand?.warga?.no_rumah || '');
      }
      return base;
    });

    doc.autoTable({
      startY:60,
      head: [cols],
      body: rows,
      theme:'grid',
      headStyles:{
        fillColor:[21,147,90],
        textColor:[255,255,255],
        fontStyle:'bold',
        fontSize:10,
        halign:'center',
        cellPadding:{top:5,bottom:5,left:6,right:6}
      },
      bodyStyles:{
        fontSize:9,
        textColor:[15,26,20],
        cellPadding:{top:4,bottom:4,left:6,right:6}
      },
      alternateRowStyles:{
        fillColor:[244,246,244]
      },
      margin:{ left:margin, right:margin },
      tableWidth:contentW,
      styles:{
        cellPadding:{top:4,bottom:4,left:6,right:6},
        lineColor:[200,204,198],
        lineWidth:0.3
      },
      didDrawPage:function(data){
        doc.setFontSize(8);
        doc.setTextColor(160,160,160);
        doc.setFont('helvetica','normal');
        doc.text('Warga P2S — RW 04 | Halaman '+data.pageNumber+' dari '+data.pageCount,margin,290);
      }
    });

    const finalY = doc.lastAutoTable.finalY || 200;

    // summary footer
    const totalFiltered = filtered.reduce((s, t) => s + (t.nominal || 0), 0);
    doc.setDrawColor(15,26,20);
    doc.setLineWidth(0.5);
    doc.line(margin, finalY + 8, pageW - margin, finalY + 8);
    doc.setFontSize(11);
    doc.setFont('helvetica','bold');
    doc.setTextColor(15,26,20);
    doc.text('Total: '+rupiah(totalFiltered)+' | '+filtered.length+' tagihan', margin, finalY + 18);

    doc.setFontSize(7);
    doc.setTextColor(180,180,180);
    doc.setFont('helvetica','normal');
    doc.text('Laporan ini digenerate otomatis dari sistem Warga P2S.', margin, 280);

    doc.save('tagihan-'+now.toISOString().slice(0,10)+'.pdf');
  };

  function loadScript(src) {
    return new Promise((res,rej)=>{
      if(document.querySelector('script[src="'+src+'"]')) return res();
      const s=document.createElement('script');
      s.src=src; s.async=false;
      s.onload=res; s.onerror=rej;
      document.head.appendChild(s);
    });
  }

  const filters = [
    { key: 'all', label: 'Semua' },
    { key: 'Belum Dibayar', label: 'Belum Bayar' },
    { key: 'Menunggu Konfirmasi', label: 'Menunggu' },
    { key: 'Lunas', label: 'Lunas' },
  ];



  return (
    <div className="page-padded">
      <div style={{ padding: '16px 20px 0' }}>
        <h2>Tagihan {modePengurus && '(Mode Pengurus)'}</h2>
      </div>

      <div className="page-content" style={{ marginTop: 16 }}>
        {/* Toggle Mode Pengurus */}
        {isPengurus && (
          <div className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, background: modePengurus ? '#E8F5EE' : '#fff', border: modePengurus ? '1.5px solid #15935A' : 'none' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: modePengurus ? '#15935A' : '#3A453F' }}>Mode Pengurus</div>
              <div style={{ fontSize: 12, color: modePengurus ? '#0C6B40' : '#8A9991' }}>Tampilkan semua tagihan warga</div>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={modePengurus} 
                onChange={(e) => setModePengurus(e.target.checked)} 
              />
              <span className="slider round"></span>
            </label>
          </div>
        )}

        {/* Summary */}
        <div className="card-green">
          <div style={{ fontSize: 13, opacity: 0.8, fontWeight: 600 }}>Total {modePengurus && 'semua warga '}belum dibayar</div>
          <div className="rupiah" style={{ marginTop: 6, fontSize: 28, fontWeight: 800 }}>{rupiah(totalUnpaid)}</div>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
            {tagihan.filter(t => t.status_pembayaran !== 'Lunas').length} tagihan aktif
          </div>
        </div>

        {/* Filters - Status (horizontal scroll pills) */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none', marginTop: 20 }}>
          <div style={{ display: 'flex', gap: 8, paddingBottom: 4, flexWrap: 'nowrap' }}>
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  flex: 'none',
                  border: filter === f.key ? '1.5px solid #15935A' : '1.5px solid #E6EBE7',
                  background: filter === f.key ? '#E8F5EE' : '#fff',
                  color: filter === f.key ? '#15935A' : '#6B7B72',
                  padding: '9px 14px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: filter === f.key ? 700 : 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Bar — Kode Rumah + Bulan Iuran */}
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          {/* Kode Rumah — tampil untuk semua pengurus */}
          {isPengurus && (
            <div style={{ position: 'relative', flex: 1, minWidth: 130 }}>
              <input
                type="text"
                placeholder="� Cari No. Rumah…"
                value={searchRumah}
                onChange={e => setSearchRumah(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 14,
                  border: searchRumah ? '1.5px solid #15935A' : '1.5px solid #E6EBE7',
                  background: searchRumah ? '#F8FDFA' : '#fff',
                  color: searchRumah ? '#15935A' : '#3A453F',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
              {searchRumah && (
                <button
                  onClick={() => setSearchRumah('')}
                  style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', fontSize: 16, color: '#8A9991',
                    cursor: 'pointer', padding: '4px 8px', fontFamily: 'inherit', lineHeight: 1,
                  }}
                  aria-label="Reset"
                >✕</button>
              )}
            </div>
          )}
          <div style={{ flex: modePengurus ? 1 : 2, minWidth: 130, position: 'relative' }}>
            <select
              value={selectedKode}
              onChange={(e) => setSelectedKode(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                paddingRight: 36,
                borderRadius: 14,
                border: selectedKode !== 'all' ? '1.5px solid #15935A' : '1.5px solid #E6EBE7',
                background: selectedKode !== 'all' ? '#F8FDFA' : '#fff',
                color: selectedKode !== 'all' ? '#15935A' : '#6B7B72',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none',
                WebkitAppearance: 'none',
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=%2710%27 height=%276%27 viewBox=%270 0 10 6%27 fill=%27none%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cpath d=%27M1 1L5 5L9 1%27 stroke=%27%236B7B72%27 stroke-width=%271.5%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
              }}
            >
              <option value="all">Semua Bulan</option>
              {availableKodes.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
          {(selectedKode !== 'all' || (isPengurus && searchRumah)) && (
            <button
              onClick={() => { setSelectedKode('all'); setSearchRumah(''); setFilter('all'); }}
              style={{
                padding: '10px 14px',
                borderRadius: 14,
                border: '1.5px solid #E8E5E4',
                background: '#fff',
                color: '#6B7B72',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              ✕ Reset
            </button>
          )}
        </div>

        {/* List */}
        <div className="mt-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Daftar tagihan</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {filtered.length > 0 && (<>
              <button
                onClick={handleExportPDF}
                style={{
                  border: '1.5px solid #0F1A14',
                  background: '#0F1A14',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9V3h12v6"/>
                  <rect x="4" y="9" width="16" height="12" rx="2"/>
                  <path d="M9 13h6M9 16h4"/>
                </svg>
                PDF
              </button>
              <button
                onClick={() => {
                  // Generate CSV
                  const rows = [
                    ['No', ...(modePengurus ? ['Warga','No. Rumah'] : []), 'Bulan Iuran', 'Nominal', 'Status', 'Jatuh Tempo', 'Tgl Dibuat'],
                    ...filtered.map((t, i) => [
                      i + 1,
                      ...(modePengurus ? [
                        t.expand?.warga?.expand?.user?.name || 'Warga',
                        t.expand?.warga?.no_rumah || '',
                      ] : []),
                      t.expand?.iuran?.kode || '-',
                      (t.nominal || 0).toString(),
                      t.status_pembayaran,
                      t.jatuh_tempo ? new Date(t.jatuh_tempo).toLocaleDateString('id-ID') : '-',
                      t.created ? new Date(t.created).toLocaleDateString('id-ID') : '-',
                    ]),
                  ];
                  const csv = rows.map(r => r.join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'tagihan.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                style={{
                  border: '1.5px solid #15935A',
                  background: '#E8F5EE',
                  color: '#15935A',
                  padding: '6px 12px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3v13m0 0l-4-4m4 4l4-4" stroke="#15935A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 17v3h16v-3" stroke="#15935A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                CSV
              </button>
            </>)}
            {filtered.length > 0 && (
              <span style={{ fontSize: 11, color: '#8A9991', fontWeight: 600 }}>{filtered.length} item</span>
            )}
          </div>
        </div>
        {loading ? (
          <div className="card text-center" style={{ padding: 40, marginTop: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #E6EBE7', borderTopColor: '#15935A', animation: 'spin 0.6s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: '#8A9991', fontSize: 13 }}>Memuat data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center" style={{ padding: 32, marginTop: 12 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <p style={{ color: '#8A9991', fontSize: 14, fontWeight: 600 }}>Tidak ada tagihan.</p>
            <p style={{ color: '#B0B8B2', fontSize: 12, marginTop: 4 }}>Coba ubah filter atau status.</p>
          </div>
        ) : (
          <div className="flex-col gap-sm" style={{ marginTop: 8 }}>
            {filtered.map((t) => (
              <div key={t.id} className="list-card" style={{ cursor: 'default', padding: '12px 14px', gap: 12 }}>
                <div className="list-icon" style={{ background: '#E8F5EE', width: 40, height: 40, borderRadius: 12 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="4" y="3" width="16" height="18" rx="3" stroke="#15935A" strokeWidth="1.8"/>
                    <path d="M8 8h8M8 12h8M8 16h5" stroke="#15935A" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="list-body" style={{ flex: 1, minWidth: 0 }}>
                  <span className="list-title" style={{ fontSize: 14 }}>
                    {modePengurus && t.expand?.warga 
                      ? `${t.expand.warga.expand?.user?.name || 'Warga'}` : t.expand?.iuran?.kode || '-'}
                  </span>
                  <span className="list-sub" style={{ fontSize: 11 }}>
                    {modePengurus && t.expand?.warga 
                      ? `🏠 ${t.expand.warga.no_rumah} · ${t.expand?.iuran?.kode || '-'}` 
                      : ((t.expand?.iuran?.kode || '-') + (t.jatuh_tempo ? ' · Jatuh tempo: ' + new Date(t.jatuh_tempo).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''))}
                  </span>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span className="list-amount" style={{ fontSize: 14 }}>{rupiah(t.nominal)}</span>
                  <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span className={`badge ${statusBadge(t.status_pembayaran)}`}>
                      {t.status_pembayaran}
                    </span>
                    {t.status_pembayaran !== 'Lunas' && (() => {
                      const lampirans = Array.isArray(t.expand?.lampiran) ? t.expand.lampiran : (t.expand?.lampiran ? [t.expand.lampiran] : []);
                      return (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {modePengurus && (
                            <button 
                              className="btn" 
                              style={{ background: '#15935A', color: '#fff', fontSize: 11, padding: '4px 10px', height: 'auto', borderRadius: 8 }}
                              onClick={(e) => { e.stopPropagation(); setConfirmApproveId(t.id); }}
                            >
                              Setujui
                            </button>
                          )}
                          {lampirans.length === 0 && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setLampiranUpload(t);
                              }}
                              style={{ background: '#fff', color: '#15935A', fontSize: 11, padding: '4px 10px', height: 'auto', borderRadius: 8, border: '1.5px dashed #15935A', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}
                            >
                              + Lampiran
                            </button>
                          )}
                        </div>
                      );
                    })()}
                    {(() => {
                      const lampirans = Array.isArray(t.expand?.lampiran) ? t.expand.lampiran : (t.expand?.lampiran ? [t.expand.lampiran] : []);
                      if (lampirans.length === 0) return null;
                      const isImage = (name) => /(\.jpg|\.jpeg|\.png|\.webp)$/i.test(name || '');
                      const isPdf = (name) => /\.pdf$/i.test(name || '');
                      return lampirans.map((lmp, idx) => {
                        if (!lmp?.file_bukti) return null;
                        const url = `/api/files/${lmp.collectionId}/${lmp.id}/${lmp.file_bukti}`;
                        const img = isImage(lmp.file_bukti);
                        const pdf = isPdf(lmp.file_bukti);
                        return (
                          <button key={lmp.id || idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (img) {
                                setPreviewFile({ url, name: lmp.file_bukti, isImage: true, isPdf: false });
                              } else if (pdf) {
                                setPreviewFile({ url, name: lmp.file_bukti, isImage: false, isPdf: true });
                              } else {
                                setPreviewFile({ url, name: lmp.file_bukti, isImage: false, isPdf: false });
                              }
                            }}
                            style={{ background: 'none', border: 'none', fontSize: 11, color: '#15935A', fontWeight: 600, textDecoration: 'underline', padding: 0, cursor: 'pointer', marginTop: 4, marginLeft: idx > 0 ? 8 : 0 }}
                          >
                            {img ? '📷 Lihat Bukti' : (pdf ? '📄 Buka PDF' : '🔗 Buka File')}
                            {lampirans.length > 1 ? ` ${idx + 1}` : ''}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Upload Lampiran (form style seperti LampiranForm) */}
      {lampiranUpload && (
        <div className="modal-overlay" onClick={() => { setLampiranUpload(null); setUploadFile(null); }} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20
        }}>
          <div 
            style={{ 
              background: '#fff', padding: 24, borderRadius: 12, width: '100%', maxWidth: 400,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: 18, color: '#1B211E' }}>Tambah Lampiran</h3>

            {/* Warga info */}
            {lampiranUpload.expand?.warga && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
                padding: '8px 12px', background: '#E8F5EE', borderRadius: 8
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="3.5" stroke="#15935A" strokeWidth="2"/>
                  <path d="M5 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" stroke="#15935A" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#15935A' }}>
                  {lampiranUpload.expand.warga.expand?.user?.name || 'Warga'} — No. {lampiranUpload.expand.warga.no_rumah}
                </span>
              </div>
            )}

            {/* Iuran (pre-selected, read-only) */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#3A453F', display: 'block', marginBottom: 6 }}>
                Iuran yang Dibayar
              </label>
              <div style={{
                padding: '10px 12px',
                background: '#F5F7F5',
                border: '1.5px solid #D0D8D2',
                borderRadius: 8,
                color: '#6B7B72',
                fontSize: 13,
              }}>
                <span style={{ fontWeight: 700, color: '#15935A' }}>
                  {lampiranUpload.expand?.iuran?.kode || '-'}
                </span>
                <span style={{ marginLeft: 8, color: '#3A453F' }}>
                  {rupiah(lampiranUpload.nominal)}
                </span>
                {lampiranUpload.expand?.iuran?.keterangan && (
                  <span style={{ marginLeft: 8, fontSize: 11, color: '#8A9991' }}>
                    — {lampiranUpload.expand.iuran.keterangan}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 11, color: '#8A9991', margin: '4px 0 0', fontStyle: 'italic' }}>
                Iuran dikunci sesuai tagihan ini (1-to-1)
              </p>
            </div>

            {/* File input */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#3A453F', display: 'block', marginBottom: 6 }}>
                File Bukti (Gambar / PDF)
              </label>
              <input
                type="file"
                accept="image/jpeg, image/png, image/webp, application/pdf"
                onChange={(e) => setUploadFile(e.target.files[0] || null)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1.5px solid #E6EBE7',
                  fontSize: 12,
                  fontFamily: 'inherit',
                  background: '#fff',
                  color: '#3A453F',
                }}
              />
            </div>

            {/* Message / Status */}
            {uploading && (
              <p style={{ fontSize: 13, color: '#15935A', fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>
                Mengupload...
              </p>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button 
                onClick={async () => {
                  if (!uploadFile) return alert('Pilih file lampiran dulu');
                  setUploading(true);
                  try {
                    const formData = new FormData();
                    formData.append('tagihan_id', lampiranUpload.id);
                    formData.append('file_bukti', uploadFile);

                    const res = await fetch(`${API_URL}/v1/tagihan/tambah-lampiran`, {
                      method: 'POST',
                      headers: { 'Authorization': pb.authStore.token },
                      body: formData,
                    });

                    if (!res.ok) {
                      const err = await res.json();
                      throw new Error(err.message || `HTTP ${res.status}`);
                    }

                    // Upload berhasil, refresh data
                    const userId = pb.authStore.model.id;
                    const w = await pb.collection('warga').getFirstListItem(`user="${userId}"`);
                    const records = await pb.collection('tagihan').getFullList({ 
                      expand: 'iuran,warga,warga.user,lampiran'
                    });
                    records.sort((a, b) => new Date(b.created) - new Date(a.created));
                    setTagihan(records);

                    setUploadFile(null);
                    setLampiranUpload(null);
                  } catch (e) {
                    console.error(e);
                    alert('Gagal upload: ' + e.message);
                  }
                  setUploading(false);
                }}
                disabled={uploading || !uploadFile}
                style={{ 
                  padding: '11px 0', borderRadius: 8, border: 'none',
                  background: uploadFile ? '#15935A' : '#B0D8C0',
                  color: '#fff', fontSize: 14, fontWeight: 700, cursor: uploadFile ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit'
                }}
              >
                {uploading ? 'Mengupload...' : 'Upload Lampiran'}
              </button>
              <button 
                onClick={() => { setLampiranUpload(null); setUploadFile(null); }}
                style={{ 
                  padding: '10px 0', borderRadius: 8, border: '1.5px solid #E6EBE7',
                  background: '#fff', color: '#6B7B72', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview File (Image / PDF) */}
      {previewFile && (
        <div onClick={() => setPreviewFile(null)} style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.93)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 12
        }}>
          <button
            onClick={() => setPreviewFile(null)}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(255,255,255,0.18)',
              border: 'none', borderRadius: '50%',
              width: 44, height: 44,
              color: '#fff', fontSize: 22,
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit', zIndex: 10000
            }}
          >
            ✕
          </button>
          {previewFile.isImage ? (
            <img
              src={previewFile.url}
              alt="Preview Lampiran"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '100%',
                maxHeight: '90vh',
                borderRadius: 12,
                objectFit: 'contain',
                boxShadow: '0 8px 40px rgba(0,0,0,0.5)'
              }}
            />
          ) : previewFile.isPdf ? (
            <iframe
              src={previewFile.url}
              title="Preview PDF"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 800,
                height: '85vh',
                borderRadius: 12,
                border: 'none',
                boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
                background: '#fff'
              }}
            />
          ) : (
            <iframe
              src={previewFile.url}
              title="Preview File"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 800,
                height: '85vh',
                borderRadius: 12,
                border: 'none',
                boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
                background: '#fff'
              }}
            />
          )}
        </div>
      )}

      {/* Modal Confirm Approve */}
      {confirmApproveId && (
        <div className="modal-overlay" onClick={() => setConfirmApproveId(null)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20
        }}>
          <div 
            style={{ 
              background: '#fff', padding: 24, borderRadius: 12, width: '100%', maxWidth: 320, 
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)', textAlign: 'center' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: 18, color: '#1B211E' }}>Konfirmasi</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: 14, color: '#6B7B72', lineHeight: 1.5 }}>
              Tandai tagihan ini menjadi Lunas?
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => setConfirmApproveId(null)}
                style={{ 
                  flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #E6EBE7', 
                  background: '#fff', color: '#6B7B72', fontSize: 14, fontWeight: 600, cursor: 'pointer' 
                }}
              >
                Batal
              </button>
              <button 
                onClick={() => handleApprove()}
                style={{ 
                  flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', 
                  background: '#15935A', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' 
                }}
              >
                Ya, Setujui
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
