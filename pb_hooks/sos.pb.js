// Hook: SOS Collection — buat record + notif ke ntfy.sh/p2s-sos
console.log('sos: loaded v3 (bypass auth)');

const SOS_BASE_URL = 'https://prestige2.sawangan.web.id';

// ── Helper: kirim ke ntfy.sh ──
function _sosSend(payload) {
  try {
    const res = $http.send({
      method: 'POST',
      url: 'https://ntfy.sh',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      timeout: 30
    });
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('sos: notifikasi berhasil dikirim ke ntfy.sh');
      return true;
    } else {
      console.error('sos: gagal kirim notifikasi, status:', res.statusCode);
      return false;
    }
  } catch (err) {
    console.error('sos: error HTTP:', err);
    return false;
  }
}

// ── Helper: ambil data warga dari DB ──
function _sosGetWargaData(userId) {
  let result = { wargaId: '', nama: '-', noRumah: '-', noWa: '' };
  try {
    const authRecord = $app.findFirstRecordByData('users', 'id', userId);
    if (authRecord) result.nama = authRecord.getString('name') || '-';
  } catch (err) {}
  try {
    const wargaRecord = $app.findFirstRecordByData('warga', 'user', userId);
    if (wargaRecord) {
      result.wargaId = wargaRecord.getId();
      result.noRumah = wargaRecord.getString('no_rumah') || '-';
      result.noWa = wargaRecord.getString('no_wa') || '';
    }
  } catch (err) {}
  return result;
}

// ── 1. Endpoint: POST /api/sos — buat SOS (boleh tanpa auth) ──
routerAdd('POST', '/api/sos', (c) => {
  try {
    const authRecord = c.get('authRecord');
    let keterangan = '';
    let bodyNama = '';
    let bodyNoRumah = '';
    let bodyNoWa = '';

    // Baca body dari request
    try {
      var info = c.requestInfo();
      if (info && info.body) {
        keterangan = String(info.body.keterangan || '');
        bodyNama = String(info.body.nama || '');
        bodyNoRumah = String(info.body.no_rumah || '');
        bodyNoWa = String(info.body.no_wa || '');
      }
    } catch (e) {
      console.log('sos: gagal baca body:', e.message);
    }

    let userId = '';
    let wargaData = { wargaId: '', nama: '-', noRumah: '-', noWa: '' };

    if (authRecord) {
      userId = authRecord.getId();
      wargaData = _sosGetWargaData(userId);
    } else {
      wargaData.nama = bodyNama || 'Warga (anonim)';
      wargaData.noRumah = bodyNoRumah || '-';
      wargaData.noWa = bodyNoWa || '';
    }

    const collection = $app.findCollectionByNameOrId('sos');
    const record = new Record(collection, {
      user: userId || null,
      warga: wargaData.wargaId || null,
      nama: wargaData.nama,
      no_rumah: wargaData.noRumah,
      no_wa: wargaData.noWa,
      keterangan: keterangan,
      status: 'Menunggu',
      waktu_kirim: new Date().toISOString()
    });

    $app.save(record);

    return c.json(200, {
      success: true,
      message: 'SOS berhasil dikirim!',
      id: record.getId()
    });
  } catch (err) {
    console.error('sos: error endpoint:', err);
    return c.json(500, { success: false, message: 'Error: ' + (err.message || String(err)) });
  }
});

// ── 2. Notifikasi saat SOS BARU dibuat ──
onRecordAfterCreateSuccess(function(e) {
  try {
    const record = e.record;
    if (!record) return;
    const collName = record.collection ? record.collection().name : record.collectionName;
    if (collName !== 'sos') return;
    if (record.getString('status') !== 'Menunggu') return;

    const nama = record.getString('nama') || '-';
    const noRumah = record.getString('no_rumah') || '-';
    const noWa = record.getString('no_wa') || '';
    const keterangan = record.getString('keterangan') || '';
    const sosId = record.getId();
    const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    var message = '🚨 *SINYAL DARURAT (SOS)* 🚨\n\n';
    message += '👤 *Nama:* ' + nama + '\n';
    message += '🏠 *No. Rumah:* ' + noRumah + '\n';
    if (noWa) message += '📱 *No. WA:* ' + noWa + '\n';
    if (keterangan) message += '📋 *Keterangan:* ' + keterangan + '\n';
    message += '🆔 *ID SOS:* ' + sosId + '\n';
    message += '🕐 *Waktu:* ' + waktu + '\n\n';
    message += '⚡ *Segera proses di panel admin!*';

    const adminUrl = SOS_BASE_URL + '/_/#/collections/sos/records/' + sosId;

    const payload = {
      topic: 'p2s-sos',
      title: '🚨 SOS: ' + nama + ' (No. ' + noRumah + ')',
      message: message,
      tags: ['sos', 'rotating_light', 'warning'],
      priority: 5,
      click: adminUrl
    };

    _sosSend(payload);
  } catch (err) {
    console.error('sos: error onRecordAfterCreateSuccess:', err);
  }
});

// ── 3. Notifikasi saat SOS DIUPDATE (approval/rejection) ──
onRecordAfterUpdateSuccess(function(e) {
  try {
    const record = e.record;
    if (!record) return;
    const collName = record.collection ? record.collection().name : record.collectionName;
    if (collName !== 'sos') return;

    const status = record.getString('status');
    const oldStatus = record.getOriginal('status');
    if (status === oldStatus) return;

    const nama = record.getString('nama') || '-';
    const noRumah = record.getString('no_rumah') || '-';
    const noWa = record.getString('no_wa') || '';
    const keterangan = record.getString('keterangan') || '';
    const respons = record.getString('respons') || '';
    const sosId = record.getId();
    const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    var title, message, tags, priority, topic;

    if (status === 'Disetujui') {
      title = '✅ SOS Disetujui: ' + nama + ' (No. ' + noRumah + ')';
      tags = ['sos', 'white_check_mark', 'ok'];
      priority = 5;
      topic = 'p2s-sos';
      message = '✅ *SOS DISETUJUI* ✅\n\n';
      message += '👤 *Nama:* ' + nama + '\n';
      message += '🏠 *No. Rumah:* ' + noRumah + '\n';
      if (noWa) message += '📱 *No. WA:* ' + noWa + '\n';
      message += '🕐 *Waktu:* ' + waktu + '\n\n';
      message += '🆘 *Bantuan sedang dalam perjalanan. Tetap tenang!*';
      if (respons) message += '\n\n💬 *Catatan Pengurus:* ' + respons;
    } else if (status === 'Ditolak') {
      title = '❌ SOS Ditolak: ' + nama + ' (No. ' + noRumah + ')';
      tags = ['sos', 'x', 'no_entry'];
      priority = 4;
      topic = 'p2s-sos';
      message = '❌ *SOS DITOLAK* ❌\n\n';
      message += '👤 *Nama:* ' + nama + '\n';
      message += '🏠 *No. Rumah:* ' + noRumah + '\n';
      if (noWa) message += '📱 *No. WA:* ' + noWa + '\n';
      message += '🕐 *Waktu:* ' + waktu + '\n';
      if (respons) message += '\n💬 *Alasan:* ' + respons;
      else message += '\nSilakan hubungi pengurus untuk info lebih lanjut.';
    } else if (status === 'Selesai') {
      title = '🏁 SOS Selesai: ' + nama + ' (No. ' + noRumah + ')';
      tags = ['sos', 'checkered_flag', 'done'];
      priority = 3;
      topic = 'p2s';
      message = '🏁 *SOS SELESAI* 🏁\n\n';
      message += '👤 *Nama:* ' + nama + '\n';
      message += '🏠 *No. Rumah:* ' + noRumah + '\n';
      message += '🕐 *Waktu:* ' + waktu + '\n\n';
      message += '✅ Situasi telah teratasi.';
      if (respons) message += '\n💬 *Laporan:* ' + respons;
    } else {
      return;
    }

    const adminUrl = SOS_BASE_URL + '/_/#/collections/sos/records/' + sosId;
    const payload = { topic: topic, title: title, message: message, tags: tags, priority: priority, click: adminUrl };
    _sosSend(payload);
  } catch (err) {
    console.error('sos: error onRecordAfterUpdateSuccess:', err);
  }
});
