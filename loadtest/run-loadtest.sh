#!/usr/bin/env bash
# =============================================================================
# run-loadtest.sh
# =============================================================================
# Load Test: Semua Warga Login & Get Data API Secara Bersamaan
#
# Simulasi seluruh warga melakukan:
#   1. Login (POST /api/collections/users/auth-with-password)
#   2. GET /api/collections/warga/records?expand=user,status
#   3. GET /api/collections/warga/records?filter=user%3D"<id>"&expand=user,status
#
# Menghasilkan:
#   - Laporan HTML interaktif
#   - Laporan JSON mentah
#   - Ringkasan di stdout
#
# Usage:
#   ./run-loadtest.sh               # default: 40 VU, 60s, production
#   ./run-loadtest.sh --local       # localhost:8090
#   ./run-loadtest.sh --vus 80      # 80 virtual users
#   ./run-loadtest.sh --duration 300  # 5 menit
#   ./run-loadtest.sh --url https://staging.example.com/api  # custom URL
# =============================================================================

set -euo pipefail

# ── Defaults ─────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K6_SCRIPT="${SCRIPT_DIR}/loadtest-warga.js"
ACCOUNTS_FILE="${SCRIPT_DIR}/warga-accounts.json"
REPORT_DIR="${SCRIPT_DIR}/reports"
BASE_URL="https://prestige2.sawangan.web.id/api"
TARGET_VUS=""
DURATION="60"
K6_DEBUG=""

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── Parse Arguments ─────────────────────────────────────────────────────────
print_usage() {
  cat <<EOF
${BOLD}Usage:${NC} $0 [OPTIONS]

${BOLD}Load Test Options:${NC}
  --local             Gunakan server localhost:8090
  --prod              Gunakan server production (default)
  --url URL           Custom base URL API (e.g. https://staging.example.com/api)
  --vus N             Jumlah virtual user (default: dari jumlah akun di JSON)
  --duration SECONDS  Durasi test dalam detik (default: 60)
  --accounts PATH     File JSON daftar akun warga (default: ./warga-accounts.json)
  --report-dir PATH   Direktori output report (default: ./reports)
  --debug             Jalankan k6 dengan --verbose

${BOLD}Examples:${NC}
  $0                                # Production, 40 VU, 60 detik
  $0 --local                        # Localhost, 40 VU, 60 detik
  $0 --vus 100 --duration 120       # 100 VU selama 2 menit
  $0 --vus 10 --local --debug       # 10 VU, local, verbose log

EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --local)
      BASE_URL="http://localhost:8090/api"
      shift
      ;;
    --prod)
      BASE_URL="https://prestige2.sawangan.web.id/api"
      shift
      ;;
    --url)
      BASE_URL="$2"
      shift 2
      ;;
    --vus)
      TARGET_VUS="$2"
      shift 2
      ;;
    --duration)
      DURATION="$2"
      shift 2
      ;;
    --accounts)
      ACCOUNTS_FILE="$2"
      shift 2
      ;;
    --report-dir)
      REPORT_DIR="$2"
      shift 2
      ;;
    --debug)
      K6_DEBUG="--verbose"
      shift
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      print_usage
      exit 1
      ;;
  esac
done

# ── Pre-flight Checks ───────────────────────────────────────────────────────
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  LOAD TEST: WARGA LOGIN & GET DATA${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check k6
if ! command -v k6 &>/dev/null; then
  echo -e "${RED}ERROR: k6 tidak ditemukan.${NC}"
  echo ""
  echo "Install k6:"
  echo "  macOS:  brew install k6"
  echo "  Linux:  sudo gpg -k && sudo rm /usr/share/keyrings/k6-archive-keyring.gpg 2>/dev/null; \\"
  echo "          curl -s https://dl.k6.io/key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/k6-archive-keyring.gpg; \\"
  echo "          echo 'deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main' | \\"
  echo "          sudo tee /etc/apt/sources.list.d/k6.list; sudo apt update && sudo apt install k6"
  echo "  Docker: docker run --rm -v \$(pwd):/scripts grafana/k6 run /scripts/loadtest-warga.js"
  exit 1
fi

# Check accounts file
if [[ ! -f "$ACCOUNTS_FILE" ]]; then
  echo -e "${RED}ERROR: File akun warga tidak ditemukan: $ACCOUNTS_FILE${NC}"
  echo "Buat file JSON dengan format:"
  echo '  [{"kode":"C09","email":"c09@warga.local","password":"c09@warga.local"}, ...]'
  exit 1
fi

# Count accounts
ACCOUNTS_COUNT=$(python3 -c "import json; print(len(json.load(open('$ACCOUNTS_FILE'))))" 2>/dev/null || \
  node -e "console.log(require('$ACCOUNTS_FILE').length)" 2>/dev/null || \
  echo "?")
echo -e "  ${BOLD}Accounts file:${NC} ${ACCOUNTS_FILE} (${ACCOUNTS_COUNT} akun)"

# Set TARGET_VUS if not specified
if [[ -z "$TARGET_VUS" ]]; then
  if [[ "$ACCOUNTS_COUNT" =~ ^[0-9]+$ ]]; then
    TARGET_VUS=$((ACCOUNTS_COUNT < 40 ? ACCOUNTS_COUNT : 40))
  else
    TARGET_VUS=40
  fi
fi
echo -e "  ${BOLD}Virtual Users:${NC} ${TARGET_VUS}"
echo -e "  ${BOLD}Duration:${NC}      ${DURATION}s"
echo -e "  ${BOLD}Base URL:${NC}      ${BASE_URL}"
echo -e "  ${BOLD}Report Dir:${NC}    ${REPORT_DIR}"
echo ""

# Create report directory
mkdir -p "$REPORT_DIR"

# ── Quick Health Check ───────────────────────────────────────────────────────
echo -e "${YELLOW}[*] Health check ke server...${NC}"
if curl -sf --connect-timeout 10 "${BASE_URL}/health" >/dev/null 2>&1; then
  echo -e "${GREEN}    ✓ Server OK: ${BASE_URL}/health${NC}"
else
  echo -e "${RED}    ✗ Server tidak merespon di ${BASE_URL}/health${NC}"
  echo -e "${YELLOW}    Melanjutkan test... (pastikan server sudah berjalan)${NC}"
fi
echo ""

# ── Run k6 ───────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[*] Menjalankan k6 load test...${NC}"
echo -e "    Tekan ${BOLD}Ctrl+C${NC} untuk menghentikan lebih awal."
echo ""

START_TIME=$(date +%s)

# Build k6 command
K6_CMD=(
  k6 run
  ${K6_DEBUG}
  --quiet
  "${K6_SCRIPT}"
  -e "BASE_URL=${BASE_URL}"
  -e "TARGET_VUS=${TARGET_VUS}"
  -e "DURATION=${DURATION}"
  -e "REPORT_DIR=${REPORT_DIR}"
)

# Execute k6
"${K6_CMD[@]}"
K6_EXIT_CODE=$?

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""

# ── Find Generated Reports ───────────────────────────────────────────────────
LATEST_HTML=$(ls -t "$REPORT_DIR"/loadtest-warga-*.html 2>/dev/null | head -1)
LATEST_JSON=$(ls -t "$REPORT_DIR"/loadtest-warga-*.json 2>/dev/null | head -1)

# ── Summary ──────────────────────────────────────────────────────────────────
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  LOAD TEST SELESAI${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BOLD}Exit Code:${NC}    ${K6_EXIT_CODE}"
echo -e "  ${BOLD}Elapsed:${NC}      ${ELAPSED}s"
echo ""

if [[ -n "$LATEST_HTML" ]]; then
  HTML_SIZE=$(du -h "$LATEST_HTML" | cut -f1)
  echo -e "  ${GREEN}✓ HTML Report:${NC}  ${LATEST_HTML} (${HTML_SIZE})"
  echo -e "    Buka:  ${CYAN}open ${LATEST_HTML}${NC}"
fi

if [[ -n "$LATEST_JSON" ]]; then
  JSON_SIZE=$(du -h "$LATEST_JSON" | cut -f1)
  echo -e "  ${GREEN}✓ JSON Report:${NC}  ${LATEST_JSON} (${JSON_SIZE})"
fi

echo ""

# Show quick summary from JSON if available
if [[ -n "$LATEST_JSON" ]] && command -v python3 &>/dev/null; then
  echo -e "${BOLD}Quick Summary:${NC}"
  python3 -c "
import json,sys
with open('$LATEST_JSON') as f:
    d = json.load(f)
m = d.get('metrics',{})

def p(key, label):
    v = m.get(key,{})
    if v:
        print(f'  {label}: avg={v.get(\"avg\",\"?\")}  p95={v.get(\"p(95)\",\"?\")}  max={v.get(\"max\",\"?\")}')

p('http_req_duration',        'HTTP Req Duration (ms)')
p('http_req_failed',          'HTTP Req Failed Rate  ')
p('login_duration',           'Login Duration (ms)   ')
p('login_success_rate',       'Login Success Rate    ')
p('get_warga_list_duration',  'Warga List (ms)       ')
p('get_warga_detail_duration','Warga Detail (ms)     ')
p('http_reqs',                'Total HTTP Requests   ')

# Iterations
it = m.get('iterations',{})
print(f'  Total Iterations:    {it.get(\"count\",\"?\")}')
" 2>/dev/null || true
fi

echo ""
echo -e "${BOLD}Done.${NC}"

exit "${K6_EXIT_CODE}"