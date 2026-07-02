#!/bin/bash
# Wrapper: start pi in tmux session for Telegram bridge
# Systemd calls this, handles restart loop inside tmux

set -euo pipefail

SESSION="pi"
PID_FILE="/tmp/pi-telegram.pid"
PI_BIN="/home/nurahmat/.local/share/pi-node/node-v22.23.0-linux-x64/bin/pi"
CWD="/home/nurahmat/pocketbase"

# Kill old session if exists
tmux kill-session -t "$SESSION" 2>/dev/null || true

# Create new tmux session running pi
tmux new-session -d -s "$SESSION" -c "$CWD" "exec $PI_BIN"

echo $$ > "$PID_FILE"

# Wait for tmux session to end (pi exiting or crash)
tmux wait-for -S "pi-exit" 2>/dev/null &
tmux wait-for "$SESSION:pi-exit" 2>/dev/null || {
    # Session ended
    :
}

# Cleanup
rm -f "$PID_FILE"