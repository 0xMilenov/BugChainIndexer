#!/usr/bin/env bash
# audit-one.sh — extract a single contract, run Plamen thorough, ingest findings.
#
# Usage:
#   scanners/audits/audit-one.sh <network> <address>
#   MODE=thorough scanners/audits/audit-one.sh ethereum 0xabc...
#
# Env:
#   MODE            plamen mode: thorough|core|light (default: thorough)
#   AUDIT_ROOT      base dir for extracted projects (default: /tmp/audits)
#   SKIP_EXTRACT=1  reuse an existing project dir (skips re-extraction)
#   SKIP_RUN=1      skip the Plamen run (useful to re-ingest an existing report)
#   SKIP_INGEST=1   stop after the Plamen run
#
# Exits non-zero on any failed step.

set -euo pipefail

NETWORK="${1:-}"
ADDRESS="${2:-}"
if [[ -z "$NETWORK" || -z "$ADDRESS" ]]; then
  echo "usage: $0 <network> <address>" >&2
  exit 2
fi

MODE="${MODE:-thorough}"
AUDIT_ROOT="${AUDIT_ROOT:-/tmp/audits}"
SCANNERS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_DIR="${AUDIT_ROOT}/${NETWORK}-${ADDRESS}"
LOG_DIR="${AUDIT_ROOT}/logs"
LOG_FILE="${LOG_DIR}/${NETWORK}-${ADDRESS}.log"

mkdir -p "$LOG_DIR"
export PATH="${HOME}/.plamen:${HOME}/.foundry/bin:${HOME}/.local/bin:${PATH}"

STARTED_AT=$(($(date +%s) * 1000))

if [[ "${SKIP_EXTRACT:-0}" != "1" ]]; then
  echo "[audit-one] extracting ${NETWORK}/${ADDRESS} ..." >&2
  node "${SCANNERS_DIR}/audits/extract.js" \
    --network "$NETWORK" --address "$ADDRESS" --out "$PROJECT_DIR" >/dev/null
fi

if [[ "${SKIP_RUN:-0}" != "1" ]]; then
  echo "[audit-one] running plamen ${MODE} (log: ${LOG_FILE}) ..." >&2
  ( cd "$PROJECT_DIR" \
    && plamen "$MODE" . --proven-only --network "$NETWORK" ) \
    > "$LOG_FILE" 2>&1
fi

if [[ "${SKIP_INGEST:-0}" == "1" ]]; then
  echo "[audit-one] SKIP_INGEST=1, stopping after plamen run" >&2
  exit 0
fi

REPORT="${PROJECT_DIR}/AUDIT_REPORT.md"
if [[ ! -f "$REPORT" ]]; then
  echo "[audit-one] ERROR: report not found at ${REPORT}" >&2
  exit 3
fi

echo "[audit-one] ingesting ${REPORT} ..." >&2
node "${SCANNERS_DIR}/audits/ingest.js" \
  --network "$NETWORK" --address "$ADDRESS" \
  --report "$REPORT" --mode "$MODE" \
  --started-at "$STARTED_AT" --status completed
