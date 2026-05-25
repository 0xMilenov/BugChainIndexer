#!/usr/bin/env bash
# Public-RPC slow scanner tier.
# Runs dense or timeout-prone networks with stricter caps and serial execution.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export SCANNER_PROFILE="${SCANNER_PROFILE:-slow}"
export SCANNER_NETWORKS="${SCANNER_NETWORKS:-optimism,arbitrum,polygon,avalanche,gnosis,linea,megaeth,celo,opbnb}"
export SCANNER_MAX_PARALLEL="${SCANNER_MAX_PARALLEL:-1}"
export PUBLIC_RPC_MAX_BLOCKS_PER_RUN="${PUBLIC_RPC_MAX_BLOCKS_PER_RUN:-20}"
export PUBLIC_RPC_MAX_CONTRACTS_PER_RUN="${PUBLIC_RPC_MAX_CONTRACTS_PER_RUN:-5}"
export TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-900}"

exec "$SCRIPT_DIR/cron-unified-cautious.sh"
