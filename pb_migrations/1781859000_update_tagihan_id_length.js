migrate((app) => {
  const collection = app.findCollectionByNameOrId("tagihan");
  
  // Update the id field to allow longer IDs (for no_rumah+kode_iuran format)
  // Example: a01iuranipl26bln03 = 18 chars
  const idField = collection.fields.getByName("id");
  if (idField) {
    idField.min = 1;
    idField.max = 30;
    idField.pattern = "^[a-z0-9]+$";
  }

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("tagihan");
  const idField = collection.fields.getByName("id");
  if (idField) {
    idField.min = 15;
    idField.max = 15;
    idField.pattern = "^[a-z0-9]+$";
  }
  app.save(collection);
});
