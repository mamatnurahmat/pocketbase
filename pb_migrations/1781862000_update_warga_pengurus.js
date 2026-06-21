/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Daftar kode blok/nomor rumah warga yang akan diangkat menjadi pengurus
  const daftarPengurus = ["e03", "f03", "f01", "b05", "a02", "d06", "b03", "c09"];
  
  for (const kode of daftarPengurus) {
    // ID warga pada sistem terdiri dari kode ditambah angka 0 hingga 15 karakter
    const wargaId = kode.padEnd(15, "0");
    
    try {
      // Cari data warga dan ubah status pengurusnya menjadi true
      const record = app.findRecordById("warga", wargaId);
      record.set("pengurus", true);
      app.save(record);
      
      console.log(`✅ Status pengurus diaktifkan untuk warga: ${kode}`);
    } catch (err) {
      // Abaikan jika data warga belum ada di database
      console.log(`⚠️ Warga dengan kode ${kode} tidak ditemukan, dilewati.`);
    }
  }
}, (app) => {
  // --- Proses Rollback (Membatalkan perubahan jika migrasi di-revert) ---
  const daftarPengurus = ["e03", "f03", "f01", "b05", "a02", "d06", "b03", "c09"];
  
  for (const kode of daftarPengurus) {
    const wargaId = kode.padEnd(15, "0");
    
    try {
      // Kembalikan status pengurus menjadi false
      const record = app.findRecordById("warga", wargaId);
      record.set("pengurus", false);
      app.save(record);
    } catch (err) {
      // Abaikan jika data tidak ditemukan
    }
  }
});
