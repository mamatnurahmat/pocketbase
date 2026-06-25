migrate((app) => {
  // Check if collection already exists
  try {
    app.findCollectionByNameOrId("laporan_scurity");
    // Already exists, skip
    return;
  } catch (_) {}

  const usersCollection = app.findCollectionByNameOrId("users");
  const scurityCollection = app.findCollectionByNameOrId("scurity");

  const collection = new Collection({
    name: "laporan_scurity",
    type: "base",
    fields: [
      {
        name: "jenis",
        type: "select",
        required: true,
        values: ["absen", "patroli", "lainnya"],
        maxSelect: 1
      },
      {
        name: "keterangan",
        type: "text",
        required: false
      },
      {
        name: "foto",
        type: "file",
        required: false,
        maxSelect: 1,
        mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"]
      },
      {
        name: "dibuat_oleh",
        type: "relation",
        required: false,
        collectionId: usersCollection.id,
        cascadeDelete: false,
        maxSelect: 1
      }
    ],
    // Semua user yang login bisa list/view
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    // Hanya scurity yang bisa create (cek via scurity collection)
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });

  app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("laporan_scurity");
    if (collection) {
      app.delete(collection);
    }
  } catch (_) {}
});
