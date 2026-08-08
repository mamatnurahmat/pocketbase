/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const mutasiCollection = app.findCollectionByNameOrId("mutasi");
  const tagihanCollection = app.findCollectionByNameOrId("tagihan");
  const wargaCollection = app.findCollectionByNameOrId("warga");
  const fileMutasiCollection = app.findCollectionByNameOrId("file_mutasi");
  const rekonCollection = app.findCollectionByNameOrId("rekon");

  // Hapus collection rekon lama lalu buat ulang dengan schema baru
  if (rekonCollection) {
    app.delete(rekonCollection);
  }

  const newRekon = new Collection({
    id: "rekon_collection_id",
    name: "rekon",
    type: "base",
    fields: [
      { name: "id", type: "text", primaryKey: true, required: true, system: true },
      // Referensi transaksi mutasi bank (sumber valid)
      {
        name: "mutasi",
        type: "relation",
        required: true,
        collectionId: mutasiCollection.id,
        maxSelect: 1
      },
      // Tagihan aplikasi yang cocok
      {
        name: "tagihan",
        type: "relation",
        required: false,
        collectionId: tagihanCollection.id,
        maxSelect: 1
      },
      // Warga yang teridentifikasi dari deskripsi
      {
        name: "warga",
        type: "relation",
        required: false,
        collectionId: wargaCollection.id,
        maxSelect: 1
      },
      // Status hasil rekon
      {
        name: "status",
        type: "select",
        required: true,
        values: ["COCOK", "TIDAK_COCOK", "BELUM_ADA_TAGIHAN"]
      },
      {
        name: "keterangan",
        type: "text",
        required: false
      },
      {
        name: "no_urut",
        type: "number",
        required: false
      },
      {
        name: "tanggal_posting",
        type: "date",
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
  app.save(newRekon);
}, (app) => {
  const rekonCollection = app.findCollectionByNameOrId("rekon");
  if (rekonCollection) app.delete(rekonCollection);
});
