#!/bin/bash
# Apply nginx API proxy so external browsers reach backend (works when SSH disconnected)
# Run with: sudo ./apply-nginx-api-proxy.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_CONF="$SCRIPT_DIR/nginx-app.visualisa.xyz.conf"

echo "=== Applying nginx API proxy ==="
cp "$NGINX_CONF" /etc/nginx/sites-available/app.visualisa.xyz
nginx -t
systemctl reload nginx
# Re-add SSL if certbot had configured it (overwrite removed it)
if [[ -d /etc/letsencrypt/live/app.visualisa.xyz ]]; then
  certbot --nginx -d app.visualisa.xyz --non-interactive 2>/dev/null || true
fi
echo "Done. API requests now go: Browser -> nginx -> backend:8000"
echo "Test from external browser: https://app.visualisa.xyz (not localhost)"
