migrate((app) => {
  const collection = app.findCollectionByNameOrId("lapor");

  // Allow authenticated users to update (client handles pengurus check)
  collection.updateRule = "@request.auth.id != ''";

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("lapor");
  collection.updateRule = null;
  app.save(collection);
});
