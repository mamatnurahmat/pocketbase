/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("payout_collection_id")

  // add field
  collection.fields.addAt(3, new Field({
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
  }))

  // update field
  collection.fields.addAt(0, new Field({
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
  }))

  // update field
  collection.fields.addAt(1, new Field({
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
  }))

  // update field
  collection.fields.addAt(4, new Field({
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
  }))

  // update field
  collection.fields.addAt(5, new Field({
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
  }))

  // update field
  collection.fields.addAt(6, new Field({
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
  }))

  // update field
  collection.fields.addAt(7, new Field({
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
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("payout_collection_id")

  // remove field
  collection.fields.removeById("select_tipe")

  // update field
  collection.fields.addAt(0, new Field({
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
  }))

  // update field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "warga_collection_id",
    "help": "",
    "hidden": false,
    "id": "relation_warga",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "warga",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // update field
  collection.fields.addAt(3, new Field({
    "help": "",
    "hidden": false,
    "id": "select_jenis",
    "maxSelect": 1,
    "name": "jenis",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "Bank",
      "E-Wallet"
    ]
  }))

  // update field
  collection.fields.addAt(4, new Field({
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
    "required": true,
    "system": false,
    "type": "text"
  }))

  // update field
  collection.fields.addAt(5, new Field({
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
    "required": true,
    "system": false,
    "type": "text"
  }))

  // update field
  collection.fields.addAt(6, new Field({
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
    "required": true,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
})
