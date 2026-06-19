migrate((app) => {
  const wargaCollection = app.findCollectionByNameOrId("warga");

  const collection = new Collection({
    id: "lapor_collection_id",
    name: "lapor",
    type: "base",
    fields: [
      {
        name: "warga",
        type: "relation",
        required: true,
        collectionId: wargaCollection.id,
        cascadeDelete: false,
        maxSelect: 1
      },
      {
        name: "keterangan",
        type: "text",
        required: true
      },
      {
        name: "foto",
        type: "file",
        required: true,
        maxSelect: 1,
        mimeTypes: ["image/jpeg", "image/png", "image/svg+xml", "image/gif", "image/webp"]
      }
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("lapor");
  if (collection) {
    app.delete(collection);
  }
});
