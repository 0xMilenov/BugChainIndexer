#!/bin/bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# 1. Pull latest
git pull origin main

# 2. Install deps (if package.json changed)
cd server/backend && npm ci --omit=dev && cd "$ROOT"
cd server/frontend-next && npm ci --omit=dev && npm run build && cd "$ROOT"

# 3. Ensure PostgreSQL is running, then restart BugChainIndexer services (systemd if installed, else run-local-ui)
systemctl start postgresql 2>/dev/null || true
if systemctl is-active --quiet bugchain-backend 2>/dev/null; then
  systemctl restart bugchain-backend bugchain-frontend
else
  ./run-local-ui.sh restart
fi
