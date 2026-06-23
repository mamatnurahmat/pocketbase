migrate((app) => {
  const collection = app.findCollectionByNameOrId("lapor");
  const field = collection.fields.find(f => f.name === "warga");
  if (field) {
    field.required = false;
    app.save(collection);
  }
}, (app) => {});