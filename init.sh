#!/bin/bash

echo "Memulai inisialisasi environment untuk PocketBase..."

# 1. Cek instalasi Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker belum terinstall. Silakan install Docker terlebih dahulu."
    exit 1
else
    echo "✅ Docker terdeteksi."
fi

# Cek instalasi Docker Compose
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose belum terinstall."
    exit 1
else
    echo "✅ Docker Compose terdeteksi."
fi

# 2. Pembuatan Direktori Volume
BASE_DIR="/var/data/pocketbase"
echo "Membuat struktur direktori di $BASE_DIR..."

# Meminta akses sudo sekali di awal
sudo -v

# Membuat direktori dasar dan sub-direktori
sudo mkdir -p $BASE_DIR/pb_data
sudo mkdir -p $BASE_DIR/pb_public
sudo mkdir -p $BASE_DIR/pb_migrations
sudo mkdir -p $BASE_DIR/swagger
sudo mkdir -p $BASE_DIR/caddy_data
sudo mkdir -p $BASE_DIR/caddy_config

# 3. Pastikan user-level bisa mengakses tanpa sudo terus-menerus
echo "Mengubah kepemilikan (ownership) folder $BASE_DIR ke user: $USER"
# chown kepada user yang menjalankan script
sudo chown -R $USER $BASE_DIR

# 4. Menyalin data awal (Caddyfile, swagger, dan migrations)
echo "Menyiapkan file konfigurasi awal ke direktori volume..."

if [ -f "./Caddyfile" ]; then
    cp ./Caddyfile $BASE_DIR/Caddyfile
fi

if [ -d "./swagger" ]; then
    cp -r ./swagger/* $BASE_DIR/swagger/ 2>/dev/null
fi

if [ -d "./pb_migrations" ]; then
    cp -r ./pb_migrations/* $BASE_DIR/pb_migrations/ 2>/dev/null
fi

# Menjadikan build_client.sh executable
chmod +x ./build_client.sh 2>/dev/null

echo "✅ Inisialisasi selesai!"
echo "Semua folder siap di $BASE_DIR dengan akses untuk user '$USER'."
echo "Anda bisa menjalankan project dengan:"
echo "docker compose -f docker-compose.local.yml up -d"
