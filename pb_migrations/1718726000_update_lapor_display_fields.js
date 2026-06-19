migrate((app) => {
  const collection = app.findCollectionByNameOrId("lapor");
  const wargaField = collection.fields.getByName("warga");
  wargaField.displayFields = ["no_rumah"];
  app.save(collection);
});
