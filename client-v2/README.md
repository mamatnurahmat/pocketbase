# Warga P2S — Client v2 (SvelteKit)

Redesign client aplikasi warga Prestige 2 Sawangan dari React ke SvelteKit 5,
mengikuti pola stack HarnessAgents (SvelteKit 5 + adapter-static + Vite PWA).

**Folder ini terpisah dari `../client`** (React lama) dan tidak mengganggu build
`pb_public/` yang sedang aktif. Semua fitur diporting bertahap sambil menjaga
fungsi tetap sama (login `xxx@warga.local`, PIN, dev-mode, role pengurus/scurity).

## Quick Start — Dev Mode (docker compose)

Terhubung langsung ke PocketBase production `https://prestige2.sawangan.web.id`.

```bash
cd client-v2
docker compose -f docker-compose.dev.yml up --build
```

Buka `http://localhost:5173`.

Login pakai akun warga.local yang sudah ada di production (mis. `c09@warga.local`).

## Quick Start — Lokal (tanpa docker)

Butuh Node 22 + pnpm 9.

```bash
cd client-v2
pnpm install
pnpm dev
```

## Environment variables

Salin `.env.example` ke `.env` untuk override:

- `PUBLIC_PB_URL` — URL PocketBase (default: `https://prestige2.sawangan.web.id`)
- `PUBLIC_API_URL` — URL Flask API (default: `https://api.sawangan.web.id`)

## Build production

Output ke `build/` (bukan langsung ke `../pb_public`).

```bash
pnpm build
```

Untuk cutover ke `pb_public/`, salin isi `build/` ke `../pb_public/` setelah
semua halaman selesai di-port. Roadmap lengkap ada di `../REDESIGN_PLAN` (chat).

## Status porting

- [x] M1 Foundation (SvelteKit + PWA + design token hijau P2S)
- [x] M2 Auth & Shell (login, PIN lock, idle 60s, sidebar/bottom-nav adaptif)
- [ ] M3 Halaman sederhana (Profil, Notifikasi, Lapor, Warga, Riwayat)
- [ ] M4 Halaman kompleks (Dashboard, Tagihan, Iuran, Lampiran, Mutasi, Rekon, Payout, LaporanWarga, LaporanScurity)
- [ ] M5 PWA polish + skeleton/toast/empty konsisten
- [ ] M6 Cutover ke `pb_public/`
