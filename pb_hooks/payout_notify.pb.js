// Hook: Saat payout disetujui (Disetujui -> Dibayar), auto debit KAS wallet + buat transaksi + ledger
console.log('payout_notify: loaded');

onRecordAfterUpdateSuccess(function (e) {
  try {
    var record = e.record;
    if (!record) return;

    var collName = record.collectionName || (record.collection ? record.collection().name : null);
    if (collName !== 'payout') return;

    var newStatus = record.getString('status') || '';
    var oldStatus = '';
    try {
      oldStatus = e.oldRecord ? (e.oldRecord.getString('status') || '') : '';
    } catch (_) {}

    console.log('payout_notify: payout updated', record.getString('id'), oldStatus, '->', newStatus);

    // Hanya trigger saat status BERUBAH ke Dibayar
    if (newStatus !== 'Dibayar' || oldStatus === 'Dibayar') return;

    var wargaId = record.getString('warga');
    var nominal = record.get('nominal') || 0;
    console.log('payout_notify: PAYOUT APPROVED', 'warga=', wargaId, 'nominal=', nominal);

    if (!wargaId || nominal <= 0) {
      console.error('payout_notify: skip - no wargaId or nominal');
      return;
    }

    // 1. Dapatkan user_id dari warga
    var warga = $app.findFirstRecordByData('warga', 'id', wargaId);
    if (!warga) { console.error('payout_notify: warga not found', wargaId); return; }

    var userId = warga.getString('user');
    if (!userId) { console.error('payout_notify: warga tidak punya user', wargaId); return; }
    console.log('payout_notify: user found', userId);

    // 2. Cari wallet KAS
    var kasWallet;
    try {
      var allWallets = $app.findRecordsByFilter('wallets', 'wallet_type="KAS"', '', 1, 0);
      if (allWallets && allWallets.length > 0) {
        kasWallet = allWallets[0];
      }
    } catch (_) {}

    if (!kasWallet) {
      console.error('payout_notify: KAS wallet not found');
      return;
    }

    // 3. Cek saldo cukup
    var balanceBefore = kasWallet.get('balance') || 0;
    if (balanceBefore < nominal) {
      console.error('payout_notify: saldo KAS tidak cukup', balanceBefore, '<', nominal);
      // TODO: bisa kirim notifikasi ke pengurus
      return;
    }

    var balanceAfter = balanceBefore - nominal;

    // 4. Update balance KAS wallet
    var walletsColl = $app.findCollectionByNameOrId('wallets');
    var walletRecord = new Record(walletsColl, {
      id: kasWallet.getString('id'),
      balance: balanceAfter,
    });
    $app.save(walletRecord);
    console.log('payout_notify: KAS wallet updated', balanceBefore, '->', balanceAfter);

    // 5. Buat transaksi PENGELUARAN
    var now = new Date().toISOString();
    var refNo = 'POUT-' + now.slice(0, 10).replace(/-/g, '') + '-' +
      Math.random().toString(36).substring(2, 6).toUpperCase();

    var trxColl = $app.findCollectionByNameOrId('transactions');
    var trxRecord = new Record(trxColl, {
      reference_no: refNo,
      type: 'PENGELUARAN',
      status: 'SUCCESS',
      from_wallet: kasWallet.getString('id'),
      amount: nominal,
      fee: 0,
      net_amount: nominal,
      note: 'Pencairan dana ke warga #' + wargaId + ' (' + refNo + ')',
      created_by: userId,
    });
    $app.save(trxRecord);
    var trxId = trxRecord.getString('id');
    console.log('payout_notify: transaction created', refNo, trxId);

    // 6. Buat ledger entry (DEBIT dari KAS wallet)
    var ledColl = $app.findCollectionByNameOrId('ledgers');
    var ledRecord = new Record(ledColl, {
      wallet: kasWallet.getString('id'),
      transaction: trxId,
      entry_type: 'DEBIT',
      amount: nominal,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
    });
    $app.save(ledRecord);
    console.log('payout_notify: ledger DEBIT created for KAS wallet', kasWallet.getString('id'));

    // 7. Catat aktivitas warga
    try {
      var aktivitasColl = $app.findCollectionByNameOrId('aktivitas_warga');
      var aktivitasRecord = new Record(aktivitasColl, {
        warga: wargaId,
        aktivitas: 'Pencairan dana',
        detail: 'Pencairan Rp ' + nominal.toLocaleString('id-ID') + ' - ' + refNo,
      });
      $app.save(aktivitasRecord);
      console.log('payout_notify: aktivitas_warga created');
    } catch (err) {
      console.error('payout_notify: gagal catat aktivitas', String(err));
    }

    console.log('payout_notify: DONE -', refNo);
  } catch (err) {
    console.error('payout_notify: FATAL ERROR', String(err));
  }
});