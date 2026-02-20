#!/bin/bash
# Fix UFW blocking ports 80 and 443 - run with: sudo ./fix-ufw-ports.sh
set -e
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw --force enable 2>/dev/null || true
ufw reload
echo "Done. Ports 80, 443, 22 are now allowed."
ufw status
