/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("warga");

  // Perbolehkan semua authenticated user untuk update warga
  // Frontend guard: hanya pengurus yang bisa melihat tombol edit
  collection.updateRule = "@request.auth.id != ''";

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("warga");

  // Rollback
  collection.updateRule = "@request.auth.id = user";

  app.save(collection);
});