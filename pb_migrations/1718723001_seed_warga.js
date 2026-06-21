migrate((app) => {
  const usersCollection = app.findCollectionByNameOrId("users");
  const wargaCollection = app.findCollectionByNameOrId("warga");

  const data = [
    { kode: "a01", nama: "Eko Budi Santoso" },
    { kode: "a02", nama: "Penni Arumdati", pengurus: true },
    { kode: "a03", nama: "Putri Permata Sari" },
    { kode: "a04", nama: "Riyadi Wahyu Nugroho" },
    { kode: "a05", nama: "Pambudi" },
    { kode: "a06", nama: "Rahmat Wahvudi" },
    { kode: "b01", nama: "Leonardo" },
    { kode: "b02", nama: "Dika" },
    { kode: "b03", nama: "Aris Nandar", pengurus: true },
    { kode: "b04", nama: "Jejen Jaenudin" },
    { kode: "b05", nama: "Alunad Hasbi", pengurus: true },
    { kode: "b06", nama: "Andika Harrv Octavianto" },
    { kode: "c01", nama: "Muhammad Rolando R" },
    { kode: "c02", nama: "Nanda Agussah Putra" },
    { kode: "c03", nama: "Dadan Darmawan" },
    { kode: "c04", nama: "Muhammad Noval" },
    { kode: "c05", nama: "Denny Hermawan / Nurhavati Octavia Syahrul" },
    { kode: "c06", nama: "Sadana Nur Utama" },
    { kode: "c07", nama: "Nur Dewi Aflfah" },
    { kode: "c08", nama: "" },
    { kode: "c09", nama: "Mamat Nurahmat", pengurus: true },
    { kode: "c10", nama: "Andre" },
    { kode: "c11", nama: "Erny Hendriaswa" },
    { kode: "c12", nama: "Irvan" },
    { kode: "c13", nama: "Mohammad Adi Tryaswindito" },
    { kode: "c14", nama: "Usman" },
    { kode: "d01", nama: "Heri Budi Prasetyo" },
    { kode: "d02", nama: "Isabela Tiara Anggita" },
    { kode: "d03", nama: "Heri Nuryadi" },
    { kode: "d04", nama: "Yokeke Dwi Harapan" },
    { kode: "d05", nama: "Adam Shofi Tarwadi" },
    { kode: "d06", nama: "Kiduno Sadewa", pengurus: true },
    { kode: "d07", nama: "" },
    { kode: "e01", nama: "" },
    { kode: "e02", nama: "Fadly Octaviano" },
    { kode: "e03", nama: "Fitria Atika Chairia", pengurus: true },
    { kode: "e04", nama: "Fajar Nugroho" },
    { kode: "e05", nama: "Fiki Ari Rusli" },
    { kode: "e06", nama: "Fitrianto" },
    { kode: "e07", nama: "Satrio Utomo Gunawan" },
    { kode: "e08", nama: "Rohati" },
    { kode: "e09", nama: "Ibadarrohman" },
    { kode: "e10", nama: "Egi Nopriandi" },
    { kode: "e11", nama: "Muhammad Reza R" },
    { kode: "e12", nama: "" },
    { kode: "f01", nama: "Gilan Raka Pratama", pengurus: true },
    { kode: "f02", nama: "Ali Akbar Al Afghani" },
    { kode: "f03", nama: "Edwin Rega Prayoga", pengurus: true },
    { kode: "f04", "nama": "Yanuari Riza" },
    { kode: "f05", nama: "Albertus Eka Purwawidi ana" },
    { kode: "f06", nama: "Almira Vania" },
    { kode: "f07", nama: "Mulyadi" },
    { kode: "f08", nama: "Dellananda Rizki Putri" },
    { kode: "f09", nama: "Ade Andriani Butar Butar" },
    { kode: "f10", nama: "Adisetyo Prabowo" },
    { kode: "f11", nama: "Ririn Respatin" },
    { kode: "f12", nama: "Budiarti" },
    { kode: "g01", nama: "Faris Human Jalaludin" },
    { kode: "g02", nama: "Angga Pratama" },
    { kode: "g03", nama: "Dalle Octaviano Putra" },
    { kode: "g04", nama: "Apri Setyo Anggoro" },
    { kode: "g05", nama: "Angga Pramana / Yen Twenti Tri Bastian" }
  ];

  for (const item of data) {
    // PocketBase mewajibkan ID harus TEPAT 15 karakter alfanumerik.
    // Oleh karena itu, kita tambahkan padding di belakang kodenya.
    const userId = `usr${item.kode}`.padEnd(15, "0");  // cth: usra01000000000
    const wargaId = `${item.kode}`.padEnd(15, "0");    // cth: a01000000000000
    const email = `${item.kode}@warga.local`;
    const pwd = email;

    // 1. Create User
    try {
      app.findRecordById("users", userId);
    } catch (err) {
      const userRecord = new Record(usersCollection);
      userRecord.set("id", userId);
      userRecord.set("username", item.kode);
      userRecord.set("email", email);
      userRecord.set("emailVisibility", true);
      userRecord.setPassword(pwd);
      userRecord.set("name", item.nama || `Warga ${item.kode.toUpperCase()}`);
      app.save(userRecord);
    }

    // 2. Create Warga
    let wargaExists = false;
    try {
      app.findRecordById("warga", wargaId);
      wargaExists = true;
    } catch (err) {}

    if (!wargaExists) {
      const wargaRecord = new Record(wargaCollection);
      wargaRecord.set("id", wargaId);
      wargaRecord.set("no_rumah", item.kode.toUpperCase());
      wargaRecord.set("user", userId);
      wargaRecord.set("no_wa", ""); // Kosongkan field sisanya
      wargaRecord.set("pengurus", item.pengurus || false);
      app.save(wargaRecord);
    } else {
      // Update jika data sudah ada dan pengurus perlu diubah
      try {
        const existingWarga = app.findRecordById("warga", wargaId);
        if (item.pengurus && existingWarga.get("pengurus") !== true) {
          existingWarga.set("pengurus", true);
          app.save(existingWarga);
        }
      } catch (e) {}
    }
  }

}, (app) => {
  // rollback
});
