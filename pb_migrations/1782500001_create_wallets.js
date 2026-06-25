/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.collectionName = '_superusers'",
    "deleteRule": "@request.auth.collectionName = '_superusers'",
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
        "collectionId": "_pb_users_auth_",
        "help": "",
        "hidden": false,
        "id": "relation2375276105",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "user",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select3779895852",
        "maxSelect": 1,
        "name": "wallet_type",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "PERSONAL",
          "KAS"
        ]
      },
      {
        "help": "",
        "hidden": false,
        "id": "number2901680126",
        "max": null,
        "min": 0,
        "name": "balance",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "help": "",
        "hidden": false,
        "id": "bool458715613",
        "name": "is_active",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text3485334036",
        "max": 255,
        "min": 0,
        "name": "note",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      }
    ],
    "id": "pbc_120182150",
    "indexes": [
      "CREATE UNIQUE INDEX idx_wallet_user ON wallets (user)"
    ],
    "listRule": "@request.auth.id != ''",
    "name": "wallets",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.collectionName = '_superusers'",
    "viewRule": "@request.auth.id != ''"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_120182150");

  return app.delete(collection);
})