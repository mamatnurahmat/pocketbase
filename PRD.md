# Product Requirements Document (PRD)
## Aplikasi Warga — Perumahan Prestige 2 Sawangan

---

### 📌 1. Ringkasan Eksekutif

| Item | Deskripsi |
|---|---|
| **Nama Produk** | Aplikasi Warga Prestige 2 Sawangan |
| **Domain** | `prestige2.sawangan.web.id` |
| **Dokumentasi API** | `prestige2.sawangan.web.id/docs` |
| **Tipe** | Web Application (SPA + BaaS Monolith) |
| **Tech Stack** | PocketBase (backend), React 19 + Vite 8 (frontend), Caddy (reverse proxy) |
| **Target User** | Warga Perumahan Prestige 2, Pengurus RT/RW |
| **Versi PRD** | 1.0 — 21 Juni 2026 |

---

### 🎯 2. Tujuan & Visi Produk

Membangun aplikasi digital terpadu untuk manajemen warga di Perumahan Prestige 2, Sawangan yang mencakup:

- **Manajemen Data Warga** — pencatatan penghuni per nomor rumah
- **Pembayaran Iuran (IPL)** — tracking tagihan dan pembayaran bulanan
- **Pelaporan Warga** — sistem laporan/keluhan dari warga ke pengurus
- **Log Aktivitas** — audit trail semua aktivitas penting
- **Dashboard Pengurus** — panel khusus untuk approval dan manajemen

**Visi**: Menjadi satu-satunya platform digital yang digunakan seluruh warga Prestige 2 untuk urusan administrasi lingkungan.

---

### 👥 3. Persona Pengguna

| Persona | Deskripsi | Kebutuhan Utama |
|---|---|---|
| **Warga** | Penghuni perumahan yang terdaftar | Melihat tagihan, upload bukti bayar, membuat laporan |
| **Pengurus** | Warga yang ditunjuk sebagai pengurus RT/RW | Approve pembayaran, tanggapi laporan, kelola data warga |
| **Admin** | Super admin PocketBase | Akses penuh ke database, kelola collection, reset akun |

---

### 🏗 4. Arsitektur Sistem

```
┌──────────────────────────────────────────────┐
│              Browser (User)                   │
│    https://prestige2.sawangan.web.id          │
└──────────────┬───────────────┬────────────────┘
               │               │
               ▼               ▼
┌──────────────────┐  ┌──────────────────┐
│   Caddy (Proxy)  │  │  /docs           │
│   :80, :443      │  │  Swagger UI      │
└────────┬─────────┘  └──────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│           PocketBase :8090                    │
│  ┌────────────┐ ┌──────────┐ ┌────────────┐  │
│  │ /api/*     │ │ /_/      │ │ /* (SPA)   │  │
│  │ REST API   │ │ Admin UI │ │ pb_public/ │  │
│  └────────────┘ └──────────┘ └────────────┘  │
│         │                                     │
│    ┌────▼────┐                                │
│    │ SQLite  │  pb_data/data.db               │
│    └─────────┘                                │
└──────────────────────────────────────────────┘
```

---

### 📊 5. Model Data (Collections)

#### 5.1 `users` (Auth Collection — bawaan PocketBase)
| Field | Type | Keterangan |
|---|---|---|
| id | text (PK) | ID unik user (format: `usr{kode}000...`) |
| email | email | `{kode}@warga.local` |
| password | password | Default: sama dengan email |
| name | text | Nama lengkap warga |
| emailVisibility | bool | true |

#### 5.2 `warga` (Base Collection)
| Field | Type | Required | Keterangan |
|---|---|---|---|
| id | text (PK) | ✅ | ID unik (format: `{kode}000...`, e.g. `c09000000000000`) |
| no_rumah | text | ✅ | Nomor rumah (e.g. A01, C09) |
| no_wa | text | ❌ | Nomor WhatsApp |
| user | relation→users | ✅ | Link ke akun user (1:1, cascade delete) |
| status | relation→status | ❌ | Tipe status warga |
| pengurus | bool | ❌ | Flag pengurus (default: false) |
| agama | select | ❌ | islam/katolik/protestan/hindu/budha/konghucu |

**API Rules:**
- `listRule`: `@request.auth.id != ''` (harus login)
- `viewRule`: `@request.auth.id != ''`
- `createRule`: `@request.auth.id != ''`
- `updateRule`: `@request.auth.id = user` (hanya pemilik akun)
- `deleteRule`: `@request.auth.id = user`

**Total seed data**: 59 warga (blok A–G)

#### 5.3 `status` (Base Collection)
| Field | Type | Required | Keterangan |
|---|---|---|---|
| id | text (PK) | ✅ | ID unik |
| nama | text | ✅ | Nama status |
| jumlah_iuran | number | ✅ | Nominal iuran untuk status ini |

#### 5.4 `iuran` (Base Collection)
| Field | Type | Required | Keterangan |
|---|---|---|---|
| id | text (PK) | ✅ | Format: `iuranipl26bln{MM}` |
| kode | text | ✅ | Format: `IPL-{MM}-26` (e.g. IPL-01-26) |
| nominal | number | ✅ | 170000 (default IPL) |
| keterangan | text | ❌ | Deskripsi iuran |
| jatuh_tempo | date | ❌ | Tanggal jatuh tempo (tanggal 20 per bulan) |

**Seed data**: 12 bulan IPL tahun 2026 (Januari–Desember)

#### 5.5 `tagihan` (Base Collection)
| Field | Type | Required | Keterangan |
|---|---|---|---|
| id | text (PK) | ✅ | Panjang 1–30 char, format: `{no_rumah}{kode_iuran}` |
| iuran | relation→iuran | ✅ | Link ke iuran |
| warga | relation→warga | ✅ | Link ke warga |
| jatuh_tempo | date | ✅ | Tanggal jatuh tempo |
| nominal | number | ✅ | Nominal tagihan |
| status_pembayaran | select | ✅ | Belum Dibayar / Menunggu Konfirmasi / Lunas |
| lampiran | relation→lampiran | ❌ | Bukti pembayaran yang diupload |

#### 5.6 `lampiran` (Base Collection)
| Field | Type | Required | Keterangan |
|---|---|---|---|
| id | text (PK) | ✅ | ID unik |
| iuran | relation[]→iuran | ✅ | Multi-select iuran (max 999) |
| warga | relation→warga | ✅ | Warga yang upload |
| file_bukti | file | ✅ | Gambar/PDF (max 5MB, jpeg/png/webp/pdf) |
| approval | bool | ❌ | Status approval oleh pengurus |
| approved_by | relation→users | ❌ | User pengurus yang approve |

#### 5.7 `lapor` (Base Collection)
| Field | Type | Required | Keterangan |
|---|---|---|---|
| id | text (PK) | ✅ | ID unik (auto-generated) |
| warga | relation→warga | ✅ | Warga pelapor |
| keterangan | text | ✅ | Isi laporan |
| foto | file | ✅ | Gambar pendukung (jpeg/png/svg/gif/webp) |
| status | select | ✅ | Menunggu Konfirmasi / Diproses / Selesai / Ditolak |
| respons | text | ❌ | Tanggapan dari pengurus |
| created | autodate | auto | Timestamp pembuatan (onCreate) |
| updated | autodate | auto | Timestamp update (onCreate + onUpdate) |

**API Rules:**
- `updateRule`: `@request.auth.id != ''` (permission check dilakukan di frontend)

#### 5.8 `aktivitas_warga` (Base Collection)
| Field | Type | Required | Keterangan |
|---|---|---|---|
| id | text (PK) | ✅ | ID unik |
| warga | relation→warga | ✅ | Warga terkait (cascade delete) |
| aktivitas | text | ✅ | Nama/jenis aktivitas |
| detail | text | ❌ | Detail tambahan |

**API Rules:**
- `listRule`: `null` (public read)
- `viewRule`: `null`
- `createRule`: `@request.auth.id != ''`
- `updateRule`: `null`
- `deleteRule`: `null`

---

### 🔌 6. API Endpoints

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| POST | `/api/collections/users/auth-with-password` | ❌ | Login warga |
| POST | `/api/collections/users/auth-refresh` | ✅ | Refresh token |
| GET | `/api/collections/warga/records` | ✅ | List warga (filterable) |
| POST | `/api/collections/warga/records` | ✅ | Tambah warga |
| GET | `/api/collections/warga/records/{id}` | ✅ | Detail warga |
| PATCH | `/api/collections/warga/records/{id}` | ✅ | Update warga |
| DELETE | `/api/collections/warga/records/{id}` | ✅ | Hapus warga |
| GET | `/api/collections/iuran/records` | ✅ | List iuran |
| GET | `/api/collections/tagihan/records` | ✅ | List tagihan (filter by warga) |
| POST | `/api/collections/tagihan/records` | ✅ | Buat tagihan |
| PATCH | `/api/collections/tagihan/records/{id}` | ✅ | Update tagihan |
| GET | `/api/collections/lampiran/records` | ✅ | List lampiran |
| POST | `/api/collections/lampiran/records` | ✅ | Upload bukti bayar |
| PATCH | `/api/collections/lampiran/records/{id}` | ✅ | Approve/reject bukti |
| GET | `/api/collections/lapor/records` | ✅ | List laporan |
| POST | `/api/collections/lapor/records` | ✅ | Buat laporan |
| PATCH | `/api/collections/lapor/records/{id}` | ✅ | Update status & respons |
| GET | `/api/collections/aktivitas_warga/records` | ❌ | Lihat log aktivitas |
| GET | `/api/files/{collection}/{recordId}/{filename}` | ✅ | Download file |
| WS | `/api/realtime` | ✅ | Subscribe realtime |

---

### 🖥 7. Fitur Aplikasi

#### 7.1 Fase 1 — MVP (Sudah Berjalan)
- [x] Login/logout warga dengan email & password
- [x] Dashboard warga (lihat profil, tagihan, status)
- [x] Upload bukti pembayaran IPL
- [x] Tracking status pembayaran (Belum Dibayar → Menunggu Konfirmasi → Lunas)
- [x] Laporan warga ke pengurus (dengan foto)
- [x] Panel pengurus: lihat & tanggapi laporan, approve pembayaran
- [x] Bottom sheet modal untuk edit status laporan
- [x] Toast notifications
- [x] Statistik laporan (Total / Selesai / Diproses)
- [x] Log aktivitas warga

#### 7.2 Fase 2 — Mendatang
- [ ] Notifikasi WhatsApp/Telegram untuk tagihan baru & jatuh tempo
- [ ] Dashboard pengurus dengan grafik pembayaran bulanan
- [ ] Export data ke Excel/PDF
- [ ] Multi-role (ketua RT, bendahara, seksi keamanan, dll.)
- [ ] Reminder otomatis H-7 jatuh tempo
- [ ] Integrasi payment gateway (QRIS, VA)
- [ ] Forum/diskusi warga
- [ ] Jadwal ronda & kegiatan lingkungan
- [ ] PWA (Progressive Web App) untuk install di HP

---

### 🔐 8. Keamanan

| Aspek | Implementasi |
|---|---|
| **Autentikasi** | JWT token via PocketBase auth |
| **Otorisasi** | API Rules di collection level |
| **Enkripsi** | PB_ENCRYPTION_KEY untuk field-level encryption |
| **HTTPS** | Caddy reverse proxy dengan auto TLS |
| **File Upload** | Validasi MIME type & max size (5MB) |
| **CORS** | Tidak diperlukan (single origin pattern) |
| **Rate Limiting** | Bisa ditambahkan di Caddy |

---

### 📦 9. Deployment

| Komponen | Teknologi | Port |
|---|---|---|
| Reverse Proxy | Caddy v2 | 80, 443 |
| Backend | PocketBase (ghcr.io/muchobien/pocketbase) | 8090 (internal) |
| Frontend | React 19 + Vite 8 → static build | di-serve oleh PocketBase |
| API Docs | Swagger UI | /docs (via Caddy) |
| Database | SQLite | `/var/data/pocketbase/pb_data/` |

**Server**: VPS/KVM dengan Docker & Docker Compose  
**CI/CD**: Manual deploy via `docker compose up -d`

---

### 📈 10. Metrik Sukses

| Metrik | Target |
|---|---|
| Adopsi warga | 80% dari 59 rumah terdaftar & login |
| Pembayaran tepat waktu | 70% lunas sebelum tanggal 20 |
| Waktu respons laporan | ≤ 3 hari kerja |
| Uptime | 99% (jam kerja saja karena komunitas) |

---

### 📝 11. Changelog

| Tanggal | Versi | Deskripsi |
|---|---|---|
| 21 Jun 2026 | 1.0 | PRD awal; 8 collections, 59 warga seed, swagger docs, Caddy HTTPS |

---

> ✨ Dokumen ini adalah panduan hidup produk. Update sesuai perkembangan fitur.