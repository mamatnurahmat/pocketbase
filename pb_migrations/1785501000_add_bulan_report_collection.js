/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // 1. Tambah field 'bulan' (MM-YYYY) pada file_mutasi untuk grouping bulanan
  const fileMutasiCollection = app.findCollectionByNameOrId("file_mutasi");
  fileMutasiCollection.fields.add(
    new TextField({
      name: "bulan",
      required: false,
    })
  );
  app.save(fileMutasiCollection);

  // 2. Buat collection 'report' — data hasil convert mutasi + keterangan
  const mutasiCollection = app.findCollectionByNameOrId("mutasi");
  const tagihanCollection = app.findCollectionByNameOrId("tagihan");

  const reportCollection = new Collection({
    id: "report_collection_id",
    name: "report",
    type: "base",
    fields: [
      { name: "id", type: "text", primaryKey: true, required: true, system: true },
      {
        name: "tanggal",
        type: "date",
        required: false
      },
      {
        name: "keterangan",
        type: "text",
        required: true
      },
      {
        name: "debet",
        type: "number",
        required: false
      },
      {
        name: "kredit",
        type: "number",
        required: false
      },
      {
        name: "saldo",
        type: "number",
        required: false
      },
      {
        name: "mutasi",
        type: "relation",
        required: false,
        collectionId: mutasiCollection.id,
        maxSelect: 1
      },
      {
        name: "tagihan",
        type: "relation",
        required: false,
        collectionId: tagihanCollection.id,
        maxSelect: 1
      }
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });
  app.save(reportCollection);
}, (app) => {
  const reportCollection = app.findCollectionByNameOrId("report");
  if (reportCollection) app.delete(reportCollection);

  const fileMutasiCollection = app.findCollectionByNameOrId("file_mutasi");
  if (fileMutasiCollection) {
    const field = fileMutasiCollection.fields.getByName("bulan");
    if (field) fileMutasiCollection.fields.remove(field);
    app.save(fileMutasiCollection);
  }
});
