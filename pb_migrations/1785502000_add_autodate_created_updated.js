/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  for (const name of ["file_mutasi", "mutasi", "report"]) {
    const collection = app.findCollectionByNameOrId(name);
    if (!collection) continue;

    if (!collection.fields.getByName("created")) {
      collection.fields.add(new AutodateField({
        name: "created",
        onCreate: true,
        onUpdate: false,
      }));
    }
    if (!collection.fields.getByName("updated")) {
      collection.fields.add(new AutodateField({
        name: "updated",
        onCreate: true,
        onUpdate: true,
      }));
    }

    app.save(collection);
  }
}, (app) => {
  for (const name of ["file_mutasi", "mutasi", "report"]) {
    const collection = app.findCollectionByNameOrId(name);
    if (!collection) continue;
    const created = collection.fields.getByName("created");
    if (created) collection.fields.remove(created);
    const updated = collection.fields.getByName("updated");
    if (updated) collection.fields.remove(updated);
    app.save(collection);
  }
});
