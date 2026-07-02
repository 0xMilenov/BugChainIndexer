#!/usr/bin/env bash
# audit-one.sh — extract a single contract, run Plamen, ingest findings.
#
# Plamen CLI: tested against v2.0.0. The smart-contract pipeline keeps the
# positional `<mode> <path>` form plus `--network` and `--proven-only` from
# v1.1.8, so the initial invocation is unchanged across the upgrade.
#
# Plamen v2 exit code grammar (from ~/.plamen/scripts/plamen_types.py):
#    0  EXIT_SUCCESS        run finished, AUDIT_REPORT.md assembled
#    1  EXIT_ERROR          genuine failure
#    2  EXIT_RATE_LIMITED   provider quota/rate limit hit; resume after wait
#    3  EXIT_DEGRADED       finished with >N degraded phases
#    4  EXIT_CONFIG_MISSING
#   42  EXIT_HIBERNATING    long wait detected; resume after wake_at_utc
#
# We auto-resume exit 2 and 42 with an exponential backoff (configurable
# via PLAMEN_RESUME_BACKOFF_SEQ + PLAMEN_MAX_RESUME_ATTEMPTS below) so
# rate-limited runs don't surface as `failed` rows on the dashboard.
# Resumes call `plamen_driver.py <scratchpad>/config.json --force`,
# which skips Plamen's internal hibernation sleep (we manage timing
# externally) and picks up from the last completed phase via the v2
# checkpoint.
#
# Usage:
#   scanners/audits/audit-one.sh <network> <address>
#   MODE=thorough scanners/audits/audit-one.sh ethereum 0xabc...
#
# Env:
#   MODE                         plamen mode: thorough|core|light (default: thorough)
#   AUDIT_ROOT                   base dir for extracted projects (default: /tmp/audits)
#   SKIP_EXTRACT=1               reuse an existing project dir (skips re-extraction)
#   SKIP_RUN=1                   skip the Plamen run (useful to re-ingest an existing report)
#   SKIP_INGEST=1                stop after the Plamen run
#   PLAMEN_MAX_RESUME_ATTEMPTS   default 4 (covers daily-cap recovery)
#   PLAMEN_RESUME_BACKOFF_SEQ    default "900 2700 7200 14400" (15m, 45m, 2h, 4h)
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

PLAMEN_MAX_RESUME_ATTEMPTS="${PLAMEN_MAX_RESUME_ATTEMPTS:-4}"
PLAMEN_RESUME_BACKOFF_SEQ="${PLAMEN_RESUME_BACKOFF_SEQ:-900 2700 7200 14400}"

mkdir -p "$LOG_DIR"
export PATH="${HOME}/.plamen:${HOME}/.foundry/bin:${HOME}/.local/bin:${PATH}"

STARTED_AT=$(($(date +%s) * 1000))

# Return the backoff (seconds) for resume attempt N (1-indexed). Capped at
# the last value of PLAMEN_RESUME_BACKOFF_SEQ.
resume_backoff_sec() {
  local n="$1"
  local -a seq
  read -ra seq <<< "$PLAMEN_RESUME_BACKOFF_SEQ"
  local idx=$((n - 1))
  if (( idx >= ${#seq[@]} )); then
    idx=$((${#seq[@]} - 1))
  fi
  echo "${seq[$idx]}"
}

if [[ "${SKIP_EXTRACT:-0}" != "1" ]]; then
  echo "[audit-one] extracting ${NETWORK}/${ADDRESS} ..." >&2
  node "${SCANNERS_DIR}/audits/extract.js" \
    --network "$NETWORK" --address "$ADDRESS" --out "$PROJECT_DIR" >/dev/null
fi

echo "[audit-one] preparing exploit-intel sidecar (if any) ..." >&2
node "${SCANNERS_DIR}/audits/exploit-intel.js" \
  --network "$NETWORK" --address "$ADDRESS" \
  --out "${PROJECT_DIR}/.scratchpad/exploit_intel.md" >&2 || {
    echo "[audit-one] WARN: exploit-intel sidecar generation failed; continuing without it" >&2
  }

if [[ "${SKIP_RUN:-0}" != "1" ]]; then
  echo "[audit-one] running plamen ${MODE} via Codex (log: ${LOG_FILE}) ..." >&2
  PLAMEN_EXIT=0
  ( cd "$PROJECT_DIR" \
    && plamen "$MODE" . --proven-only --network "$NETWORK" --codex ) \
    > "$LOG_FILE" 2>&1 || PLAMEN_EXIT=$?

  # Auto-resume on rate-limit / hibernate. Other non-zero codes fall
  # through to the REPORT existence check (which handles exit 3 + report
  # gracefully) or propagate.
  RESUME_ATTEMPT=0
  while [[ "$PLAMEN_EXIT" -eq 2 || "$PLAMEN_EXIT" -eq 42 ]]; do
    RESUME_ATTEMPT=$((RESUME_ATTEMPT + 1))
    if [[ "$RESUME_ATTEMPT" -gt "$PLAMEN_MAX_RESUME_ATTEMPTS" ]]; then
      MSG="[audit-one] ERROR: Plamen provider quota/rate-limited (exit ${PLAMEN_EXIT}); exhausted ${PLAMEN_MAX_RESUME_ATTEMPTS} resume attempts"
      echo "$MSG" >&2
      echo "$MSG" >> "$LOG_FILE"
      exit "$PLAMEN_EXIT"
    fi

    SCRATCH_CONFIG="${PROJECT_DIR}/.scratchpad/config.json"
    if [[ ! -f "$SCRATCH_CONFIG" ]]; then
      echo "[audit-one] ERROR: scratchpad config missing at ${SCRATCH_CONFIG}; cannot resume" >&2
      exit 1
    fi

    BACKOFF_SEC=$(resume_backoff_sec "$RESUME_ATTEMPT")
    BACKOFF_MIN=$((BACKOFF_SEC / 60))
    MSG="[audit-one] Plamen exit ${PLAMEN_EXIT} (provider quota/rate-limited / hibernating); resume attempt ${RESUME_ATTEMPT}/${PLAMEN_MAX_RESUME_ATTEMPTS}; sleeping ${BACKOFF_MIN}min before resume"
    echo "$MSG" >&2
    echo "$MSG" >> "$LOG_FILE"
    sleep "$BACKOFF_SEC"

    echo "[audit-one] resuming Plamen (attempt ${RESUME_ATTEMPT}) ..." >&2
    echo "[audit-one] === resume attempt ${RESUME_ATTEMPT} ===" >> "$LOG_FILE"
    PLAMEN_EXIT=0
    python3 "${HOME}/.plamen/scripts/plamen_driver.py" "$SCRATCH_CONFIG" --force \
      >> "$LOG_FILE" 2>&1 || PLAMEN_EXIT=$?
  done

  # Exit 3 (DEGRADED) may still leave a usable AUDIT_REPORT.md (e.g., late
  # validator failures after assembly). Let the REPORT existence check
  # downstream decide. Any other non-zero code is a hard failure.
  case "$PLAMEN_EXIT" in
    0|3) : ;;
    *)
      echo "[audit-one] Plamen exited with code ${PLAMEN_EXIT}; aborting" >&2
      exit "$PLAMEN_EXIT"
      ;;
  esac
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
