#!/usr/bin/env bash
# Cron-compatible script for ERC-20 token balance updates via Etherscan API
# Usage in crontab: 0 2,6,10,14,18,22 * * * /path/to/scanners/cron/cron-erc20-balances.sh
# Runs every 2h at 2,6,10,14,18,22 UTC - quiet times (avoids unified at 0,4,8,12,16,20)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

# Environment setup
export TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-7200}"
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

# Log file with timestamp
LOG_FILE="$SCRIPT_DIR/logs/cron-erc20-balances-$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$SCRIPT_DIR/logs"

# Execute with proper output redirection
exec >> "$LOG_FILE" 2>&1

echo "====== CRON ERC20 BALANCES UPDATE STARTED: $(date) ======"
START_EPOCH=$(date +%s)

# Run ERC-20 balance scanner (sequential across networks)
./run.sh erc20-balances

END_EPOCH=$(date +%s)
DURATION=$((END_EPOCH - START_EPOCH))
DURATION_MIN=$((DURATION / 60))
DURATION_SEC=$((DURATION % 60))
echo "====== CRON ERC20 BALANCES UPDATE FINISHED: $(date) ======"
echo "Duration: ${DURATION_MIN}m ${DURATION_SEC}s (${DURATION} seconds)"
