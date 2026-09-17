/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "help": "",
        "hidden": false,
        "id": "text3208210256",
        "max": 30,
        "min": 1,
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
        "id": "relation1228294964",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "warga",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "help": "",
        "hidden": false,
        "id": "date1496365537",
        "max": "",
        "min": "",
        "name": "jatuh_tempo",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      },
      {
        "help": "",
        "hidden": false,
        "id": "number3797995395",
        "max": null,
        "min": null,
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
        "id": "select1623867781",
        "maxSelect": 1,
        "name": "status_pembayaran",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "Belum Dibayar",
          "Menunggu Konfirmasi",
          "Lunas"
        ]
      },
      {
        "cascadeDelete": false,
        "collectionId": "iuran_collection_id",
        "help": "",
        "hidden": false,
        "id": "relation2407012360",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "iuran",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": false,
        "collectionId": "lampiran_collection_id",
        "help": "",
        "hidden": false,
        "id": "relation1168688009",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "lampiran",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      }
    ],
    "id": "pbc_1704023057",
    "indexes": [],
    "listRule": null,
    "name": "dev_tagihan",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1704023057");

  return app.delete(collection);
})
