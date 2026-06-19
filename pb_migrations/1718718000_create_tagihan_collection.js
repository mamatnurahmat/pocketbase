migrate((app) => {
  const wargaCollection = app.findCollectionByNameOrId("warga");

  const collection = new Collection({
    id: "tagihan_collection_id",
    name: "tagihan",
    type: "base",
    fields: [
      {
        name: "kode_ipl",
        type: "text",
        required: true
      },
      {
        name: "warga",
        type: "relation",
        required: true,
        collectionId: wargaCollection.id,
        cascadeDelete: false,
        maxSelect: 1
      },
      {
        name: "jatuh_tempo",
        type: "date",
        required: true
      },
      {
        name: "nominal",
        type: "number",
        required: true
      },
      {
        name: "status_pembayaran",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["Belum Dibayar", "Menunggu Konfirmasi", "Lunas"]
      }
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("tagihan");
  if (collection) {
    app.delete(collection);
  }
});
