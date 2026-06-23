migrate((app) => {
  const usersCollection = app.findCollectionByNameOrId("users");
  const scurityCollection = app.findCollectionByNameOrId("scurity");

  const data = [
    { nama: "Tatab", no_hp: "081234567890" },
    { nama: "Iwan", no_hp: "081234567891" },
    { nama: "Udin", no_hp: "081234567892" },
    { nama: "Usman", no_hp: "081234567893" }
  ];

  for (const item of data) {
    const id = `scr${item.nama.toLowerCase()}`.padEnd(15, "0");
    const userId = `usr${item.nama.toLowerCase()}`.padEnd(15, "0");
    const email = `${item.nama.toLowerCase()}@scurity.local`;

    // 1. Create User
    try {
      app.findRecordById("users", userId);
    } catch (err) {
      const userRecord = new Record(usersCollection);
      userRecord.set("id", userId);
      userRecord.set("username", `${item.nama.toLowerCase()}.scurity`);
      userRecord.set("email", email);
      userRecord.set("emailVisibility", true);
      userRecord.setPassword("samasama");
      userRecord.set("name", item.nama);
      app.save(userRecord);
    }

    // 2. Create Scurity record
    let exists = false;
    try {
      app.findRecordById("scurity", id);
      exists = true;
    } catch (_) {}

    if (!exists) {
      const record = new Record(scurityCollection);
      record.set("id", id);
      record.set("nama", item.nama);
      record.set("no_hp", item.no_hp);
      record.set("user", userId);
      app.save(record);
    }
  }
}, (app) => {});