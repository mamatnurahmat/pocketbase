# 📊 Load Test — PocketBase Warga API

**Tanggal:** 22 Juni 2026 &nbsp;|&nbsp; **Server:** `https://prestige2.sawangan.web.id/api` &nbsp;|&nbsp; **Tool:** k6 (Grafana)  
**Durasi:** 60 detik per test &nbsp;|&nbsp; **Akun:** 62 warga (blok A-G dari `pb_migrations/seed_warga.js`)

---

## 🚀 Quick Start

```bash
# Default: 40 VU, 60s, production
./run-loadtest.sh

# Custom VU & durasi
./run-loadtest.sh --vus 12 --duration 60

# Local server
./run-loadtest.sh --local
```

---

## 📈 Hasil Load Test (3 Level)

| # | VU | Login Success | HTTP Error | HTTP p95 | Exit | Status |
|---|-----|---------------|------------|----------|------|--------|
| 1 | 12  | 100% (312/312) | 0% | 342ms | 0 | 🟢 Optimal |
| 2 | 50  | 100% (540/540) | 0% | 3.86s | 0 | 🟡 Berat |
| 3 | 62  | 100% (563/563) | 0% | 4.79s | 0 | 🔴 Batas |

> **Kesimpulan:** Server PocketBase mampu menangani **62 concurrent user (100% warga)** tanpa error.  
> Endpoint login menjadi bottleneck utama karena operasi **bcrypt hashing** yang CPU-intensive.

---

## 📊 Detail Metrik

### 12 VU — Baseline Optimal

| Metrik | avg | min | med | p90 | p95 | p99 | max |
|--------|-----|-----|-----|-----|-----|-----|-----|
| Login | 246ms | 103ms | 189ms | 393ms | 494ms | 1.24s | 1.30s |
| GET List | 78ms | 29ms | 70ms | 127ms | 154ms | 207ms | 320ms |
| GET Detail | 43ms | 13ms | 33ms | 77ms | 88ms | 146ms | 186ms |
| HTTP Req | 121ms | 12ms | 77ms | 270ms | 342ms | 957ms | 1.21s |

### 50 VU — Mulai Berat

| Metrik | avg | min | med | p90 | p95 | p99 | max |
|--------|-----|-----|-----|-----|-----|-----|-----|
| Login | 2.72s | 112ms | 3.09s | 4.28s | 4.60s | 4.93s | 4.99s |
| GET List | 593ms | 30ms | 509ms | 1.15s | 1.28s | 1.54s | 1.63s |
| GET Detail | 373ms | 15ms | 265ms | 873ms | 1.00s | 1.50s | 1.68s |
| HTTP Req | 1.22s | 14ms | 579ms | 3.45s | 3.86s | 4.59s | 4.84s |

### 62 VU — Batas Maksimum

| Metrik | avg | min | med | p90 | p95 | p99 | max |
|--------|-----|-----|-----|-----|-----|-----|-----|
| Login | 3.62s | 115ms | 3.70s | 5.43s | 5.91s | 6.27s | 6.47s |
| GET List | 836ms | 55ms | 810ms | 1.37s | 1.51s | 1.85s | 1.96s |
| GET Detail | 526ms | 19ms | 486ms | 971ms | 1.24s | 1.62s | 2.23s |
| HTTP Req | 1.66s | 18ms | 918ms | 4.24s | 4.79s | 6.03s | 6.37s |

---

## 🔍 Analisis Scaling

### Login — Bottleneck Utama (bcrypt CPU-bound)

```
12 VU:  246ms ▏░░░░░░
50 VU: 2.72s  ██████▌  (11x lebih lambat)
62 VU: 3.62s  ████████▌ (15x lebih lambat)
```

### GET Data — Selalu Excellent

```
GET List   → 78ms → 593ms → 836ms   (masih <1s di 62 VU)
GET Detail → 43ms → 373ms → 526ms   (masih <1s di 62 VU)
```

### Throughput Mentok di ~25 req/s

```
12 VU → 15.1 req/s
50 VU → 25.7 req/s
62 VU → 25.7 req/s   (CPU saturasi penuh)
```

---

## 🧠 Root Cause

```
┌──────────────────────────────────────────────┐
│                                              │
│  Login (bcrypt hash)                         │
│  ┌─────────────────────────┐                 │
│  │ CPU-intensive           │ ← Bottleneck   │
│  │ 246ms @ 12 VU          │                 │
│  │ 3.62s @ 62 VU          │                 │
│  └─────────────────────────┘                 │
│                                              │
│  GET Data (SQLite query)                     │
│  ┌─────────────────────────┐                 │
│  │ Ringan & cepat          │ ← Bukan masalah│
│  │ 43ms → 836ms            │                 │
│  └─────────────────────────┘                 │
│                                              │
│  Antrian terjadi karena CPU sibuk proses     │
│  bcrypt, bukan karena DB atau network.       │
└──────────────────────────────────────────────┘
```

---

## 🎯 Rekomendasi Tuning

### 🟢 Quick Wins

| # | Tindakan | Effort |
|---|----------|--------|
| 1 | Ganti script ke `ramping-arrival-rate` (simulasi lebih realistis) | Low |
| 2 | Tambah `keepalive` connection pool di reverse proxy | Low |
| 3 | **Token reuse** — simpan token per VU, jangan login ulang tiap iterasi | Low |
| 4 | **SQLite WAL mode** + pragma tuning (`cache_size`, `synchronous`) | Low |

**Contoh token reuse:**
```javascript
const vuTokens = new Map();
export default function() {
  let token = vuTokens.get(__VU);
  if (!token) {
    // login sekali per VU
    const res = http.post(/* ... */);
    token = res.json('token');
    vuTokens.set(__VU, token);
  }
  // GET data pakai token yang sudah ada
}
```

**Contoh ramping scenario:**
```javascript
scenarios: {
  realistic: {
    executor: 'ramping-arrival-rate',
    startRate: 1, timeUnit: '1s',
    preAllocatedVUs: 10, maxVUs: 62,
    stages: [
      { target: 5, duration: '15s' },
      { target: 30, duration: '1m' },
      { target: 5, duration: '15s' },
    ],
  },
}
```

### 🟡 Medium Effort

| # | Tindakan |
|---|----------|
| 5 | Pasang **monitoring CPU/memory** (htop, Grafana, Prometheus) |
| 6 | **Pisahkan upload file** ke S3/MinIO/CDN (kurangi I/O) |
| 7 | Nginx/Caddy **reverse proxy** dengan connection pooling |

### 🔴 Strategic (Jangka Panjang)

| # | Tindakan |
|---|----------|
| 8 | **Multi-instance** PocketBase + load balancer |
| 9 | **Auth offload** — pisahkan auth ke service terpisah / JWT cache |
| 10 | **Upgrade server** — tambah CPU core (bcrypt scaling linear) |

---

## 📐 Capacity Planning

| Warga | Rekomendasi VU | Login p95 | Status |
|-------|----------------|-----------|--------|
| < 20 | 12 | < 500ms | 🟢 Aman |
| 20–50 | 20–30 | 1–3s | 🟡 OK |
| 50–62 | 50 | 3–5s | 🟡 Optimasi |
| > 62 | Scale | > 5s | 🔴 Harus scale |

---

## 📋 Action Items

| # | Tindakan | Prioritas | Effort | Impact |
|---|----------|-----------|--------|--------|
| 1 | Ramping-arrival-rate script | 🔴 High | Low | Realistic test |
| 2 | Keepalive di reverse proxy | 🔴 High | Low | Kurangi TLS overhead |
| 3 | Token reuse di script | 🟡 Med | Low | -30% beban login |
| 4 | SQLite WAL + pragma tuning | 🟡 Med | Low | Query lebih cepat |
| 5 | Monitoring CPU/memory | 🟡 Med | Med | Visibility |
| 6 | Upload ke S3/MinIO | 🟢 Low | Med | Kurangi I/O |
| 7 | Multi-instance + LB | 🟢 Low | High | Horizontal scale |
| 8 | Auth offload | 🟢 Low | High | Eliminasi bottleneck |

---

## 📝 Lessons Learned

1. **Data akun invalid adalah silent killer** — 11 dari 40 akun awal tidak terdaftar, menyebabkan 40–50% login "gagal". Selalu validasi data test sebelum load test.
2. **PocketBase single instance cukup untuk 62 user** — dengan catatan login latency tinggi di peak.
3. **bcrypt = trade-off security vs perf** — > 62 user perlu caching atau auth offload.
4. **Constant-vus bukan simulasi realistis** — user real tidak login serentak. Gunakan ramping.
5. **Network & TLS bukan bottleneck** — latency murni dari CPU server (connect < 1ms, TLS < 3ms).

---

## 🗂️ Struktur Folder

```
loadtest/
├── README.md               ← File ini
├── loadtest-warga.js       # Script k6 load test
├── run-loadtest.sh          # Runner script
├── warga-accounts.json     # 62 akun warga (sync dengan seed migration)
└── reports/
    ├── LOADTEST_PERFORMANCE_REPORT.md  # Report detail
    ├── *.html               # HTML reports
    └── *.json               # JSON raw data
```