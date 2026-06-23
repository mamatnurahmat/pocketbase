migrate((app) => {
  const collection = app.findCollectionByNameOrId("sos");
  if (!collection) {
    console.log("sos_fix3: collection not found");
    return;
  }

  const fields = collection.fields;
  let modified = false;

  for (const f of fields) {
    // Make user field not required (for anonymous SOS)
    if (f.name === "user" && f.required) {
      f.required = false;
      modified = true;
      console.log("sos_fix3: user field set to not required");
    }
  }

  if (modified) {
    app.save(collection);
    console.log("sos_fix3: collection updated successfully");
  } else {
    console.log("sos_fix3: no changes needed");
  }
}, (app) => {
  // rollback: nothing to do
});