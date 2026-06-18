migrate((app) => {
  const iuranCollection = app.findCollectionByNameOrId("iuran");
  
  const sampleData = [
    { id: "iurankeamanan24", kode: "IUR-KEAMANAN-24", nominal: 50000, keterangan: "Iuran Keamanan Bulanan" },
    { id: "iurankebersih24", kode: "IUR-KEBERSIHAN-24", nominal: 35000, keterangan: "Iuran Kebersihan Sampah" },
    { id: "iuranagustusn24", kode: "IUR-AGUSTUSAN-24", nominal: 100000, keterangan: "Sumbangan Acara 17 Agustus" },
    { id: "iuransosialwg24", kode: "IUR-SOSIAL-24", nominal: 20000, keterangan: "Dana Kas Sosial Warga" }
  ];

  for (const data of sampleData) {
    const record = new Record(iuranCollection);
    record.set("id", data.id);
    record.set("kode", data.kode);
    record.set("nominal", data.nominal);
    record.set("keterangan", data.keterangan);
    app.save(record);
  }
}, (app) => {
  // Try to clean up the seeded data on rollback
  try {
    const records = app.findAllRecords("iuran");
    for (const record of records) {
      if (record.get("kode").includes("-24")) {
        app.delete(record);
      }
    }
  } catch (err) {
    // Ignore errors during rollback
  }
});
