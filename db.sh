#!/bin/bash

ACTION=$1
LOCATION=$2

if [ -z "$ACTION" ] || [ -z "$LOCATION" ]; then
  echo "============================================="
  echo " PocketBase Backup & Restore Script"
  echo "============================================="
  echo "Cara penggunaan:"
  echo "  ./db.sh backup  <nama_file.tar.gz>"
  echo "  ./db.sh restore <nama_file.tar.gz>"
  echo ""
  echo "Contoh:"
  echo "  ./db.sh backup backup-18juni.tar.gz"
  echo "  ./db.sh restore backup-18juni.tar.gz"
  exit 1
fi

if [ "$ACTION" == "backup" ]; then
  echo "[+] Membuat backup database ke $LOCATION..."
  
  # Compress the pb_data directory to a tar.gz file
  tar -czvf "$LOCATION" pb_data/
  
  if [ $? -eq 0 ]; then
    echo "[+] Backup berhasil dibuat di $LOCATION!"
  else
    echo "[-] Terjadi kesalahan saat membuat backup."
    exit 1
  fi

elif [ "$ACTION" == "restore" ]; then
  if [ ! -f "$LOCATION" ]; then
    echo "[-] Error: File backup '$LOCATION' tidak ditemukan!"
    exit 1
  fi
  
  echo "[+] Memulai proses restore dari $LOCATION..."
  
  echo "    -> Mematikan service PocketBase sementara..."
  docker compose stop pocketbase
  
  # Create a safety copy of current data
  TIMESTAMP=$(date +%s)
  echo "    -> Mengamankan data saat ini ke pb_data_old_$TIMESTAMP..."
  mv pb_data "pb_data_old_$TIMESTAMP"
  
  echo "    -> Mengekstrak data dari backup..."
  tar -xzvf "$LOCATION"
  
  if [ $? -eq 0 ]; then
    echo "    -> Menyalakan kembali service PocketBase..."
    docker compose start pocketbase
    echo "[+] Restore berhasil! Sistem sudah kembali menyala dengan data backup."
  else
    echo "[-] Ekstraksi gagal! Mengembalikan data dari pb_data_old..."
    mv "pb_data_old_$TIMESTAMP" pb_data
    docker compose start pocketbase
    exit 1
  fi

else
  echo "[-] Aksi tidak valid. Gunakan 'backup' atau 'restore'."
  exit 1
fi
