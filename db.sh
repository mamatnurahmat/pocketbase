#!/bin/bash

ACTION=$1
LOCATION=$2

# Path tetap
DATA_DIR="/var/data/pocketbase/pb_data"
BACKUP_DIR="/var/data/pocketbase/backup"
DEFAULT_FILE="file-$(date +%F).tar.gz"
NTFY_URL="https://ntfy.sh/p2s"
HOSTNAME=$(hostname)

# ─── Fungsi notifikasi ntfy ──────────────────────────────────────
ntfy_notify() {
  local title="$1"
  local message="$2"
  local priority="${3:-default}"
  curl -sS -o /dev/null -X POST "$NTFY_URL" \
    -H "Title: ${title}" \
    -H "Priority: ${priority}" \
    -H "Tags: floppy_disk" \
    -d "${message}" 2>/dev/null || true
}

if [ -z "$ACTION" ]; then
  echo "============================================="
  echo " PocketBase Backup & Restore Script"
  echo "============================================="
  echo "Cara penggunaan:"
  echo "  ./db.sh backup  [nama_file.tar.gz]"
  echo "  ./db.sh restore [nama_file.tar.gz]"
  echo ""
  echo "Default lokasi backup/restore:"
  echo "  $BACKUP_DIR/$DEFAULT_FILE"
  echo ""
  echo "Contoh:"
  echo "  ./db.sh backup                           # -> $BACKUP_DIR/$DEFAULT_FILE"
  echo "  ./db.sh backup custom-backup.tar.gz      # -> $BACKUP_DIR/custom-backup.tar.gz"
  echo "  ./db.sh restore                          # -> $BACKUP_DIR/$DEFAULT_FILE"
  echo "  ./db.sh restore /path/ke/backup.tar.gz   # -> restore dari lokasi kustom"
  exit 1
fi

# Tentukan path backup
if [ -z "$LOCATION" ]; then
  # Jika LOCATION tidak diisi, gunakan default
  BACKUP_PATH="$BACKUP_DIR/$DEFAULT_FILE"
elif [[ "$LOCATION" == *"/"* ]]; then
  # Jika LOCATION mengandung path (absolute/relative)
  BACKUP_PATH="$LOCATION"
else
  # Jika hanya nama file, taruh di BACKUP_DIR
  BACKUP_PATH="$BACKUP_DIR/$LOCATION"
fi

if [ "$ACTION" == "backup" ]; then
  # Pastikan direktori backup ada
  BACKUP_FILE_DIR=$(dirname "$BACKUP_PATH")
  mkdir -p "$BACKUP_FILE_DIR"

  BACKUP_FILENAME=$(basename "$BACKUP_PATH")
  echo "[+] Membuat backup database ke $BACKUP_PATH..."
  ntfy_notify "🗄️ DB Backup Started" "Server: ${HOSTNAME}\nFile: ${BACKUP_FILENAME}\nWaktu: $(date '+%Y-%m-%d %H:%M:%S')"
  
  # Compress the pb_data directory to a tar.gz file
  tar -czvf "$BACKUP_PATH" -C "$(dirname "$DATA_DIR")" "$(basename "$DATA_DIR")"
  
  if [ $? -eq 0 ]; then
    SIZE=$(ls -lh "$BACKUP_PATH" | awk '{print $5}')
    echo "[+] Backup berhasil dibuat di $BACKUP_PATH!"
    ls -lh "$BACKUP_PATH"
    ntfy_notify "✅ DB Backup Sukses" "Server: ${HOSTNAME}\nFile: ${BACKUP_FILENAME}\nSize: ${SIZE}\nWaktu: $(date '+%Y-%m-%d %H:%M:%S')" "low"
  else
    echo "[-] Terjadi kesalahan saat membuat backup."
    ntfy_notify "❌ DB Backup GAGAL" "Server: ${HOSTNAME}\nFile: ${BACKUP_FILENAME}\nError: tar compression failed\nWaktu: $(date '+%Y-%m-%d %H:%M:%S')" "high"
    exit 1
  fi

elif [ "$ACTION" == "restore" ]; then
  if [ ! -f "$BACKUP_PATH" ]; then
    echo "[-] Error: File backup '$BACKUP_PATH' tidak ditemukan!"
    exit 1
  fi
  
  echo "[+] Memulai proses restore dari $BACKUP_PATH..."
  
  echo "    -> Mematikan service PocketBase sementara..."
  docker compose stop pocketbase
  
  # Safety: pastikan DATA_DIR ada sebelum pindahkan
  if [ -d "$DATA_DIR" ]; then
    TIMESTAMP=$(date +%s)
    echo "    -> Mengamankan data saat ini ke ${DATA_DIR}_old_$TIMESTAMP..."
    mv "$DATA_DIR" "${DATA_DIR}_old_$TIMESTAMP"
  fi
  
  echo "    -> Mengekstrak data dari backup..."
  # Ekstrak ke parent directori DATA_DIR (karena arsip berisi "pb_data")
  tar -xzvf "$BACKUP_PATH" -C "$(dirname "$DATA_DIR")"
  
  if [ $? -eq 0 ]; then
    echo "    -> Menyalakan kembali service PocketBase..."
    docker compose start pocketbase
    echo "[+] Restore berhasil! Sistem sudah kembali menyala dengan data backup."
    ntfy_notify "✅ DB Restore Sukses" "Server: ${HOSTNAME}\nFile: ${BACKUP_FILENAME}\nWaktu: $(date '+%Y-%m-%d %H:%M:%S')" "low"
  else
    echo "[-] Ekstraksi gagal! Mengembalikan data dari backup lama..."
    if [ -d "${DATA_DIR}_old_$TIMESTAMP" ]; then
      rm -rf "$DATA_DIR" 2>/dev/null
      mv "${DATA_DIR}_old_$TIMESTAMP" "$DATA_DIR"
    fi
    docker compose start pocketbase
    ntfy_notify "❌ DB Restore GAGAL" "Server: ${HOSTNAME}\nFile: ${BACKUP_FILENAME}\nError: ekstraksi gagal, data dikembalikan\nWaktu: $(date '+%Y-%m-%d %H:%M:%S')" "high"
    exit 1
  fi

else
  echo "[-] Aksi tidak valid. Gunakan 'backup' atau 'restore'."
  exit 1
fi