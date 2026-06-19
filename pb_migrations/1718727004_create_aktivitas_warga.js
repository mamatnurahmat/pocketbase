migrate((app) => {
  const wargaCollection = app.findCollectionByNameOrId("warga");

  const collection = new Collection({
    id: "aktivitas_warga_id_1",
    name: "aktivitas_warga",
    type: "base",
    fields: [
      {
        name: "warga",
        type: "relation",
        required: true,
        collectionId: wargaCollection.id,
        cascadeDelete: true,
        maxSelect: 1,
        displayFields: ["no_rumah"]
      },
      {
        name: "aktivitas",
        type: "text",
        required: true
      },
      {
        name: "detail",
        type: "text",
        required: false
      }
    ],
    listRule: null, 
    viewRule: null, 
    createRule: "@request.auth.id != ''", 
    updateRule: null, 
    deleteRule: null
  });

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("aktivitas_warga");
  if (collection) {
    app.delete(collection);
  }
});
