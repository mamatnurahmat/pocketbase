#!/bin/bash

# ============================================================
# reset_admin.sh - Reset PocketBase Superuser
# ============================================================

EMAIL="${1:-admin@example.com}"
PASSWORD="${2:-password1234}"

echo ""
echo "🔑 Reset Superuser PocketBase"
echo "=============================="
echo "  Email    : $EMAIL"
echo "  Password : $PASSWORD"
echo ""

docker compose exec pocketbase /usr/local/bin/pocketbase superuser upsert "$EMAIL" "$PASSWORD" --dir /pb_data

echo ""
echo "✅ Selesai! Login ke http://localhost:8090/_/ dengan kredensial di atas."
echo ""
