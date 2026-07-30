/// <reference path="../pb_data/types.d.ts" />

// Migration: Fix dev_mode collections dengan schema yang benar
// Clone collection + data ke dev_ prefix (kecuali users & warga)

// Daftar koleksi yang akan di-clone
const collectionsToClone = [
  'iuran', 'tagihan', 'lampiran', 'lapor', 'status',
  'aktivitas_warga', 'sos', 'scurity', 'laporan_scurity',
  'categories', 'wallets', 'transactions', 'ledgers', 'payout',
];

migrate((app) => {
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

    // Clone collection dengan export/import via unmarshal
    // Export collection ke JSON string, lalu import ke collection baru
    const colData = {
      name: devName,
      type: col.type,
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [], // akan diisi dari original
      indexes: [],
      system: false,
    };

    // Copy fields satu per satu dari original
    for (const field of col.fields) {
      const fieldData = {};
      for (const key in field) {
        if (key === 'id' || key === 'systemKey') continue;
        try {
          const val = field[key];
          if (val !== undefined && val !== null) {
            fieldData[key] = val;
          }
        } catch (_) {}
      }
      colData.fields.push(fieldData);
    }

    const clone = new Collection(colData);
    // Set ID unik
    clone.id = 'd_' + col.id.slice(0, 13);

    app.save(clone);
    console.log('dev-mode: CREATED ' + devName + ' with ' + colData.fields.length + ' fields');

    // Copy data dari original
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
        console.log('dev-mode: ERROR copy record to ' + devName + ': ' + String(e));
      }
    }
    console.log('dev-mode: COPIED ' + copied + ' records to ' + devName);
  }
  console.log('dev-mode: DONE');
}, (app) => {
  // Rollback
  for (const name of collectionsToClone) {
    const devName = 'dev_' + name;
    try {
      const col = app.findCollectionByNameOrId(devName);
      app.delete(col);
      console.log('dev-mode: DELETED ' + devName);
    } catch (_) {}
  }
});