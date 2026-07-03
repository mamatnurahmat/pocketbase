import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pb } from '../lib/pocketbase';

export default function Riwayat() {
  const { walletId } = useParams();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterWaktu, setFilterWaktu] = useState('all');
  const [filterTipe, setFilterTipe] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [isPengurus, setIsPengurus] = useState(false);

  const rupiah = (n) => { let v = n || 0; if (v < 1 && v > 0) v = 0; return 'Rp ' + v.toLocaleString('id-ID'); };

  // Icon & color per transaction type
  const txInfo = (type, entryType) => ({
    icon: type === 'TOPUP' || type === 'IURAN' ? '📥' :
          type === 'PENGELUARAN' ? '📤' :
          type === 'TRANSFER' ? '🔄' :
          type === 'WITHDRAWAL' ? '📤' :
          type === 'REVERSAL' ? '↩️' : '💳',
    color: type === 'TOPUP' || type === 'IURAN' ? '#15935A' :
           type === 'PENGELUARAN' ? '#C24A4A' :
           type === 'TRANSFER' ? '#2563EB' :
           type === 'WITHDRAWAL' ? '#E68A2E' :
           type === 'REVERSAL' ? '#8A9991' : '#6B7B72',
    label: entryType === 'CREDIT' ? 'Masuk' : entryType === 'DEBIT' ? 'Keluar' : '-',
  });

  // Fetch wallet & ledgers
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get wallet
        const w = await pb.collection('wallets').getOne(walletId, { expand: 'user' });
        setWallet(w);

        // Check if user is pengurus
        try {
          const wargaMe = await pb.collection('warga').getFirstListItem(`user="${pb.authStore.model.id}"`);
          setIsPengurus(wargaMe.pengurus || false);
        } catch (_) {}

        // Build date filter (client-side, since ledgers don't have created field)
        let dateCutoff = null;
        if (filterWaktu === '7') {
          dateCutoff = new Date(); dateCutoff.setDate(dateCutoff.getDate() - 7);
        } else if (filterWaktu === '30') {
          dateCutoff = new Date(); dateCutoff.setDate(dateCutoff.getDate() - 30);
        } else if (filterWaktu === '90') {
          dateCutoff = new Date(); dateCutoff.setDate(dateCutoff.getDate() - 90);
        }

        // Fetch ledgers for this wallet with expand transaction
        let filter = `wallet="${walletId}"`;

        const result = await pb.collection('ledgers').getFullList({
          filter: filter,
          sort: '-created',
          expand: 'transaction',
          perPage: 200,
        });

        // Filter by entry type (Masuk/Keluar)
        let filtered = result;
        if (filterTipe === 'masuk') filtered = result.filter(l => l.entry_type === 'CREDIT');
        else if (filterTipe === 'keluar') filtered = result.filter(l => l.entry_type === 'DEBIT');

        // Filter by date (client-side, using transaction.created)
        if (dateCutoff) {
          filtered = filtered.filter(l => {
            const tx = l.expand?.transaction;
            if (tx?.created) return new Date(tx.created) >= dateCutoff;
            return true;
          });
        }

        setLedgers(filtered);
      } catch (e) {
        console.error('Riwayat fetch error:', e);
      }
      setLoading(false);
    };
    if (pb.authStore.isValid && walletId) fetchData();
  }, [walletId, filterWaktu, filterTipe]);

  const filtersWaktu = [
    { key: '7', label: '7 Hari' },
    { key: '30', label: '30 Hari' },
    { key: '90', label: '3 Bulan' },
    { key: 'all', label: 'Semua' },
  ];

  const filtersTipe = [
    { key: 'all', label: 'Semua' },
    { key: 'masuk', label: 'Masuk' },
    { key: 'keluar', label: 'Keluar' },
  ];

  return (
    <div className="page-padded" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, fontFamily: 'inherit' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="#0F1A14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h2 style={{ margin: 0 }}>Riwayat Transaksi</h2>
      </div>

      {/* Wallet Info Card */}
      {wallet && (
        <div style={{ margin: '16px 20px 0', background: wallet.wallet_type === 'KAS' ? 'linear-gradient(145deg, #147a4a, #0C6B40)' : 'linear-gradient(145deg, #2563EB, #1d4ed8)', borderRadius: 16, padding: 20, color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 600 }}>
                {wallet.wallet_type === 'KAS' ? '💰 Saldo Kas Warga' : '💳 Saldo Dompet Pribadi'}
              </div>
              {wallet.expand?.user?.name && (
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{wallet.expand.user.name}</div>
              )}
            </div>
            <div style={{ fontSize: 11, opacity: 0.7, background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: 8 }}>
              {wallet.wallet_type}
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 10 }}>{rupiah(wallet.balance)}</div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
            {ledgers.length} transaksi tercatat
          </div>
        </div>
      )}

      {/* Filters - Waktu */}
      <div style={{ display: 'flex', gap: 8, marginTop: 20, padding: '0 20px', overflowX: 'auto', paddingBottom: 4 }}>
        {filtersWaktu.map((f) => (
          <button key={f.key} onClick={() => setFilterWaktu(f.key)}
            style={{
              flex: 'none', border: filterWaktu === f.key ? '1.5px solid #15935A' : '1.5px solid #E6EBE7',
              background: filterWaktu === f.key ? '#E8F5EE' : '#fff',
              color: filterWaktu === f.key ? '#15935A' : '#6B7B72',
              padding: '8px 14px', borderRadius: 20, fontSize: 12, fontWeight: filterWaktu === f.key ? 700 : 600,
              cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >{f.label}</button>
        ))}
      </div>

      {/* Filters - Tipe */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10, padding: '0 20px' }}>
        {filtersTipe.map((f) => (
          <button key={f.key} onClick={() => setFilterTipe(f.key)}
            style={{
              flex: 1, border: filterTipe === f.key ? '1.5px solid #15935A' : '1.5px solid #E6EBE7',
              background: filterTipe === f.key ? '#E8F5EE' : '#fff',
              color: filterTipe === f.key ? '#15935A' : '#6B7B72',
              padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: filterTipe === f.key ? 700 : 600,
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
            }}
          >{f.label}</button>
        ))}
      </div>

      {/* Transaction List */}
      <div style={{ marginTop: 16, padding: '0 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#8A9991', fontSize: 14 }}>Memuat...</div>
        ) : ledgers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#8A9991', fontSize: 14 }}>
            <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 10 }}>📭</div>
            Belum ada transaksi
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ledgers.map((l) => {
              const tx = l.expand?.transaction || {};
              const info = txInfo(tx.type, l.entry_type);
              const isExpanded = expandedId === l.id;
              return (
                <div key={l.id} className="card" style={{ padding: 14, border: isExpanded ? '1.5px solid #15935A' : '1.5px solid #E6EBE7', cursor: 'pointer' }}
                  onClick={() => setExpandedId(isExpanded ? null : l.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                      <span style={{ fontSize: 22 }}>{info.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: '#0F1A14' }}>{tx.type || 'Transaksi'}</span>
                          <span style={{
                            fontSize: 10, padding: '2px 6px', borderRadius: 4,
                            background: l.entry_type === 'CREDIT' ? '#E8F5EE' : '#FFF5F4',
                            color: l.entry_type === 'CREDIT' ? '#15935A' : '#C24A4A',
                            fontWeight: 700,
                          }}>{info.label}</span>
                        </div>
                        {tx.note && <div style={{ fontSize: 11, color: '#6B7B72', marginTop: 2 }}>{tx.note}</div>}
                        <div style={{ fontSize: 10, color: '#A6B0AA', marginTop: 2 }}>
                          {l.created ? new Date(l.created).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : (l.expand?.transaction?.created ? new Date(l.expand.transaction.created).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '')}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: l.entry_type === 'CREDIT' ? '#15935A' : '#C24A4A' }}>
                        {l.entry_type === 'CREDIT' ? '+' : '-'}{rupiah(l.amount)}
                      </div>
                      <div style={{ fontSize: 10, color: '#A6B0AA', marginTop: 1 }}>
                        {rupiah(l.balance_after)}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #E6EBE7' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 12 }}>
                        <span style={{ color: '#6B7B72' }}>Referensi:</span>
                        <span style={{ fontWeight: 600 }}>{tx.reference_no || '-'}</span>
                        
                        <span style={{ color: '#6B7B72' }}>Status:</span>
                        <span style={{ fontWeight: 600, color: tx.status === 'SUCCESS' ? '#15935A' : tx.status === 'PENDING' ? '#E68A2E' : '#C24A4A' }}>
                          {tx.status || '-'}
                        </span>
                        
                        <span style={{ color: '#6B7B72' }}>Saldo Sebelum:</span>
                        <span style={{ fontWeight: 600 }}>{rupiah(l.balance_before)}</span>
                        
                        <span style={{ color: '#6B7B72' }}>Saldo Sesudah:</span>
                        <span style={{ fontWeight: 600 }}>{rupiah(l.balance_after)}</span>
                        
                        {tx.amount > 0 && (
                          <>
                            <span style={{ color: '#6B7B72' }}>Jumlah:</span>
                            <span style={{ fontWeight: 600, color: l.entry_type === 'CREDIT' ? '#15935A' : '#C24A4A' }}>
                              {l.entry_type === 'CREDIT' ? '+' : '-'}{rupiah(tx.amount)}
                            </span>
                            
                            {tx.fee > 0 && (
                              <>
                                <span style={{ color: '#6B7B72' }}>Biaya:</span>
                                <span style={{ fontWeight: 600 }}>{rupiah(tx.fee)}</span>
                              </>
                            )}
                            
                            <span style={{ color: '#6B7B72' }}>Bersih:</span>
                            <span style={{ fontWeight: 600 }}>{rupiah(tx.net_amount)}</span>
                          </>
                        )}
                        
                        {tx.note && (
                          <>
                            <span style={{ color: '#6B7B72' }}>Catatan:</span>
                            <span style={{ fontWeight: 600 }}>{tx.note}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}