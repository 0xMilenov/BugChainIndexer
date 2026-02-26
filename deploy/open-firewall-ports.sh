#!/bin/bash
# Open HTTP/HTTPS ports for app.visualisa.xyz (host firewall only)
# Run with: sudo ./open-firewall-ports.sh
#
# NOTE: If site still unreachable, also open ports 80 and 443 in
# Hetzner Cloud Console -> Firewalls -> your firewall -> Inbound rules
set -e

echo "=== Opening firewall ports 80 and 443 (UFW) ==="
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload
echo "Done. Ports 80 and 443 are now open in UFW."
ufw status
