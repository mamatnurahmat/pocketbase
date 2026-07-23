// Hook: Saat tagihan disetujui (Lunas), auto topup KAS wallet + buat transaksi
// NOTE: Semua tagihan masuk ke KAS.
// Hook ini fallback jika Flask API gagal.
console.log('wallet_tagihan: loaded v3 (fallback only)');

onRecordAfterUpdateSuccess(function (e) {
  try {
    var record = e.record;
    if (!record) return;

    var collName = record.collectionName || (record.collection ? record.collection().name : null);
    if (collName !== 'tagihan') return;

    var newStatus = record.getString('status_pembayaran') || '';
    console.log('wallet_tagihan: tagihan updated', record.getString('id'), '->', newStatus);

    // Hanya trigger saat status BERUBAH ke Lunas
    if (newStatus !== 'Lunas') return;

    var tagihanId = record.getString('id');

    // Cek apakah transaksi sudah dibuat oleh Flask API
    var existingTrx = $app.findRecordsByFilter('transactions', 'note ~ "' + tagihanId + '"', '', 1, 0);
    if (existingTrx.length > 0) {
      console.log('wallet_tagihan: transaksi sudah ada, skip (handled by API)');
      return;
    }

    var nominal = record.get('nominal') || 0;
    console.log('wallet_tagihan: APPROVE detected', 'tagihan=', tagihanId, 'nominal=', nominal);

    if (nominal <= 0) {
      console.error('wallet_tagihan: skip - nominal 0');
      return;
    }

    // 1. Cari KAS wallet
    var wallets = $app.findRecordsByFilter('wallets', 'wallet_type="KAS"', '', 1, 0);
    var wallet = wallets.length > 0 ? wallets[0] : null;

    if (!wallet) {
      console.error('wallet_tagihan: KAS wallet not found');
      return;
    }

    // 2. Update balance KAS wallet
    var balanceBefore = wallet.get('balance') || 0;
    var balanceAfter = balanceBefore + nominal;

    var walletRecord = $app.findRecordById('wallets', wallet.getString('id'));
    walletRecord.set('balance', balanceAfter);
    $app.save(walletRecord);
    console.log('wallet_tagihan: KAS wallet updated', balanceBefore, '->', balanceAfter);

    // 3. Buat transaksi TOPUP ke KAS
    var now = new Date().toISOString();
    var refNo = 'TRX-' + now.slice(0, 10).replace(/-/g, '') + '-' +
      Math.random().toString(36).substring(2, 6).toUpperCase();

    var trxColl = $app.findCollectionByNameOrId('transactions');
    var trxRecord = new Record(trxColl);
    trxRecord.set('reference_no', refNo);
    trxRecord.set('type', 'TOPUP');
    trxRecord.set('status', 'SUCCESS');
    trxRecord.set('to_wallet', wallet.getString('id'));
    trxRecord.set('amount', nominal);
    trxRecord.set('fee', 0);
    trxRecord.set('net_amount', nominal);
    trxRecord.set('note', 'Auto topup dari tagihan #' + tagihanId);
    $app.save(trxRecord);
    var trxId = trxRecord.getString('id');
    console.log('wallet_tagihan: transaction created', refNo, trxId);

    // 4. Buat ledger entry (CREDIT ke KAS)
    var ledColl = $app.findCollectionByNameOrId('ledgers');
    var ledRecord = new Record(ledColl);
    ledRecord.set('wallet', wallet.getString('id'));
    ledRecord.set('transaction', trxId);
    ledRecord.set('entry_type', 'CREDIT');
    ledRecord.set('amount', nominal);
    ledRecord.set('balance_before', balanceBefore);
    ledRecord.set('balance_after', balanceAfter);
    $app.save(ledRecord);
    console.log('wallet_tagihan: ledger CREDIT created for KAS');
    console.log('wallet_tagihan: DONE -', refNo);
  } catch (err) {
    console.error('wallet_tagihan: FATAL ERROR', String(err));
  }
});