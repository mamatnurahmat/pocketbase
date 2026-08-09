/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Ubah field tagihan di collection rekon: maxSelect 1 -> banyak (multi tagihan)
  const rekonCollection = app.findCollectionByNameOrId("rekon");
  if (!rekonCollection) return;

  const field = rekonCollection.fields.getByName("tagihan");
  if (field) {
    field.maxSelect = 999;
    app.save(rekonCollection);
  }
}, (app) => {
  const rekonCollection = app.findCollectionByNameOrId("rekon");
  if (!rekonCollection) return;
  const field = rekonCollection.fields.getByName("tagihan");
  if (field) {
    field.maxSelect = 1;
    app.save(rekonCollection);
  }
});
