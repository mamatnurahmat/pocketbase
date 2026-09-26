/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\" && @collection.warga.id ?= warga && @collection.warga.pengurus = true",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "help": "",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "cascadeDelete": true,
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
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text1997877400",
        "max": 64,
        "min": 16,
        "name": "code",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "help": "",
        "hidden": false,
        "id": "bool1260321794",
        "name": "active",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      }
    ],
    "id": "pbc_3044821090",
    "indexes": [
      "CREATE UNIQUE INDEX idx_dev_qr_codes_warga_active ON dev_qr_codes (warga) WHERE active = TRUE",
      "CREATE UNIQUE INDEX idx_dev_qr_codes_code ON dev_qr_codes (code)"
    ],
    "listRule": "@request.auth.id != \"\"",
    "name": "dev_qr_codes",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id != \"\" && @collection.warga.id ?= warga && @collection.warga.pengurus = true",
    "viewRule": "@request.auth.id != \"\""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3044821090");

  return app.delete(collection);
})
