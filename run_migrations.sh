#!/bin/bash

echo "🚀 Menyiapkan migrasi PocketBase..."

# Menyalin file migrasi terbaru dari direktori lokal (repo) ke volume absolut
# agar container mengenali migrasi yang baru ditambahkan
sudo cp -r ./pb_migrations/* /var/data/pocketbase/pb_migrations/ 2>/dev/null

echo "🚀 Menjalankan migrasi di dalam container..."

# Menjalankan perintah migrate menggunakan docker-compose.local.yml
docker compose -f docker-compose.local.yml exec pocketbase /usr/local/bin/pocketbase migrate up --dir /pb_data --migrationsDir /pb_migrations

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migrasi berhasil dijalankan!"
else
    echo ""
    echo "❌ Terjadi kesalahan saat menjalankan migrasi."
    exit 1
fi
