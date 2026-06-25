/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.collectionName = '_superusers'",
    "deleteRule": null,
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
        "cascadeDelete": false,
        "collectionId": "pbc_120182150",
        "help": "",
        "hidden": false,
        "id": "relation2087227935",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "wallet",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_3174063690",
        "help": "",
        "hidden": false,
        "id": "relation1916208593",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "transaction",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select687615802",
        "maxSelect": 1,
        "name": "entry_type",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "DEBIT",
          "CREDIT"
        ]
      },
      {
        "help": "",
        "hidden": false,
        "id": "number2392944706",
        "max": null,
        "min": 0,
        "name": "amount",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "help": "",
        "hidden": false,
        "id": "number1572871111",
        "max": null,
        "min": 0,
        "name": "balance_before",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "help": "",
        "hidden": false,
        "id": "number389218067",
        "max": null,
        "min": 0,
        "name": "balance_after",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      }
    ],
    "id": "pbc_1212822754",
    "indexes": [],
    "listRule": "@request.auth.id != ''",
    "name": "ledgers",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": "@request.auth.id != ''"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1212822754");

  return app.delete(collection);
})
