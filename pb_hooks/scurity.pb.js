// Hook: Scurity — auto-tanggal + absen terakhir + notif ntfy
console.log('scurity: loaded v3');

var BASE_URL = 'https://prestige2.sawangan.web.id';
var NTFY_TOPIC = 'p2s-scurity';

// ── Helper: ambil data scurity dari DB ──
var _scurityGetData = function(userId) {
  var result = { scurityId: '', nama: '-', noHp: '' };
  try {
    var scurityRecord = $app.findFirstRecordByData('scurity', 'user', userId);
    if (scurityRecord) {
      result.scurityId = scurityRecord.getId();
      result.nama = scurityRecord.getString('nama') || '-';
      result.noHp = scurityRecord.getString('no_hp') || '';
    }
  } catch (err) {}
  return result;
};

// ── Helper: kirim ke ntfy.sh ──
var _scurityNotify = function(payload) {
  try {
    var res = $http.send({
      method: 'POST',
      url: 'https://ntfy.sh',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      timeout: 30
    });
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('scurity: notifikasi berhasil ke ntfy.sh/' + NTFY_TOPIC);
      return true;
    }
    console.error('scurity: gagal kirim notifikasi, status:', res.statusCode);
    return false;
  } catch (err) {
    console.error('scurity: error HTTP:', err);
    return false;
  }
};

// ── 1. Auto-set tanggal saat laporan_scurity dibuat ──
// ponytail: autodate (onCreate:true) handles this natively, no hook needed

// ── 2. Notifikasi saat laporan_scurity BARU dibuat ──
onRecordAfterCreateSuccess((e) => {
  try {
    if (!e.record) return;
    var coll = e.record.collection ? e.record.collection() : null;
    if (!coll || coll.name !== 'laporan_scurity') return;

    var record = e.record;
    var jenis = record.getString('jenis') || 'lainnya';
    var keterangan = record.getString('keterangan') || '-';
    var dibuatOleh = record.getString('dibuat_oleh') || '';
    var waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    var recordId = record.getId ? record.getId() : (record.id || '');

    // ponytail: skip notif kalo dibuat_oleh kosong (misal test curl tanpa user relasi)
    var nama = '-';
    var noHp = '';
    if (dibuatOleh) {
      var scurityData = _scurityGetData(dibuatOleh);
      nama = scurityData.nama || '-';
      noHp = scurityData.noHp || '';
    }

    var jenisLabel = jenis === 'absen' ? '📋 Absen' : jenis === 'patroli' ? '🚓 Patroli' : '📌 Lainnya';
    var tags = jenis === 'absen' ? ['clipboard', 'scurity'] : jenis === 'patroli' ? ['police_car', 'scurity'] : ['memo', 'scurity'];

    var message = `${jenisLabel}\n\n`;
    message += `👤 *Nama:* ${nama}\n`;
    if (noHp) message += `📱 *No. HP:* ${noHp}\n`;
    message += `📝 *Keterangan:* ${keterangan}\n`;
    message += `🕐 *Waktu:* ${waktu}\n`;
    message += `🆔 *ID:* ${recordId}\n`;

    var adminUrl = `${BASE_URL}/_/#/collections/laporan_scurity/records/${recordId}`;

    _scurityNotify({
      topic: NTFY_TOPIC,
      title: `${jenisLabel}: ${nama}`,
      message: message,
      tags: tags,
      priority: 3,
      click: adminUrl
    });
  } catch (err) {
    console.error('scurity: error onRecordAfterCreateSuccess:', err);
  }
});

// ── 3. Endpoint: GET /api/scurity/absen-terakhir ──
// Kembalikan tanggal absen terakhir (tanggal terbaru dengan jenis="absen")
routerAdd('GET', '/api/scurity/absen-terakhir', (c) => {
  try {
    // ponytail: info.auth sudah ada kalau token valid
    var authRecord = c.requestInfo().auth;
    if (!authRecord || !authRecord.id) {
      return c.json(401, { success: false, message: 'Login dulu.' });
    }

    // ponytail: filter by jenis="absen", sorted by tanggal desc, limit 1
    var records = $app.findRecordsByFilter(
      'laporan_scurity',
      'jenis = "absen"',
      '-tanggal',
      1,
      0
    );

    if (records.length === 0) {
      return c.json(200, { success: true, data: null, message: 'Belum ada absen.' });
    }

    var record = records[0];
    var dibuatOleh = record.getString('dibuat_oleh') || '';
    var recordId = record.getId ? record.getId() : (record.id || '');

    // ponytail: inline lookup nama scurity (Goja function hoisting issue)
    var nama = '-';
    if (dibuatOleh) {
      try {
        var sr = $app.findFirstRecordByData('scurity', 'user', dibuatOleh);
        if (sr) nama = sr.getString('nama') || '-';
      } catch (_) {}
    }

    return c.json(200, {
      success: true,
      data: {
        id: recordId,
        tanggal: record.getString('tanggal') || '',
        dibuat_oleh: dibuatOleh,
        nama: nama,
        keterangan: record.getString('keterangan') || ''
      }
    });
  } catch (err) {
    console.error('scurity: error /api/scurity/absen-terakhir:', err);
    return c.json(500, { success: false, message: 'Error: ' + (err.message || String(err)) });
  }
});
