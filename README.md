# Warga P2S — Client v2 (SvelteKit)

Aplikasi warga Prestige 2 Sawangan untuk iuran, tagihan, mutasi, dan informasi
RW 04. Frontend **SvelteKit 5 (SPA)** + **PocketBase** sebagai backend, di-serve
sebagai static site lewat nginx.

Redesign dari client React lama ke SvelteKit 5, mengikuti pola stack
`SvelteKit 5 + adapter-static + Vite PWA`.

- **Backend:** PocketBase — `https://prestige2.sawangan.web.id`
- **API tambahan:** Flask — `https://api.sawangan.web.id` (approve tagihan,
  upload bukti, upload mutasi)
- **Mode:** SPA murni (`ssr = false`, `prerender = false`) — semua data diambil
  di browser, output static + fallback `index.html`

---

## Daftar isi

- [Struktur proyek](#struktur-proyek)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Build & release (Docker)](#build--release-docker)
- [Deploy & cutover](#deploy--cutover)
- [Route & hak akses](#route--hak-akses)
- [Role & autentikasi](#role--autentikasi)
- [Dev Mode](#dev-mode)
- [Collection PocketBase yang dipakai](#collection-pocketbase-yang-dipakai)
- [Dokumentasi lain](#dokumentasi-lain)
- [Status porting](#status-porting)

---

## Struktur proyek

```text
.
├── src/
│   ├── app.css              # design token + utilitas global (tema hijau P2S)
│   ├── app.html             # shell HTML (meta PWA, font, viewport)
│   ├── lib/
│   │   ├── pb.ts            # instance PocketBase + Dev Mode + API_URL
│   │   ├── auth.ts          # login, logout, flag pengurus/scurity
│   │   ├── idle.ts          # auto-lock 30 menit + PIN
│   │   ├── mode.ts          # mode pengurus (persist di localStorage)
│   │   ├── viewMode.ts      # toggle tampilan ponsel/desktop
│   │   ├── ui.ts            # toast + formatter (tanggal, rupiah, inisial)
│   │   ├── types.ts         # tipe record PocketBase
│   │   ├── dashboard.ts     # query dashboard
│   │   ├── tagihan.ts       # tagihan + integrasi Flask
│   │   ├── mutasi.ts        # file mutasi + upload PDF
│   │   ├── warga.ts         # data warga + helper blok/agama
│   │   ├── lapor.ts         # laporan warga & scurity
│   │   ├── riwayat.ts       # ledger wallet + visual transaksi
│   │   └── components/      # AppBar, Modal, PinLock, PinPad, States, Toasts, StubPage
│   └── routes/              # 18 halaman (lihat tabel route)
├── static/
│   ├── manifest.json        # manifest PWA (dirujuk app.html)
│   ├── icons/               # ikon PWA 192 & 512
│   ├── favicon.svg
│   └── siteplan/index.html  # peta 3D mandiri (di-embed via iframe di /map)
├── Dockerfile               # production: Node builder → nginx
├── Dockerfile.dev           # development: Node + pnpm dev + inspector
├── default.conf             # konfigurasi nginx (gzip, cache, SPA fallback)
├── compose.yaml             # build lokal
├── build.compose            # build CI/CD
├── compose.latest.yml       # jalankan image latest (tanpa build)
├── docker-compose.dev.yml   # dev mode + hot reload
├── Makefile                 # build / release / run / verify-arch
├── vite.config.ts           # Vite + SvelteKit + PWA
└── svelte.config.js         # adapter-static (fallback index.html)
```

---

## Quick start

### 1. Docker Compose (dev + hot reload)

Terhubung ke PocketBase production. Cocok untuk mengembangkan UI tanpa mengubah
apa pun di server.

```bash
docker compose -f docker-compose.dev.yml up --build
```

- Aplikasi: <http://localhost:5173>
- Node Inspector (debug): `localhost:9229` → `chrome://inspect`

Login pakai akun warga yang sudah ada di production, format
`kode_rumah@warga.local` (contoh: `c09@warga.local`).

### 2. Lokal tanpa Docker

Butuh **Node 22** dan **pnpm 9**.

```bash
pnpm install
pnpm dev        # http://localhost:5173
```

### 3. Perintah lain

```bash
pnpm check      # svelte-kit sync && svelte-check (type check)
pnpm build      # build static → build/
pnpm preview    # pratinjau hasil build
```

> Vite dev server memakai proxy `/api` → `PUBLIC_PB_URL`, sehingga pemanggilan
> API tetap same-origin dan bebas CORS saat development.

---

## Environment variables

Salin contohnya:

```bash
cp .env.example .env
```

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `PUBLIC_PB_URL` | `https://prestige2.sawangan.web.id` | URL PocketBase public (diakses dari browser) |
| `PUBLIC_API_URL` | `https://api.sawangan.web.id` | URL Flask API |

**Penting:** nilai `PUBLIC_*` dibaca Vite saat **BUILD**, bukan runtime. Mengubahnya
perlu rebuild image / `pnpm build` ulang — bukan cukup restart container.

---

## Build & release (Docker)

Semua build **dipaksa `linux/amd64`** via `PLATFORM ?= linux/amd64`, supaya image
tetap cocok dengan node deploy meski di-build dari mesin Apple Silicon.

```bash
make build                              # build image amd64
make verify-arch                        # pastikan image = linux/amd64
make release                            # build → verify-arch → push
make run                                # build + jalankan container (port 8080)
make down                               # stop container
make staging                            # full flow staging
make production                         # full flow production
make build ENV=staging                  # pilih environment
make build IMAGE_TAG=v1.2.3             # tag spesifik
make build COMPOSE_FILE=build.compose   # jalur CI/CD
make build PLATFORM=linux/arm64         # override platform (khusus dev)
```

Default image: `newrahmat/p2s-app:latest`.

`make release` akan **gagal** jika hasil build bukan `linux/amd64` — guard
`verify-arch` mencegah image arsitektur salah sampai ke registry.

### File compose

| File | Kegunaan | Port | Catatan |
| --- | --- | --- | --- |
| `compose.yaml` | Build lokal (default) | `8080` | `restart: unless-stopped` |
| `build.compose` | Build CI/CD | `80` | `restart: "no"` |
| `compose.latest.yml` | Jalankan image latest | `8111` | Mount `default.conf` |
| `docker-compose.dev.yml` | Dev + hot reload | `5173`, `9229` | Bind mount source |

Menjalankan image yang sudah di-push, tanpa build:

```bash
docker compose -f compose.latest.yml up -d     # http://localhost:8111
```

Detail lengkap alur build/release/CI ada di
[`docs/BUILD-RELEASE.md`](./docs/BUILD-RELEASE.md).

---

## Deploy & cutover

### Login registry

```bash
docker login                      # untuk push ke Docker Hub
```

### Deploy ke host (Docker Compose)

FE Qoin disetup dengan Docker Compose (bukan Kubernetes/ArgoCD). Alurnya:
build & push image → deploy via Compose di host.

```bash
docker compose -f compose.latest.yml pull
docker compose -f compose.latest.yml up -d
```

### Cutover ke `pb_public/` (disajikan langsung PocketBase)

Saat semua halaman selesai di-port, hasil build bisa disalin ke folder static
PocketBase:

```bash
pnpm build
cp -r build/* ../pb_public/
```

---

## Route & hak akses

| Route | Halaman | Akses | Status |
| --- | --- | --- | --- |
| `/` | Redirect ke `/dashboard` atau `/login` | publik | selesai |
| `/login` | Login `kode_rumah@warga.local` | publik | selesai |
| `/dashboard` | Beranda: saldo kas, saldo pribadi, tagihan, mutasi | semua | selesai |
| `/tagihan` | Daftar tagihan + approve + upload bukti | semua (pengurus: semua rumah) | selesai |
| `/lapor` | Lapor warga / absen scurity | semua | selesai |
| `/map` | Siteplan 3D (immersive) | semua | selesai |
| `/laporan-warga` | Laporan warga | non-scurity | selesai |
| `/warga` | Data warga (edit: pengurus) | semua | selesai |
| `/mutasi` | Mutasi bank (upload: pengurus) | semua | selesai |
| `/profil` | Profil, PIN, Dev Mode, mode pengurus | semua | selesai |
| `/riwayat` | Redirect ke `/dashboard` | semua | selesai |
| `/riwayat/[walletId]` | Detail ledger wallet | semua | selesai |
| `/iuran` | Upload bukti iuran | pengurus | **stub** |
| `/lampiran` | Dokumen & bukti terlampir | — | **stub** |
| `/payout` | Pencairan kas | pengurus | **stub** |
| `/notifikasi` | Pemberitahuan | — | **stub** |
| `/rekon` | Rekonsiliasi kas & tagihan | — | **stub** |
| `/laporan-scurity` | Rekap laporan patroli | — | **stub** |

Halaman berstatus **stub** tetap ada supaya URL langsung tidak 404, tapi belum
punya fungsionalitas. Sebagian juga sengaja tidak ditautkan di navigasi.

### Navigasi

- **Sidebar** — hanya tampil di mode desktop (`view-mode = desktop`)
- **Bottom nav** — tampil di mode ponsel
- **Immersive** — `/map` menyembunyikan sidebar & bottom-nav
- Urutan menu: Beranda, Tagihan, Lapor, Siteplan, Lap. Warga, Warga, Mutasi,
  Pembayaran, Notifikasi, Profil

---

## Role & autentikasi

Login memakai PocketBase auth dengan format email `kode_rumah@warga.local`.
Setelah sukses, dua flag disimpan di `localStorage` dan dipakai untuk mengatur
navigasi:

| Flag | Sumber | Efek |
| --- | --- | --- |
| `isPengurus` | kolom `warga.pengurus` | Menu Pembayaran, akses semua rumah, upload mutasi, edit warga |
| `isScurity` | record di collection `scurity` | Navigasi dibatasi ke `/dashboard`, `/lapor`, `/warga`, `/profil`, `/map` |

### Auto-lock PIN

- Idle **30 menit** → aplikasi terkunci, minta PIN (`PinLock`)
- PIN diambil dari `warga.pin` atau `scurity.pin`; fallback `666666`
- Aktivitas yang mereset timer: `mousedown`, `touchstart`, `keydown`, `scroll`,
  `mousemove`, `wheel`

### Mode pengurus

Toggle di `/profil` — pengurus bisa mematikan tampilan mode pengurus (mis. untuk
melihat tampilan seperti warga biasa). Preferensi persist di `localStorage`.

---

## Dev Mode

Dev Mode memakai collection terpisah ber-prefix `dev_` agar pengurus bisa menguji
dengan data dummy tanpa mengotori produksi.

- Aktifkan dari `/profil` → tersimpan di `localStorage.devMode`
- Berlaku otomatis: **semua** nama collection dibungkus prefix `dev_`
- **Pengecualian** (tidak ikut prefix): `users`, `warga`, `_superusers`

Implementasi ada di `src/lib/pb.ts` (`getCollectionName`, `applyDevMode`).

---

## Collection PocketBase yang dipakai

| Collection | Dipakai untuk |
| --- | --- |
| `users` | Akun login (auth) |
| `warga` | Data warga, `no_rumah`, `pengurus`, `pin`, relasi `status` |
| `scurity` | Data petugas keamanan + PIN |
| `status` | Status kependudukan (`Developer`, `Kosong`, `Exempt IPL`) |
| `tagihan` | Tagihan IPL warga + status pembayaran |
| `iuran` | Master iuran (kode + nominal) |
| `wallets` | Wallet `KAS` & `PERSONAL` |
| `ledgers` | Mutasi baris ledger per wallet |
| `file_mutasi` | File PDF mutasi bank |
| `mutasi` | Baris transaksi hasil parsing PDF mutasi |
| `lapor` | Laporan dari warga |
| `laporan_scurity` | Laporan/absen petugas keamanan |
| `aktivitas_warga` | Log aktivitas warga (best effort) |

### Endpoint Flask API

| Endpoint | Kegunaan |
| --- | --- |
| `POST /v1/tagihan/approve` | Approve tagihan (pengurus) |
| `POST /v1/tagihan/tambah-lampiran` | Upload bukti bayar ke tagihan |
| `POST /v1/mutasi/upload` | Upload & parsing PDF mutasi bank |

Ketiganya dikirim dengan header `Authorization` berisi token PocketBase.

---

## Dokumentasi lain

- [`docs/BUILD-RELEASE.md`](./docs/BUILD-RELEASE.md) — alur build, release,
  platform amd64, CI/CD, dan troubleshooting container.
- [`FITUR-SITEPLAN.md`](./FITUR-SITEPLAN.md) — fitur peta siteplan 3D `/map`
  (status kavling, panel penghuni, mode jalan POV, pagar & pohon saluran air).

---

## Status porting

- [x] M1 Foundation (SvelteKit + PWA + design token hijau P2S)
- [x] M2 Auth & Shell (login, PIN lock, idle, sidebar/bottom-nav adaptif)
- [x] M3 Halaman sederhana (Profil, Warga, Lapor)
- [x] M4 Halaman kompleks (Dashboard, Tagihan, Mutasi, Riwayat)
- [ ] M5 Sisa halaman (Iuran, Lampiran, Payout, Notifikasi, Rekon, Laporan Scurity)
- [ ] M6 Cutover ke `pb_public/`

---

## Catatan teknis (gotcha)

- **`PUBLIC_*` di-bake saat build.** Ubah env → rebuild, bukan restart container.
- **`build/` dan `.svelte-kit/` adalah artefak hasil build** dan di-ignore git.
- **Service worker PWA** memakai `registerType: 'autoUpdate'` +
  `skipWaiting`/`clientsClaim`, sehingga warga otomatis mendapat versi baru.
  Saat mengembangkan peta, lakukan hard-refresh dulu.
- **Dua manifest PWA** ada di output (`manifest.json` dari `static/` yang dirujuk
  `app.html`, dan `manifest.webmanifest` hasil plugin). Yang aktif dipakai adalah
  `static/manifest.json`.
- **`/map` bersifat same-origin**, jadi sesi login (`localStorage.pocketbase_auth`)
  langsung terbaca dari dalam iframe peta.
