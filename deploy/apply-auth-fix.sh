#!/bin/bash
# Apply auth cookie fix: Secure cookie for HTTPS, nginx proxy_cookie_domain
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Applying auth fix ==="
echo "1. Restarting bugchain-backend..."
systemctl restart bugchain-backend

echo "2. Updating nginx config..."
cp "$SCRIPT_DIR/nginx-app.visualisa.xyz.conf" /etc/nginx/sites-available/app.visualisa.xyz

echo "3. Testing nginx config..."
nginx -t

echo "4. Reloading nginx..."
systemctl reload nginx

echo "Done. Clear your browser cookies for app.visualisa.xyz and log in again."
