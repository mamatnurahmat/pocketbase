#!/bin/bash
# ================================================================
# backup_collections.sh - Backup semua koleksi PocketBase
# ================================================================
# Menyimpan setiap koleksi sebagai file JSON terpisah ke:
#   /var/data/pocketbase/backup/[YYYY-MM-DD]/
#
# Menggunakan PocketBase REST API (AMAN, tidak corrupt WAL).
#
# Usage:
#   ./backup_collections.sh                           # pakai default admin@example.com / password1234
#   ./backup_collections.sh admin@example.com mypass  # kredensial kustom
# ================================================================

set -euo pipefail

# ─── Konfigurasi ────────────────────────────────────────────────
PB_URL="${PB_URL:-http://localhost:8090}"
ADMIN_EMAIL="${1:-admin@example.com}"
ADMIN_PASSWORD="${2:-password1234}"
DATE_DIR=$(date +%Y-%m-%d)
BACKUP_DIR="/var/data/pocketbase/backup/${DATE_DIR}"
PER_PAGE=500
NTFY_URL="https://ntfy.sh/p2s"
HOSTNAME=$(hostname)
SCRIPT_START=$(date +%s)

# ─── Fungsi notifikasi ntfy ──────────────────────────────────────
ntfy_notify() {
  local title="$1"
  local message="$2"
  local priority="${3:-default}"
  local tags="${4:-floppy_disk}"
  curl -sS -o /dev/null -X POST "$NTFY_URL" \
    -H "Title: ${title}" \
    -H "Priority: ${priority}" \
    -H "Tags: ${tags}" \
    -d "${message}" 2>/dev/null || true
}

# ─── Warna output ───────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_err()   { echo -e "${RED}[ERROR]${NC} $*"; }

# ─── Notifikasi mulai ───────────────────────────────────────────
ntfy_notify "📋 Collections Backup Started" "Server: ${HOSTNAME}\nDir: ${DATE_DIR}\nWaktu: $(date '+%Y-%m-%d %H:%M:%S')"

# ─── Buat direktori backup ──────────────────────────────────────
mkdir -p "$BACKUP_DIR"
log_info "Backup directory: ${BACKUP_DIR}"

# ─── Step 1: Autentikasi admin ──────────────────────────────────
log_info "Authenticating as admin (${ADMIN_EMAIL})..."

# PocketBase v0.22+ menggunakan _superusers collection untuk admin auth
AUTH_RESPONSE=$(curl -sS -X POST "${PB_URL}/api/collections/_superusers/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")

TOKEN=$(echo "$AUTH_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "" ]; then
  log_err "Gagal login. Response: $AUTH_RESPONSE"
  ntfy_notify "❌ Collections Backup GAGAL" "Server: ${HOSTNAME}\nDir: ${DATE_DIR}\nError: Autentikasi gagal\nWaktu: $(date '+%Y-%m-%d %H:%M:%S')" "high" "x"
  exit 1
fi
log_ok "Token didapatkan."

# ─── Step 2: Ambil daftar koleksi ───────────────────────────────
log_info "Mengambil daftar koleksi..."

COLLECTIONS_JSON=$(curl -sS "${PB_URL}/api/collections?perPage=500" \
  -H "Authorization: ${TOKEN}")

# Ambil nama dan id koleksi menggunakan python3
COLLECTIONS=$(echo "$COLLECTIONS_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for item in data.get('items', []):
    print(f\"{item['name']}|{item['id']}\")
")

if [ -z "$COLLECTIONS" ]; then
  log_err "Tidak ada koleksi ditemukan."
  ntfy_notify "❌ Collections Backup GAGAL" "Server: ${HOSTNAME}\nDir: ${DATE_DIR}\nError: Tidak ada koleksi\nWaktu: $(date '+%Y-%m-%d %H:%M:%S')" "high" "x"
  exit 1
fi

COL_COUNT=$(echo "$COLLECTIONS" | wc -l)
log_ok "Ditemukan ${COL_COUNT} koleksi."

# ─── Step 3: Export setiap koleksi ──────────────────────────────
EXPORTED=0
FAILED=0

while IFS='|' read -r col_name col_id; do
  log_info "Backup koleksi: ${col_name} (${col_id})"
  OUTFILE="${BACKUP_DIR}/${col_name}.json"

  # Ambil halaman pertama untuk dapatkan totalPages
  PAGE1=$(curl -sS "${PB_URL}/api/collections/${col_id}/records?perPage=${PER_PAGE}&page=1" \
    -H "Authorization: ${TOKEN}")

  TOTAL_PAGES=$(echo "$PAGE1" | python3 -c "import sys,json; print(json.load(sys.stdin)['totalPages'])" 2>/dev/null)
  TOTAL_ITEMS=$(echo "$PAGE1" | python3 -c "import sys,json; print(json.load(sys.stdin)['totalItems'])" 2>/dev/null)

  if [ -z "$TOTAL_PAGES" ]; then
    log_err "  Gagal membaca data koleksi ${col_name}"
    FAILED=$((FAILED + 1))
    continue
  fi

  log_info "  Total records: ${TOTAL_ITEMS}, halaman: ${TOTAL_PAGES}"

  # Gabungkan semua halaman jadi satu array JSON
  python3 << PYEOF > "$OUTFILE"
import sys, json, subprocess, os

col_id = """${col_id}"""
token = """${TOKEN}"""
pb_url = """${PB_URL}"""
per_page = ${PER_PAGE}
total_pages = ${TOTAL_PAGES}

all_records = []

for page in range(1, total_pages + 1):
    import subprocess
    result = subprocess.run([
        "curl", "-sS",
        f"{pb_url}/api/collections/{col_id}/records?perPage={per_page}&page={page}",
        "-H", f"Authorization: {token}"
    ], capture_output=True, text=True)
    
    if result.returncode != 0:
        print(json.dumps({"error": f"Failed to fetch page {page}"}), file=sys.stderr)
        sys.exit(1)
    
    data = json.loads(result.stdout)
    all_records.extend(data.get("items", []))

# Output final JSON
output = {
    "collection": "${col_name}",
    "totalItems": len(all_records),
    "items": all_records
}
print(json.dumps(output, indent=2, ensure_ascii=False))
PYEOF

  if [ $? -eq 0 ] && [ -s "$OUTFILE" ]; then
    FILE_SIZE=$(du -h "$OUTFILE" | cut -f1)
    log_ok "  → ${OUTFILE} (${FILE_SIZE})"
    EXPORTED=$((EXPORTED + 1))
  else
    log_err "  → Gagal menyimpan ${OUTFILE}"
    FAILED=$((FAILED + 1))
  fi

done <<< "$COLLECTIONS"

# ─── Step 4: Buat metadata ──────────────────────────────────────
META_FILE="${BACKUP_DIR}/_backup_meta.json"
python3 << PYEOF > "$META_FILE"
import json
from datetime import datetime
meta = {
    "date": "${DATE_DIR}",
    "timestamp": datetime.now().isoformat(),
    "pocketbase_url": "${PB_URL}",
    "total_collections": ${COL_COUNT},
    "exported": ${EXPORTED},
    "failed": ${FAILED}
}
print(json.dumps(meta, indent=2, ensure_ascii=False))
PYEOF

# ─── Ringkasan ──────────────────────────────────────────────────
SCRIPT_END=$(date +%s)
DURATION=$((SCRIPT_END - SCRIPT_START))

echo ""
echo "============================================="
echo -e " Backup selesai: ${GREEN}${EXPORTED} berhasil${NC}, ${RED}${FAILED} gagal${NC}"
echo " Lokasi: ${BACKUP_DIR}"
echo " Durasi: ${DURATION}s"
echo "============================================="
ls -lh "$BACKUP_DIR"

# ─── Notifikasi selesai ──────────────────────────────────────────
if [ "$FAILED" -eq 0 ]; then
  ntfy_notify "✅ Collections Backup Sukses" "Server: ${HOSTNAME}\nDir: ${DATE_DIR}\nKoleksi: ${EXPORTED}/${COL_COUNT} berhasil\nDurasi: ${DURATION}s\nWaktu: $(date '+%Y-%m-%d %H:%M:%S')" "low" "white_check_mark"
else
  ntfy_notify "⚠️ Collections Backup Sebagian" "Server: ${HOSTNAME}\nDir: ${DATE_DIR}\nBerhasil: ${EXPORTED}/${COL_COUNT}\nGagal: ${FAILED}\nDurasi: ${DURATION}s\nWaktu: $(date '+%Y-%m-%d %H:%M:%S')" "high" "warning"
fi