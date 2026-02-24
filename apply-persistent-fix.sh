#!/bin/bash
# Apply the persistent deployment fix - run with: sudo ./apply-persistent-fix.sh
set -e
cd "$(dirname "$0")"

echo "=== Applying Persistent Deployment Fix ==="

echo "[1/3] Reinstalling systemd units..."
./server/services/install-systemd.sh

echo "[2/3] Starting PostgreSQL..."
systemctl start postgresql 2>/dev/null || true

echo "[3/3] Restarting backend and frontend..."
systemctl restart bugchain-backend bugchain-frontend

echo ""
echo "=== Done ==="
echo "Verify with: systemctl status postgresql bugchain-backend bugchain-frontend"
