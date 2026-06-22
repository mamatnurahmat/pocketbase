// Hook: Kirim notifikasi ke ntfy.sh/p2s saat upload file lampiran
// Dipanggil setelah record lampiran berhasil dibuat dan disimpan

onRecordAfterCreateSuccess((e) => {
  try {
    const record = e.record;
    if (!record) {
      console.error("lampiran_notify: record is nil");
      return;
    }

    // Filter: hanya untuk collection lampiran
    const collName = record.collection ? record.collection().name : record.collectionName;
    if (collName !== "lampiran") {
      return;
    }

    const lampiranId = record.getString("id") || record.get("id") || "";
    const wargaId = record.getString("warga");
    const iuranIds = record.get("iuran"); // bisa []string

    if (!wargaId) {
      console.error("lampiran_notify: wargaId is empty");
      return;
    }

    // Ambil data warga
    let wargaRecord;
    try {
      wargaRecord = $app.findFirstRecordByData("warga", "id", wargaId);
    } catch (err) {
      console.error("lampiran_notify: gagal ambil warga:", err);
      return;
    }

    if (!wargaRecord) {
      console.error("lampiran_notify: warga tidak ditemukan:", wargaId);
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
      console.warn("lampiran_notify: gagal ambil user:", err);
    }

    // Ambil nama iuran
    let iuranNames = [];
    if (iuranIds && iuranIds.length > 0) {
      for (const iId of iuranIds) {
        try {
          const iuranRecord = $app.findFirstRecordByData("iuran", "id", iId);
          if (iuranRecord) {
            iuranNames.push(iuranRecord.getString("kode"));
          }
        } catch (err) {
          console.warn("lampiran_notify: gagal ambil iuran:", err);
        }
      }
    }

    // Format pesan notifikasi
    const iuranList = iuranNames.length > 0 ? iuranNames.join(", ") : "-";
    const currentTime = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

    let message = "📎 *Upload Bukti Pembayaran Baru*\n\n";
    message += `👤 *Warga:* ${userName} (No. ${noRumah})\n`;
    message += `💰 *Iuran:* ${iuranList}\n`;
    message += `🆔 *ID Lampiran:* ${lampiranId}\n`;
    message += `🕐 *Waktu:* ${currentTime}\n`;

    // Kirim notifikasi ke ntfy.sh
    const adminUrl = "http://p2s.duckdns.org/_/#/collections?collection=lampiran";

    const payload = {
      topic: "p2s",
      title: "📎 Upload Bukti Pembayaran",
      message: message,
      tags: ["money", "pocketbase", "part_alternation_mark"],
      priority: 4,  // high priority
      click: adminUrl,
      attach: "https://ntfy.sh/static/img/ntfy.png"
    };

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
        console.log("lampiran_notify: notifikasi berhasil dikirim ke ntfy.sh");
      } else {
        console.error("lampiran_notify: gagal kirim notifikasi, status:", res.statusCode);
      }
    } catch (httpErr) {
      console.error("lampiran_notify: error HTTP:", httpErr);
    }
  } catch (err) {
    console.error("lampiran_notify: error umum:", err);
  }
});