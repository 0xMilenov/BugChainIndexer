#!/usr/bin/env bash
# Public-RPC fast scanner tier.
# Runs networks that complete reliably inside the short recurring window.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export SCANNER_PROFILE="${SCANNER_PROFILE:-fast}"
export SCANNER_NETWORKS="${SCANNER_NETWORKS:-binance,base,arbitrum-nova,cronos,polygon-zkevm,subtensor}"
export SCANNER_MAX_PARALLEL="${SCANNER_MAX_PARALLEL:-1}"
export PUBLIC_RPC_MAX_BLOCKS_PER_RUN="${PUBLIC_RPC_MAX_BLOCKS_PER_RUN:-30}"
export PUBLIC_RPC_MAX_CONTRACTS_PER_RUN="${PUBLIC_RPC_MAX_CONTRACTS_PER_RUN:-8}"
export TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-900}"

exec "$SCRIPT_DIR/cron-unified-cautious.sh"
