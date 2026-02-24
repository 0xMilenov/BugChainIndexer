#!/bin/bash
# Run with: sudo ./install-systemd.sh
# Installs evmbench, bugchain-backend, bugchain-frontend as systemd services.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cp "$SCRIPT_DIR/evmbench.service" /etc/systemd/system/evmbench.service
cp "$SCRIPT_DIR/backend.services" /etc/systemd/system/bugchain-backend.service
cp "$SCRIPT_DIR/frontend.services" /etc/systemd/system/bugchain-frontend.service

systemctl daemon-reload
systemctl enable postgresql 2>/dev/null || true
systemctl enable evmbench bugchain-backend bugchain-frontend
echo "Services installed. Start with: systemctl start postgresql evmbench bugchain-backend bugchain-frontend"
