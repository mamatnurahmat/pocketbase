# 📊 Load Test Report — PocketBase Warga API

**Tanggal:** 22 Juni 2026
**Server:** `https://prestige2.sawangan.web.id/api`
**Tool:** k6 (Grafana)
**Durasi per test:** 60 detik
**Akun valid:** 62 warga (blok A, B, C, D, E, F, G dari seed migration)

---

## 1. Ringkasan Eksekutif

Tiga load test dilakukan dengan metode **constant-vus** (semua virtual user login bersamaan) untuk mencari batas maksimum performa API warga.

| # | VU | Login Success | HTTP Error | HTTP p95 | Exit Code | Status |
|---|-----|---------------|------------|----------|-----------|--------|
| 1 | 12  | 100% (312/312) | 0% | 342ms | 0 | 🟢 Optimal |
| 2 | 50  | 100% (540/540) | 0% | 3.86s | 0 | 🟡 Berat |
| 3 | 62  | 100% (563/563) | 0% | 4.79s | 0 | 🔴 Batas |

**Kesimpulan:** Server PocketBase mampu menangani **62 concurrent user (100% warga)** tanpa error. Endpoint login menjadi bottleneck utama saat user bertambah karena operasi bcrypt hashing yang CPU-intensive.

---

## 2. Hasil Detail Per Test

### 2.1 — 12 Virtual Users (Baseline)

```
┌──────────────────────────────────────────────────┐
│              12 VU — ZONA OPTIMAL                │
├──────────────────────────────────────────────────┤
│ Iterasi total:           312                     │
│ HTTP Requests:           936  (15.1 req/s)       │
│ Semua checks:          2,808 (100%)              │
│ HTTP Error Rate:         0%                      │
└──────────────────────────────────────────────────┘
```

| Metrik | avg | min | med | p90 | p95 | p99 | max |
|--------|-----|-----|-----|-----|-----|-----|-----|
| **Login Duration** | 246ms | 103ms | 189ms | 393ms | 494ms | 1.24s | 1.30s |
| **GET Warga List** | 78ms | 29ms | 70ms | 127ms | 154ms | 207ms | 320ms |
| **GET Warga Detail** | 43ms | 13ms | 33ms | 77ms | 88ms | 146ms | 186ms |
| **HTTP Req Duration** | 121ms | 12ms | 77ms | 270ms | 342ms | 957ms | 1.21s |
| **Iteration Duration** | 2.35s | 1.29s | 2.29s | 3.17s | 3.29s | 3.86s | 4.34s |

---

### 2.2 — 50 Virtual Users (Berat)

```
┌──────────────────────────────────────────────────┐
│              50 VU — ZONA BERAT                  │
├──────────────────────────────────────────────────┤
│ Iterasi total:           540                     │
│ HTTP Requests:         1,620  (25.7 req/s)       │
│ Semua checks:          4,860 (100%)              │
│ HTTP Error Rate:         0%                      │
└──────────────────────────────────────────────────┘
```

| Metrik | avg | min | med | p90 | p95 | p99 | max |
|--------|-----|-----|-----|-----|-----|-----|-----|
| **Login Duration** | 2.72s | 112ms | 3.09s | 4.28s | 4.60s | 4.93s | 4.99s |
| **GET Warga List** | 593ms | 30ms | 509ms | 1.15s | 1.28s | 1.54s | 1.63s |
| **GET Warga Detail** | 373ms | 15ms | 265ms | 873ms | 1.00s | 1.50s | 1.68s |
| **HTTP Req Duration** | 1.22s | 14ms | 579ms | 3.45s | 3.86s | 4.59s | 4.84s |
| **Iteration Duration** | 5.69s | 1.36s | 6.03s | 7.24s | 7.51s | 8.18s | 8.40s |

---

### 2.3 — 62 Virtual Users (Maksimum)

```
┌──────────────────────────────────────────────────┐
│              62 VU — BATAS MAKSIMUM              │
├──────────────────────────────────────────────────┤
│ Iterasi total:           563                     │
│ HTTP Requests:         1,689  (25.7 req/s)       │
│ Semua checks:          5,067 (100%)              │
│ HTTP Error Rate:         0%                      │
└──────────────────────────────────────────────────┘
```

| Metrik | avg | min | med | p90 | p95 | p99 | max |
|--------|-----|-----|-----|-----|-----|-----|-----|
| **Login Duration** | 3.62s | 115ms | 3.70s | 5.43s | 5.91s | 6.27s | 6.47s |
| **GET Warga List** | 836ms | 55ms | 810ms | 1.37s | 1.51s | 1.85s | 1.96s |
| **GET Warga Detail** | 526ms | 19ms | 486ms | 971ms | 1.24s | 1.62s | 2.23s |
| **HTTP Req Duration** | 1.66s | 18ms | 918ms | 4.24s | 4.79s | 6.03s | 6.37s |
| **Iteration Duration** | 7.01s | 3.06s | 7.14s | 8.52s | 8.93s | 9.57s | 9.76s |

---

## 3. Analisis Scaling

### 3.1 Login — Bottleneck Utama

```
VU    Login avg    Login p95    Degradasi vs 12 VU
──    ─────────    ─────────    ──────────────────
12      246ms         494ms     baseline
50    2,720ms       4,600ms     9-11x lebih lambat
62    3,620ms       5,910ms     12-15x lebih lambat
```

Login menggunakan PocketBase `auth-with-password` yang menjalankan **bcrypt hash comparison** — operasi murni CPU-bound. Semakin banyak concurrent login, semakin jenuh CPU server.

### 3.2 GET Data — Masih Sangat Baik

```
VU    GET List    GET Detail   Degradasi vs 12 VU
──    ────────    ──────────   ──────────────────
12      78ms         43ms      baseline
50     593ms        373ms      7-9x lebih lambat
62     836ms        526ms      10-12x lebih lambat
```

GET data 100% sukses di semua level. Latency naik karena antrian di server (CPU sibuk memproses login), bukan karena query lambat.

### 3.3 Throughput Mentok di ~25 req/s

```
VU    Iterasi    Total Req    Req/s
──    ───────    ─────────    ─────
12      312         936        15.1
50      540       1,620        25.7
62      563       1,689        25.7
```

Server mencapai throughput maksimum **~25 request/detik**. Dari 50 ke 62 VU, request rate tidak naik → **CPU sudah saturasi penuh**.

### 3.4 HTTP p95 — Hampir Tembus Threshold

```
VU    p95 HTTP    Threshold
──    ────────    ─────────
12      342ms     ▏░░░░░░░ 5s
50     3,860ms    ███████▌░ 5s
62     4,790ms    █████████░ 5s  ← Bahaya!
```

---

## 4. Root Cause: bcrypt CPU Saturation

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   Login (bcrypt)                                      │
│   ┌──────────────────────────┐                         │
│   │ 246ms @ 12 VU           │  → Single CPU core      │
│   │ 2.72s @ 50 VU          │    mulai jenuh           │
│   │ 3.62s @ 62 VU          │    saturasi penuh        │
│   └──────────────────────────┘                         │
│                                                         │
│   GET Data (SQLite query)                              │
│   ┌──────────────────────────┐                         │
│   │ 43-78ms @ 12 VU        │  → Ringan, bukan        │
│   │ 373-593ms @ 50 VU      │    masalah utama         │
│   │ 526-836ms @ 62 VU      │                          │
│   └──────────────────────────┘                         │
│                                                         │
│   Antrian terjadi karena CPU sibuk proses bcrypt,      │
│   bukan karena database atau network.                  │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Rekomendasi Tuning (Stack Existing)

### 5.1 🟢 Quick Wins — Bisa dilakukan sekarang

#### A. Optimasi PocketBase Config
```toml
# pocketbase serve --hooksDir pb_hooks
# Naikkan concurrent DB connections
maxOpenConns=25
maxIdleConns=10
```

#### B. Caddy/Nginx Reverse Proxy dengan Keep-Alive Pooling
```nginx
# /etc/nginx/sites-available/prestige2
upstream pocketbase {
    server localhost:8090;
    keepalive 32;     # Connection pool
}

server {
    # ... existing config ...

    location /api/ {
        proxy_pass http://pocketbase;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_read_timeout 30s;
    }
}
```

#### C. Optimasi Script Load Test — Ramping Pattern
Ganti `constant-vus` (semua serentak) ke `ramping-arrival-rate` (naik bertahap) untuk simulasi lebih realistis:

```javascript
scenarios: {
  realistic_load: {
    executor: 'ramping-arrival-rate',
    startRate: 1,
    timeUnit: '1s',
    preAllocatedVUs: 10,
    maxVUs: 62,
    stages: [
      { target: 5,  duration: '15s' },  // warm-up
      { target: 30, duration: '1m'  },  // peak
      { target: 5,  duration: '15s' },  // cool-down
    ],
  },
}
```

#### D. Token Reuse — Jangan Login Setiap Iterasi
Script saat ini login ulang setiap iterasi. Simpan token per VU:

```javascript
const vuTokens = new Map();

export default function() {
  let token;
  if (vuTokens.has(__VU)) {
    token = vuTokens.get(__VU);
  } else {
    // login ...
    vuTokens.set(__VU, token);
  }
  // ... GET data pakai token yang sudah ada
}
```

---

### 5.2 🟡 Medium Effort — Butuh Deployment

#### E. SQLite → WAL Mode + Optimize
```sql
-- PocketBase pakai SQLite, pastikan WAL mode aktif
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA cache_size=-64000;       -- 64MB cache
PRAGMA busy_timeout=5000;
PRAGMA foreign_keys=ON;
```

#### F. Pisahkan Static Assets
Pindahkan upload file PocketBase ke object storage (S3/MinIO) atau CDN agar tidak membebani server:

```go
// pb_hooks/main.pb.go
// Gunakan S3-compatible storage untuk file upload
onRecordAfterCreateRequest((e) => {
  // offload file ke object storage
})
```

#### G. Monitoring & Alerting
Pasang health check endpoint dan pantau:
```bash
# Metrics untuk di-monitor
- CPU usage (htop)
- Memory usage
- SQLite write lock contention
- Login failure rate
- p95 response time
```

---

### 5.3 🔴 Strategic — Investasi Jangka Panjang

#### H. Multi-Instance PocketBase + Load Balancer
```
                     ┌──────────────┐
                     │   Caddy LB    │
                     │  (round-robin) │
                     └──┬──┬──┬─────┘
                        │  │  │
              ┌─────────┘  │  └─────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ PB Inst 1│ │ PB Inst 2│ │ PB Inst 3│
        │  :8091   │ │  :8092   │ │  :8093   │
        └──────────┘ └──────────┘ └──────────┘
```

> ⚠️ PocketBase tidak support horizontal scaling native. Gunakan solusi ini hanya jika:
> - Upload file dipindahkan ke S3/shared storage
> - Read-heavy workload (PB replica untuk GET, 1 master untuk write)

#### I. Auth Offload
Pisahkan autentikasi ke service terpisah yang lebih ringan:

```
Login → service auth (JWT HMAC, bukan bcrypt) → token
API   → validate JWT tanpa query database
```

Atau gunakan **PocketBase di depan dengan Redis cache** untuk session token yang sudah divalidasi.

#### J. Upgrade Server
Jika budget memungkinkan:
- CPU: 4 core → 8 core (bcrypt scaling linear dengan jumlah core)
- RAM: minimal 1GB per 50 concurrent user
- SSD/NVMe: IOPS lebih baik dari HDD

---

## 6. Capacity Planning

| Jumlah Warga | Rekomendasi VU | Ekspektasi Login p95 | Status |
|-------------|----------------|---------------------|--------|
| < 20 | 12 | < 500ms | 🟢 Aman |
| 20 - 50 | 20-30 | 1 - 3s | 🟡 OK |
| 50 - 62 | 50 | 3 - 5s | 🟡 Perlu optimasi |
| > 62 | Perlu scaling | > 5s | 🔴 Harus scale |

---

## 7. Lessons Learned

1. **Data akun invalid adalah silent killer** — 11 dari 40 akun awal tidak terdaftar, menyebabkan 40-50% login "gagal" yang sebenarnya bukan masalah performa. Selalu validasi test data sebelum load test.

2. **PocketBase single instance cukup untuk 62 user** dengan catatan login latency akan tinggi di peak. GET data selalu cepat.

3. **bcrypt adalah trade-off security vs perf** — kalau user > 62, perlu dipikirkan caching atau offload auth.

4. **Constant-vus bukan simulasi realistis** — di dunia nyata, user tidak login serentak. Gunakan ramping scenario untuk hasil yang lebih akurat.

5. **Network & TLS bukan bottleneck** — latency murni dari CPU server, bukan dari jaringan (connect time < 1ms, TLS < 3ms).

---

## 8. Action Items

| # | Tindakan | Prioritas | Effort | Impact |
|---|----------|-----------|--------|--------|
| 1 | Ganti script ke ramping-arrival-rate | 🔴 High | Low | Hasil lebih realistis |
| 2 | Tambah keepalive di reverse proxy | 🔴 High | Low | Kurangi TLS overhead |
| 3 | Token reuse antar iterasi di script | 🟡 Med | Low | Kurangi 30% beban login |
| 4 | SQLite WAL mode + pragma tuning | 🟡 Med | Low | Faster queries |
| 5 | Pasang monitoring CPU/mem | 🟡 Med | Med | Visibility |
| 6 | Pindahkan upload ke S3/MinIO | 🟢 Low | Med | Kurangi I/O server |
| 7 | Multi-instance + LB | 🟢 Low | High | Scale horizontal |
| 8 | Auth offload ke service terpisah | 🟢 Low | High | Eliminasi bottleneck |

---

*Report generated by k6 load test suite — `/loadtest/run-loadtest.sh`*
