# INCIDENT — 2026-09-04: Tagihan Approve 400 setelah Upgrade PocketBase 0.40.2

## 🚨 Ringkasan

Setelah upgrade PocketBase **0.39.4 → 0.40.2** (2026-09-04), aksi **"Menyetujui tagihan"** di
aplikasi `prestige2.sawangan.web.id` gagal dengan error:

```
PocketBase error (400): {"data":{},"message":"Failed to update record.","status":400}
```

Record **tersimpan** di database, namun **respons request error 400** sehingga frontend
menampilkan "Gagal menyetujui tagihan".

## 📅 Timeline

| Waktu (WIB) | Kejadian |
|---|---|
| 07:03 | Backup penuh dibuat: `/var/data/pocketbase/backup/before-upgrade-20260904.tar.gz` (50MB, `db.sh`) |
| 07:05 | Upgrade image `ghcr.io/muchobien/pocketbase:latest` → **0.40.2** — hooks 9/9 loaded, `/api/health` OK |
| ~07:30 | User melaporkan error approve tagihan (400) di prestige2 |
| 07:5x | Diagnosa: log PB tidak mencatat; ditemukan pola filter tidak aman di hook |
| 08:08 | Patch hook `wallet_tagihan.pb.js` (filter placeholder) — auto-reload OK |

## 🔍 Akar Masalah

Hook **`pb_hooks/wallet_tagihan.pb.js`** (koleksi `wallets` setelah update tagihan) memakai
**string filter dengan concat + embedded quote** yang di-parse lebih ketat oleh versi 0.40:

```js
// SEBELUM (berisiko, gagal di parser filter 0.40+)
var existingTrx = $app.findRecordsByFilter('transactions', 'note ~ "' + tagihanId + '"', '', 1, 0);

// SESUDAH (aman & version-proof, pakai placeholder)
var existingTrx = $app.findRecordsByFilter('transactions', 'note ~ {:tagid}', '', 1, 0, { tagid: tagihanId });
```

Ketika filter gagal di-parse di dalam hook `onRecordAfterUpdateSuccess`, error hook menyebar
ke luar sehingga request update balas **400 `Failed to update record`** (data kosong `{}`),
padahal record utama sudah tersimpan.

Hook lain masih memakai filter polos (`wallet_type="KAS"`) tanpa concat variabel — aman.

## 🛠️ Fix

1. Backup hook: `pb_hooks/wallet_tagihan.pb.js.bak-20260904T070857` (dan `*.bak` di-ignore git)
2. Patch line 23 → placeholder `{:tagid}` (lihat di atas)
3. PB auto-reload hook (log: `File /pb_hooks/wallet_tagihan.pb.js changed, restarting... → wallet_tagihan: loaded v3`)

## ✅ Validasi

- `/api/health` → 200
- Hook reload tanpa error
- Aksi approve tagihan perlu diuji ulang oleh user (status saat penulisan: menunggu konfirmasi)

## ♻️ Backup & Rollback

- Backup DB penuh sebelum upgrade: `/var/data/pocketbase/backup/before-upgrade-20260904.tar.gz`
- Rollback: `./db.sh restore before-upgrade-20260904.tar.gz` (lihat `BACKUP-RESTORE.md`)

## 📌 Rekomendasi

- Audit semua hook untuk pola **string concat dalam filter** → wajib pakai **placeholder args**
  (`{:namavar}` + objek args), hindari embedded quotes variabel
- Selalu backup `db.sh` sebelum upgrade minor/major
- Uji satu transaksi kunci (approve tagihan, approve payout, upload lampiran) setelah upgrade

## 🔗 Terkait
- [BACKUP-RESTORE.md](./BACKUP-RESTORE.md) — prosedur backup/restore
- Commit fix: `pb_hooks/wallet_tagihan.pb.js` (commit pesan terkait insiden ini)