# Product Requirements Document — Fitur Payout (Klaim/Reimbursement)
## Aplikasi Warga — Perumahan Prestige 2 Sawangan

---

### 📌 1. Ringkasan

| Item | Deskripsi |
|---|---|
| **Nama Fitur** | Payout / Klaim & Reimbursement Warga |
| **Branch** | `fitur/payout` |
| **Tipe** | Self-service claim + Approval pengurus |
| **Status** | ✨ Direncanakan |

**Tujuan**: Memberikan warga kemampuan mengajukan klaim reimbursement (pengeluaran pribadi untuk kepentingan bersama) yang akan diverifikasi dan dibayarkan oleh pengurus dari kas RT/RW, dengan pencatatan otomatis ke sistem keuangan (wallet + transaksi).

---

### 👥 2. Alur Pengguna

#### 2.1 Alur Warga (Pengaju)

```
1. Warga buka menu Payout
2. Klik "Ajukan Pencairan"
3. Isi form:
   - Nominal (jumlah yang diklaim)
   - Jenis (Bank / E-Wallet)
   - Nama Bank / Wallet (BCA, Mandiri, GoPay, dll)
   - No Rekening / No Wallet
   - Atas Nama
   - Keterangan (alasan klaim)
   - Lampiran (foto nota/bukti pengeluaran)
4. Submit → status "Menunggu Konfirmasi"
5. Tunggu approval pengurus
6. Jika disetujui → saldo KAS otomatis berkurang, transaksi tercatat
7. Jika ditolak → ada alasan penolakan dari pengurus
```

#### 2.2 Alur Pengurus (Approval)

```
1. Pengurus buka menu Payout → lihat daftar pengajuan
2. Klik salah satu pengajuan
3. Lihat detail: nominal, bukti, keterangan warga
4. Isi form approval:
   - Keterangan pengurus (opsional)
   - Upload bukti bayar (foto transfer/slip)
5. Pilih aksi:
   - ✅ Setujui & Bayar → otomatis kurangi saldo KAS + buat transaksi
   - ❌ Tolak → beri alasan penolakan
```

---

### 🗄 3. Model Data

#### 3.1 Collection `payout`

| Field | Type | Required | Keterangan |
|---|---|---|---|
| `id` | text (PK) | ✅ | Auto-generated |
| `warga` | relation → `warga` | ✅ | Pengaju klaim |
| `nominal` | number | ✅ | Jumlah yang diajukan (>= Rp 1.000) |
| `jenis` | select | ✅ | `"Bank"` / `"E-Wallet"` |
| `bank` | text | ✅ | Nama bank/wallet (BCA, Mandiri, GoPay, dll) |
| `no_rekening` | text | ✅ | Nomor rekening / wallet ID |
| `atas_nama` | text | ✅ | Nama pemilik rekening |
| `keterangan_warga` | text | ❌ | Alasan pengajuan dari warga |
| `lampiran_warga` | file | ❌ | Bukti/foto dari warga (jpg, png, pdf) |
| `keterangan_pengurus` | text | ❌ | Catatan dari pengurus saat approve/tolak |
| `lampiran_pengurus` | file | ❌ | Bukti transfer/pembayaran dari pengurus |
| `status` | select | ✅ | `"Menunggu Konfirmasi"`, `"Disetujui"`, `"Ditolak"`, `"Dibayar"` |
| `tanggal_diajukan` | autodate | ✅ | Waktu pengajuan (created) |
| `tanggal_disetujui` | date | ❌ | Waktu approval |
| `tanggal_dibayar` | date | ❌ | Waktu pembayaran |

**API Rules:**
- `listRule`: `@request.auth.id != '' && (warga.user = @request.auth.id || warga.pengurus = true)`
- `viewRule`: `@request.auth.id != '' && (warga.user = @request.auth.id || warga.pengurus = true)`
- `createRule`: `@request.auth.id != ''`
- `updateRule`: `@request.auth.id != '' && (warga.pengurus = true || (warga.user = @request.auth.id && status = 'Menunggu Konfirmasi'))`
- `deleteRule`: `@request.auth.id != '' && warga.user = @request.auth.id && status = 'Menunggu Konfirmasi'`

#### 3.2 Integrasi Wallet & Transaksi

Saat pengurus **setujui & bayar**:

| Action | Detail |
|---|---|
| **Wallet** | Kurangi saldo wallet bertipe `KAS` sebesar `nominal` |
| **Transaction** | Buat record baru dengan `type: "PENGELUARAN"`, `status: "SUCCESS"` |
| **Ledger** | Buat entry `CREDIT` dari KAS wallet (pengurangan balance) |
| **Aktivitas** | Catat aktivitas "Pencairan dana" di `aktivitas_warga` |

---

### 🧩 4. Rencana Implementasi

#### 4.1 File yang akan dibuat/dimodifikasi

| File | Tujuan |
|---|---|
| `PRD-PAYOUT.md` | Dokumen perencanaan (ini) |
| `pb_migrations/1783000000_create_payout_collection.js` | Migrasi collection payout |
| `pb_hooks/payout_notify.pb.js` | Hook: notifikasi & auto-update wallet saat approve |
| `api/payout.py` | Service API endpoint payout |
| `client/src/pages/Payout.jsx` | Halaman payout (warga + pengurus) |
| `client/src/App.jsx` | Tambah route `/payout` |

#### 4.2 Tahapan

| # | Tahap | Estimasi |
|---|---|---|
| 1 | Migrasi database (collection) | ✅ Selesai |
| 2 | Hook: auto-debit KAS wallet + transaksi | ⏳ |
| 3 | API service endpoints | ⏳ |
| 4 | Halaman frontend warga (ajukan klaim) | ⏳ |
| 5 | Halaman frontend pengurus (approval) | ⏳ |
| 6 | Integrasi notifikasi | ⏳ |
| 7 | Testing & bug fixing | ⏳ |

---

### 🔌 5. API Endpoints (Flask)

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `POST` | `/v1/payout/submit` | Warga | Ajukan klaim baru (multipart: data + file) |
| `GET` | `/v1/payout/list` | All | Daftar payout (filter by user/pengurus) |
| `GET` | `/v1/payout/:id` | All | Detail payout |
| `POST` | `/v1/payout/:id/approve` | Pengurus | Setujui & bayar (multipart: file bukti) |
| `POST` | `/v1/payout/:id/reject` | Pengurus | Tolak klaim |

---

### 📊 6. Status Flow

```
                   ┌──────────────┐
                   │   DRAFT      │
                   └──────┬───────┘
                          │ submit
                          ▼
             ┌────────────────────────┐
             │ Menunggu Konfirmasi    │
             └──────┬─────────┬───────┘
                    │         │
           approve  │         │  reject
                    ▼         ▼
             ┌──────────┐ ┌──────────┐
             │ Disetujui│ │ Ditolak  │
             └─────┬────┘ └──────────┘
                   │ bayar
                   ▼
             ┌──────────┐
             │ Dibayar  │
             └──────────┘
```

---

### 🔐 7. Aturan Keamanan

- Hanya **warga** yang bisa mengajukan klaim untuk dirinya sendiri
- Hanya **pengurus** yang bisa menyetujui/menolak/membayar
- Nominal minimal: Rp 1.000
- Tidak bisa edit setelah status bukan "Menunggu Konfirmasi"
- Hanya penolakan yang bisa disertai alasan wajib
- Setiap approve akan otomatis mengurangi saldo KAS
- Semua transaksi tercatat di ledger untuk audit

---

### 🔔 8. Notifikasi

| Event | Penerima | Channel |
|---|---|---|
| Pengajuan baru | Pengurus | In-app + WhatsApp |
| Payout disetujui | Warga pengaju | In-app + WhatsApp |
| Payout ditolak | Warga pengaju | In-app + WhatsApp |
| Payout dibayar | Warga pengaju | In-app + WhatsApp |