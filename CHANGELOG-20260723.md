# Changelog — Perbaikan Bug & Enhancement

## [2026-07-23] Fix: Approve Tagihan Gagal & Transaksi Tidak Tercatat

### Issue
Ketika pengurus meng-approve tagihan:
- Status tagihan berubah menjadi **Lunas**
- Tapi **transaksi & ledger tidak tercatat**
- Error: `PocketBase error (404): The requested resource wasn't found.`
- Dana masuk ke **wallet PERSONAL** bukan **KAS**

### Root Cause

1. **Collection Rules Terlalu Ketat**
   - `wallets.updateRule` hanya untuk superusers → user biasa ditolak akses (404)
   - `ledgers.createRule` hanya untuk superusers → user biasa ditolak akses (404)

2. **PocketBase v0.39 Bug: nilai `0` dianggap blank**
   - Field `balance` di wallets & ledgers dengan `required: true` menolak nilai `0`
   - Menyebabkan `Cannot be blank` error

3. **Logika Transfer Salah**
   - API mengirim dana ke wallet **PERSONAL** jika jatuh tempo masih bulan depan
   - Seharusnya semua pembayaran tagihan masuk ke **KAS**

4. **Hook JS usang**
   - Hook `wallet_tagihan.pb.js` menggunakan `new Record(col, {data})` yang bermasalah di PB v0.39
   - Tidak ada pengecekan duplikasi dengan API

### Perubahan

| File | Perubahan |
|---|---|
| `api/app.py` | Hapus logic transfer ke PERSONAL; selalu kirim ke KAS |
| `pb_hooks/wallet_tagihan.pb.js` | Rewrite v3: pakai `findRecordById` + `set()`, deteksi duplikasi, kirim ke KAS |
| `pb_public/sw.js` | Bump cache `v6` → `v7` untuk refresh client |
| `pb_migrations/1783000001_updated_payout.js` | Fix urutan migrasi payout (rename dari 1782985742) |
| `pb_migrations/1783000002_updated_payout.js` | Fix urutan migrasi payout (rename dari 1782987088) |
| `pb_migrations/1783042191_updated_payout.js` | Fix urutan migrasi payout (rename dari 1783042190) |
| `pb_migrations/1784802772_updated_wallets.js` | Auto-migrasi: `balance` tidak required |
| `pb_migrations/1784813586_updated_wallets.js` | Auto-migrasi: `updateRule` dibuka |
| `pb_migrations/1784813594_updated_ledgers.js` | Auto-migrasi: `createRule` dibuka |
| `pb_migrations/1784814379_updated_ledgers.js` | Auto-migrasi: `balance_before/after` tidak required |

### Perbaikan Tambahan

- **K3s dinonaktifkan** — Traefik K3s mengambil alih port 443 dan mencegah Caddy melayani HTTPS dengan benar
- **Data KAS** — Nama wallet diubah dari "Kas RW 04" menjadi "Prestige 2 Sawangan"
- **Saldo KAS** — Diupdate ke Rp16.116.491 (data terakhir)
- **Seed data** — 62 warga, 13 iuran, 63 wallet, 124 tagihan Agutus (IPL + 17an)
