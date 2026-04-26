#!/usr/bin/env bash
# Switch bugchain-backend systemd unit to run as the `claude` user so spawned
# Plamen audits inherit ~/.claude/ creds and ~/.plamen/, ~/.foundry/ on PATH.
#
# Usage:
#   sudo bash scripts/switch-backend-to-claude-user.sh
#
# Idempotent: safe to re-run.

set -euo pipefail

UNIT="/etc/systemd/system/bugchain-backend.service"
TARGET_USER="claude"
TARGET_GROUP="claude"

if [[ $EUID -ne 0 ]]; then
  echo "ERROR: must be run with sudo" >&2
  exit 1
fi

if [[ ! -f "$UNIT" ]]; then
  # Try the common alternate locations
  for cand in \
    /lib/systemd/system/bugchain-backend.service \
    /usr/lib/systemd/system/bugchain-backend.service; do
    if [[ -f "$cand" ]]; then UNIT="$cand"; break; fi
  done
fi

if [[ ! -f "$UNIT" ]]; then
  echo "ERROR: cannot find bugchain-backend.service unit file" >&2
  echo "Try:  systemctl cat bugchain-backend" >&2
  exit 2
fi

echo "[1/5] Found unit: $UNIT"
cp -a "$UNIT" "${UNIT}.bak.$(date +%s)"
echo "       Backed up to ${UNIT}.bak.<timestamp>"

# Replace User= and Group= lines. If they don't exist, add them under [Service].
if grep -q '^User=' "$UNIT"; then
  sed -i "s/^User=.*/User=${TARGET_USER}/" "$UNIT"
else
  sed -i "/^\[Service\]/a User=${TARGET_USER}" "$UNIT"
fi

if grep -q '^Group=' "$UNIT"; then
  sed -i "s/^Group=.*/Group=${TARGET_GROUP}/" "$UNIT"
else
  sed -i "/^\[Service\]/a Group=${TARGET_GROUP}" "$UNIT"
fi

# Ensure systemd-spawned children can find plamen + foundry on PATH. systemd
# launches with a minimal PATH; without this, audit-one.sh's `plamen` call
# resolves to nothing even when the user logs in interactively.
PATH_LINE='Environment="PATH=/home/claude/.plamen:/home/claude/.foundry/bin:/home/claude/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"'
if grep -q '^Environment="PATH=' "$UNIT"; then
  sed -i "s|^Environment=\"PATH=.*|${PATH_LINE}|" "$UNIT"
else
  sed -i "/^\[Service\]/a ${PATH_LINE}" "$UNIT"
fi

# Ensure HOME is set so ~ expands correctly inside the spawned audit-one.sh.
if ! grep -q '^Environment=HOME=' "$UNIT"; then
  sed -i "/^\[Service\]/a Environment=HOME=/home/claude" "$UNIT"
fi

echo "[2/5] Set User=${TARGET_USER} / Group=${TARGET_GROUP} + PATH/HOME"

# Ensure audit log dir is writable by the new user.
mkdir -p /tmp/audits/logs
chown -R "${TARGET_USER}:${TARGET_GROUP}" /tmp/audits
echo "[3/5] Ensured /tmp/audits is owned by ${TARGET_USER}"

systemctl daemon-reload
echo "[4/5] systemctl daemon-reload"

systemctl restart bugchain-backend
sleep 1
echo "[5/5] Restarted bugchain-backend"

echo
echo "--- Status ---"
systemctl status bugchain-backend --no-pager | head -15 || true

echo
echo "--- Verifying tools available to ${TARGET_USER} (-i = login shell) ---"
sudo -iu "${TARGET_USER}" bash -c '
  echo "PATH=$PATH"
  echo -n "plamen: "; command -v plamen || echo MISSING
  echo -n "forge:  "; command -v forge || echo MISSING
  echo -n "node:   "; command -v node || echo MISSING
  echo -n "creds:  "; ls -la ~/.claude/.credentials.json 2>/dev/null || echo "MISSING — run: claude login"
'

echo
echo "Done. Click 'Run audit' on a contract page to test."
echo "Watch with:  tail -f /tmp/audits/logs/<network>-<address>.log"
