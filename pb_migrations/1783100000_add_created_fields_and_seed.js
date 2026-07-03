/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  // ===== 1. Add created & updated fields to ledgers =====
  const ledgersColl = app.findCollectionByNameOrId("pbc_1212822754");
  if (ledgersColl) {
    // Check if created field already exists
    const hasCreated = ledgersColl.fields.some(f => f.name === 'created');
    if (!hasCreated) {
      ledgersColl.fields.add(new Field({
        hidden: false,
        id: "autodate2990389176",
        name: "created",
        onCreate: true,
        onUpdate: false,
        presentable: false,
        system: false,
        type: "autodate",
      }));
      ledgersColl.fields.add(new Field({
        hidden: false,
        id: "autodate3332085495",
        name: "updated",
        onCreate: true,
        onUpdate: true,
        presentable: false,
        system: false,
        type: "autodate",
      }));
      app.save(ledgersColl);
      console.log("migration: added created/updated to ledgers");
    }
  }

  // ===== 2. Add created & updated fields to transactions =====
  const trxColl = app.findCollectionByNameOrId("pbc_3174063690");
  if (trxColl) {
    const hasCreated = trxColl.fields.some(f => f.name === 'created');
    if (!hasCreated) {
      trxColl.fields.add(new Field({
        hidden: false,
        id: "autodate2990389176",
        name: "created",
        onCreate: true,
        onUpdate: false,
        presentable: false,
        system: false,
        type: "autodate",
      }));
      trxColl.fields.add(new Field({
        hidden: false,
        id: "autodate3332085495",
        name: "updated",
        onCreate: true,
        onUpdate: true,
        presentable: false,
        system: false,
        type: "autodate",
      }));
      app.save(trxColl);
      console.log("migration: added created/updated to transactions");
    }
  }

  // ===== 3. Seed dummy transactions for today (if not exist) =====
  var now = new Date();
  var todayStr = now.toISOString().slice(0, 10); // "2026-07-02"

  // Check if we already seeded today
  var existingToday = app.findRecordsByFilter('transactions', `reference_no ~ "${todayStr}"`, '', 1, 0);
  if (existingToday.length === 0) {
    // Get KAS wallet
    var kasWallet;
    var allWallets = app.findRecordsByFilter('wallets', 'wallet_type="KAS"', '', 1, 0);
    if (allWallets.length > 0) {
      kasWallet = allWallets[0];
      var kasId = kasWallet.getString('id');
      var balance = kasWallet.get('balance') || 0;

      // Dummy TOPUP transactions to KAS
      var topups = [
        { nominal: 170000, ref: 'SEED-' + todayStr.replace(/-/g, '') + '-001', note: 'Iuran warga A01 (seed)' },
        { nominal: 170000, ref: 'SEED-' + todayStr.replace(/-/g, '') + '-002', note: 'Iuran warga B03 (seed)' },
        { nominal: 170000, ref: 'SEED-' + todayStr.replace(/-/g, '') + '-003', note: 'Iuran warga C09 (seed)' },
      ];

      for (var i = 0; i < topups.length; i++) {
        var t = topups[i];
        var trx = new Record(app.findCollectionByNameOrId('transactions'), {
          reference_no: t.ref,
          type: 'TOPUP',
          status: 'SUCCESS',
          to_wallet: kasId,
          amount: t.nominal,
          fee: 0,
          net_amount: t.nominal,
          note: t.note,
          created_by: 'usra01000000000',
        });
        app.save(trx);

        // Update KAS balance
        balance += t.nominal;

        // Create ledger entry
        var ledger = new Record(app.findCollectionByNameOrId('ledgers'), {
          wallet: kasId,
          transaction: trx.getString('id'),
          entry_type: 'CREDIT',
          amount: t.nominal,
          balance_before: balance - t.nominal,
          balance_after: balance,
        });
        app.save(ledger);
      }

      // Update KAS wallet balance via direct DB
      // Use original record and update just the balance field
      var kasRec = app.findRecordById('wallets', kasId);
      if (kasRec) {
        kasRec.set('balance', balance);
        app.save(kasRec);
      }

      console.log('migration: seeded ' + topups.length + ' dummy transactions for ' + todayStr);
    }
  } else {
    console.log('migration: already seeded today (' + todayStr + '), skipping');
  }
}, (app) => {
  // rollback: nothing to do
});