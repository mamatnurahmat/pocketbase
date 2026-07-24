// Hook: Saat tagihan dibuat, cek kebersihan warga
// Jika warga tidak punya kebersihan (kebersihan=false), nominal IPL dikurangi Rp35.000
console.log('tagihan_kebersihan: loaded v1');

onRecordAfterCreateSuccess(function (e) {
  try {
    var record = e.record;
    if (!record) return;

    var collName = record.collectionName || (record.collection ? record.collection().name : null);
    if (collName !== 'tagihan') return;

    var iuranId = record.getString('iuran');
    // Hanya untuk iuran IPL (kode dimulai dengan iuranipl)
    if (!iuranId || iuranId.indexOf('iuranipl') !== 0) return;

    var wargaId = record.getString('warga');
    if (!wargaId) return;

    // Cek field kebersihan warga
    var warga = $app.findRecordById('warga', wargaId);
    if (!warga) return;

    var kebersihan = warga.get('kebersihan');
    // Jika kebersihan false/null, kurangi nominal Rp35.000
    if (kebersihan === false || kebersihan === null || kebersihan === undefined) {
      var nominal = record.get('nominal') || 0;
      if (nominal > 35000) {
        var nominalBaru = nominal - 35000;
        record.set('nominal', nominalBaru);
        $app.save(record);
        console.log('tagihan_kebersihan: potong Rp35.000 untuk', wargaId, nominal, '->', nominalBaru);
      }
    }
  } catch (err) {
    console.error('tagihan_kebersihan: ERROR', String(err));
  }
});