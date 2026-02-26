#!/bin/bash
# Set up SSL (HTTPS) for app.visualisa.xyz
# Run with: sudo ./setup-ssl.sh
#
# Prerequisites:
# - Port 80 must be reachable (HTTP works for ACME challenge)
# - Port 443 open in UFW and Hetzner Cloud Firewall

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Setting up SSL for app.visualisa.xyz ==="

# 1. Ensure port 443 is allowed
echo "1. Opening port 443 in UFW..."
ufw allow 443/tcp
ufw reload 2>/dev/null || true

# 2. Obtain certificate (certbot modifies nginx config automatically)
echo "2. Obtaining SSL certificate from Let's Encrypt..."
CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@visualisa.xyz}"
certbot --nginx -d app.visualisa.xyz --non-interactive --agree-tos -m "$CERTBOT_EMAIL" || \
certbot --nginx -d app.visualisa.xyz --non-interactive --agree-tos --register-unsafely-without-email || {
    echo ""
    echo "Certbot failed. Common causes:"
    echo "  - Port 443 blocked: Open it in Hetzner Cloud Console -> Firewalls"
    echo "  - Port 80 blocked: Ensure HTTP works first"
    echo "  - DNS wrong: app.visualisa.xyz must point to this server"
    exit 1
}

echo ""
echo "Done! Site should now work at https://app.visualisa.xyz"
echo "If still failing, open ports 80 and 443 in Hetzner Cloud Console -> Firewalls"
