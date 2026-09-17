# Build & Release — p2s-app

Panduan build, release, dan troubleshooting image Docker untuk aplikasi
Warga P2S (`newrahmat/p2s-app`).

---

## Daftar isi

- [Ringkasan arsitektur image](#ringkasan-arsitektur-image)
- [Platform: wajib linux/amd64](#platform-wajib-linuxamd64)
- [Perintah Makefile](#perintah-makefile)
- [Variable Makefile](#variable-makefile)
- [File compose](#file-compose)
- [Alur CI/CD](#alur-cicd)
- [Deploy di host](#deploy-di-host)
- [Troubleshooting](#troubleshooting)

---

## Ringkasan arsitektur image

Build memakai **multi-stage**:

| Stage | Base image | Hasil |
| --- | --- | --- |
| `builder` | `node:22-alpine` | `pnpm install` → `pnpm build` → static site di `/app/build` |
| `runner` | `nginx:1.27-alpine` | Static site + `default.conf` di `/usr/share/nginx/html` |

Hal penting:

- **`PUBLIC_*` dibaca Vite saat build**, bukan runtime. Nilai di-*bake* ke bundle.
- Urutan sumber nilai env (paling akhir menang):
  1. default di `src/lib/pb.ts`
  2. file `.env.<BRANCH>` di dalam image (kalau ada)
  3. build-arg `PUBLIC_PB_URL` / `PUBLIC_API_URL`
- Container listen di **port 80**; port host diatur `PORT`.
- **`.dockerignore` wajib ada.** Tanpa itu `COPY . .` menimpa `node_modules`
  hasil `pnpm install` dengan `node_modules` host → build gagal.

---

## Platform: wajib linux/amd64

Node deploy adalah **linux/amd64**. Kalau image di-build dari mesin arm64
(Apple Silicon) tanpa pin platform, hasilnya `linux/arm64` dan container gagal
jalan di server.

Karena itu:

- `PLATFORM ?= linux/amd64` di `Makefile`
- Semua compose file memakai `platform: ${PLATFORM:-linux/amd64}`
- `make release` menjalankan target `verify-arch` — **gagal** kalau hasil build
  bukan `linux/amd64`, jadi image arsitektur salah tidak sampai ke registry

Cek manual:

```bash
make verify-arch
# >> OK: newrahmat/p2s-app:latest = linux/amd64

docker image inspect newrahmat/p2s-app:latest --format '{{.Os}}/{{.Architecture}}'
# linux/amd64

make verify-arch IMAGE_NAME=nonexistent-xyz   # contoh gagal → exit != 0
```

Verifikasi manifest di registry (bukan hanya image lokal):

```bash
docker buildx imagetools inspect newrahmat/p2s-app:latest
# Platform: linux/amd64
```

> Entri `Platform: unknown/unknown` pada output di atas adalah *attestation*
> dari BuildKit (provenance/SBOM) — normal, bukan image tambahan.

---

## Perintah Makefile

| Perintah | Keterangan |
| --- | --- |
| `make help` | Daftar perintah |
| `make build` | Build image |
| `make verify-arch` | Pastikan image hasil build `linux/amd64` |
| `make push` | Push image ke registry |
| `make release` | `build` → `verify-arch` → `push` |
| `make run` | Build + jalankan container |
| `make down` | Stop container |
| `make staging` | Full flow staging |
| `make production` | Full flow production |
| `make check-env` | Peringatan bila `.env.<ENV>` tidak ada |

`make release` sengaja ditulis berurutan (`$(MAKE) build` lalu `$(MAKE) push`),
bukan `release: build push`, agar urutannya terjamin dan `verify-arch` selalu
jalan di antara keduanya.

---

## Variable Makefile

| Variable | Default | Keterangan |
| --- | --- | --- |
| `ORG_REGISTRY` | `newrahmat` | Registry / organisasi Docker Hub |
| `IMAGE_NAME` | `p2s-app` | Nama image |
| `IMAGE_TAG` | `latest` | Tag image |
| `ENV` | `production` | Environment → memilih `.env.<ENV>` |
| `PORT` | `8080` | Port host → container `:80` |
| `PLATFORM` | `linux/amd64` | Target platform build |
| `COMPOSE_FILE` | `compose.yaml` | File compose yang dipakai |
| `PUBLIC_PB_URL` | (kosong) | Override build-arg URL PocketBase |
| `PUBLIC_API_URL` | (kosong) | Override build-arg URL Flask API |

Contoh:

```bash
make build IMAGE_TAG=v1.2.3
make build ENV=staging
make build PORT=9090
make build COMPOSE_FILE=build.compose
```

---

## File compose

| File | Kegunaan | Port | Restart | Catatan |
| --- | --- | --- | --- | --- |
| `compose.yaml` | Build lokal (default) | `8080` | `unless-stopped` | Sumber build-arg |
| `build.compose` | Build CI/CD | `80` | `"no"` | Sama, khusus pipeline |
| `compose.latest.yml` | Jalankan image latest | `8111` | `unless-stopped` | Mount `default.conf` |
| `docker-compose.dev.yml` | Dev + hot reload | `5173`, `9229` | — | Bind mount source |

`compose.latest.yml` me-mount `default.conf` dari repo, sehingga perbaikan
konfigurasi nginx bisa dipakai **tanpa rebuild** image.

---

## Alur CI/CD

Gunakan `build.compose` di pipeline:

```bash
make build COMPOSE_FILE=build.compose
make verify-arch
make push COMPOSE_FILE=build.compose
```

Registry kredensial disiapkan lewat `docker login` (Docker Hub) di runner.

> Catatan: repo ini **belum** punya workflow GitHub Actions / Jenkins X.
> Pipeline masih dijalankan lewat Makefile di atas.

---

## Deploy di host

FE Qoin memakai **Docker Compose**, bukan Kubernetes/ArgoCD.

```bash
docker compose -f compose.latest.yml pull
docker compose -f compose.latest.yml up -d
```

Akses: `http://<host>:8111`.

Karena `PUBLIC_*` sudah di-*bake* saat build, tidak perlu di-set lagi saat
menjalankan container.

---

## Troubleshooting

### `failed to solve: cannot copy to non-directory: .../node_modules/...`

Penyebab: `.dockerignore` hilang atau `node_modules` tidak di-exclude, sehingga
`COPY . .` menimpa `node_modules` hasil `pnpm install`.

Perbaikan: pastikan `.dockerignore` memuat minimal:

```text
node_modules
.svelte-kit
build
.env
.git
```

### Image jalan tapi arsitekturnya salah

Gejala: container langsung gagal / `exec format error` di server.

```bash
# cek arsitektur image lokal
make verify-arch

# cek arsitektur manifest di registry
docker buildx imagetools inspect newrahmat/p2s-app:latest
```

Perbaikan: build ulang tanpa override `PLATFORM` (default sudah `linux/amd64`).

### Perubahan env `PUBLIC_*` tidak berefek

Seperti disebut di atas, `PUBLIC_*` di-*bake* saat build. Rebuild image:

```bash
make release PUBLIC_PB_URL=https://... PUBLIC_API_URL=https://...
```

### Halaman dalam (deep link) menghasilkan 404

`default.conf` sudah memuat SPA fallback (`try_files $uri $uri/ /index.html`).
Kalau 404 muncul, pastikan `default.conf` yang ter-mount benar — pada
`compose.latest.yml` file ini di-mount dari repo.

### Aset lama masih muncul setelah deploy

Service worker PWA mem-cache aset. Aplikasi memakai
`registerType: 'autoUpdate'` + `skipWaiting`/`clientsClaim`, jadi versi baru
diambil otomatis. Untuk uji cepat: hard-refresh, atau kosongkan cache situs.
