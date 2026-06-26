# Product Requirements Document — Sistem Notifikasi
## Aplikasi Warga Prestige 2 Sawangan

---

### 📌 1. Ringkasan

| Item | Deskripsi |
|---|---|
| **Nama Fitur** | Sistem Notifikasi — `ntfy.sh` Backend Hooks |
| **Versi PRD** | 1.0 — 26 Juni 2026 |
| **Status** | ✅ Production (Fase 1) / 🔧 Roadmap (Fase 2) |
| **Channel** | `ntfy.sh` (HTTP POST), push service (Node.js), Telegram/WhatsApp (planned) |
| **Tech** | PocketBase JS Hooks (`pb_hooks/*.pb.js`), `$http.send`, `onRecordAfter*Success` |

---

### 🎯 2. Tujuan

Membangun sistem notifikasi terpadu yang memberi tahu pengurus (admin) secara real-time tentang seluruh aktivitas penting di aplikasi warga:

- **Transparansi** — pengurus langsung tahu setiap perubahan data
- **Responsif** — laporan warga, pembayaran, dan SOS langsung terlihat
- **Audit trail** — setiap aktivitas tercatat via notifikasi dan log aktivitas
- **Multi-channel** — ntfy.sh (sekarang), Telegram/WhatsApp (mendatang)

---

### 🏗 3. Arsitektur Notifikasi

```
┌──────────────────────────────────────────────────────────────────┐
│                     PocketBase (Backend)                          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ warga CRUD   │  │ tagihan CRUD │  │ lapor CRUD   │  ...      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                     │
│         ▼                 ▼                 ▼                     │
│  ┌──────────────────────────────────────────────────┐           │
│  │           PocketBase JS Hooks                     │           │
│  │  onRecordAfterCreateSuccess / AfterUpdateSuccess │           │
│  └──────────────────────┬───────────────────────────┘           │
│                         │                                         │
│                         │ $http.send(POST)                        │
│                         ▼                                         │
│              ┌─────────────────────┐                             │
│              │    ntfy.sh API      │                             │
│              │  https://ntfy.sh    │                             │
│              └────────┬────────────┘                             │
│                       │                                           │
└───────────────────────┼───────────────────────────────────────────┘
                        │
            ┌───────────┼───────────┐
            ▼           ▼           ▼
      ┌──────────┐ ┌─────────┐ ┌──────────┐
      │  Android │ │  iOS    │ │  Web     │
      │  (ntfy)  │ │ (ntfy)  │ │ (ntfy)   │
      └──────────┘ └─────────┘ └──────────┘
```

**Flow**: Setiap operasi CRUD di collection → hook JS terpicu → format pesan → POST ke ntfy.sh → pengurus terima push notification real-time.

---

### 📡 4. Channel Notifikasi

#### 4.1 ntfy.sh (Fase 1 — ✅ Active)

| Properti | Nilai |
|---|---|
| **Endpoint** | `POST https://ntfy.sh` |
| **Auth** | Tidak ada (public topic, topic name sebagai secret) |
| **Protocol** | HTTP/1.1 JSON |
| **Timeout** | 30 detik |
| **Library** | `$http.send` (PocketBase built-in) |

**Topik (Topics)**:

| Topic | Kegunaan | Prioritas Default | Subscriber |
|---|---|---|---|
| `p2s` | Notifikasi umum (warga, tagihan, lapor, aktivitas, lampiran) | 3–4 | Semua pengurus |
| `p2s-sos` | Sinyal darurat / SOS | 5 | Semua pengurus (urgent) |
| `p2s-scurity` | Laporan keamanan (patroli, absen) | 3 | Pengurus + scurity |

#### 4.2 Telegram Bot (Fase 2 — 🔧 Planned)

- Bot Telegram untuk broadcast ke grup pengurus
- Format: Markdown / HTML
- Fitur: tagihan jatuh tempo, laporan baru, SOS
- Lihat §9 Roadmap

#### 4.3 WhatsApp Gateway (Fase 2 — 🔧 Planned)

- Integrasi via WhatsApp Business API atau gateway pihak ketiga
- Notifikasi personal ke warga: tagihan baru, reminder H-7 jatuh tempo
- Notifikasi grup pengurus: laporan, pembayaran

#### 4.4 In-App Notification (Fase 2 — 🔧 Planned)

- Collection `notifications` di PocketBase
- Bell icon + badge di client React
- WebSocket realtime subscribe via `/api/realtime`
- Read/unread status, history

---

### 🔔 5. Jenis Notifikasi & Trigger

#### 5.1 `warga_notify.pb.js`

| Trigger | Event | Priority | Topic |
|---|---|---|---|
| `onRecordAfterCreateSuccess` | Warga baru terdaftar | 4 | `p2s` |
| `onRecordAfterUpdateSuccess` | Data warga diupdate (perubahan no_rumah, no_wa, status, pengurus, agama) | 3 | `p2s` |

**Payload Create**:
```json
{
  "topic": "p2s",
  "title": "🏠 Warga Baru: {nama} (No. {no_rumah})",
  "message": "🏠 *Warga Baru Terdaftar*\n\n🏠 No. Rumah: ...\n👤 Nama: ...\n📱 No. WA: ...\n📧 Email: ...\n🏷️ Status: ...\n🕌 Agama: ...\n⭐ Peran: Pengurus\n🆔 ID Warga: ...\n🕐 Terdaftar: ...",
  "tags": ["house", "pocketbase", "wave"],
  "priority": 4,
  "click": "https://prestige2.sawangan.web.id/_/#/collections/warga/records/{id}"
}
```

**Payload Update** (hanya jika ada perubahan terdeteksi via `getOriginal()`):
```json
{
  "topic": "p2s",
  "title": "✏️ Data Warga Diupdate: {nama} (No. {no_rumah})",
  "message": "✏️ *Data Warga Diupdate*\n\n👤 Warga: ...\n📋 Perubahan:\n  1. No. Rumah: A01 → A02\n  2. Status: Warga → Pengurus\n...",
  "tags": ["pencil", "pocketbase"],
  "priority": 3
}
```

**Deteksi perubahan**: Membandingkan nilai `getOriginal()` vs nilai baru untuk field: `no_rumah`, `no_wa`, `status`, `pengurus`, `agama`. Jika tidak ada perubahan signifikan → skip notifikasi.

---

#### 5.2 `tagihan_notify.pb.js`

| Trigger | Event | Priority | Topic |
|---|---|---|---|
| `onRecordAfterCreateSuccess` | Tagihan baru dibuat | 3 | `p2s` |
| `onRecordAfterUpdateSuccess` | Status pembayaran berubah | 3 | `p2s` |

**Payload Create**:
```json
{
  "topic": "p2s",
  "title": "🧾 Tagihan Baru: {kode_iuran} - {no_rumah}",
  "message": "🧾 *Tagihan Baru Dibuat*\n\n👤 Warga: {nama} (No. {no_rumah})\n📂 Iuran: {kode}\n💰 Nominal: Rp 170.000\n📅 Jatuh Tempo: 20 Januari 2026\n📌 Status: Belum Dibayar\n🆔 ID Tagihan: ...\n🕐 Dibuat: ...",
  "tags": ["money", "pocketbase", "dollar"],
  "priority": 3
}
```

**Payload Update** — deteksi transisi status:

| Transisi | Emoji | Judul | Deskripsi |
|---|---|---|---|
| `Belum Dibayar` → `Menunggu Konfirmasi` | ⏳ | Bukti Bayar {iuran} - {no_rumah} | Warga upload bukti pembayaran |
| `Menunggu Konfirmasi` → `Lunas` | ✅ | Pembayaran {iuran} - {no_rumah} Lunas | Pengurus mengkonfirmasi pembayaran |
| Perubahan lain | 🔴/⏳/✅ | Tagihan {iuran} - {no_rumah} | Status berubah: {old} → {new} |

**Deteksi perubahan**: Membandingkan `getOriginal("status_pembayaran")` dan `getOriginal("lampiran")` vs nilai baru. Skip jika tidak ada perubahan signifikan.

---

#### 5.3 `lapor_notify.pb.js`

| Trigger | Event | Priority | Topic |
|---|---|---|---|
| `onRecordAfterCreateSuccess` | Laporan baru dari warga | 3 | `p2s` |
| `onRecordAfterUpdateSuccess` | Status laporan diupdate | 3 | `p2s` |

**Payload Create**:
```json
{
  "topic": "p2s",
  "title": "📩 Laporan Baru dari Warga",
  "message": "📩 *Laporan Baru dari Warga*\n\n👤 Warga: {nama} (No. {no_rumah})\n📋 Keterangan: ...\n🆔 ID Laporan: ...\n🕐 Waktu: ...",
  "tags": ["memo", "pocketbase", "loudspeaker"],
  "priority": 3,
  "click": "https://prestige2.sawangan.web.id/_/#/collections/lapor/records/{id}",
  "attach": "https://prestige2.sawangan.web.id/api/files/lapor/{id}/{foto}"
}
```

**Fitur attach**: Jika laporan memiliki foto, URL file dilampirkan sebagai `attach` di payload ntfy — muncul sebagai attachment di notifikasi.

**Payload Update** — status berubah:
```json
{
  "topic": "p2s",
  "title": "{emoji} Laporan {status}",
  "message": "{emoji} *Status Laporan Diupdate*\n\n👤 Warga: ...\n📋 Keterangan: {100 char pertama}...\n{emoji} Status: {status}\n💬 Respons Pengurus: {respons}\n🆔 ID Laporan: ...\n🕐 Waktu: ...",
  "tags": ["memo", "pocketbase"],
  "priority": 3
}
```

**Status emoji mapping**:
| Status | Emoji |
|---|---|
| `Diproses` | 🔄 |
| `Selesai` | ✅ |
| `Ditolak` | ❌ |
| Default | 📋 |

---

#### 5.4 `aktivitas_notify.pb.js`

| Trigger | Event | Priority | Topic |
|---|---|---|---|
| `onRecordAfterCreateSuccess` | Aktivitas warga baru tercatat | 3 | `p2s` |

**Auto-emoji detection** berdasarkan kata kunci di field `aktivitas`:

| Kata Kunci | Emoji |
|---|---|
| bayar, pembayaran, lunas | 💰 |
| login, masuk | 🔑 |
| daftar, registrasi, register | 📝 |
| ubah, edit, update | ✏️ |
| hapus, delete, remove | 🗑️ |
| lapor, laporan, keluhan | 📩 |
| approve, konfirmasi, setuju | ✅ |
| tolak, reject | ❌ |
| Default | 📋 |

**Payload**:
```json
{
  "topic": "p2s",
  "title": "{emoji} {aktivitas}",
  "message": "{emoji} *Aktivitas Warga Baru*\n\n👤 Warga: {nama} (No. {no_rumah})\n{emoji} Aktivitas: {aktivitas}\n📄 Detail: {detail}\n🕐 Waktu: ...",
  "tags": ["pocketbase", "clipboard"],
  "priority": 3
}
```

---

#### 5.5 `lampiran_notify.pb.js`

| Trigger | Event | Priority | Topic |
|---|---|---|---|
| `onRecordAfterCreateSuccess` | Upload bukti pembayaran baru | 4 | `p2s` |

**Payload**:
```json
{
  "topic": "p2s",
  "title": "📎 Upload Bukti Pembayaran",
  "message": "📎 *Upload Bukti Pembayaran Baru*\n\n👤 Warga: {nama} (No. {no_rumah})\n💰 Iuran: {kode_iuran_list}\n🆔 ID Lampiran: ...\n🕐 Waktu: ...",
  "tags": ["money", "pocketbase", "part_alternation_mark"],
  "priority": 4,
  "click": "https://prestige2.sawangan.web.id/_/#/collections?collection=lampiran",
  "attach": "https://prestige2.sawangan.web.id/api/files/lampiran/{id}/{file_bukti}"
}
```

**Fitur attach**: File bukti pembayaran dilampirkan sebagai attachment di notifikasi ntfy.

---

#### 5.6 `sos.pb.js` — Sinyal Darurat

| Trigger | Event | Priority | Topic |
|---|---|---|---|
| `onRecordAfterCreateSuccess` | SOS baru dikirim | 5 | `p2s-sos` |
| `onRecordAfterUpdateSuccess` | Status SOS diupdate | 3–5 | `p2s-sos` / `p2s` |

**Custom endpoint**: `POST /api/sos` — mendukung request tanpa autentikasi (anonim). Jika user login, data warga otomatis diambil dari DB.

**Payload Create** (priority tertinggi):
```json
{
  "topic": "p2s-sos",
  "title": "🚨 SOS: {nama} (No. {no_rumah})",
  "message": "🚨 *SINYAL DARURAT (SOS)* 🚨\n\n👤 Nama: ...\n🏠 No. Rumah: ...\n📱 No. WA: ...\n📋 Keterangan: ...\n🆔 ID SOS: ...\n🕐 Waktu: ...\n\n⚡ *Segera proses di panel admin!*",
  "tags": ["sos", "rotating_light", "warning"],
  "priority": 5
}
```

**Payload Update** — berdasarkan status:

| Status | Emoji | Priority | Topic |
|---|---|---|---|
| `Disetujui` | ✅ | 5 | `p2s-sos` |
| `Ditolak` | ❌ | 4 | `p2s-sos` |
| `Selesai` | 🏁 | 3 | `p2s` |

---

#### 5.7 `scurity.pb.js` — Laporan Keamanan

| Trigger | Event | Priority | Topic |
|---|---|---|---|
| `onRecordAfterCreateSuccess` | Laporan scurity baru | 3 | `p2s-scurity` |

**Custom endpoint**: `GET /api/scurity/absen-terakhir` — mengembalikan absen terakhir (jenis=absen) untuk ditampilkan di frontend.

**Payload**:
```json
{
  "topic": "p2s-scurity",
  "title": "{jenis_emoji}: {nama_scurity}",
  "message": "{jenis_emoji}\n\n👤 Nama: {nama}\n📱 No. HP: {no_hp}\n📝 Keterangan: {keterangan}\n🕐 Waktu: ...\n🆔 ID: ...",
  "tags": ["clipboard"/"police_car"/"memo", "scurity"],
  "priority": 3
}
```

**Jenis → Label mapping**:
| Jenis | Label | Emoji |
|---|---|---|
| `absen` | 📋 Absen | clipboard |
| `patroli` | 🚓 Patroli | police_car |
| `lainnya` | 📌 Lainnya | memo |

---

#### 5.8 `wallet_tagihan.pb.js` — Auto Topup Wallet

| Trigger | Event | Notifikasi? |
|---|---|---|
| `onRecordAfterUpdateSuccess` | Tagihan disetujui → Lunas | ❌ Tidak ada notifikasi terpisah |

**Aksi**: Saat tagihan berubah ke `Lunas`, hook ini otomatis:
1. Menambah balance wallet PERSONAL warga
2. Membuat transaksi `TOPUP`
3. Membuat ledger entry `CREDIT`

Notifikasi untuk pengurus sudah ditangani oleh `tagihan_notify.pb.js` (transisi `Menunggu Konfirmasi → Lunas`).

---

### 📊 6. Matriks Notifikasi

| No | Collection | Hook File | Create | Update | Topic | Priority |
|---|---|---|---|---|---|---|
| 1 | `warga` | `warga_notify.pb.js` | ✅ | ✅ (perubahan saja) | `p2s` | 3–4 |
| 2 | `tagihan` | `tagihan_notify.pb.js` | ✅ | ✅ (status/lampiran) | `p2s` | 3 |
| 3 | `lapor` | `lapor_notify.pb.js` | ✅ | ✅ (status/respons) | `p2s` | 3 |
| 4 | `aktivitas_warga` | `aktivitas_notify.pb.js` | ✅ | ❌ | `p2s` | 3 |
| 5 | `lampiran` | `lampiran_notify.pb.js` | ✅ | ❌ | `p2s` | 4 |
| 6 | `sos` | `sos.pb.js` | ✅ | ✅ (status) | `p2s-sos` | 3–5 |
| 7 | `laporan_scurity` | `scurity.pb.js` | ✅ | ❌ | `p2s-scurity` | 3 |

---

### 🎨 7. Format Pesan

#### 7.1 Struktur Umum

Semua pesan menggunakan format **Markdown-like** (ntfy.sh mendukung subset Markdown):

```
{emoji} *{judul_section}*
{emoji} *{judul_section}*

{emoji} *{field_label}:* {value}
{emoji} *{field_label}:* {value}
...

🆔 *ID:* {record_id}
🕐 *Waktu:* {timestamp_WIB}
```

#### 7.2 Konvensi

| Elemen | Konvensi |
|---|---|
| **Bold** | `*teks*` (Markdown) |
| **Emoji** | Unicode emoji sebagai prefix field |
| **Waktu** | `toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })` |
| **Nominal** | `Rp {Number(n).toLocaleString("id-ID")}` |
| **URL** | `click` field di payload untuk deep link ke Admin UI |
| **Attachment** | `attach` field untuk file gambar/bukti |

#### 7.3 Priority System

| Priority | Arti | Penggunaan |
|---|---|---|
| 5 | Urgent / SOS | SOS baru, SOS disetujui |
| 4 | High | Warga baru, bukti bayar baru, SOS ditolak |
| 3 | Normal | Semua notifikasi lainnya |

---

### 🔐 8. Keamanan & Reliability

| Aspek | Implementasi |
|---|---|
| **Topic secrecy** | Topic name (`p2s`, `p2s-sos`, `p2s-scurity`) berfungsi sebagai shared secret. Hanya pengurus yang tahu topic name. |
| **Error handling** | Semua hook punya try-catch. Gagal kirim → log error, tidak menghentikan operasi CRUD. |
| **Timeout** | HTTP request timeout 30 detik. |
| **No SPOF** | Notifikasi async via `$http.send`. Gagal tidak mempengaruhi operasi utama. |
| **Rate limiting** | ntfy.sh punya rate limit bawaan. Tidak ada throttling dari sisi PocketBase. |
| **Data privacy** | Tidak ada data sensitif dikirim (tidak ada password, token). Hanya info operasional. |

---

### 🗺 9. Roadmap — Fase 2

#### 9.1 In-App Notification (Collection `notifications`)

```
Collection: notifications (base)
├── id: text (PK)
├── user: relation → users (penerima)
├── type: select (tagihan, lapor, sos, warga, sistem)
├── title: text
├── message: text
├── is_read: bool (default: false)
├── link: text (deep link ke record terkait)
├── created: autodate
└── updated: autodate
```

**Fitur**:
- Bell icon + unread badge di navbar React
- Dropdown list 5 notifikasi terbaru
- Halaman `/notifikasi` untuk history
- Realtime via WebSocket subscribe ke collection `notifications`
- Mark as read / mark all as read
- Auto-create notifikasi dari hook yang sudah ada (side effect: hook kirim ke ntfy + insert ke collection notifications)

#### 9.2 Telegram Bot Integration

- Bot Telegram dengan command: `/start`, `/status`, `/tagihan`
- Grup pengurus: broadcast otomatis untuk laporan baru, SOS, pembayaran
- Format: HTML dengan inline keyboard
- Library: `node-telegram-bot-api` atau integrasi langsung dari PocketBase hooks

#### 9.3 WhatsApp Notification

- Gateway: WhatsApp Business API (Twilio, WATI, atau Qontak)
- Template pesan disetujui WhatsApp:
  - `tagihan_baru`: "Yth. {nama}, tagihan IPL {bulan} sebesar Rp {nominal} telah tersedia. Jatuh tempo: {tanggal}."
  - `reminder_h7`: "Pengingat: tagihan IPL {bulan} jatuh tempo {tanggal}. Segera lakukan pembayaran."
  - `pembayaran_dikonfirmasi`: "Pembayaran IPL {bulan} Anda telah dikonfirmasi. Terima kasih."
- Biaya: per pesan via provider

#### 9.4 Reminder Otomatis (Cron / Scheduled Hook)

- **H-7 jatuh tempo**: Kirim notifikasi ke warga via WhatsApp/Telegram
- **H-1 jatuh tempo**: Reminder kedua
- **H+1 jatuh tempo**: Notifikasi keterlambatan
- Implementasi: cron job via PocketBase scheduled hooks atau external cron + API

#### 9.5 Push Notification Browser (PWA)

- Service Worker + Web Push API
- Notifikasi muncul meskipun browser tidak dibuka
- Integrasi dengan PWA (Progressive Web App)

---

### 📁 10. Struktur File

```
pb_hooks/
├── warga_notify.pb.js       # Notifikasi warga (create/update)
├── tagihan_notify.pb.js     # Notifikasi tagihan (create/update status)
├── lapor_notify.pb.js       # Notifikasi laporan (create/update)
├── aktivitas_notify.pb.js   # Notifikasi aktivitas warga (create)
├── lampiran_notify.pb.js    # Notifikasi upload bukti (create)
├── sos.pb.js                # Notifikasi SOS + custom endpoint /api/sos
├── sos-debug.pb.js          # Debug endpoint /api/sos-debug
├── scurity.pb.js            # Notifikasi scurity + custom endpoint /api/scurity/absen-terakhir
└── wallet_tagihan.pb.js     # Auto topup wallet (tidak ada notifikasi, side-effect)
```

---

### 📝 11. Konfigurasi

Semua konfigurasi hardcoded di dalam hook file. Tidak ada environment variable terpisah.

| Konstanta | File | Nilai |
|---|---|---|
| `_wargaBaseUrl` | `warga_notify.pb.js` | `https://prestige2.sawangan.web.id` |
| `_tagihanBaseUrl` | `tagihan_notify.pb.js` | `https://prestige2.sawangan.web.id` |
| `_aktivitasBaseUrl` | `aktivitas_notify.pb.js` | `https://prestige2.sawangan.web.id` |
| `SOS_BASE_URL` | `sos.pb.js` | `https://prestige2.sawangan.web.id` |
| `BASE_URL` | `scurity.pb.js` | `https://prestige2.sawangan.web.id` |
| `NTFY_TOPIC` | `scurity.pb.js` | `p2s-scurity` |
| `ntfy.sh endpoint` | semua hook | `https://ntfy.sh` |

---

### 🔄 12. Lifecycle Hook

```
User Action (CRUD)
  │
  ▼
PocketBase API Handler
  │
  ├─► Validasi (API Rules)
  ├─► Simpan ke SQLite
  │
  └─► Trigger Hook (onRecordAfter*Success)
        │
        ├─► Cek collection name (filter)
        ├─► Ambil data terkait (warga, user, iuran)
        ├─► Format pesan (Markdown + emoji)
        ├─► Buat payload JSON
        ├─► $http.send(POST, ntfy.sh)
        │     │
        │     ├─► 200 OK → log sukses
        │     └─► Error → log error, tidak throw
        │
        └─► (Fase 2: insert ke collection notifications)
```

---

### 📈 13. Metrik & Monitoring

| Metrik | Target | Cara Ukur |
|---|---|---|
| **Delivery rate** | > 99% | Log sukses/gagal di hook |
| **Latency notifikasi** | < 3 detik dari action | Timestamp hook vs timestamp ntfy |
| **Error rate** | < 1% | Monitoring log PocketBase |
| **Subscriber ntfy** | 5+ pengurus ter-install | Manual check |

---

### 🐛 14. Troubleshooting

| Masalah | Penyebab | Solusi |
|---|---|---|
| Notifikasi tidak muncul | ntfy.sh down / topic salah | Cek `https://ntfy.sh/p2s` di browser |
| Error `$http.send` timeout | Koneksi lambat / ntfy.sh block | Cek log PocketBase, pastikan server bisa akses internet |
| Notifikasi duplikat | Hook terpicu 2x | Cek tidak ada double hook, tambahkan dedup logic |
| Format pesan berantakan | Markdown tidak dirender | ntfy.sh support Markdown di Web UI, native app mungkin plain text |
| Attachment tidak muncul | URL file tidak valid / expired | Cek token file, pastikan URL bisa diakses publik |

---

### 📋 15. Changelog

| Tanggal | Versi | Deskripsi |
|---|---|---|
| 21 Jun 2026 | 0.1 | Implementasi awal: warga, tagihan, lampiran notification hooks |
| 22 Jun 2026 | 0.2 | Tambah lapor, aktivitas, SOS notification hooks |
| 23 Jun 2026 | 0.3 | Tambah scurity notification hook + endpoint absen-terakhir |
| 25 Jun 2026 | 0.4 | Perbaikan: lapor v2 dengan attach, deteksi perubahan di warga |
| 26 Jun 2026 | 1.0 | PRD-NOTIF.md — dokumentasi lengkap sistem notifikasi |

---

> ✨ Dokumen ini adalah panduan hidup sistem notifikasi. Update sesuai perkembangan fitur.