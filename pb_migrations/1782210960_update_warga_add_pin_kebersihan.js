/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("warga");

  // Tambah field pin (6 karakter, default "666666")
  collection.fields.add(new Field({
    name: "pin",
    type: "text",
    required: true,
    min: 6,
    max: 6
  }));

  // Tambah field kebersihan (boolean, default true)
  collection.fields.add(new Field({
    name: "kebersihan",
    type: "bool"
  }));

  app.save(collection);

  // Update semua warga yang sudah ada: pin = "666666", kebersihan = true
  const wargaRecords = app.findRecordsByFilter("warga", "id != ''", undefined, undefined, undefined);
  for (const record of wargaRecords) {
    record.set("pin", "666666");
    record.set("kebersihan", true);
    app.save(record);
  }

  console.log(`✅ Field pin dan kebersihan ditambahkan, ${wargaRecords.length} warga diupdate.`);
}, (app) => {
  const collection = app.findCollectionByNameOrId("warga");

  collection.fields.removeByName("pin");
  collection.fields.removeByName("kebersihan");

  app.save(collection);
});
