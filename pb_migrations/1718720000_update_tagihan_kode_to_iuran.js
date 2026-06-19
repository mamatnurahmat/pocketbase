migrate((app) => {
  const collection = app.findCollectionByNameOrId("tagihan");
  const iuranCollection = app.findCollectionByNameOrId("iuran");

  // Remove the old text field
  collection.fields.removeByName("kode_ipl");

  // Add the new relation field to iuran
  collection.fields.add(new Field({
    name: "iuran",
    type: "relation",
    required: true,
    collectionId: iuranCollection.id,
    cascadeDelete: false,
    maxSelect: 1
  }));

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("tagihan");

  // Revert back to text field
  collection.fields.removeByName("iuran");
  
  collection.fields.add(new Field({
    name: "kode_ipl",
    type: "text",
    required: true
  }));

  app.save(collection);
});
