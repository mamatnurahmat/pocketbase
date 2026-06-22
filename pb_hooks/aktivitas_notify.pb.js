// Hook: Kirim notifikasi ke ntfy.sh/p2s saat aktivitas warga tercatat
console.log('aktivitas_notify: loaded');
var _aktivitasBaseUrl = "https://prestige2.sawangan.web.id";

// Helper: ambil data warga (return object dengan nama & no_rumah)
function _aktivitasGetWarga(wargaId) {
  try {
    var wr = $app.findFirstRecordByData("warga", "id", wargaId);
    if (!wr) return { name: "-", noRumah: "-" };
    var nr = wr.getString("no_rumah");
    var un = "-";
    var uid = wr.getString("user");
    if (uid) {
      var ur = $app.findFirstRecordByData("users", "id", uid);
      if (ur) un = ur.getString("name");
    }
    return { name: un, noRumah: nr };
  } catch (err) {
    console.error("aktivitas_notify: gagal ambil warga:", err);
    return { name: "-", noRumah: "-" };
  }
}

// Helper: kirim ke ntfy.sh
function _aktivitasSend(payload) {
  try {
    var res = $http.send({
      url: "https://ntfy.sh",
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      timeout: 30
    });
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log("aktivitas_notify: notifikasi berhasil dikirim ke ntfy.sh");
    } else {
      console.error("aktivitas_notify: gagal kirim notifikasi, status:", res.statusCode);
    }
  } catch (err) {
    console.error("aktivitas_notify: error HTTP:", err);
  }
}

// ── Notifikasi saat aktivitas warga BARU dibuat ──
onRecordAfterCreateSuccess(function(e) {
  console.log('aktivitas_notify: onRecordAfterCreateSuccess called');
  var record = e.record;
  if (!record) return;

  var collName = record.collection ? record.collection().name : record.collectionName;
  if (collName !== "aktivitas_warga") return;

  var aktivitasId = record.getString("id") || record.get("id") || "";
  var wargaId = record.getString("warga");
  var aktivitas = record.getString("aktivitas") || "";
  var detail = record.getString("detail") || "";

  if (!wargaId) return;

  var info = _aktivitasGetWarga(wargaId);
  var waktu = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

  // Tentukan emoji berdasarkan kata kunci aktivitas
  var emoji = "📋";
  var aktivitasLower = aktivitas.toLowerCase();
  if (aktivitasLower.includes("bayar") || aktivitasLower.includes("pembayaran") || aktivitasLower.includes("lunas")) {
    emoji = "💰";
  } else if (aktivitasLower.includes("login") || aktivitasLower.includes("masuk")) {
    emoji = "🔑";
  } else if (aktivitasLower.includes("daftar") || aktivitasLower.includes("registrasi") || aktivitasLower.includes("register")) {
    emoji = "📝";
  } else if (aktivitasLower.includes("ubah") || aktivitasLower.includes("edit") || aktivitasLower.includes("update")) {
    emoji = "✏️";
  } else if (aktivitasLower.includes("hapus") || aktivitasLower.includes("delete") || aktivitasLower.includes("remove")) {
    emoji = "🗑️";
  } else if (aktivitasLower.includes("lapor") || aktivitasLower.includes("laporan") || aktivitasLower.includes("keluhan")) {
    emoji = "📩";
  } else if (aktivitasLower.includes("approve") || aktivitasLower.includes("konfirmasi") || aktivitasLower.includes("setuju")) {
    emoji = "✅";
  } else if (aktivitasLower.includes("tolak") || aktivitasLower.includes("reject")) {
    emoji = "❌";
  }

  var message = emoji + " *Aktivitas Warga Baru*\n\n";
  message += "👤 *Warga:* " + info.name + " (No. " + info.noRumah + ")\n";
  message += emoji + " *Aktivitas:* " + aktivitas + "\n";

  if (detail) {
    message += "📄 *Detail:* " + detail + "\n";
  }

  message += "🕐 *Waktu:* " + waktu + "\n";

  var adminUrl = _aktivitasBaseUrl + "/_/#/collections/aktivitas_warga/records/" + aktivitasId;

  var payload = {
    topic: "p2s",
    title: emoji + " " + aktivitas.substring(0, 50) + (aktivitas.length > 50 ? "..." : ""),
    message: message,
    tags: ["pocketbase", "clipboard"],
    priority: 3,
    click: adminUrl
  };

  _aktivitasSend(payload);
});