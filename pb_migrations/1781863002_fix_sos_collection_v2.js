migrate((app) => {
  // Force delete old sos collection and recreate with correct schema
  try {
    const existing = app.findCollectionByNameOrId("sos");
    if (existing) {
      console.log("sos_fix2: removing old sos collection");
      app.delete(existing);
    }
  } catch (err) {
    console.log("sos_fix2: collection not found, creating new one");
  }

  const collection = new Collection({
    name: "sos",
    type: "base",
    fields: [
      {
        name: "user",
        type: "relation",
        required: true,
        collectionId: app.findCollectionByNameOrId("users").id,
        cascadeDelete: false,
        maxSelect: 1
      },
      {
        name: "warga",
        type: "relation",
        required: false,
        collectionId: app.findCollectionByNameOrId("warga").id,
        cascadeDelete: false,
        maxSelect: 1
      },
      {
        name: "nama",
        type: "text",
        required: true
      },
      {
        name: "no_rumah",
        type: "text",
        required: false
      },
      {
        name: "no_wa",
        type: "text",
        required: false
      },
      {
        name: "keterangan",
        type: "text",
        required: false
      },
      {
        name: "status",
        type: "select",
        required: true,
        values: ["Menunggu", "Disetujui", "Ditolak", "Selesai"],
        maxSelect: 1
      },
      {
        name: "respons",
        type: "text",
        required: false
      },
      {
        name: "waktu_kirim",
        type: "date",
        required: true
      }
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "user = @request.auth.id"
  });

  app.save(collection);
  console.log("sos_fix2: collection recreated successfully");
}, (app) => {
  const collection = app.findCollectionByNameOrId("sos");
  if (collection) {
    app.delete(collection);
  }
});