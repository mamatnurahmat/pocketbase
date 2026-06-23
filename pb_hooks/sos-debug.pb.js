routerAdd('POST', '/api/sos-debug', (c) => {
  var result = {};
  try {
    var auth = c.get('authRecord');
    result.authType = typeof auth;
    result.authVal = JSON.stringify(auth);
    if (auth) {
      result.authKeys = Object.keys(auth).slice(0,20).join(', ');
    }
  } catch (e) {
    result.authError = e.message;
  }
  try {
    var rec = new Record($app.findCollectionByNameOrId('sos'), {
      user: null,
      warga: null,
      nama: 'test',
      no_rumah: '-',
      no_wa: '',
      keterangan: 'test',
      status: 'Menunggu',
      waktu_kirim: new Date().toISOString()
    });
    $app.save(rec);
    result.saveOk = rec.getId();
  } catch (e) {
    result.saveError = e.message;
  }
  return c.json(200, result);
});
