/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("lampiran_collection_id")

  // update collection data
  unmarshal({
    "viewRule": "@request.auth.id != \"\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("lampiran_collection_id")

  // update collection data
  unmarshal({
    "viewRule": "@request.auth.id != ''"
  }, collection)

  return app.save(collection)
})
