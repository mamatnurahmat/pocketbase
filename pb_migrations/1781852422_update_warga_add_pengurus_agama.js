migrate((app) => {
  const collection = app.findCollectionByNameOrId("warga");

  collection.fields.add(new Field({
    name: "pengurus",
    type: "bool"
  }));

  collection.fields.add(new Field({
    name: "agama",
    type: "select",
    maxSelect: 1,
    values: ["islam", "katolik", "protestan", "hindu", "budha", "konghucu"]
  }));

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("warga");

  collection.fields.removeByName("pengurus");
  collection.fields.removeByName("agama");

  app.save(collection);
});
