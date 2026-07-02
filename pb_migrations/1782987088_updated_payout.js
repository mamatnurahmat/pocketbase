/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("payout_collection_id")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.id != \"\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("payout_collection_id")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.id != '' && warga.user = @request.auth.id && status = 'Menunggu Konfirmasi'",
    "updateRule": "@request.auth.id != '' && (warga.pengurus = true || (warga.user = @request.auth.id && status = 'Menunggu Konfirmasi'))"
  }, collection)

  return app.save(collection)
})
