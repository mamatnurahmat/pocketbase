/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("payout_collection_id")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("payout_collection_id")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.id != '' && (warga.user = @request.auth.id || warga.pengurus = true)",
    "viewRule": "@request.auth.id != '' && (warga.user = @request.auth.id || warga.pengurus = true)"
  }, collection)

  return app.save(collection)
})
