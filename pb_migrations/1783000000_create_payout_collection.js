/// <reference path="../pb_data/types.pb.d.ts" />

migrate((app) => {
  // Create payout collection
  const payoutCollection = new Collection({
    id: "payout_collection_id",
    name: "payout",
    type: "base",
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    fields: [
      {
        id: "relation_warga",
        name: "warga",
        type: "relation",
        required: true,
        collectionId: "warga_collection_id",
        cascadeDelete: false,
        maxSelect: 1,
      },
      {
        id: "number_nominal",
        name: "nominal",
        type: "number",
        required: true,
        min: 1000,
      },
      {
        id: "select_jenis",
        name: "jenis",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["Bank", "E-Wallet"],
      },
      {
        id: "text_bank",
        name: "bank",
        type: "text",
        required: true,
        max: 100,
      },
      {
        id: "text_no_rekening",
        name: "no_rekening",
        type: "text",
        required: true,
        max: 50,
      },
      {
        id: "text_atas_nama",
        name: "atas_nama",
        type: "text",
        required: true,
        max: 100,
      },
      {
        id: "text_keterangan_warga",
        name: "keterangan_warga",
        type: "text",
        required: false,
        max: 1000,
      },
      {
        id: "file_lampiran_warga",
        name: "lampiran_warga",
        type: "file",
        required: false,
        maxSelect: 1,
        maxSize: 5242880,
        mimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
        thumbs: null,
        protected: false,
      },
      {
        id: "text_keterangan_pengurus",
        name: "keterangan_pengurus",
        type: "text",
        required: false,
        max: 1000,
      },
      {
        id: "file_lampiran_pengurus",
        name: "lampiran_pengurus",
        type: "file",
        required: false,
        maxSelect: 1,
        maxSize: 5242880,
        mimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
        thumbs: null,
        protected: false,
      },
      {
        id: "select_status",
        name: "status",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["Menunggu Konfirmasi", "Disetujui", "Ditolak", "Dibayar"],
      },
      {
        id: "date_tanggal_disetujui",
        name: "tanggal_disetujui",
        type: "date",
        required: false,
      },
      {
        id: "date_tanggal_dibayar",
        name: "tanggal_dibayar",
        type: "date",
        required: false,
      },
      {
        id: "autodate_tanggal_diajukan",
        name: "tanggal_diajukan",
        type: "autodate",
        onCreate: true,
        onUpdate: false,
      },
    ],
    indexes: [],
    system: false,
  });

  app.save(payoutCollection);
}, (app) => {
  const payoutCollection = app.findCollectionByNameOrId("payout");
  if (payoutCollection) {
    app.delete(payoutCollection);
  }
});