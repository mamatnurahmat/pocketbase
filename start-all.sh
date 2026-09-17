#!/bin/bash
# Start all services in order
set -e

echo "🚀 Starting PocketBase services..."
cd "$(dirname "$0")/api"
docker compose up -d
echo "✅ PocketBase + API + Swagger started"

echo ""
echo "🚀 Starting Caddy..."
cd "$(dirname "$0")/caddy"
docker compose up -d
echo "✅ Caddy started"

echo ""
echo "=== All services running ==="
docker compose ps
cd ../caddy
docker compose ps
