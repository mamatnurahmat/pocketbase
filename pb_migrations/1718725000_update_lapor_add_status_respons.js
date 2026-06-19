migrate((app) => {
  const collection = app.findCollectionByNameOrId("lapor");

  // Add status field
  collection.fields.add(new Field({
    name: "status",
    type: "select",
    required: true,
    maxSelect: 1,
    values: ["Menunggu Konfirmasi", "Diproses", "Selesai", "Ditolak"],
  }));

  // Add respons field
  collection.fields.add(new Field({
    name: "respons",
    type: "text",
    required: false
  }));

  // Set updateRule to null (Admin Only) so client can't edit their own report
  collection.updateRule = null;

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("lapor");
  collection.fields.removeByName("status");
  collection.fields.removeByName("respons");
  collection.updateRule = "@request.auth.id != ''";
  app.save(collection);
});
