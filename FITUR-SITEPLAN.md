# Fitur Siteplan 3D — `/map`

Peta siteplan interaktif Prestige 2 Sawangan (62 kavling, Blok A–G) yang
terintegrasi dengan data warga di PocketBase.

- **Route:** `/map` (immersive — sidebar/bottom-nav disembunyikan)
- **Aset:** `static/siteplan/index.html` (halaman mandiri, di-render via iframe)
- **Sumber desain:** `prestige2-siteplan-3d.html` (desain awal peta 3D)
- **Quick menu:** tombol **Siteplan** di `/dashboard` (pengurus, warga, dan scurity)

iframe berkomunikasi ke aplikasi induk lewat `postMessage` (`p2s:back`), sehingga
tombol kembali di dalam peta membawa user ke `/dashboard`.

---

## 1. Status kavling mengikuti PocketBase

Peta **tidak** memakai daftar status hardcoded. Saat dibuka, peta mengambil
collection `warga` dan mewarnai kavling sesuai data asli.

- **Endpoint:** `/api/collections/warga/records?perPage=200&expand=status,user`
- **Token:** dibaca dari `localStorage.pocketbase_auth` (iframe `/map` bersifat
  same-origin, jadi sesi login aplikasi langsung terpakai)
- **Fallback:** bila belum login atau request gagal, peta memakai data bawaan
  dan tetap tampil normal

### Aturan pemetaan

| Data PocketBase | Status peta | Keterangan panel |
| --- | --- | --- |
| `status = Developer` | available + **tanah kosong** | — belum dibangun |
| `status = Kosong` | available (rumah tanpa penghuni) | Belum berpenghuni |
| Akun belum aktif | available | Belum berpenghuni |
| Selain itu | sudah akad | nama penghuni |

"Akun belum aktif" = email mengandung `.disabled@` / `nonexistent`, atau nama
akun masih generik (`Warga C08`).

Contoh data saat ini: **C-08** = satu-satunya tanah kosong (status Developer),
**F-10** = rumah kosong tanpa penghuni. Total 5 available / 57 akad.

### Normalisasi nomor rumah

`no_rumah` di PocketBase tidak memakai strip (`C09`), sedangkan id kavling di
peta memakai strip (`C-09`). Konversi dilakukan otomatis oleh `toUnitId()`.

---

## 2. Info penghuni di panel detail

Klik kavling (atau blok → navigasi Sebelumnya/Berikutnya) untuk membuka panel
detail. Panel menampilkan dua baris tambahan di bagian atas:

- **Penghuni** — nama warga, ditambah penanda `· Pengurus` bila berlaku
- **Keterangan** — status kependudukan dari collection `status`
  (`Developer` / `Kosong` / `Exempt IPL`)

Baris otomatis disembunyikan bila datanya tidak ada.

### Privasi

Peta dapat dibuka semua warga yang login, bukan hanya pengurus. Karena itu:

- **Nomor WA, PIN, dan agama tidak ditampilkan** di peta
- Nama generik (`Warga C08`) dan akun nonaktif tidak ditampilkan sebagai penghuni

---

## 3. Mode Jalan (POV pejalan kaki)

Tombol **Jalan** mengaktifkan kamera setinggi mata yang berjalan otomatis
menyusuri jaringan jalan perumahan.

- Jalur membentuk **loop tertutup** (`WALK_PTS`) dan terus berulang
- Posisi selalu dijaga di badan jalan (`keepOnRoad`), termasuk saat menikung
- Ada efek **head-bob** halus agar terasa seperti melangkah
- Arah pandang terpisah dari arah gerak — bisa menoleh tanpa mengubah jalur

### Kontrol

| Aksi | Mobile | Desktop |
| --- | --- | --- |
| Menoleh / mendongak | seret 1 jari | drag mouse, atau tombol panah |
| Ubah laju | cubit (pinch) | scroll, atau `+` / `-` |
| Jeda / lanjut | ketuk layar | `Spasi` |
| Luruskan pandangan | — | `R` |
| Keluar mode jalan | tombol ✕ | `Esc` |

Tersedia juga tombol ⏸ jeda, − / ＋ laju, dan ✕ keluar. Laju berkisar 2–14 m/detik.

---

## 4. Pagar & pohon di saluran air

Saluran air memanjang di `x ≈ 55.5` (badan air `x 53.9–57.1`, `z 32–173`).

- **Pagar pengaman di kedua sisi** sepanjang alur (tiang + rel emas)
- Diberi **celah di persimpangan jalan** agar akses warga tidak tertutup
- **22 pohon peneduh** dan rumpun semak/ilalang di kedua bibir saluran

Pagar sisi timur sengaja dipasang rapat di bibir air (bukan di bahu jalan),
karena sisi timur berbatasan langsung dengan jalan pada sebagian ruas.

---

## 5. UI/UX mobile

- Panel detail berupa **bottom sheet** (drag-grip, scrim, animasi slide)
- Dukungan `env(safe-area-inset-*)` untuk notch & gesture bar
- Tap target tombol minimal 44 px
- Dock panel jadi strip horizontal dengan scroll-snap
- Saat bottom sheet terbuka, dock/kontrol kamera disembunyikan otomatis
- Saat mode jalan aktif, dock & kontrol kamera disembunyikan agar layar bersih

---

## Validasi

Sebelum di-build, perubahan peta diverifikasi lewat skrip lokal:

1. **Sintaks** — ekstrak `<script>` inline lalu `node --check`
2. **Jalur jalan** — simulasi sampling: setiap titik harus berada di badan jalan
   (100%) dan loop kembali ke titik awal
3. **Tabrakan geometri** — pagar/pohon tidak boleh menimpa `ROADS` maupun `WATER`
4. **Build & runtime** — `pnpm check`, `pnpm build`, lalu telusuri seluruh 62 unit
   lewat panel detail di headless browser

```bash
pnpm check     # svelte-kit sync && svelte-check
pnpm build     # adapter-static → build/
pnpm preview   # cek /map, /siteplan/index.html, /dashboard
```

## Catatan

- Service worker PWA meng-cache `siteplan/index.html`. Saat mengembangkan peta,
  lakukan hard-refresh atau nonaktifkan cache; warga lain akan otomatis mendapat
  versi terbaru lewat `autoUpdate` + `skipWaiting`.
- Peta hanya menampilkan status kavling — tidak menulis apa pun ke PocketBase.
