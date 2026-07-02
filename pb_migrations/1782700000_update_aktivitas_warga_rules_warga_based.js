/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("aktivitas_warga");

  // Pengurus can see all aktivitas, regular warga only their own
  // Uses expanded warga relation: warga.pengurus = true OR warga.user = current user
  collection.listRule = "@request.auth.id != '' && (warga.pengurus = true || warga.user = @request.auth.id)";
  collection.viewRule = "@request.auth.id != '' && (warga.pengurus = true || warga.user = @request.auth.id)";

  // Allow update/delete for authenticated users (pengurus via frontend guard)
  collection.updateRule = "@request.auth.id != '' && (warga.pengurus = true || warga.user = @request.auth.id)";
  collection.deleteRule = "@request.auth.id != '' && (warga.pengurus = true || warga.user = @request.auth.id)";

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("aktivitas_warga");

  collection.listRule = null;
  collection.viewRule = null;
  collection.updateRule = null;
  collection.deleteRule = null;

  app.save(collection);
});
