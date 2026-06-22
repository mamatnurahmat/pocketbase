// Hook: Kirim notifikasi ke ntfy.sh/p2s saat laporan warga dibuat/ditanggapi
console.log('lapor_notify: loaded v2');

// ── 1. Notifikasi saat laporan BARU dibuat ──
onRecordAfterCreateSuccess((e) => {
  try {
    const record = e.record;
    if (!record) {
      console.error("lapor_notify: record is nil");
      return;
    }

    const collName = record.collection ? record.collection().name : record.collectionName;
    if (collName !== "lapor") {
      return;
    }

    const laporId = record.getString("id") || record.get("id") || "";
    const wargaId = record.getString("warga");
    const keterangan = record.getString("keterangan") || "";
    const status = record.getString("status") || "Menunggu Konfirmasi";
    const fotoName = record.getString("foto") || "";

    if (!wargaId) {
      console.error("lapor_notify: wargaId is empty");
      return;
    }

    // Ambil data warga
    let wargaRecord;
    try {
      wargaRecord = $app.findFirstRecordByData("warga", "id", wargaId);
    } catch (err) {
      console.error("lapor_notify: gagal ambil warga:", err);
      return;
    }

    if (!wargaRecord) {
      console.error("lapor_notify: warga tidak ditemukan:", wargaId);
      return;
    }

    const noRumah = wargaRecord.getString("no_rumah");

    // Ambil nama user
    let userName = "-";
    try {
      const userId = wargaRecord.getString("user");
      if (userId) {
        const userRecord = $app.findFirstRecordByData("users", "id", userId);
        if (userRecord) {
          userName = userRecord.getString("name");
        }
      }
    } catch (err) {
      console.warn("lapor_notify: gagal ambil user:", err);
    }

    const currentTime = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

    let message = "📩 *Laporan Baru dari Warga*\n\n";
    message += "👤 *Warga:* " + userName + " (No. " + noRumah + ")\n";
    message += "📋 *Keterangan:* " + keterangan + "\n";
    message += "🆔 *ID Laporan:* " + laporId + "\n";
    message += "🕐 *Waktu:* " + currentTime + "\n";

    const baseUrl = "https://prestige2.sawangan.web.id";
    const adminUrl = baseUrl + "/_/#/collections/lapor/records/" + laporId;
    const fileUrl = fotoName ? baseUrl + "/api/files/lapor/" + laporId + "/" + fotoName : "";

    const payload = {
      topic: "p2s",
      title: "📩 Laporan Baru dari Warga",
      message: message,
      tags: ["memo", "pocketbase", "loudspeaker"],
      priority: 3,
      click: adminUrl
    };

    if (fileUrl) payload.attach = fileUrl;

    try {
      const res = $http.send({
        method: "POST",
        url: "https://ntfy.sh",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 30
      });

      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log("lapor_notify: notifikasi berhasil dikirim ke ntfy.sh");
      } else {
        console.error("lapor_notify: gagal kirim notifikasi, status:", res.statusCode);
      }
    } catch (httpErr) {
      console.error("lapor_notify: error HTTP:", httpErr);
    }
  } catch (err) {
    console.error("lapor_notify: error umum:", err);
  }
});

// ── 2. Notifikasi saat laporan DIUPDATE (status/respons) ──
onRecordAfterUpdateSuccess((e) => {
  try {
    const record = e.record;
    if (!record) return;

    const collName = record.collection ? record.collection().name : record.collectionName;
    if (collName !== "lapor") return;

    const laporId = record.getString("id") || record.get("id") || "";
    const wargaId = record.getString("warga");
    const keterangan = record.getString("keterangan") || "";
    const status = record.getString("status") || "";
    const respons = record.getString("respons") || "";
    const fotoName = record.getString("foto") || "";

    if (!wargaId) return;

    // Ambil data warga
    let wargaRecord;
    try {
      wargaRecord = $app.findFirstRecordByData("warga", "id", wargaId);
    } catch (err) {
      console.error("lapor_notify: gagal ambil warga:", err);
      return;
    }
    if (!wargaRecord) return;

    const noRumah = wargaRecord.getString("no_rumah");
    let userName = "-";
    try {
      const userId = wargaRecord.getString("user");
      if (userId) {
        const userRecord = $app.findFirstRecordByData("users", "id", userId);
        if (userRecord) {
          userName = userRecord.getString("name");
        }
      }
    } catch (err) {
      console.warn("lapor_notify: gagal ambil user:", err);
    }

    const currentTime = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

    let statusEmoji = "📋";
    if (status === "Diproses") statusEmoji = "🔄";
    else if (status === "Selesai") statusEmoji = "✅";
    else if (status === "Ditolak") statusEmoji = "❌";

    let message = statusEmoji + " *Status Laporan Diupdate*\n\n";
    message += "👤 *Warga:* " + userName + " (No. " + noRumah + ")\n";
    message += "📋 *Keterangan:* " + keterangan.substring(0, 100) + (keterangan.length > 100 ? "..." : "") + "\n";
    message += statusEmoji + " *Status:* " + status + "\n";

    if (respons) {
      message += "💬 *Respons Pengurus:* " + respons + "\n";
    }

    message += "🆔 *ID Laporan:* " + laporId + "\n";
    message += "🕐 *Waktu:* " + currentTime + "\n";

    const baseUrl = "https://prestige2.sawangan.web.id";
    const adminUrl = baseUrl + "/_/#/collections/lapor/records/" + laporId;
    const fileUrl = fotoName ? baseUrl + "/api/files/lapor/" + laporId + "/" + fotoName : "";

    const payload = {
      topic: "p2s",
      title: statusEmoji + " Laporan " + status,
      message: message,
      tags: ["memo", "pocketbase"],
      priority: 3,
      click: adminUrl
    };

    if (fileUrl) payload.attach = fileUrl;

    try {
      const res = $http.send({
        method: "POST",
        url: "https://ntfy.sh",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 30
      });

      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log("lapor_notify: notifikasi berhasil dikirim ke ntfy.sh");
      } else {
        console.error("lapor_notify: gagal kirim notifikasi, status:", res.statusCode);
      }
    } catch (httpErr) {
      console.error("lapor_notify: error HTTP:", httpErr);
    }
  } catch (err) {
    console.error("lapor_notify: error umum:", err);
  }
});