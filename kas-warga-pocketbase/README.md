# Kas Warga — PocketBase Schema

Database e-wallet internal kas warga dengan double-entry ledger untuk tracing transaksi masuk dan keluar.

---

## Struktur File

```
kas-warga-pocketbase/
├── schema/
│   ├── categories.json      # Kategori transaksi
│   ├── wallets.json         # Dompet tiap warga
│   ├── transactions.json    # Catatan transaksi
│   └── ledgers.json         # Double-entry audit trail
├── seed/
│   ├── seed.json            # Data seeding (warga + kas + kategori)
│   └── seed.sh              # Script otomatis import & seed via API
├── erd.html                 # Diagram ERD (buka di browser)
└── README.md
```

---

## Collections

### `users` (built-in PocketBase)
Tidak perlu dibuat. Gunakan collection auth bawaan PocketBase. Setiap warga = 1 user.

### `categories`
Kategori transaksi. Dibuat oleh admin.

| Field | Type | Keterangan |
|---|---|---|
| name | text | Nama kategori (unique) |
| type | select | INCOME / EXPENSE / TRANSFER |
| icon | text | Emoji atau kode icon |
| is_active | bool | Aktif/nonaktif |

Contoh data awal:
- Iuran Bulanan (INCOME)
- Iuran Kebersihan (INCOME)
- Pengeluaran Operasional (EXPENSE)
- Bantuan Sosial (EXPENSE)

### `wallets`
Satu wallet per warga. Wallet kas = wallet dengan `wallet_type` = `KAS`.

| Field | Type | Keterangan |
|---|---|---|
| user | relation → users | Pemilik wallet (UNIQUE) |
| wallet_type | select | PERSONAL / KAS |
| balance | number | Saldo saat ini (Rp) |
| is_active | bool | Status aktif |
| note | text | Keterangan tambahan |

- `PERSONAL`: wallet milik tiap warga, bisa diisi (TOPUP) dan dipakai iuran
- `KAS`: wallet penampung kas pusat, hanya 1 per instance, dibuat oleh admin

### `transactions`
Setiap perpindahan uang dicatat di sini.

| Field | Type | Keterangan |
|---|---|---|
| reference_no | text | ID unik human-readable, contoh: TRX-20260625-001 |
| type | select | Lihat tipe di bawah |
| status | select | PENDING → SUCCESS/FAILED, SUCCESS → REVERSED |
| from_wallet | relation → wallets | Sumber dana (null jika topup dari luar) |
| to_wallet | relation → wallets | Tujuan dana (null jika pengeluaran ke luar) |
| amount | number | Nominal transaksi |
| fee | number | Biaya admin (default 0) |
| net_amount | number | amount - fee |
| category | relation → categories | Kategori transaksi |
| note | text | Keterangan/keperluan |
| created_by | relation → users | Siapa yang membuat transaksi |
| parent_transaction | relation → transactions | Referensi transaksi asal (untuk REVERSAL) |

**Tipe Transaksi:**
- `TOPUP` — Isi saldo wallet warga
- `IURAN` — Warga bayar iuran ke kas
- `TRANSFER` — Transfer antar wallet
- `PENGELUARAN` — Kas keluar untuk keperluan
- `WITHDRAWAL` — Tarik saldo dari wallet
- `REVERSAL` — Pembatalan/koreksi transaksi

**Status Transaksi:**
```
PENDING → SUCCESS
        → FAILED
SUCCESS → REVERSED
```

### `ledgers`
Audit trail double-entry. **Tidak boleh diedit atau dihapus.**

| Field | Type | Keterangan |
|---|---|---|
| wallet | relation → wallets | Wallet yang terpengaruh |
| transaction | relation → transactions | Transaksi yang terkait |
| entry_type | select | DEBIT / CREDIT |
| amount | number | Nominal |
| balance_before | number | Saldo sebelum transaksi |
| balance_after | number | Saldo setelah transaksi |

Aturan: Setiap transaksi menghasilkan **minimal 2 ledger entry** (double-entry).

---

## Cara Import ke PocketBase

### Metode 1: Via Admin UI
1. Buka PocketBase Admin → **Settings → Import collections**
2. Upload file JSON satu per satu dengan urutan:
   ```
   categories → wallets → transactions → ledgers
   ```
   (urutan penting karena relasi antar collection)

   **PENTING:** Setelah import, buat wallet KAS via Admin UI:
   1. Buka collection `wallets` → New Record
   2. Pilih user bendahara/admin sebagai `user`
   3. Set `wallet_type` = `KAS`
   4. `balance` = 0, `is_active` = true

### Metode 2: Via API
```bash
# Ganti YOUR_ADMIN_TOKEN dengan token admin PocketBase kamu
curl -X POST http://localhost:8090/api/collections/import \
  -H "Authorization: YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d @schema/categories.json
```

---

## Flow Transaksi

### Iuran Warga ke Kas
```
1. Buat transactions:
   - type: IURAN
   - from_wallet: wallet_warga_id
   - to_wallet: wallet_kas_id
   - status: PENDING

2. Buat ledger DEBIT (wallet warga):
   - entry_type: DEBIT
   - balance_before: 500.000
   - balance_after:  400.000  (−100.000)

3. Buat ledger CREDIT (wallet kas):
   - entry_type: CREDIT
   - balance_before: 2.000.000
   - balance_after:  2.100.000 (+100.000)

4. Update wallets.balance untuk keduanya
5. Update transactions.status → SUCCESS
```

### Pengeluaran Kas
```
1. Buat transactions:
   - type: PENGELUARAN
   - from_wallet: wallet_kas_id
   - to_wallet: null
   - category: pengeluaran_operasional_id

2. Buat ledger DEBIT (wallet kas):
   - entry_type: DEBIT

3. Update wallets.balance kas
4. Update transactions.status → SUCCESS
```

### Audit & Rekonsiliasi
```
Cek balance wallet X:
  SUM(amount WHERE wallet=X AND entry_type=CREDIT)
- SUM(amount WHERE wallet=X AND entry_type=DEBIT)
= Harus sama dengan wallets.balance

Jika tidak sama → ada anomali transaksi
```

---

## Query Berguna (PocketBase Filter)

```
# Semua transaksi masuk ke kas
transactions?filter=(to_wallet="KAS_WALLET_ID" && status="SUCCESS")

# Riwayat transaksi warga tertentu
transactions?filter=(from_wallet="WALLET_ID" || to_wallet="WALLET_ID")&sort=-created

# Ledger wallet warga (mutasi rekening)
ledgers?filter=(wallet="WALLET_ID")&sort=-created&expand=transaction

# Transaksi bulan ini
transactions?filter=(created>="2026-06-01" && status="SUCCESS")&sort=-created
```

---

## Catatan Keamanan

- Rule `updateRule: null` pada `ledgers` mencegah edit apapun setelah dibuat
- Rule `deleteRule: null` mencegah penghapusan ledger dan transaksi
- Koreksi hanya boleh via transaksi REVERSAL baru
- Hanya admin (collectionName = 'users' auth) yang bisa update status transaksi
