/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("scurity");

  // Tambah field pin (6 karakter, default "666666")
  collection.fields.add(new Field({
    name: "pin",
    type: "text",
    required: true,
    min: 6,
    max: 6
  }));

  app.save(collection);

  // Update semua scurity yang sudah ada: pin = "666666"
  const records = app.findRecordsByFilter("scurity", "id != ''", undefined, undefined, undefined);
  for (const record of records) {
    record.set("pin", "666666");
    app.save(record);
  }

  console.log(`✅ Field pin ditambahkan ke scurity, ${records.length} scurity diupdate.`);
}, (app) => {
  const collection = app.findCollectionByNameOrId("scurity");
  collection.fields.removeByName("pin");
  app.save(collection);
});
