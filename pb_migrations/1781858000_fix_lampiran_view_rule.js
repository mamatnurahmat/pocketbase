migrate((app) => {
  const collection = app.findCollectionByNameOrId("lampiran");
  // Change viewRule to allow any authenticated user to view any lampiran
  // This is needed because PocketBase validates relation records using viewRule
  collection.viewRule = "@request.auth.id != ''";
  app.save(collection);
}, (app) => {
  // No changes needed on revert since rule is unchanged
});
