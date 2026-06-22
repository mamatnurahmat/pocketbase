/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("lapor");

  // Filter rule:
  // - Pengurus (warga.pengurus = true) bisa melihat semua laporan
  // - Warga biasa hanya bisa melihat laporan yang bukan "Menunggu Konfirmasi"
  //   atau laporan miliknya sendiri (warga.user = @request.auth.id)
  collection.listRule = "@request.auth.id != '' && (warga.pengurus = true || status != 'Menunggu Konfirmasi' || warga.user = @request.auth.id)";
  collection.viewRule = "@request.auth.id != '' && (warga.pengurus = true || status != 'Menunggu Konfirmasi' || warga.user = @request.auth.id)";

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("lapor");

  // Rollback ke rule sebelumnya
  collection.listRule = "@request.auth.id != ''";
  collection.viewRule = "@request.auth.id != ''";

  app.save(collection);
});