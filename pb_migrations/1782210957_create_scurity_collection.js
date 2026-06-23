migrate((app) => {
  const usersCollection = app.findCollectionByNameOrId("users");

  // 1. Create scurity collection
  const collection = new Collection({
    name: "scurity",
    type: "base",
    fields: [
      {
        name: "nama",
        type: "text",
        required: true,
        presentable: true
      },
      {
        name: "no_hp",
        type: "text",
        required: true
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
  const collection = app.findCollectionByNameOrId("scurity");
  if (collection) {
    app.delete(collection);
  }
});
