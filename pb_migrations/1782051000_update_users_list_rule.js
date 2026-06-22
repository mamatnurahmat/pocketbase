/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");

  // Allow authenticated users to list and view other users (needed for Warga page)
  collection.listRule = "@request.auth.id != ''";
  collection.viewRule = "@request.auth.id != ''";

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");

  // Rollback
  collection.listRule = "id = @request.auth.id";
  collection.viewRule = "id = @request.auth.id";

  app.save(collection);
});