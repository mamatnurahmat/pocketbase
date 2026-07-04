# Plan — Fix Upload Bukti Bayar

## Masalah

1. **Multi iuran tidak bisa dipilih** — Saat upload bukti bayar, user hanya bisa pilih 1 iuran, padahal bisa bayar beberapa iuran sekaligus dalam 1 bukti transfer
2. **Tagihan yang sudah dibayar masih muncul** — Iuran yang sudah Lunas/Menunggu Konfirmasi masih ditampilkan di daftar iuran yang bisa dipilih
3. **UX kurang intuitif** — Halaman upload bukti bayar (Iuran.jsx) perlu diperbaiki

## Solusi

### Perbaikan di halaman Iuran.jsx:

| Perbaikan | Detail |
|---|---|
| ✅ **Multi-select iuran** | Ganti dari single select jadi checkbox list untuk pilih beberapa iuran sekaligus |
| ✅ **Filter iuran yang sudah dibayar** | Sembunyikan iuran yang sudah punya tagihan Lunas / Menunggu Konfirmasi |
| ✅ **Info status per iuran** | Tampilkan status (Belum Dibayar / Lunas / Menunggu) di sebelah setiap iuran |
| ✅ **UI lebih jelas** | Card per iuran dengan checkbox + info nominal + jatuh tempo |

### Alur baru:

```
1. Buka halaman Upload Bukti
2. Lihat daftar iuran yang BELUM dibayar saja
3. Centang 1 atau lebih iuran yang ingin dibayar
4. Upload file bukti transfer (1 file untuk semua iuran yang dicentang)
5. Submit → semua iuran yang dicentang dibuat tagihan + status Menunggu Konfirmasi
```

## File yang Diubah

| File | Perubahan |
|---|---|
| `client/src/pages/Iuran.jsx` | Redesign form upload dengan multi-select checkbox |
| `client/src/pages/Tagihan.jsx` | (Opsional) Perbaiki filter jika ada |

## Desain UI

```
┌──────────────────────────────────────┐
│  Upload Bukti Pembayaran              │
│                                       │
│  Pilih Iuran yang Dibayar:            │
│                                       │
│  ☑ IPL-01-26 — Rp 170.000            │ ← Checkbox + info
│     Jatuh tempo: 20 Jan 2026          │
│                                       │
│  ☐ IPL-02-26 — Rp 170.000            │
│     Jatuh tempo: 20 Feb 2026          │
│                                       │
│  ☑ IPL-03-26 — Rp 170.000            │
│     Jatuh tempo: 20 Mar 2026          │
│                                       │
│  ─────────────────────────────        │
│  Total dipilih: Rp 340.000            │ ← Summary
│                                       │
│  Upload Bukti: [Pilih File]           │
│  📎 bukti_transfer.jpg                │
│                                       │
│  [Kirim Pembayaran]                   │
└──────────────────────────────────────┘
```