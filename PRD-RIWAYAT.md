# Product Requirements Document — Fitur Riwayat Transaksi
## Aplikasi Warga — Perumahan Prestige 2 Sawangan

---

### 📌 1. Ringkasan

| Item | Deskripsi |
|---|---|
| **Nama Fitur** | Riwayat Transaksi per Wallet |
| **Branch** | `fitur/riwayat` |
| **Tipe** | Halaman riwayat + navigasi dari wallet |
| **Status** | ✨ Direncanakan |

**Tujuan**: Menampilkan riwayat transaksi secara informatif untuk setiap wallet (KAS maupun PERSONAL per warga), dengan navigasi yang mudah dari tampilan wallet di halaman lain (Dashboard/Profil).

---

### 👥 2. Alur Pengguna

#### 2.1 Dari Dashboard
```
Dashboard
  │
  ├─ 💰 Saldo KAS (Rp xxx.xxx)
  │    └─ Klik → Riwayat Transaksi KAS
  │
  └─ 👤 Saldo Pribadi (Rp xxx.xxx)
       └─ Klik → Riwayat Transaksi Pribadi
```

#### 2.2 Dari Halaman Riwayat
```
Halaman Riwayat
  │
  ├─ Header: Nama Wallet + Saldo Saat Ini
  ├─ Filter: 7 Hari / 30 Hari / 3 Bulan / Semua
  ├─ Filter: Masuk / Keluar / Semua
  │
  └─ Daftar Transaksi (sorted descending)
       ├─ 🟢 TOPUP (Masuk)
       ├─ 🔵 IURAN (Masuk)
       ├─ 🔴 PENGELUARAN (Keluar)
       ├─ 🟡 WITHDRAWAL (Keluar)
       └─ ⚪ REVERSAL / TRANSFER
```

---

### 🗄 3. Model Data (Existing — Tidak Ada Migrasi Baru)

| Collection | Field | Keterangan |
|---|---|---|
| **wallets** | id, user, wallet_type, balance | Data wallet (KAS/PERSONAL) |
| **transactions** | id, reference_no, type, status, from_wallet, to_wallet, amount, fee, net_amount, note, created_by | Semua transaksi |
| **ledgers** | id, wallet, transaction, entry_type, amount, balance_before, balance_after | Jurnal/ledger entries |

#### 3.1 Relasi Data
```
Wallet (KAS/PERSONAL)
  └── has many → Ledgers (via wallet.id = ledgers.wallet)
       └── has one → Transaction (via ledgers.transaction = transactions.id)
```

---

### 🖥 4. Halaman Riwayat (Riwayat.jsx)

#### 4.1 Layout

```
┌──────────────────────────────────┐
│ ← Riwayat Transaksi              │  ← Back button
│                                  │
│ ┌──────────────────────────────┐ │
│ │ 💰 Saldo KAS / Pribadi       │ │  ← Wallet info card
│ │ Rp xxx.xxx                   │ │
│ │ 💳 {wallet_type}             │ │
│ └──────────────────────────────┘ │
│                                  │
│ [7 Hari] [30 Hari] [3 Bulan] [Semua]  ← Filter waktu
│ [Semua] [Masuk] [Keluar]        │  ← Filter tipe
│                                  │
│ ┌──────────────────────────────┐ │
│ │ 🟢 TOPUP                     │ │
│ │ Auto topup dari tagihan      │ │
│ │ Rp 170.000                   │ │
│ │ 26 Jun 2026 · 14:30          │ │
│ ├──────────────────────────────┤ │
│ │ 🔴 PENGELUARAN               │ │
│ │ Gaji security bulan Juni     │ │
│ │ Rp 150.000                   │ │
│ │ 02 Jul 2026 · 10:00          │ │
│ ├──────────────────────────────┤ │
│ │ ...                          │ │
│ └──────────────────────────────┘ │
│                                  │
│ [Muat lebih banyak...]           │  ← Pagination
└──────────────────────────────────┘
```

#### 4.2 Detail Transaksi (Expandable)

Saat item transaksi diklik, muncul detail tambahan:

```json
No. Referensi: TRX-20260626-B743
Tipe: TOPUP
Status: SUCCESS
Jumlah: Rp 170.000
Biaya: Rp 0
Jumlah Bersih: Rp 170.000
Dari: - (external)
Ke: KAS Wallet
Catatan: Auto topup dari tagihan #xxx
Dibuat: 26 Jun 2026 · 14:30
```

---

### 🔄 5. Status Transaksi & Icon

| Tipe Transaksi | Icon | Warna | Masuk/Keluar |
|---|---|---|---|
| `TOPUP` | 📥 | 🟢 Hijau | Masuk |
| `IURAN` | 📥 | 🟢 Hijau | Masuk |
| `TRANSFER` | 🔄 | 🔵 Biru | Masuk/Keluar |
| `PENGELUARAN` | 📤 | 🔴 Merah | Keluar |
| `WITHDRAWAL` | 📤 | 🟡 Kuning | Keluar |
| `REVERSAL` | ↩️ | ⚪ Abu | - |

---

### 🧩 6. Rencana Implementasi

#### 6.1 File yang akan dibuat/dimodifikasi

| File | Tujuan |
|---|---|
| `PRD-RIWAYAT.md` | Dokumen perencanaan (ini) |
| `client/src/pages/Riwayat.jsx` | Halaman riwayat transaksi |
| `client/src/App.jsx` | Tambah route `/riwayat/:walletId` |
| `client/src/components/BottomNav.jsx` | Tambah menu Riwayat (opsional) |
| `client/src/pages/Dashboard.jsx` | Tambah navigasi klik wallet → riwayat |
| `client/src/pages/Profil.jsx` | Tambah navigasi klik wallet → riwayat |

#### 6.2 Tahapan

| # | Tahap | Estimasi |
|---|---|---|
| 1 | Buat halaman Riwayat.jsx (list + filter + expand detail) | ✅ |
| 2 | Route `/riwayat/:walletId` di App.jsx | ✅ |
| 3 | Navigasi dari Dashboard (klik wallet card) | ✅ |
| 4 | Navigasi dari Profil (klik wallet pribadi) | ✅ |
| 5 | Testing & perbaikan | ⏳ |

---

### 🔌 7. API Endpoints (Opsional — bisa langsung dari PocketBase SDK)

| Method | Endpoint | Fungsi |
|---|---|---|
| `GET` | PocketBase: `transactions?expand=from_wallet,to_wallet` | List transaksi (filter by wallet) |
| `GET` | PocketBase: `ledgers?filter=wallet="{id}"&expand=transaction` | List ledger entries per wallet |

Karena data sudah ada di PocketBase, kita bisa langsung pakai SDK tanpa perlu endpoint Flask tambahan.

---

### 📊 8. Query Data

#### Untuk menampilkan riwayat per wallet:

```
// Method 1: Via ledgers (lebih akurat untuk balance)
Ledgers → filter by wallet.id → expand transaction
  → Tampilkan: entry_type (DEBIT/CREDIT), amount, balance_before, balance_after
  → transaction.reference_no, transaction.type, transaction.note

// Method 2: Via transactions (lebih lengkap)
Transactions → filter by from_wallet=id OR to_wallet=id
  → Tampilkan: reference_no, type, amount, status, note, created
```

**Rekomendasi:** Gunakan **ledgers** sebagai sumber utama karena:
- Terkait langsung dengan wallet tertentu
- Ada informasi balance_before dan balance_after
- entry_type (DEBIT = pengurangan, CREDIT = penambahan)

**Filter waktu:**
- 7 Hari: `created >= "2026-06-25 00:00:00"`
- 30 Hari: `created >= "2026-06-02 00:00:00"`
- 3 Bulan: `created >= "2026-04-02 00:00:00"`
- Semua: tanpa filter

---

### 🔔 9. Catatan

- Halaman bisa diakses via URL langsung: `/riwayat/{walletId}`
- Jika walletId tidak valid, tampilkan error/message
- Untuk warga biasa: hanya bisa lihat wallet pribadi dan KAS (info publik)
- Untuk pengurus: bisa lihat semua wallet
- Gunakan infinite scroll atau tombol "Muat lebih banyak" untuk pagination
- Tampilkan saldo saat ini di header
- Format nominal dengan rupiah (`Rp 1.000.000`)
