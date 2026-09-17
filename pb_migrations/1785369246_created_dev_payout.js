/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text3208210256",
        "max": 0,
        "min": 0,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "cascadeDelete": false,
        "collectionId": "warga_collection_id",
        "help": "",
        "hidden": false,
        "id": "relation_warga",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "warga",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "help": "",
        "hidden": false,
        "id": "number_nominal",
        "max": null,
        "min": 1000,
        "name": "nominal",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select_tipe",
        "maxSelect": 1,
        "name": "tipe",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "Klaim Warga",
          "Pengeluaran Kas"
        ]
      },
      {
        "help": "",
        "hidden": false,
        "id": "select_jenis",
        "maxSelect": 1,
        "name": "jenis",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "Bank",
          "E-Wallet"
        ]
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text_bank",
        "max": 100,
        "min": 0,
        "name": "bank",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text_no_rekening",
        "max": 50,
        "min": 0,
        "name": "no_rekening",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text_atas_nama",
        "max": 100,
        "min": 0,
        "name": "atas_nama",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text_keterangan_warga",
        "max": 1000,
        "min": 0,
        "name": "keterangan_warga",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "help": "",
        "hidden": false,
        "id": "file_lampiran_warga",
        "maxSelect": 1,
        "maxSize": 5242880,
        "mimeTypes": [
          "image/jpeg",
          "image/png",
          "image/webp",
          "application/pdf"
        ],
        "name": "lampiran_warga",
        "presentable": false,
        "protected": false,
        "required": false,
        "system": false,
        "thumbs": null,
        "type": "file"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text_keterangan_pengurus",
        "max": 1000,
        "min": 0,
        "name": "keterangan_pengurus",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "help": "",
        "hidden": false,
        "id": "file_lampiran_pengurus",
        "maxSelect": 1,
        "maxSize": 5242880,
        "mimeTypes": [
          "image/jpeg",
          "image/png",
          "image/webp",
          "application/pdf"
        ],
        "name": "lampiran_pengurus",
        "presentable": false,
        "protected": false,
        "required": false,
        "system": false,
        "thumbs": null,
        "type": "file"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select_status",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "Menunggu Konfirmasi",
          "Disetujui",
          "Ditolak",
          "Dibayar"
        ]
      },
      {
        "help": "",
        "hidden": false,
        "id": "date_tanggal_disetujui",
        "max": "",
        "min": "",
        "name": "tanggal_disetujui",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "help": "",
        "hidden": false,
        "id": "date_tanggal_dibayar",
        "max": "",
        "min": "",
        "name": "tanggal_dibayar",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "autodate_tanggal_diajukan",
        "name": "tanggal_diajukan",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_2475438575",
    "indexes": [],
    "listRule": null,
    "name": "dev_payout",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2475438575");

  return app.delete(collection);
})
