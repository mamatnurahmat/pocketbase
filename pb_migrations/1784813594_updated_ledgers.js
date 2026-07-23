/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1212822754")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != ''"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1212822754")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.collectionName = '_superusers'"
  }, collection)

  return app.save(collection)
})
