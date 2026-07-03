# Plan — Fix Toggle Mode Pengurus

## Masalah
Toggle "Mode Pengurus" saat ini berupa card besar di dalam halaman Tagihan & Lampiran yang memakan tempat dan mengganggu UX.

## Solusi
Pindahkan toggle ke **pojok kiri atas** sebagai icon/chip kecil yang minimalis.

## Perubahan

| File | Perubahan |
|---|---|
| `client/src/pages/Tagihan.jsx` | Hapus card toggle, ganti dengan icon di pojok kiri atas header |
| `client/src/pages/Lampiran.jsx` | Sama — icon chip di pojok kiri atas |
| `client/src/components/PengurusMode.jsx` | **(Baru)** Component toggle reusable |

## Desain
```
┌─────────────────────────────┐
| 👤 Mode Warga  [⬤-------]  |  ← chip kecil di pojok kiri atas
|                             |     Kuning = mode pengurus ON
| [konten halaman]            |     Abu = mode warga
|                             |
└─────────────────────────────┘
```

Chip akan menampilkan:
- **"👤 Mode Warga"** (abu-abu) → klik untuk toggle ON
- **"⭐ Mode Pengurus"** (hijau/kuning) → klik untuk toggle OFF