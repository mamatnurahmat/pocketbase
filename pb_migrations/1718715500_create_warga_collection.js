migrate((app) => {
  const usersCollection = app.findCollectionByNameOrId("users");

  const collection = new Collection({
    id: "warga_collection_id",
    name: "warga",
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
        name: "no_rumah",
        type: "text",
        required: true,
        presentable: true
      },
      {
        name: "no_wa",
        type: "text",
        required: false
      },
      {
        name: "user",
        type: "relation",
        required: true,
        collectionId: usersCollection.id,
        cascadeDelete: true,
        maxSelect: 1
      }
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id = user",
    deleteRule: "@request.auth.id = user"
  });

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("warga");
  if (collection) {
    app.delete(collection);
  }
});
