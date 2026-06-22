# Task Log — Aplikasi Warga Prestige 2 Sawangan

---

## 2026-06-22 — Update: OpenAPI Docs, Profil, Tagihan, Iuran & Deploy Config

### 📄 Ringkasan
Peningkatan dokumentasi API secara menyeluruh, perbaikan tampilan data profil warga, enhancement preview bukti pembayaran, refactor logika pembayaran iuran, dan penyederhanaan konfigurasi deployment.

---

### ✅ Perubahan

#### 1. **PRD.md** (File Baru)
- Membuat Product Requirements Document lengkap untuk seluruh aplikasi
- Mencakup: ringkasan eksekutif, visi produk, persona pengguna, arsitektur sistem, 8 model data, API endpoints, fitur MVP & mendatang, keamanan, deployment, metrik sukses, dan changelog

#### 2. **swagger/openapi.yaml** — Rewrite Dokumentasi API
- Dari 98 baris → 623 baris
- Menambahkan semua collection: Authentication, Warga, Status, Iuran, Tagihan, Lampiran, Lapor, Aktivitas, Files, Health Check
- Menambahkan schema definitions lengkap (LoginRequest, LoginResponse, WargaRecord, TagihanRecord, LaporRecord, dll)
- Menambahkan dokumentasi parameter (filter, sort, expand, page, perPage)
- Menambahkan contoh request/response
- Menambahkan tag grouping
- Menambahkan deskripsi server production & local

#### 3. **client/src/pages/Profil.jsx** — Fix Tampilan Profil
- Baris info rumah: menampilkan `no_wa` setelah `no_rumah` jika tersedia, format: `No. Rumah C09 · HP: 0812xxxx`
- Field "Nomor HP": menggunakan `warga.no_wa` sebagai sumber utama, fallback ke `phone` atau `-`

#### 4. **client/src/pages/Dashboard.jsx** — Fix Tampilan HP
- Menampilkan `warga.no_wa` sebagai nomor HP utama
- Fallback ke parsing `user.username` (untuk data lama) atau `-`

#### 5. **client/src/pages/Iuran.jsx** — Refactor Logika Pembayaran
- Mengubah format pengiriman `iuran` dari JSON string menjadi multiple `formData.append('iuran', id)` (kompatibel dengan multi-select relation PocketBase)
- Menambahkan logika *upsert* tagihan: mencari tagihan yang sudah ada (`warga + iuran`), jika ditemukan di-update, jika tidak dibuat baru
- Format ID tagihan baru: `{no_rumah}{kode_iuran}` (contoh: `c09iuranipl26bln06`)
- Tagihan yang diupdate menerima `lampiran` ID + status `Menunggu Konfirmasi`

#### 6. **client/src/pages/Tagihan.jsx** — Enhancement Preview Bukti
- Mendukung **multiple lampiran** per tagihan (sebelumnya hanya satu)
- Menampilkan tombol berbeda berdasarkan tipe file: 📷 untuk gambar, 📄 untuk PDF, 🔗 untuk file lainnya
- Nomor indeks ditampilkan jika lebih dari 1 lampiran
- Modal preview baru:
  - Gambar: ditampilkan dengan `<img>` (mendukung klik untuk menutup)
  - PDF: ditampilkan dengan `<iframe>` (full height, white background)
  - File lain: ditampilkan dengan `<iframe>` sebagai fallback
- Tombol close (✕) reposition ke kanan atas dengan style rounded button
- State diganti dari `previewImage` menjadi `previewFile` (objek dengan `url`, `name`, `isImage`, `isPdf`)

#### 7. **docker-compose.yml** — Perbaikan Konfigurasi
- Menghapus `version: "3.7"` (deprecated di Docker Compose v2)
- Mengubah volume mapping dari absolute path (`/var/data/pocketbase/...`) ke relative path (`./...`) agar portable
- Volume swagger: menambahkan `:ro` (read-only)
- Menambahkan `swagger-ui` sebagai dependency `caddy`

#### 8. **Caddyfile** — Minor
- Menambahkan komentar dokumentasi untuk reverse proxy rule

---

### 🔗 Related Commits
| Commit | Deskripsi |
|---|---|
| `8194d9c` | feat(profil): tambah field email & simpan no_wa ke warga, fix validasi update |
| `deb7e64` | fix(laporan-warga): perbaiki UI edit status & tambah created/updated field |
