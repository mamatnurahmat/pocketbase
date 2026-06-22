// Hook: Kirim notifikasi ke ntfy.sh/p2s saat warga baru terdaftar atau data warga diupdate
console.log('warga_notify: loaded');
var _wargaBaseUrl = "https://prestige2.sawangan.web.id";

// Helper: ambil data user
function _wargaGetUser(userId) {
  try {
    var ur = $app.findFirstRecordByData("users", "id", userId);
    if (!ur) return { name: "-", email: "" };
    return {
      name: ur.getString("name") || "-",
      email: ur.getString("email") || ""
    };
  } catch (err) {
    console.error("warga_notify: gagal ambil user:", err);
    return { name: "-", email: "" };
  }
}

// Helper: ambil data status
function _wargaGetStatus(statusId) {
  try {
    var sr = $app.findFirstRecordByData("status", "id", statusId);
    if (!sr) return "-";
    return sr.getString("nama") || sr.getString("tipe") || "-";
  } catch (err) {
    console.error("warga_notify: gagal ambil status:", err);
    return "-";
  }
}

// Helper: kirim ke ntfy.sh
function _wargaSend(payload) {
  try {
    var res = $http.send({
      url: "https://ntfy.sh",
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      timeout: 30
    });
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log("warga_notify: notifikasi berhasil dikirim ke ntfy.sh");
    } else {
      console.error("warga_notify: gagal kirim notifikasi, status:", res.statusCode);
    }
  } catch (err) {
    console.error("warga_notify: error HTTP:", err);
  }
}

// ── 1. Notifikasi saat warga BARU dibuat ──
onRecordAfterCreateSuccess(function(e) {
  console.log('warga_notify: onRecordAfterCreateSuccess called');
  var record = e.record;
  if (!record) return;

  var collName = record.collection ? record.collection().name : record.collectionName;
  if (collName !== "warga") return;

  var wargaId = record.getString("id") || record.get("id") || "";
  var noRumah = record.getString("no_rumah") || "-";
  var noWa = record.getString("no_wa") || "";
  var userId = record.getString("user");
  var statusId = record.getString("status");
  var pengurus = record.getBool("pengurus");
  var agama = record.getString("agama") || "";

  var userInfo = userId ? _wargaGetUser(userId) : { name: "-", email: "" };
  var statusName = statusId ? _wargaGetStatus(statusId) : "-";
  var waktu = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

  var message = "🏠 *Warga Baru Terdaftar*\n\n";
  message += "🏠 *No. Rumah:* " + noRumah + "\n";
  message += "👤 *Nama:* " + userInfo.name + "\n";

  if (noWa) {
    message += "📱 *No. WA:* " + noWa + "\n";
  }

  message += "📧 *Email:* " + userInfo.email + "\n";
  message += "🏷️ *Status:* " + statusName + "\n";

  if (agama) {
    message += "🕌 *Agama:* " + agama.charAt(0).toUpperCase() + agama.slice(1) + "\n";
  }

  if (pengurus) {
    message += "⭐ *Peran:* Pengurus\n";
  }

  message += "🆔 *ID Warga:* " + wargaId + "\n";
  message += "🕐 *Terdaftar:* " + waktu + "\n";

  var adminUrl = _wargaBaseUrl + "/_/#/collections/warga/records/" + wargaId;

  var payload = {
    topic: "p2s",
    title: "🏠 Warga Baru: " + userInfo.name + " (No. " + noRumah + ")",
    message: message,
    tags: ["house", "pocketbase", "wave"],
    priority: 4,
    click: adminUrl
  };

  _wargaSend(payload);
});

// ── 2. Notifikasi saat data warga DIUPDATE ──
onRecordAfterUpdateSuccess(function(e) {
  var record = e.record;
  if (!record) return;

  var collName = record.collection ? record.collection().name : record.collectionName;
  if (collName !== "warga") return;

  var wargaId = record.getString("id") || record.get("id") || "";
  var noRumah = record.getString("no_rumah") || "-";
  var noWa = record.getString("no_wa") || "";
  var userId = record.getString("user");
  var statusId = record.getString("status");
  var pengurus = record.getBool("pengurus");
  var agama = record.getString("agama") || "";

  // Ambil nilai lama untuk deteksi perubahan
  var oldNoRumah = "";
  var oldNoWa = "";
  var oldStatusId = "";
  var oldPengurus = false;
  var oldAgama = "";
  try {
    oldNoRumah = e.record.getOriginal("no_rumah") || "";
    oldNoWa = e.record.getOriginal("no_wa") || "";
    oldStatusId = e.record.getOriginal("status") || "";
    oldPengurus = e.record.getOriginal("pengurus") || false;
    oldAgama = e.record.getOriginal("agama") || "";
  } catch (err) {
    console.warn("warga_notify: gagal ambil original values:", err);
  }

  // Kumpulkan perubahan
  var changes = [];
  if (oldNoRumah !== noRumah) {
    changes.push("No. Rumah: " + (oldNoRumah || "-") + " → " + noRumah);
  }
  if (oldNoWa !== noWa) {
    changes.push("No. WA: " + (oldNoWa || "-") + " → " + (noWa || "-"));
  }
  if (oldStatusId !== statusId) {
    var oldStatusName = oldStatusId ? _wargaGetStatus(oldStatusId) : "-";
    var newStatusName = statusId ? _wargaGetStatus(statusId) : "-";
    changes.push("Status: " + oldStatusName + " → " + newStatusName);
  }
  if (oldPengurus !== pengurus) {
    changes.push("Peran: " + (oldPengurus ? "Pengurus" : "Warga") + " → " + (pengurus ? "Pengurus" : "Warga"));
  }
  if (oldAgama !== agama) {
    changes.push("Agama: " + (oldAgama || "-") + " → " + (agama || "-"));
  }

  // Jika tidak ada perubahan signifikan, skip
  if (changes.length === 0) {
    return;
  }

  var userInfo = userId ? _wargaGetUser(userId) : { name: "-", email: "" };
  var waktu = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

  var message = "✏️ *Data Warga Diupdate*\n\n";
  message += "👤 *Warga:* " + userInfo.name + " (No. " + noRumah + ")\n";
  message += "📋 *Perubahan:*\n";

  for (var i = 0; i < changes.length; i++) {
    message += "  " + (i + 1) + ". " + changes[i] + "\n";
  }

  message += "\n🆔 *ID Warga:* " + wargaId + "\n";
  message += "🕐 *Diupdate:* " + waktu + "\n";

  var adminUrl = _wargaBaseUrl + "/_/#/collections/warga/records/" + wargaId;

  var payload = {
    topic: "p2s",
    title: "✏️ Data Warga Diupdate: " + userInfo.name + " (No. " + noRumah + ")",
    message: message,
    tags: ["pencil", "pocketbase"],
    priority: 3,
    click: adminUrl
  };

  _wargaSend(payload);
});