migrate((app) => {
  const usersCollection = app.findCollectionByNameOrId("users");
  const wargaCollection = app.findCollectionByNameOrId("warga");

  // 1. Create 'iuran' collection
  const iuranCollection = new Collection({
    id: "iuran_collection_id",
    name: "iuran",
    type: "base",
    fields: [
      { name: "id", type: "text", primaryKey: true, required: true, system: true },
      { name: "kode", type: "text", required: true },
      { name: "nominal", type: "number", required: true },
      { name: "keterangan", type: "text", required: false }
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });
  app.save(iuranCollection);

  // 2. Create 'lampiran' collection
  const lampiranCollection = new Collection({
    id: "lampiran_collection_id",
    name: "lampiran",
    type: "base",
    fields: [
      { name: "id", type: "text", primaryKey: true, required: true, system: true },
      { 
        name: "iuran", 
        type: "relation", 
        required: true, 
        collectionId: iuranCollection.id, 
        maxSelect: 999 // Allows selecting multiple iuran
      },
      { 
        name: "warga", 
        type: "relation", 
        required: true, 
        collectionId: wargaCollection.id, 
        maxSelect: 1 
      },
      { 
        name: "file_bukti", 
        type: "file", 
        required: true, 
        maxSelect: 1, 
        maxSize: 5242880, // Max 5MB
        mimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"] 
      },
      { 
        name: "approval", 
        type: "bool", 
        required: false 
      },
      { 
        name: "approved_by", 
        type: "relation", 
        required: false, 
        collectionId: usersCollection.id, 
        maxSelect: 1 
      }
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });
  app.save(lampiranCollection);

}, (app) => {
  const lampiranCollection = app.findCollectionByNameOrId("lampiran");
  if (lampiranCollection) app.delete(lampiranCollection);

  const iuranCollection = app.findCollectionByNameOrId("iuran");
  if (iuranCollection) app.delete(iuranCollection);
});
