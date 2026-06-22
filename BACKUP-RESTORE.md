# Backup & Restore - PocketBase RT Management

Panduan backup dan restore database PocketBase. Ada **2 metode**:

| Metode | Cakupan | Kelebihan |
|--------|---------|-----------|
| **db.sh** | Seluruh database (volume penuh) | Cepat, satu file, cocok untuk disaster recovery |
| **backup_collections.sh** | Per-koleksi via REST API | Aman tanpa stop service, JSON human-readable |

---

## 📁 Struktur Data

```
/var/data/pocketbase/
├── pb_data/          # Data utama PocketBase (volume docker)
│   ├── data.db       # Database SQLite
│   ├── auxiliary.db  # Database tambahan
│   └── storage/      # File uploads
├── backup/           # Hasil backup
│   ├── file-YYYY-MM-DD.tar.gz          # dari db.sh
│   └── YYYY-MM-DD/                     # dari backup_collections.sh
│       ├── _backup_meta.json
│       ├── warga.json
│       ├── iuran.json
│       └── ...
├── pb_public/        # File publik
└── pb_migrations/    # File migrasi
```

---

## 1. `db.sh` — Backup & Restore Volume Penuh

Backup seluruh folder `/var/data/pocketbase/pb_data/` jadi file `.tar.gz`.
Cocok untuk disaster recovery, migrasi server, atau rollback besar.

### Backup

```bash
# Default: simpan ke /var/data/pocketbase/backup/file-YYYY-MM-DD.tar.gz
./db.sh backup

# Nama file custom (otomatis disimpan di backup/)
./db.sh backup before-upgrade.tar.gz

# Lokasi custom (absolute path)
./db.sh backup /tmp/backup-kondarurat.tar.gz
```

**Proses:** `tar -czvf` mengompres seluruh `pb_data/` — service **tidak** perlu dimatikan.

### Restore

```bash
# Default: restore dari /var/data/pocketbase/backup/file-YYYY-MM-DD.tar.gz
./db.sh restore

# Nama file di folder backup/
./db.sh restore before-upgrade.tar.gz

# Path custom
./db.sh restore /tmp/backup-kondarurat.tar.gz
```

**Proses restore:**
1. Stop PocketBase (`docker compose stop pocketbase`)
2. Rename `pb_data` → `pb_data_old_<timestamp>` (safety copy)
3. Ekstrak backup menggantikan `pb_data`
4. Start PocketBase
5. Jika gagal ekstrak → rollback otomatis ke data lama

> ⚠️ **Restore menyebabkan downtime singkat.** Service dimatikan selama ekstraksi (biasanya < 1 menit).

---

## 2. `backup_collections.sh` — Backup Per Koleksi via API

Ambil setiap koleksi sebagai file JSON via PocketBase REST API.
**Tidak perlu stop service**, aman untuk backup rutin (cron harian).

### Backup

```bash
# Default credentials: admin@example.com / password1234
./backup_collections.sh

# Custom credentials
./backup_collections.sh admin-email@domain.com password-anda
```

Hasil disimpan di `/var/data/pocketbase/backup/YYYY-MM-DD/`:

```
/var/data/pocketbase/backup/2026-06-22/
├── _backup_meta.json    # Metadata backup (tanggal, jumlah, status)
├── warga.json           # Data koleksi warga
├── iuran.json           # Data koleksi iuran
├── tagihan.json         # Data koleksi tagihan
├── lampiran.json        # Data koleksi lampiran
├── lapor.json           # Data koleksi lapor
├── status.json          # Data koleksi status
└── aktivitas_warga.json # Data koleksi aktivitas
```

**Format per file koleksi:**
```json
{
  "collection": "warga",
  "totalItems": 150,
  "items": [
    { "id": "...", "nama": "...", ... },
    ...
  ]
}
```

### Restore Koleksi dari JSON

Tidak ada script otomatis — restore dilakukan per koleksi via API:

```bash
# 1. Baca data dari file JSON
# 2. Import record satu per satu menggunakan curl

jq -c '.items[]' /var/data/pocketbase/backup/2026-06-22/warga.json | while read record; do
  curl -X POST "http://localhost:8090/api/collections/warga/records" \
    -H "Content-Type: application/json" \
    -d "$record"
done
```

> ⚠️ Restore via API **tidak mengembalikan ID asli** — PocketBase generate ID baru.
> Jika butuh ID yang sama, gunakan metode `db.sh`.

---

## 3. Backup Otomatis dengan Cron

### Backup volume harian (3:00 AM)

```bash
# Edit crontab
crontab -e

# Tambahkan:
0 3 * * * cd /home/nurahmat/pocketbase && ./db.sh backup
```

### Backup koleksi harian (2:00 AM)

```bash
0 2 * * * cd /home/nurahmat/pocketbase && ./backup_collections.sh admin@example.com password1234
```

---

## 4. Kapan Pakai Metode yang Mana?

| Skenario | Metode |
|----------|--------|
| Backup rutin harian tanpa downtime | `backup_collections.sh` |
| Migrasi server / pindah VPS | `db.sh backup` + `db.sh restore` |
| Rollback setelah gagal upgrade | `db.sh restore` |
| Inspeksi data tertentu (cek satu koleksi) | `backup_collections.sh` |
| Recovery lengkap dengan ID asli | `db.sh` |

---

## 5. Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `File backup tidak ditemukan` saat restore | Cek path, gunakan default: `./db.sh restore` |
| `Gagal login` di backup_collections.sh | Pastikan email/password admin benar |
| Extraksi gagal saat restore | Data lama otomatis dikembalikan dari `pb_data_old_*` |
| File backup terlalu besar | Gunakan `backup_collections.sh` untuk backup inkremental |
| Token expired saat backup collections | Script menggunakan auth per-sesi, tidak ada refresh token |