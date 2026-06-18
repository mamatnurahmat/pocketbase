migrate((app) => {
  const statusCollection = new Collection({
    id: "status_collection_id",
    name: "status",
    type: "base",
    fields: [
      {
        name: "id",
        type: "text",
        primaryKey: true,
        required: true,
        system: true
      },
      {
        name: "nama",
        type: "text",
        required: true,
        presentable: true
      },
      {
        name: "jumlah_iuran",
        type: "number",
        required: true
      }
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });

  app.save(statusCollection);

  const wargaCollection = app.findCollectionByNameOrId("warga");
  if (wargaCollection) {
    wargaCollection.fields.add(new Field({
      name: "status",
      type: "relation",
      required: false,
      collectionId: statusCollection.id,
      cascadeDelete: false,
      maxSelect: 1
    }));
    app.save(wargaCollection);
  }
}, (app) => {
  const wargaCollection = app.findCollectionByNameOrId("warga");
  if (wargaCollection) {
    wargaCollection.fields.removeByName("status");
    app.save(wargaCollection);
  }

  const statusCollection = app.findCollectionByNameOrId("status");
  if (statusCollection) {
    app.delete(statusCollection);
  }
});
