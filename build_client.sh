#!/bin/bash

echo "Memulai proses build client (React/Vite)..."

# Masuk ke folder client
cd client || exit 1

# Install dependencies (jika ada yang baru)
echo "1. Install NPM dependencies..."
npm install

# Build production
# Catatan: vite.config.js sudah diset untuk melakukan build langsung ke ../pb_public
echo "2. Build project ke folder pb_public..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build gagal!"
    exit 1
fi

echo "✅ Selesai! Client berhasil dibuild dan disiapkan di folder pb_public."
