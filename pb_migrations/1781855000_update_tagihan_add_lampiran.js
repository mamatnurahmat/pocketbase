migrate((app) => {
  const collection = app.findCollectionByNameOrId("tagihan");
  const lampiranCollection = app.findCollectionByNameOrId("lampiran");

  collection.fields.add(new Field({
    name: "lampiran",
    type: "relation",
    required: false,
    collectionId: lampiranCollection.id,
    cascadeDelete: false,
    maxSelect: 1
  }));

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("tagihan");
  collection.fields.removeByName("lampiran");
  app.save(collection);
});
