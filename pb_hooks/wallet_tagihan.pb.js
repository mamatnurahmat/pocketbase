// Hook: Saat tagihan disetujui (Lunas), auto topup wallet warga + buat transaksi
console.log('wallet_tagihan: loaded v2');

onRecordAfterUpdateSuccess(function (e) {
  try {
    var record = e.record;
    if (!record) return;

    // ponytail: check collection via collectionName (simpler, works across PB versions)
    var collName = record.collectionName || (record.collection ? record.collection().name : null);
    if (collName !== 'tagihan') return;

    var newStatus = record.getString('status_pembayaran') || '';
    var oldStatus = '';
    try { oldStatus = record.getOriginal('status_pembayaran') || ''; } catch (_) {}

    console.log('wallet_tagihan: tagihan updated', record.getString('id'), 'status', oldStatus, '->', newStatus);

    // Hanya trigger saat status BERUBAH ke Lunas
    if (newStatus !== 'Lunas' || oldStatus === 'Lunas') return;

    var wargaId = record.getString('warga');
    var nominal = record.get('nominal') || 0;
    console.log('wallet_tagihan: APPROVE detected', 'warga=', wargaId, 'nominal=', nominal);

    if (!wargaId || nominal <= 0) {
      console.error('wallet_tagihan: skip - no wargaId or nominal');
      return;
    }

    // 1. Dapatkan user_id dari warga
    var warga = $app.findFirstRecordByData('warga', 'id', wargaId);
    if (!warga) { console.error('wallet_tagihan: warga not found', wargaId); return; }

    var userId = warga.getString('user');
    if (!userId) { console.error('wallet_tagihan: warga tidak punya user', wargaId); return; }
    console.log('wallet_tagihan: user found', userId);

    // 2. Cari wallet PERSONAL warga
    var wallet;
    try {
      wallet = $app.findFirstRecordByData('wallets', 'user', userId);
    } catch (_) {}

    if (!wallet) {
      console.error('wallet_tagihan: wallet not found for user', userId);
      return;
    }

    if (wallet.getString('wallet_type') !== 'PERSONAL') {
      console.error('wallet_tagihan: wallet bukan PERSONAL, type=', wallet.getString('wallet_type'));
      return;
    }

    // 3. Update balance wallet
    var balanceBefore = wallet.get('balance') || 0;
    var balanceAfter = balanceBefore + nominal;

    var walletsColl = $app.findCollectionByNameOrId('wallets');
    var walletRecord = new Record(walletsColl, {
      id: wallet.getString('id'),
      balance: balanceAfter,
    });
    $app.save(walletRecord);
    console.log('wallet_tagihan: wallet updated', userId, balanceBefore, '->', balanceAfter);

    // 4. Buat transaksi TOPUP
    var now = new Date().toISOString();
    var refNo = 'TRX-' + now.slice(0, 10).replace(/-/g, '') + '-' +
      Math.random().toString(36).substring(2, 6).toUpperCase();

    var trxColl = $app.findCollectionByNameOrId('transactions');
    var trxRecord = new Record(trxColl, {
      reference_no: refNo,
      type: 'TOPUP',
      status: 'SUCCESS',
      to_wallet: wallet.getString('id'),
      amount: nominal,
      fee: 0,
      net_amount: nominal,
      note: 'Auto topup dari tagihan #' + record.getString('id'),
      created_by: userId,
    });
    $app.save(trxRecord);
    var trxId = trxRecord.getString('id');
    console.log('wallet_tagihan: transaction created', refNo, trxId);

    // 5. Buat ledger entry (CREDIT ke wallet warga)
    var ledColl = $app.findCollectionByNameOrId('ledgers');
    var ledRecord = new Record(ledColl, {
      wallet: wallet.getString('id'),
      transaction: trxId,
      entry_type: 'CREDIT',
      amount: nominal,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
    });
    $app.save(ledRecord);
    console.log('wallet_tagihan: ledger CREDIT created for wallet', wallet.getString('id'));
    console.log('wallet_tagihan: DONE -', refNo);
  } catch (err) {
    console.error('wallet_tagihan: FATAL ERROR', String(err));
  }
});