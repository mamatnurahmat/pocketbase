# Task: API Iuran Tersedia + Pilih Semua di Modal

## Perubahan yang Dilakukan

### 1. `api/app.py` — Endpoint Baru
- **GET /v1/iuran/available?warga_id=xxx**:
  - Mengembalikan daftar iuran yg belum punya tagihan utk warga tertentu
  - Filter otomatis iuran yg sdh ada tagihan (status apa pun)
  - Auth: Bearer token
  - Response: `{ success, items[], total, message }`
- Model `IuranAvailableResponse` + `IuranItem` ditambahkan ke Swagger

### 2. `client/src/pages/Iuran.jsx` — Pilih Semua
- Tombol **"☐ Pilih Semua"** di modal pilih iuran → centang semua item
- Tombol **"✕ Hapus Semua"** muncul jika sebagian terpilih

### 3. Build
- Docker rebuild `pocketbase-api` container

# Task: Tambah Opsi Report PDF dengan Margin Tabel yang Rapih

## Perubahan yang Dilakukan

### 1. `template/index.html` — Prototype dc-runtime
- **Halaman Kas RT**: Tambah tombol "Cetak Laporan PDF" untuk ekspor mutasi kas ke PDF
- **Halaman Iuran**: Tambah tombol "PDF" di samping tombol "Riwayat" untuk ekspor riwayat pembayaran
- Method `cetakLaporanPDF()` menggunakan jsPDF + autoTable dari CDN

### 2. `client/src/pages/Tagihan.jsx` — Aplikasi Produksi React
- **Halaman Tagihan**: Tambah tombol "PDF" hitam di samping tombol "CSV" yang sudah ada
- Fungsi `handleExportPDF()`:
  - Memuat jsPDF + autoTable secara dinamis dari CDN
  - Menghasilkan PDF A4 portrait dengan:
    - Header gelap bertuliskan "WARGA P2S — RW 04"
    - Judul laporan dan tanggal cetak
    - Info filter aktif (status, bulan)
    - Tabel dengan margin/padding rapih (top/bottom: 4-5px, left/right: 6px)
    - Header hijau, baris genap bergantian
    - Nomor halaman di setiap halaman
    - Footer total nominal + jumlah tagihan
  - Mendukung mode warga (data sendiri) dan mode pengurus (semua warga)
  - File otomatis terdownload dengan nama `tagihan-YYYY-MM-DD.pdf`

### 3. Build
- Build Vite sukses ke `pb_public/`
- Container PocketBase di-restart

### Catatan
- Library jsPDF dan autoTable dimuat dari CDN saat tombol diklik (tidak dibundel)
- Diperlukan koneksi internet saat pertama kali generate PDF