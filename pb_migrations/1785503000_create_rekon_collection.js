/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const fileMutasiCollection = app.findCollectionByNameOrId("file_mutasi");
  const tagihanCollection = app.findCollectionByNameOrId("tagihan");

  // Collection 'rekon' — format sama seperti mutasi + kolom keterangan bebas
  const rekonCollection = new Collection({
    id: "rekon_collection_id",
    name: "rekon",
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
        required: false
      },
      // Keterangan bebas — bisa kode IPL per warga atau teks bebas
      {
        name: "keterangan_bebas",
        type: "text",
        required: false
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
        required: false,
        collectionId: fileMutasiCollection.id,
        maxSelect: 1
      },
      // Relasi ke tagihan (pilihan IPL per warga yang belum dilaporkan)
      {
        name: "tagihan",
        type: "relation",
        required: false,
        collectionId: tagihanCollection.id,
        maxSelect: 1
      },
      {
        name: "created",
        type: "autodate",
        onCreate: true,
        onUpdate: false
      },
      {
        name: "updated",
        type: "autodate",
        onCreate: true,
        onUpdate: true
      }
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });
  app.save(rekonCollection);
}, (app) => {
  const rekonCollection = app.findCollectionByNameOrId("rekon");
  if (rekonCollection) app.delete(rekonCollection);
});
