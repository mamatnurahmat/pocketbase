import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
export default function Dashboard() {
  const navigate = useNavigate();
  const user = pb.authStore.model;
  const [warga, setWarga] = useState(null);
  const [tagihan, setTagihan] = useState([]);
  const [walletKas, setWalletKas] = useState(null);
  const [walletPribadi, setWalletPribadi] = useState(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [lastAbsenScurity, setLastAbsenScurity] = useState(null);
  const [showCallPopup, setShowCallPopup] = useState(false);
  const slideRef = useRef(null);
  const touchStartX = useRef(0);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat pagi';
    if (h < 15) return 'Selamat siang';
    if (h < 18) return 'Selamat sore';
    return 'Selamat malam';
  };

  const rupiah = (n) => {
    // ponytail: PocketBase v0.39 rejects balance=0, use 0.01 as sentinel; mask to 0
    var v = n || 0;
    if (v < 1) v = 0;
    return 'Rp ' + v.toLocaleString('id-ID');
  };

  const statusBadge = (status) => {
    if (status === 'Lunas') return 'badge-success';
    if (status === 'Menunggu Konfirmasi') return 'badge-warning';
    return 'badge-danger';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userId = pb.authStore.model.id;
        try {
          const w = await pb.collection('warga').getFirstListItem(`user="${userId}"`);
          setWarga(w);
          localStorage.setItem('isPengurus', w.pengurus ? 'true' : 'false');
          // Fetch tagihan for this warga
          try {
            const isPengurusMode = localStorage.getItem('modePengurus') === null ? true : localStorage.getItem('modePengurus') === 'true';
            let t = [];
            if (w.pengurus && isPengurusMode) {
                t = await pb.collection('tagihan').getFullList({ expand: 'iuran' });
            } else {
                t = await pb.collection('tagihan').getFullList({ 
                  filter: `warga="${w.id}"`,
                  expand: 'iuran'
                });
            }
            setTagihan(t);
          } catch (e) { console.warn("Tagihan fetch:", e); }
        } catch (e) { console.warn("Warga not found:", e); }

        // Fetch wallets
        try {
          const wallets = await pb.collection('wallets').getFullList({ filter: `user="${userId}"` });
          const pribadi = wallets.find(w => w.wallet_type === 'PERSONAL');
          if (pribadi) setWalletPribadi(pribadi);
        } catch (e) { console.warn("Wallet pribadi:", e); }

        // Fetch KAS wallet (public info)
        try {
          const kasList = await pb.collection('wallets').getFullList({ filter: 'wallet_type="KAS"', expand: 'user' });
          if (kasList.length > 0) setWalletKas(kasList[0]);
        } catch (e) { console.warn("Wallet kas:", e); }
      } catch (e) { console.error(e); }
    };
    if (pb.authStore.isValid) fetchData();

    // ponytail: fetch last scurity absen, single query, no pagination
    const fetchLastAbsen = async () => {
      try {
        var records = await pb.collection('laporan_scurity').getList(1, 1, {
          filter: 'jenis = "absen"',
          sort: '-tanggal',
        });
        if (records.items.length === 0) return;
        var l = records.items[0];
        var userId = l.dibuat_oleh;
        if (!userId) return;
        // ponytail: lookup user name langsung dari users collection
        try {
          var u = await pb.collection('users').getOne(userId);
          setLastAbsenScurity({ nama: u.name || u.username || 'Scurity', no_hp: '-' });
          // cek juga scurity collection untuk no_hp
          try {
            var sc = await pb.collection('scurity').getFirstListItem('user = "' + userId + '"');
            setLastAbsenScurity({ nama: sc.nama, no_hp: sc.no_hp });
          } catch (_) {}
        } catch (_) {}
      } catch (e) {
        console.warn('No scurity absen found:', e);
      }
    };
    fetchLastAbsen();
  }, []);

  const unpaid = tagihan.filter(t => t.status_pembayaran !== 'Lunas');
  const totalUnpaid = unpaid.reduce((sum, t) => sum + (t.nominal || 0), 0);
  
  const now = new Date();
  const isCurrentMonth = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const unpaidThisMonth = tagihan.filter(t => t.status_pembayaran !== 'Lunas' && isCurrentMonth(t.jatuh_tempo)).length;
  const lunasThisMonth = tagihan.filter(t => t.status_pembayaran === 'Lunas' && isCurrentMonth(t.jatuh_tempo)).length;
  
  const isScurity = localStorage.getItem('isScurity') === 'true';
  const displayName = user?.name || user?.username?.replace('hp_', '') || 'Warga';

  // ponytail: swipe handlers for slide carousel
  const slides = [
    { type: 'kas', label: 'Saldo Kas' },
    { type: 'pribadi', label: 'Saldo Saya' },
    { type: 'tagihan', label: 'Tagihan' },
  ];

  const goToSlide = (i) => setSlideIndex(i);

  // ponytail: auto-slide every 5 detik
  useEffect(() => {
    var timer = setInterval(() => {
      setSlideIndex(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && slideIndex < slides.length - 1) setSlideIndex(slideIndex + 1);
      else if (diff < 0 && slideIndex > 0) setSlideIndex(slideIndex - 1);
    }
  };

  const renderSlide = (type) => {
    if (type === 'tagihan') {
      return (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#6B7B72', fontWeight: 600 }}>
              Total tagihan {warga?.pengurus && (localStorage.getItem('modePengurus') === null || localStorage.getItem('modePengurus') === 'true') && localStorage.getItem('isPengurus') === 'true' ? 'semua warga ' : ''}belum dibayar
            </span>
            {unpaid.length > 0 && (
              <span className="badge badge-warning">{unpaid.length} tagihan</span>
            )}
          </div>
          <div className="rupiah" style={{ marginTop: 10, fontSize: 30, fontWeight: 800 }}>
            {rupiah(totalUnpaid)}
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => navigate('/tagihan')}
          >
            Lihat tagihan
          </button>
        </>
      );
    }
    if (type === 'kas') {
      const kasBalance = walletKas ? walletKas.balance : null;
      const kasOwner = walletKas?.expand?.user?.name || 'Bendahara';
      return (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#6B7B72', fontWeight: 600 }}>Saldo kas warga</span>
            <span style={{ fontSize: 12, color: '#8A9991', fontWeight: 500 }}>🏦 {kasOwner}</span>
          </div>
          <div className="rupiah" style={{ marginTop: 10, fontSize: 30, fontWeight: 800, color: (kasBalance != null && kasBalance >= 1) ? '#15935A' : '#3A453F' }}>
            {kasBalance != null ? rupiah(kasBalance) : 'Memuat...'}
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: '#8A9991' }}>
            Dana bersama untuk operasional & kegiatan warga
          </div>
          <button
            className="btn btn-outline"
            style={{ marginTop: 16 }}
            onClick={() => navigate('/tagihan')}
          >
            Riwayat kas
          </button>
        </>
      );
    }
    if (type === 'pribadi') {
      const myBalance = walletPribadi ? walletPribadi.balance : null;
      return (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#6B7B72', fontWeight: 600 }}>Saldo dompet saya</span>
            <span style={{ fontSize: 12, color: '#8A9991', fontWeight: 500 }}>💳 Pribadi</span>
          </div>
          <div className="rupiah" style={{ marginTop: 10, fontSize: 30, fontWeight: 800, color: (myBalance != null && myBalance >= 1) ? '#15935A' : '#3A453F' }}>
            {myBalance != null ? rupiah(myBalance) : 'Memuat...'}
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: '#8A9991' }}>
            Top up untuk bayar iuran & transfer antar warga
          </div>
          <button
            className="btn btn-outline"
            style={{ marginTop: 16 }}
            onClick={() => navigate('/iuran')}
          >
            Bayar iuran
          </button>
        </>
      );
    }
  };

  return (
    <div className="page-padded">
      {/* Green Header */}
      <div className="header-green">
        <div className="header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="avatar avatar-green">{getInitials(displayName)}</div>
            <div>
              <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, fontWeight: 500 }}>{getGreeting()},</div>
              <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{displayName}</div>
            </div>
          </div>
          <div className="avatar avatar-green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.7 21a2 2 0 01-3.4 0" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </div>

      <div className="page-content" style={{ marginTop: -44 }}>
        {!isScurity && (
          <>
            {/* Slide Card: Tagihan / Kas / Pribadi */}
            <div className="dashboard-cards" style={{ marginTop: -8 }}>
              {/* Dot indicators */}
              <div className="slide-dots">
                {slides.map((s, i) => (
                  <button
                    key={s.type}
                    className={`slide-dot ${i === slideIndex ? 'active' : ''}`}
                    onClick={() => goToSlide(i)}
                    aria-label={s.label}
                  />
                ))}
              </div>

              {/* Carousel */}
              <div
                ref={slideRef}
                className="slide-track-wrapper"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <div
                  className="slide-track"
                  style={{ transform: `translateX(-${slideIndex * 100}%)` }}
                >
                  {slides.map((s) => (
                    <div key={s.type} className="slide-item">
                      <div className="card slide-card" style={{ boxShadow: '0 10px 30px -12px rgba(15,26,20,.18)' }}>
                        {renderSlide(s.type)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary Laporan */}
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
              <div className="card text-center" style={{ padding: '16px 12px' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#E53935' }}>{unpaidThisMonth}</div>
                <div style={{ fontSize: 12, color: '#6B7B72', marginTop: 4 }}>Belum Bayar (Bulan Ini)</div>
              </div>
              <div className="card text-center" style={{ padding: '16px 12px' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#15935A' }}>{lunasThisMonth}</div>
                <div style={{ fontSize: 12, color: '#6B7B72', marginTop: 4 }}>Lunas (Bulan Ini)</div>
              </div>
            </div>
          </>
        )}

        {/* Quick Actions */}
        <div className="card mt-3" style={{ padding: '18px 8px' }}>
          <div className="quick-actions">
            {localStorage.getItem('isScurity') === 'true' ? (
              <>
                <button className="quick-action" onClick={() => navigate('/warga')}>
                  <span className="quick-action-icon" style={{ background: '#E3F2FD' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#1976D2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="9" cy="7" r="4" stroke="#1976D2" strokeWidth="1.8"/>
                      <path d="M23 21v-2a4 4 0 00-3-3.87" stroke="#1976D2" strokeWidth="1.8" strokeLinecap="round"/>
                      <path d="M16 3.13a4 4 0 010 7.75" stroke="#1976D2" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <span>Warga</span>
                </button>
              </>
            ) : (
              <>
                <button className="quick-action" onClick={() => navigate('/iuran')}>
                  <span className="quick-action-icon" style={{ background: '#E8F5EE' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="6" width="18" height="13" rx="3" stroke="#15935A" strokeWidth="1.8"/>
                      <path d="M3 10h18" stroke="#15935A" strokeWidth="1.8"/>
                      <path d="M7 15h4" stroke="#15935A" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <span>Upload Bukti</span>
                </button>
                <button className="quick-action" onClick={() => navigate('/laporan-warga')}>
                  <span className="quick-action-icon" style={{ background: '#FCE4EC' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M8 12h8m-8-4h8m-8 8h4" stroke="#D81B60" strokeWidth="1.8" strokeLinecap="round"/>
                      <rect x="4" y="4" width="16" height="16" rx="3" stroke="#D81B60" strokeWidth="1.8"/>
                    </svg>
                  </span>
                  <span>Lap. Warga</span>
                </button>
                <button className="quick-action" onClick={() => navigate('/warga')}>
                  <span className="quick-action-icon" style={{ background: '#E3F2FD' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#1976D2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="9" cy="7" r="4" stroke="#1976D2" strokeWidth="1.8"/>
                      <path d="M23 21v-2a4 4 0 00-3-3.87" stroke="#1976D2" strokeWidth="1.8" strokeLinecap="round"/>
                      <path d="M16 3.13a4 4 0 010 7.75" stroke="#1976D2" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <span>Warga</span>
                </button>
                <button className="quick-action" onClick={() => navigate('/laporan-scurity')}>
                  <span className="quick-action-icon" style={{ background: '#F3E5F5' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#7B1FA2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span>Lap. Scurity</span>
                </button>
                <button className="quick-action" onClick={() => navigate('/lampiran')}>
                  <span className="quick-action-icon" style={{ background: '#FEF3E2' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="#C8821A" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span>Lampiran</span>
                </button>
                <button className="quick-action" onClick={() => setShowCallPopup(true)}>
                  <span className="quick-action-icon" style={{ background: '#E8F5EE' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="#15935A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span>Call Scurity</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Info Warga */}
        {!isScurity && warga && (
          <div className="mt-3">
            <div className="section-title">Info warga</div>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="list-icon" style={{ background: '#E8F5EE' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M3 11.5L12 4l9 7.5" stroke="#15935A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 10.5V20h14v-9.5" stroke="#15935A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="list-body">
                <span className="list-title">No. Rumah: {warga.no_rumah}</span>
                <span className="list-sub">HP: {warga.no_wa || (user?.username?.startsWith('hp_') ? user.username.replace('hp_', '') : '-')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Recent Tagihan */}
        {!isScurity && unpaid.length > 0 && (
          <div className="mt-3">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className="section-title" style={{ margin: 0 }}>Tagihan aktif</span>
              <button onClick={() => navigate('/tagihan')} style={{ border: 'none', background: 'none', color: '#15935A', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Lihat semua</button>
            </div>
            <div className="flex-col gap-sm">
              {unpaid.slice(0, 3).map((t) => (
                <div key={t.id} className="list-card">
                  <div className="list-icon" style={{ background: '#E8F5EE' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <rect x="4" y="3" width="16" height="18" rx="3" stroke="#15935A" strokeWidth="1.8"/>
                      <path d="M8 8h8M8 12h8M8 16h5" stroke="#15935A" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="list-body">
                    <span className="list-title">{t.expand?.iuran?.kode || '-'}</span>
                    <span className="list-sub">{t.jatuh_tempo ? new Date(t.jatuh_tempo).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 'auto' }}>
                    <span className="list-amount">{rupiah(t.nominal)}</span>
                    <span className={`badge ${statusBadge(t.status_pembayaran)}`} style={{ marginTop: 4, display: 'inline-block' }}>
                      {t.status_pembayaran === 'Menunggu Konfirmasi' ? 'Menunggu' : t.status_pembayaran}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Call Scurity Popup ── */}
      {showCallPopup && (
        <div className="modal-backdrop" onClick={() => setShowCallPopup(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: 'auto' }}>
            <div className="modal-header">
              <h3>📞 Call Scurity</h3>
              <button className="close-btn" onClick={() => setShowCallPopup(false)}>✕</button>
            </div>
            <div className="modal-body">
              {lastAbsenScurity ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: '#E8F5EE', color: '#15935A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28, fontWeight: 800, margin: '0 auto 16px',
                  }}>
                    {lastAbsenScurity.nama.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0F1A14' }}>{lastAbsenScurity.nama}</div>
                  <div style={{ fontSize: 15, color: '#6B7B72', marginTop: 4, fontWeight: 600 }}>{lastAbsenScurity.no_hp}</div>
                  <div style={{ fontSize: 12, color: '#8A9991', marginTop: 20 }}>
                    Scurity terakhir yang absen
                  </div>
                  <a
                    href={`https://wa.me/${lastAbsenScurity.no_hp.replace(/^0/, '62')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{
                      marginTop: 20, display: 'flex',
                      textDecoration: 'none', fontSize: 16, gap: 8,
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Call via WhatsApp
                  </a>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#8A9991' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>Belum ada scurity absen</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>Tunggu scurity melakukan absen</div>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button
                className="btn btn-outline"
                onClick={() => setShowCallPopup(false)}
                style={{ maxWidth: 200 }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
