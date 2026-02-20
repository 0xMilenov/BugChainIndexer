#!/usr/bin/env bash
# MegaETH verification run - short scan to confirm contract collection works
# Usage: ./cron-megaeth-verify.sh
# Runs unified scanner for MegaETH with 2h window, 10min timeout, then verifies contracts in DB

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

# Environment setup
export TIMEDELAY_HOURS="${TIMEDELAY_HOURS:-2}"   # 2h window for faster scan
export TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-600}" # 10 min max
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

# Log file with timestamp
mkdir -p "$SCRIPT_DIR/logs"
LOG_FILE="$SCRIPT_DIR/logs/cron-megaeth-verify-$(date +%Y%m%d_%H%M%S).log"

exec > >(tee -a "$LOG_FILE") 2>&1

echo "====== MEGAETH VERIFICATION RUN STARTED: $(date) ======"
echo "TIMEDELAY_HOURS=$TIMEDELAY_HOURS TIMEOUT_SECONDS=$TIMEOUT_SECONDS"
echo ""

# Run unified scanner for MegaETH only
if timeout "${TIMEOUT_SECONDS}s" env NETWORK=megaeth ./run.sh unified; then
  echo ""
  echo "====== Scanner completed, verifying DB ======"
else
  EXIT=$?
  echo ""
  echo "====== Scanner exited with code $EXIT (timeout or error) ======"
  if [[ $EXIT -eq 124 ]]; then
    echo "Note: Hit timeout after ${TIMEOUT_SECONDS}s - partial results may exist"
  fi
fi

# Verify: count contracts vs EOAs for megaeth
if command -v psql >/dev/null 2>&1 && [[ -n "${PGDATABASE:-}" ]]; then
  export PGPASSWORD="${PGPASSWORD:-}"
  echo ""
  echo "MegaETH address breakdown:"
  psql -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" -d "${PGDATABASE:-bugchain_indexer}" -t -c "
    SELECT 
      CASE WHEN 'EOA' = ANY(COALESCE(tags, '{}')) THEN 'EOA' ELSE 'Contract' END as type,
      COUNT(*)::text
    FROM addresses WHERE network = 'megaeth'
    GROUP BY 1
    ORDER BY 1;
  " 2>/dev/null || echo "(psql not available or DB not configured)"

  CONTRACT_COUNT=$(psql -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" -d "${PGDATABASE:-bugchain_indexer}" -t -A -c "
    SELECT COUNT(*) FROM addresses 
    WHERE network = 'megaeth' AND (tags IS NULL OR NOT 'EOA' = ANY(tags));
  " 2>/dev/null || echo "0")

  # Known verified contract on MegaETH: BeefyRevenueBridge proxy
  # https://mega.etherscan.io/address/0x02ae4716b9d5d48db1445814b0ede39f5c28264b#code
  KNOWN_CONTRACT="0x02ae4716b9d5d48db1445814b0ede39f5c28264b"
  KNOWN_ROW=$(psql -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" -d "${PGDATABASE:-bugchain_indexer}" -t -A -F '|' -c "
    SELECT COALESCE(contract_name,''), COALESCE(verified::text,'f')
    FROM addresses
    WHERE network = 'megaeth' AND LOWER(address) = LOWER('$KNOWN_CONTRACT');
  " 2>/dev/null || echo "||")

  echo ""
  if [[ "${CONTRACT_COUNT:-0}" -gt 0 ]]; then
    echo "SUCCESS: $CONTRACT_COUNT MegaETH contracts found in DB"
    # Verify known contract has name and verified status (enrichment working)
    if [[ -n "$KNOWN_ROW" && "$KNOWN_ROW" != "||" ]]; then
      NAME=$(echo "$KNOWN_ROW" | cut -d'|' -f1)
      VERIFIED=$(echo "$KNOWN_ROW" | cut -d'|' -f2)
      if [[ -n "$NAME" && "$NAME" != "Unnamed Contract" && "$NAME" != "null" ]]; then
        echo "VERIFIED: Known contract $KNOWN_CONTRACT has name='$NAME' verified=$VERIFIED"
      else
        echo "WARNING: Known contract $KNOWN_CONTRACT exists but unnamed - run backfill or ensure Etherscan API keys"
      fi
    else
      echo "NOTE: Known contract $KNOWN_CONTRACT not in DB (may be outside scan window)"
    fi
    echo "====== MEGAETH VERIFICATION FINISHED: $(date) ======"
    exit 0
  else
    echo "WARNING: 0 MegaETH contracts in DB - pipeline may need investigation"
    echo "====== MEGAETH VERIFICATION FINISHED: $(date) ======"
    exit 1
  fi
else
  echo "Skipping DB verification (psql or PGDATABASE not available)"
  echo "====== MEGAETH VERIFICATION FINISHED: $(date) ======"
  exit 0
fi
