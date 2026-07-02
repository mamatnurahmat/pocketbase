/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("aktivitas_warga");

  // Pengurus can see all aktivitas, warga biasa only their own
  // warga.pengurus = true OR warga.user = current user
  collection.listRule = "@request.auth.id != '' && (warga.pengurus = true || warga.user = @request.auth.id)";
  collection.viewRule = "@request.auth.id != '' && (warga.pengurus = true || warga.user = @request.auth.id)";

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("aktivitas_warga");

  collection.listRule = null;
  collection.viewRule = null;

  app.save(collection);
});