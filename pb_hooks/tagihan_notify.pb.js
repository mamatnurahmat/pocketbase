// Hook: Kirim notifikasi ke ntfy.sh/p2s saat tagihan dibuat atau status berubah
console.log('tagihan_notify: loaded');
var _tagihanBaseUrl = "https://prestige2.sawangan.web.id";

// Helper: ambil data warga & user
function _tagihanGetWarga(wargaId) {
  try {
    var wr = $app.findFirstRecordByData("warga", "id", wargaId);
    if (!wr) return { name: "-", noRumah: "-", wa: "" };
    var nr = wr.getString("no_rumah");
    var wa = wr.getString("no_wa") || "";
    var un = "-";
    var uid = wr.getString("user");
    if (uid) {
      var ur = $app.findFirstRecordByData("users", "id", uid);
      if (ur) un = ur.getString("name");
    }
    return { name: un, noRumah: nr, wa: wa };
  } catch (err) {
    console.error("tagihan_notify: gagal ambil warga:", err);
    return { name: "-", noRumah: "-", wa: "" };
  }
}

// Helper: ambil nama iuran
function _tagihanGetIuran(iuranId) {
  try {
    var ir = $app.findFirstRecordByData("iuran", "id", iuranId);
    if (!ir) return "-";
    return ir.getString("kode") || ir.getString("nama") || "-";
  } catch (err) {
    console.error("tagihan_notify: gagal ambil iuran:", err);
    return "-";
  }
}

// Helper: kirim ke ntfy.sh
function _tagihanSend(payload) {
  try {
    var res = $http.send({
      url: "https://ntfy.sh",
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      timeout: 30
    });
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log("tagihan_notify: notifikasi berhasil dikirim ke ntfy.sh");
    } else {
      console.error("tagihan_notify: gagal kirim notifikasi, status:", res.statusCode);
    }
  } catch (err) {
    console.error("tagihan_notify: error HTTP:", err);
  }
}

// ── 1. Notifikasi saat tagihan BARU dibuat ──
onRecordAfterCreateSuccess(function(e) {
  console.log('tagihan_notify: onRecordAfterCreateSuccess called');
  var record = e.record;
  if (!record) return;

  var collName = record.collection ? record.collection().name : record.collectionName;
  if (collName !== "tagihan") return;

  var tagihanId = record.getString("id") || record.get("id") || "";
  var wargaId = record.getString("warga");
  var iuranId = record.getString("iuran");
  var nominal = record.get("nominal");
  var jatuhTempo = record.getString("jatuh_tempo") || "";
  var status = record.getString("status_pembayaran") || "Belum Dibayar";

  if (!wargaId || !iuranId) return;

  var info = _tagihanGetWarga(wargaId);
  var iuranName = _tagihanGetIuran(iuranId);
  var waktu = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

  // Format nominal
  var nominalStr = "-";
  if (nominal !== null && nominal !== undefined) {
    nominalStr = "Rp " + Number(nominal).toLocaleString("id-ID");
  }

  // Format jatuh tempo
  var jatuhStr = "-";
  if (jatuhTempo) {
    try {
      var d = new Date(jatuhTempo);
      jatuhStr = d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    } catch (err) {
      jatuhStr = jatuhTempo;
    }
  }

  var message = "🧾 *Tagihan Baru Dibuat*\n\n";
  message += "👤 *Warga:* " + info.name + " (No. " + info.noRumah + ")\n";
  message += "📂 *Iuran:* " + iuranName + "\n";
  message += "💰 *Nominal:* " + nominalStr + "\n";
  message += "📅 *Jatuh Tempo:* " + jatuhStr + "\n";
  message += "📌 *Status:* " + status + "\n";
  message += "🆔 *ID Tagihan:* " + tagihanId + "\n";
  message += "🕐 *Dibuat:* " + waktu + "\n";

  var adminUrl = _tagihanBaseUrl + "/_/#/collections/tagihan/records/" + tagihanId;

  var payload = {
    topic: "p2s",
    title: "🧾 Tagihan Baru: " + iuranName + " - " + info.noRumah,
    message: message,
    tags: ["money", "pocketbase", "dollar"],
    priority: 3,
    click: adminUrl
  };

  _tagihanSend(payload);
});

// ── 2. Notifikasi saat tagihan DIUPDATE (status pembayaran berubah) ──
onRecordAfterUpdateSuccess(function(e) {
  var record = e.record;
  if (!record) return;

  var collName = record.collection ? record.collection().name : record.collectionName;
  if (collName !== "tagihan") return;

  var tagihanId = record.getString("id") || record.get("id") || "";
  var wargaId = record.getString("warga");
  var iuranId = record.getString("iuran");
  var nominal = record.get("nominal");
  var status = record.getString("status_pembayaran") || "";
  var jatuhTempo = record.getString("jatuh_tempo") || "";

  if (!wargaId || !iuranId) return;

  var info = _tagihanGetWarga(wargaId);
  var iuranName = _tagihanGetIuran(iuranId);
  var waktu = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

  // Format nominal
  var nominalStr = "-";
  if (nominal !== null && nominal !== undefined) {
    nominalStr = "Rp " + Number(nominal).toLocaleString("id-ID");
  }

  var statusEmoji = "⏳";
  if (status === "Lunas") statusEmoji = "✅";
  else if (status === "Menunggu Konfirmasi") statusEmoji = "⏳";
  else if (status === "Belum Dibayar") statusEmoji = "🔴";

  // PB 0.39 tidak support getOriginal → kirim notifikasi generic tiap update
  var message = statusEmoji + " *Status Tagihan Diupdate*\n\n";
  message += "👤 *Warga:* " + info.name + " (No. " + info.noRumah + ")\n";
  message += "📂 *Iuran:* " + iuranName + "\n";
  message += "💰 *Nominal:* " + nominalStr + "\n";
  message += "📌 *Status:* " + status + "\n";
  message += "🆔 *ID Tagihan:* " + tagihanId + "\n";
  message += "🕐 *Diupdate:* " + waktu + "\n";

  var title = statusEmoji + " Tagihan " + iuranName + " - " + info.noRumah + ": " + status;

  var adminUrl = _tagihanBaseUrl + "/_/#/collections/tagihan/records/" + tagihanId;

  var payload = {
    topic: "p2s",
    title: title,
    message: message,
    tags: ["money", "pocketbase"],
    priority: 3,
    click: adminUrl
  };

  _tagihanSend(payload);
});