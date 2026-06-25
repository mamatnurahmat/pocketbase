# Migrasi Upload Bukti Bayar — Langsung PB → API

## Tujuan
Pindah semua operasi upload bukti bayar dari client (langsung `pb.collection().*`) ke Flask API (`api.sawangan.web.id/v1/iuran/*`).

---

## 1. API Endpoint Baru

### `POST /v1/iuran/upload-bukti`
- **Auth**: Bearer token (sama seperti `/v1/tagihan/approve`)
- **Body**: `multipart/form-data`
  - `warga_id` (string) — ID warga
  - `iuran_ids[]` (array string) — satu atau lebih ID iuran
  - `file_bukti` (file) — gambar/PDF
- **Logika** (pindah dari `Iuran.jsx.handleSubmit`):
  1. Generate random ID untuk lampiran
  2. **Create lampiran** → `pb.collection('lampiran').create(formData)` dengan file
  3. Loop tiap `iuran_id`:
     - Cari tagihan existing: `warga={warga_id} && iuran={iuran_id}`
     - Jika ada → update `lampiran` + `status_pembayaran='Menunggu Konfirmasi'`
     - Jika tidak → create tagihan baru
  4. **Create log aktivitas** → `pb.collection('aktivitas_warga').create()`
- **Response**:
  ```json
  {
    "success": true,
    "lampiran_id": "...",
    "tagihan_count": 3,
    "message": "Bukti pembayaran berhasil diupload"
  }
  ```

### Model (Flask-RESTx)
```python
iuran_ns = api.namespace("iuran", description="Upload bukti bayar")
```

### Helper upload
Gunakan `flask.request.files` + forward ke PB via `requests.post` dgn `files=` param.

---

## 2. Perubahan Client

### `client/src/lib/pocketbase.js`
- Export `API_URL = 'https://api.sawangan.web.id'` biar semua komponen bisa pakai.

### `client/src/pages/Iuran.jsx`
**Ganti**:
```jsx
// ── SEBELUM (langsung PB) ──
const lampiranRecord = await pb.collection('lampiran').create(formData);
// ... loop tagihan ...
await pb.collection('aktivitas_warga').create({...});

// ── SESUDAH (via API) ──
const formData = new FormData();
formData.append('warga_id', warga.id);
selectedIurans.forEach(id => formData.append('iuran_ids[]', id));
formData.append('file_bukti', file);

const res = await fetch(`${API_URL}/v1/iuran/upload-bukti`, {
  method: 'POST',
  headers: { 'Authorization': pb.authStore.token },
  body: formData,
});
if (!res.ok) throw await res.json();
```

**Hapus**:
- Import `generateId()` (dikerjakan backend)
- Loop tagihan manual
- Log aktivitas manual

### `client/src/components/LampiranForm.jsx`
- Sama seperti Iuran.jsx — ganti langsung PB → panggil API endpoint.

---

## 3. File Upload Forwarding (Flask → PB)

Masalah: Flask `requests` library perlu forward file `multipart` ke PB.

Pattern:
```python
from flask import request

file = request.files['file_bukti']
form_data = {
    'id': lampiran_id,
    'warga': warga_id,
    'iuran': iuran_ids,  # array
    'approval': 'false',
}
files = {'file_bukti': (file.filename, file.stream, file.content_type)}

resp = requests.post(
    f"{PB_URL}/api/collections/lampiran/records",
    headers={"Authorization": token},
    data=form_data,
    files=files,
)
```

---

## 4. Urutan Implementasi

| Step | File | Action |
|------|------|--------|
| 1 | `api/app.py` | Tambah namespace `iuran_ns`, endpoint `upload-bukti`, model |
| 2 | `api/app.py` | Implementasi upload forward + logika tagihan |
| 3 | `client/src/lib/pocketbase.js` | Export `API_URL` |
| 4 | `client/src/pages/Iuran.jsx` | Ganti panggilan PB → fetch ke API |
| 5 | `client/src/components/LampiranForm.jsx` | Sama, ganti panggilan PB → fetch ke API |
| 6 | Test | `docker compose build --no-cache api && docker compose up -d --force-recreate api` |
| 7 | Test | Upload bukti dari client, verifikasi lampiran + tagihan + log |

---

## 5. Rollback Plan
- Jika error: kembalikan client ke kode sebelumnya (langsung PB)
- API tidak perlu rollback, endpoint baru tidak mengganggu existing