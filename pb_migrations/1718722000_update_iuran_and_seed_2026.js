migrate((app) => {
  const collection = app.findCollectionByNameOrId("iuran");

  // 1. Tambahkan field jatuh_tempo (tipe date) jika belum ada
  if (!collection.fields.getByName("jatuh_tempo")) {
    collection.fields.add(new Field({
      name: "jatuh_tempo",
      type: "date",
      required: false,
    }));
    app.save(collection);
  }

  // 2. Buat seed data IPL tiap bulan tahun 2026
  for (let month = 1; month <= 12; month++) {
    const mm = month.toString().padStart(2, "0");
    const yy = "26";
    const year = 2026;
    
    const kode = `IPL-${mm}-${yy}`;
    // Jatuh tempo tanggal 20 bulan tersebut
    // Format YYYY-MM-DD HH:mm:ss.SSSZ
    const jatuhTempo = `${year}-${mm}-20 00:00:00.000Z`;

    const id = `iuranipl26bln${mm}`;
    try {
      app.findRecordById("iuran", id);
    } catch (err) {
      // Record not found, safe to create
      const record = new Record(collection);
      record.set("id", id);
      record.set("kode", kode);
      record.set("nominal", 170000);
      record.set("keterangan", `Iuran Pengelolaan Lingkungan Bulan ${month} 2026`);
      record.set("jatuh_tempo", jatuhTempo);
      
      app.save(record);
    }
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("iuran");

  // Hapus field jatuh_tempo
  try {
    collection.fields.removeByName("jatuh_tempo");
    app.save(collection);
  } catch (err) {
    // Abaikan error jika field tidak ada
  }

  // Hapus seed data IPL tahun 2026
  try {
    const records = app.findAllRecords("iuran");
    for (const record of records) {
      if (record.get("kode").startsWith("IPL-") && record.get("kode").endsWith("-26")) {
        app.delete(record);
      }
    }
  } catch (err) {
    // Abaikan error
  }
});
