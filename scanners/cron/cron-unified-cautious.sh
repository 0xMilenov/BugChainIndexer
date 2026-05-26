#!/usr/bin/env bash
# Public-RPC-friendly unified scanner schedule.
# Runs active networks in small batches instead of launching every chain at once.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
export PUBLIC_RPC_ONLY="${PUBLIC_RPC_ONLY:-true}"
export USE_ALCHEMY_RPC="${USE_ALCHEMY_RPC:-false}"
export TIMEDELAY_HOURS="${TIMEDELAY_HOURS:-1}"
export TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-1200}"
export ETHERSCAN_TIMEOUT_MS="${ETHERSCAN_TIMEOUT_MS:-15000}"
export ETHERSCAN_MAX_RETRIES="${ETHERSCAN_MAX_RETRIES:-1}"
export ETHERSCAN_BACKOFF_MAX_ATTEMPTS="${ETHERSCAN_BACKOFF_MAX_ATTEMPTS:-1}"
export SOURCIFY_TIMEOUT_MS="${SOURCIFY_TIMEOUT_MS:-8000}"
export PUBLIC_RPC_MAX_BLOCKS_PER_RUN="${PUBLIC_RPC_MAX_BLOCKS_PER_RUN:-60}"
export PUBLIC_RPC_MAX_CONTRACTS_PER_RUN="${PUBLIC_RPC_MAX_CONTRACTS_PER_RUN:-25}"

SCANNER_MAX_PARALLEL="${SCANNER_MAX_PARALLEL:-2}"
SCANNER_PROFILE="${SCANNER_PROFILE:-custom}"
NETWORKS_CSV="${SCANNER_NETWORKS:-ethereum,binance,optimism,base,arbitrum,polygon,avalanche,gnosis,linea,scroll,mantle,megaeth,arbitrum-nova,celo,cronos,opbnb,polygon-zkevm,subtensor}"
IFS=',' read -r -a NETWORKS <<< "$NETWORKS_CSV"

mkdir -p "$SCRIPT_DIR/logs"
LOG_FILE="$SCRIPT_DIR/logs/cron-unified-cautious-${SCANNER_PROFILE}-$(date +%Y%m%d_%H%M%S).log"
exec >> "$LOG_FILE" 2>&1

LOCK_FILE="/tmp/scanner-unified-cautious.lock"
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
  echo "====== CAUTIOUS UNIFIED SKIPPED: already running at $(date) ======"
  exit 0
fi

echo "====== CAUTIOUS UNIFIED STARTED: $(date) ======"
echo "Profile: $SCANNER_PROFILE"
echo "Networks: ${NETWORKS[*]}"
echo "Max parallel: $SCANNER_MAX_PARALLEL"
echo "TIMEDELAY_HOURS=$TIMEDELAY_HOURS TIMEOUT_SECONDS=$TIMEOUT_SECONDS PUBLIC_RPC_MAX_BLOCKS_PER_RUN=$PUBLIC_RPC_MAX_BLOCKS_PER_RUN PUBLIC_RPC_MAX_CONTRACTS_PER_RUN=$PUBLIC_RPC_MAX_CONTRACTS_PER_RUN"
echo "ETHERSCAN_TIMEOUT_MS=$ETHERSCAN_TIMEOUT_MS ETHERSCAN_MAX_RETRIES=$ETHERSCAN_MAX_RETRIES ETHERSCAN_BACKOFF_MAX_ATTEMPTS=$ETHERSCAN_BACKOFF_MAX_ATTEMPTS SOURCIFY_TIMEOUT_MS=$SOURCIFY_TIMEOUT_MS"

declare -a PIDS=()
declare -a PID_NETWORKS=()
FAILURES=0

wait_for_oldest() {
  local pid="${PIDS[0]}"
  local network="${PID_NETWORKS[0]}"
  if wait "$pid"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK $network"
  else
    local exit_code=$?
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] FAIL $network exit=$exit_code"
    FAILURES=$((FAILURES + 1))
  fi
  PIDS=("${PIDS[@]:1}")
  PID_NETWORKS=("${PID_NETWORKS[@]:1}")
}

for raw_network in "${NETWORKS[@]}"; do
  network="$(echo "$raw_network" | xargs)"
  if [[ -z "$network" ]]; then
    continue
  fi

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] START $network"
  env NETWORK="$network" ./run.sh unified &
  PIDS+=("$!")
  PID_NETWORKS+=("$network")

  while [[ "${#PIDS[@]}" -ge "$SCANNER_MAX_PARALLEL" ]]; do
    wait_for_oldest
  done
done

while [[ "${#PIDS[@]}" -gt 0 ]]; do
  wait_for_oldest
done

echo "====== CAUTIOUS UNIFIED FINISHED: $(date), failures=$FAILURES ======"
exit "$FAILURES"
