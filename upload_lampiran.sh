#!/bin/bash
# ============================================================
# upload_lampiran.sh — Upload lampiran tagihan via admin
#
# Usage:
#   ./upload_lampiran.sh <no_rumah> <kode_iuran> <file_bukti>
#
# Contoh:
#   ./upload_lampiran.sh F05 IPL-06-26 bukti_bayar.jpg
#   ./upload_lampiran.sh A01 IPL-06-26 photo.png
#
# Kode iuran yang umum: IPL-01-26 ... IPL-12-26, KEB-01-26, KEAMANAN-01-26
# ============================================================

set -euo pipefail

NO_RUMAH="${1:-}"
KODE_IURAN="${2:-}"
FILE_BUKTI="${3:-}"

if [ -z "$NO_RUMAH" ] || [ -z "$KODE_IURAN" ] || [ -z "$FILE_BUKTI" ]; then
  echo "Usage: $0 <no_rumah> <kode_iuran> <file_bukti>"
  echo "Contoh: $0 F05 IPL-06-26 bukti.jpg"
  exit 1
fi

if [ ! -f "$FILE_BUKTI" ]; then
  echo "❌ File tidak ditemukan: $FILE_BUKTI"
  exit 1
fi

PB_URL="${PB_URL:-http://localhost:8090}"
API_URL="${API_URL:-http://localhost:8888}"

# ── 1. Login admin ──
echo "🔑 Login admin..."
LOGIN_RESP=$(curl -s -X POST "$PB_URL/api/collections/_superusers/auth-with-password" \
  -H "Content-Type: application/json" \
  -d '{"identity":"admin@example.com","password":"password1234"}')

ADMIN_TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null)

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Gagal login admin"
  echo "$LOGIN_RESP"
  exit 1
fi
echo "   ✅ Token didapat"

# ── 2. Cari warga by no_rumah ──
echo "🔍 Cari warga no_rumah=$NO_RUMAH..."
WARGA_RESP=$(curl -s "$PB_URL/api/collections/warga/records?filter=(no_rumah='$NO_RUMAH')&perPage=1" \
  -H "Authorization: $ADMIN_TOKEN")

WARGA_ID=$(echo "$WARGA_RESP" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data.get('items', [])
if items:
    print(items[0]['id'])
else:
    print('')
" 2>/dev/null)

if [ -z "$WARGA_ID" ]; then
  echo "❌ Warga dengan no_rumah=$NO_RUMAH tidak ditemukan"
  exit 1
fi

# Dapatkan info user warga
WARGA_NAME=$(echo "$WARGA_RESP" | python3 -c "
import sys, json
items = json.load(sys.stdin)['items']
if items:
    # Cari nama user
    uid = items[0].get('user', '')
    print(uid)
" 2>/dev/null)
echo "   ✅ Warga ID: $WARGA_ID (no.$NO_RUMAH)"

# ── 3. Cari iuran by kode ──
echo "🔍 Cari iuran kode=$KODE_IURAN..."
IURAN_RESP=$(curl -s "$PB_URL/api/collections/iuran/records?filter=(kode='$KODE_IURAN')&perPage=1" \
  -H "Authorization: $ADMIN_TOKEN")

IURAN_ID=$(echo "$IURAN_RESP" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data.get('items', [])
if items:
    print(items[0]['id'])
else:
    print('')
" 2>/dev/null)

if [ -z "$IURAN_ID" ]; then
  echo "❌ Iuran dengan kode=$KODE_IURAN tidak ditemukan"
  echo "   Coba cek daftar iuran: curl $API_URL/v1/iuran/available?warga_id=$WARGA_ID"
  exit 1
fi

IURAN_NOMINAL=$(echo "$IURAN_RESP" | python3 -c "
import sys, json
items = json.load(sys.stdin)['items']
if items:
    print(items[0].get('nominal', 0))
" 2>/dev/null)
echo "   ✅ Iuran ID: $IURAN_ID (Rp ${IURAN_NOMINAL})"

# ── 4. Upload via API ──
echo "📤 Upload bukti..."
UPLOAD_RESP=$(curl -s -X POST "$API_URL/v1/iuran/upload-bukti" \
  -H "Authorization: $ADMIN_TOKEN" \
  -F "warga_id=$WARGA_ID" \
  -F "iuran_ids[]=$IURAN_ID" \
  -F "file_bukti=@$FILE_BUKTI")

SUCCESS=$(echo "$UPLOAD_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success',''))" 2>/dev/null)

if [ "$SUCCESS" = "True" ]; then
  LAMPIRAN_ID=$(echo "$UPLOAD_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('lampiran_id',''))" 2>/dev/null)
  TAGIHAN_COUNT=$(echo "$UPLOAD_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tagihan_count',''))" 2>/dev/null)
  echo ""
  echo "═══════════════════════════════════════"
  echo "  ✅ UPLOAD BERHASIL"
  echo "═══════════════════════════════════════"
  echo "  Warga       : No.$NO_RUMAH ($WARGA_ID)"
  echo "  Iuran       : $KODE_IURAN (Rp ${IURAN_NOMINAL})"
  echo "  Lampiran ID : $LAMPIRAN_ID"
  echo "  Tagihan     : $TAGIHAN_COUNT dibuat/diupdate"
  echo "  File        : $(basename "$FILE_BUKTI")"
  echo "═══════════════════════════════════════"
else
  echo ""
  echo "❌ Upload gagal:"
  echo "$UPLOAD_RESP" | python3 -m json.tool 2>/dev/null || echo "$UPLOAD_RESP"
  exit 1
fi

# ── 5. Info tambahan ──
echo ""
echo "💡 Lihat di dashboard:"
echo "   https://prestige2.sawangan.web.id/_/#/collections/tagihan"
echo "   https://prestige2.sawangan.web.id/_/#/collections/lampiran"