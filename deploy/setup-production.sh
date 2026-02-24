#!/bin/bash
# Production setup for app.visualisa.xyz
# Run with: sudo ./setup-production.sh
#
# Prerequisites:
# 1. DNS: app.visualisa.xyz A record -> your VM IP (91.98.235.181)
# 2. Ports 80 and 443 open in Hetzner firewall

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NGINX_CONF="$SCRIPT_DIR/nginx-app.visualisa.xyz.conf"

echo "=== BugChainIndexer Production Setup ==="
echo "Domain: app.visualisa.xyz"
echo ""

# 1. Install and enable PostgreSQL (required for backend DB)
echo "[1/6] Installing and enabling PostgreSQL..."
apt update
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# 2. Install nginx and certbot
echo "[2/6] Installing nginx and certbot..."
apt install -y nginx certbot python3-certbot-nginx

# 3. Copy nginx config
echo "[3/6] Configuring nginx..."
cp "$NGINX_CONF" /etc/nginx/sites-available/app.visualisa.xyz
ln -sf /etc/nginx/sites-available/app.visualisa.xyz /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

# 4. Test and reload nginx
echo "[4/6] Testing nginx config..."
nginx -t
systemctl reload nginx

# 4. Obtain SSL certificate
echo "[4/5] Obtaining SSL certificate (Let's Encrypt)..."
echo "Ensure app.visualisa.xyz DNS points to this server."
if [[ "${SKIP_CERTBOT:-}" == "1" ]]; then
    echo "Skipping certbot (SKIP_CERTBOT=1). Run manually: certbot --nginx -d app.visualisa.xyz"
else
CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@visualisa.xyz}"
    certbot --nginx -d app.visualisa.xyz --non-interactive --agree-tos -m "$CERTBOT_EMAIL" 2>/dev/null || \
    certbot --nginx -d app.visualisa.xyz --non-interactive --agree-tos --register-unsafely-without-email 2>/dev/null || {
        echo "Certbot failed. Ensure:"
        echo "  1. DNS: app.visualisa.xyz A record -> $(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_VM_IP')"
        echo "  2. Ports 80 and 443 open in Hetzner Cloud Firewall"
        exit 1
    }
fi

# 6. Ensure services are running
echo "[6/6] Checking services..."
if ! systemctl is-active --quiet bugchain-backend 2>/dev/null; then
    echo "Installing systemd services..."
    "$ROOT/server/services/install-systemd.sh"
    systemctl start postgresql evmbench bugchain-backend bugchain-frontend
else
    systemctl restart bugchain-backend bugchain-frontend
fi

echo ""
echo "=== Done ==="
echo "Your app is live at: https://app.visualisa.xyz"
echo ""
