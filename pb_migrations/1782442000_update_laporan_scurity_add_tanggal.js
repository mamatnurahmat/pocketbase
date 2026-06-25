/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("laporan_scurity");

  // Tambah field tanggal (autodate — terisi otomatis saat record dibuat)
  collection.fields.add(
    new Field({
      autogeneratePattern: "",
      hidden: false,
      id: "",
      name: "tanggal",
      onCreate: true,
      onUpdate: false,
      required: false,
      system: false,
      type: "autodate",
    })
  );

  app.save(collection);

  console.log("✅ Field tanggal (autodate) ditambahkan ke laporan_scurity.");
}, (app) => {
  const collection = app.findCollectionByNameOrId("laporan_scurity");
  collection.fields.removeByName("tanggal");
  app.save(collection);
});