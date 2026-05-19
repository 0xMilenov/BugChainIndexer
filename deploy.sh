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
  # sudo when running as non-root; harmless no-op when already root.
  # The claude user is granted NOPASSWD on these specific units via
  # /etc/sudoers.d/claude-bugchain so this runs unattended.
  if [[ $EUID -eq 0 ]]; then
    systemctl restart bugchain-backend bugchain-frontend
  else
    sudo systemctl restart bugchain-backend bugchain-frontend
  fi
else
  ./run-local-ui.sh restart
fi
