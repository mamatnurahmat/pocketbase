#!/bin/bash

echo "Memulai proses build client (React/Vite) menggunakan Docker..."

# Pastikan direktori tujuan ada
sudo mkdir -p /var/data/pocketbase/pb_public

# Build project menggunakan Docker container (node:20-alpine)
# Kita mount seluruh folder root project agar vite bisa menulis ke ../pb_public secara lokal.
docker run --rm \
  --platform linux/arm64 \
  -v "$(pwd)":/app \
  -w /app/client \
  node:20-alpine \
  sh -c "npm install && npm run build"

if [ $? -ne 0 ]; then
    echo "❌ Build gagal!"
    exit 1
fi

# Salin hasil build dari ./pb_public lokal ke target absolut /var/data/pocketbase/pb_public
echo "Menyalin hasil build ke /var/data/pocketbase/pb_public..."
sudo cp -r ./pb_public/* /var/data/pocketbase/pb_public/ 2>/dev/null || sudo cp -r ./pb_public/. /var/data/pocketbase/pb_public/

echo "✅ Selesai! Client berhasil dibuild dan disiapkan di folder /var/data/pocketbase/pb_public."
