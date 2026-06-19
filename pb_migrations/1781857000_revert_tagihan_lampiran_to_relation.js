migrate((app) => {
  const collection = app.findCollectionByNameOrId("tagihan");
  const lampiranCollection = app.findCollectionByNameOrId("lampiran");
  
  // Remove the file field
  collection.fields.removeByName("lampiran");

  // Re-add the relation field
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
  
  collection.fields.add(new Field({
    name: "lampiran",
    type: "file",
    required: false,
    maxSelect: 1,
    maxSize: 5242880, // 5MB
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"]
  }));

  app.save(collection);
});
