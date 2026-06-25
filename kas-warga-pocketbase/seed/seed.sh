#!/bin/bash
# Seed data untuk Kas Warga PocketBase
# Usage: bash seed/seed.sh http://localhost:8090 admin@example.com yourpassword
#
# Prasyarat:
# 1. PocketBase sudah berjalan
# 2. Users sudah dibuat via Admin UI > Collections > users > New Record
# 3. Ganti placeholder di bawah dengan ID user asli

set -e

PB_URL="${1:-http://localhost:8090}"
ADMIN_EMAIL="${2:-admin@example.com}"
ADMIN_PASS="${3:-password}"

# ---- GANTI dengan ID user asli dari PocketBase ----
USER_ID_PAK_RT="REPLACE_ME"
USER_ID_BUDI="REPLACE_ME"
USER_ID_SITI="REPLACE_ME"
USER_ID_AGUS="REPLACE_ME"
USER_ID_RINA="REPLACE_ME"
USER_ID_DEDI="REPLACE_ME"

echo "🔐 Login admin..."
AUTH_RESP=$(curl -sf "$PB_URL/api/admins/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}")
TOKEN=$(echo "$AUTH_RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login gagal. Cek email/password admin."
  exit 1
fi
echo "✅ Login berhasil"

AUTH="Authorization: $TOKEN"

# ---- Import categories ----
echo ""
echo "📦 Import categories..."
curl -sf -X POST "$PB_URL/api/collections/import" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d @schema/categories.json > /dev/null
echo "✅ categories imported"

# ---- Import wallets ----
echo "📦 Import wallets..."
curl -sf -X POST "$PB_URL/api/collections/import" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d @schema/wallets.json > /dev/null
echo "✅ wallets imported"

# ---- Import transactions & ledgers ----
echo "📦 Import transactions..."
curl -sf -X POST "$PB_URL/api/collections/import" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d @schema/transactions.json > /dev/null
echo "✅ transactions imported"

echo "📦 Import ledgers..."
curl -sf -X POST "$PB_URL/api/collections/import" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d @schema/ledgers.json > /dev/null
echo "✅ ledgers imported"

# ---- Create wallet records ----
echo ""
echo "👛 Membuat wallet KAS..."
curl -sf -X POST "$PB_URL/api/collections/wallets/records" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"user\":\"$USER_ID_PAK_RT\",\"wallet_type\":\"KAS\",\"balance\":0,\"is_active\":true,\"note\":\"Kas pusat RT 05\"}" > /dev/null
echo "✅ wallet KAS — Pak RT"

echo "👛 Membuat wallet warga..."
for ID in "$USER_ID_BUDI" "$USER_ID_SITI" "$USER_ID_AGUS" "$USER_ID_RINA" "$USER_ID_DEDI"; do
  curl -sf -X POST "$PB_URL/api/collections/wallets/records" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"user\":\"$ID\",\"wallet_type\":\"PERSONAL\",\"balance\":0,\"is_active\":true}" > /dev/null
done
echo "✅ 5 wallet PERSONAL warga dibuat"

echo ""
echo "🎉 Seed selesai!"
echo ""
echo "Selanjutnya:"
echo "  - Buka Admin UI untuk verifikasi data"
echo "  - Wallet KAS: cek collection wallets → wallet_type=KAS"
echo "  - Mulai buat transaksi IURAN pertama"