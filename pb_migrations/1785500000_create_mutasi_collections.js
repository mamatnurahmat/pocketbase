/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const usersCollection = app.findCollectionByNameOrId("users");

  // 1. Create 'file-mutasi' collection — menyimpan file PDF mutasi yang diupload
  const fileMutasiCollection = new Collection({
    id: "file_mutasi_collection_id",
    name: "file_mutasi",
    type: "base",
    fields: [
      { name: "id", type: "text", primaryKey: true, required: true, system: true },
      {
        name: "nama_file",
        type: "text",
        required: true
      },
      {
        name: "file_pdf",
        type: "file",
        required: true,
        maxSelect: 1,
        maxSize: 20971520, // Max 20MB
        mimeTypes: ["application/pdf"]
      },
      {
        name: "periode_awal",
        type: "date",
        required: false
      },
      {
        name: "periode_akhir",
        type: "date",
        required: false
      },
      {
        name: "saldo_awal",
        type: "number",
        required: false
      },
      {
        name: "saldo_akhir",
        type: "number",
        required: false
      },
      {
        name: "total_debet",
        type: "number",
        required: false
      },
      {
        name: "total_kredit",
        type: "number",
        required: false
      },
      {
        name: "jumlah_transaksi",
        type: "number",
        required: false
      },
      {
        name: "uploaded_by",
        type: "relation",
        required: false,
        collectionId: usersCollection.id,
        maxSelect: 1
      }
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });
  app.save(fileMutasiCollection);

  // 2. Create 'mutasi' collection — data transaksi hasil parse PDF mutasi
  const mutasiCollection = new Collection({
    id: "mutasi_collection_id",
    name: "mutasi",
    type: "base",
    fields: [
      { name: "id", type: "text", primaryKey: true, required: true, system: true },
      {
        name: "no_urut",
        type: "number",
        required: true
      },
      {
        name: "tanggal_posting",
        type: "date",
        required: false
      },
      {
        name: "tanggal_valuta",
        type: "date",
        required: false
      },
      {
        name: "keterangan",
        type: "text",
        required: true
      },
      {
        name: "mutasi_debet",
        type: "number",
        required: false
      },
      {
        name: "mutasi_kredit",
        type: "number",
        required: false
      },
      {
        name: "saldo_akhir",
        type: "number",
        required: false
      },
      {
        name: "file_mutasi",
        type: "relation",
        required: true,
        collectionId: fileMutasiCollection.id,
        maxSelect: 1
      }
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });
  app.save(mutasiCollection);
}, (app) => {
  const mutasiCollection = app.findCollectionByNameOrId("mutasi");
  if (mutasiCollection) app.delete(mutasiCollection);

  const fileMutasiCollection = app.findCollectionByNameOrId("file_mutasi");
  if (fileMutasiCollection) app.delete(fileMutasiCollection);
});
