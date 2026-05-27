#!/usr/bin/env bash
# Public-RPC Celo scanner tier.
# Celo is dense enough to need a tiny independent window.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export SCANNER_PROFILE="${SCANNER_PROFILE:-celo}"
export SCANNER_NETWORKS="${SCANNER_NETWORKS:-celo}"
export SCANNER_MAX_PARALLEL="${SCANNER_MAX_PARALLEL:-1}"
export PUBLIC_RPC_MAX_BLOCKS_PER_RUN="${PUBLIC_RPC_MAX_BLOCKS_PER_RUN:-1}"
export PUBLIC_RPC_MAX_CONTRACTS_PER_RUN="${PUBLIC_RPC_MAX_CONTRACTS_PER_RUN:-1}"
export TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-600}"

exec "$SCRIPT_DIR/cron-unified-cautious.sh"
