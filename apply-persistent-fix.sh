#!/bin/bash
# Apply the persistent deployment fix - run with: sudo ./apply-persistent-fix.sh
set -e
cd "$(dirname "$0")"

echo "=== Applying Persistent Deployment Fix ==="

echo "[1/4] Stopping run-local-ui (frees port 8000 for systemd backend)..."
./run-local-ui.sh stop 2>/dev/null || true
# Kill any orphan process holding port 8000 (run-local-ui leaves zombies)
pid=$(ss -tlnp 2>/dev/null | awk -F'pid=' '/:8000 /{gsub(/,.*/,""); print $2}' | head -1)
if [[ -n "$pid" && "$pid" =~ ^[0-9]+$ ]]; then
  echo "  Killing orphan process on port 8000 (PID $pid)"
  kill $pid 2>/dev/null || true
  sleep 2
fi

echo "[2/4] Reinstalling systemd units..."
./server/services/install-systemd.sh

echo "[3/4] Starting PostgreSQL..."
systemctl start postgresql 2>/dev/null || true

echo "[4/4] Restarting backend and frontend..."
systemctl restart bugchain-backend bugchain-frontend

echo ""
echo "=== Done ==="
echo "Verify with: systemctl status postgresql bugchain-backend bugchain-frontend"
