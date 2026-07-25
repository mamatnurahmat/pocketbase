/// <reference path="../pb_data/types.d.ts" />

// Migration: Clone collections untuk developer mode
// Membuat duplikat collection dengan prefix "dev_" untuk testing
// Kecuali: users, warga (data inti tetap sama)

migrate((app) => {
  // Daftar collection yang akan di-clone
  const collectionsToClone = [
    'iuran', 'tagihan', 'lampiran', 'lapor', 'status',
    'aktivitas_warga', 'sos', 'scurity', 'laporan_scurity',
    'categories', 'wallets', 'transactions', 'ledgers', 'payout',
  ];

  for (const name of collectionsToClone) {
    let col;
    try {
      col = app.findCollectionByNameOrId(name);
    } catch (_) {
      console.log('dev-mode: SKIP ' + name + ' (not found)');
      continue;
    }

    const devName = 'dev_' + name;

    // Cek apakah sudah ada
    let existing = false;
    try {
      app.findCollectionByNameOrId(devName);
      existing = true;
    } catch (_) {}

    if (existing) {
      console.log('dev-mode: already exists ' + devName + ', skip');
      continue;
    }

    // Clone collection
    const devId = ('d' + col.id).slice(0, 15);
    const clone = new Collection({
      id: devId,
      name: devName,
      type: col.type,
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: JSON.parse(JSON.stringify(col.fields)),
      indexes: [],
      system: false,
    });

    app.save(clone);
    console.log('dev-mode: CREATED ' + devName + ' (id=' + devId + ')');

    // Copy data dari collection asli
    const records = app.findRecordsByFilter(name, '', '', 0, 0);
    let copied = 0;
    for (const rec of records) {
      const data = {};
      for (const field of col.fields) {
        const fname = field.name;
        if (fname === 'id') continue;
        try {
          const val = rec.get(fname);
          if (val !== undefined && val !== null && val !== '') {
            data[fname] = val;
          }
        } catch (_) {}
      }
      try {
        const newRec = new Record(clone);
        for (const key in data) {
          newRec.set(key, data[key]);
        }
        app.save(newRec);
        copied++;
      } catch (e) {
        console.log('dev-mode: ERROR copying record to ' + devName + ': ' + String(e));
      }
    }
    console.log('dev-mode: COPIED ' + copied + ' records to ' + devName);
  }
  console.log('dev-mode: DONE');
}, (app) => {
  // Rollback: hapus semua collection dev_
  const devCollections = [
    'dev_iuran', 'dev_tagihan', 'dev_lampiran', 'dev_lapor', 'dev_status',
    'dev_aktivitas_warga', 'dev_sos', 'dev_scurity', 'dev_laporan_scurity',
    'dev_categories', 'dev_wallets', 'dev_transactions', 'dev_ledgers', 'dev_payout',
  ];
  for (const name of devCollections) {
    try {
      const col = app.findCollectionByNameOrId(name);
      app.delete(col);
      console.log('dev-mode: DELETED ' + name);
    } catch (_) {}
  }
});