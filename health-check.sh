#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCANNERS_DIR="$ROOT_DIR/scanners"
SCANNER_ENV="$SCANNERS_DIR/.env"
STATE_DIR="$ROOT_DIR/.health"
DAILY_FILE="$STATE_DIR/daily_totals.tsv"

print_header() {
  echo
  echo "=================================================="
  echo "$1"
  echo "=================================================="
}

status_of_service() {
  local svc="$1"
  local state
  state="$(systemctl is-active "$svc" 2>/dev/null || true)"
  if [[ "$state" == "active" ]]; then
    echo "[$svc] active"
  else
    echo "[$svc] $state"
  fi
}

read_env_value() {
  local key="$1"
  local value
  value="$(awk -F= -v k="$key" '$1==k {sub(/^[^=]*=/, "", $0); print $0; exit}' "$SCANNER_ENV" 2>/dev/null || true)"
  echo "$value"
}

print_header "BugChainIndexer Health Check"
echo "Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "Root: $ROOT_DIR"

print_header "Core Services"
status_of_service "postgresql"
status_of_service "cron"
status_of_service "redis-server"

print_header "Recent Cron Activity"
if [[ -r /var/log/syslog ]]; then
  rg "CRON|cron-unified|cron-funds|cron-revalidate|cron-db" /var/log/syslog | tail -n 20 || true
else
  echo "Cannot read /var/log/syslog (need root on some systems)."
  echo "Try: sudo journalctl -u cron -n 40 --no-pager"
fi

print_header "Scanner Status"
if [[ -x "$SCANNERS_DIR/run.sh" ]]; then
  (cd "$SCANNERS_DIR" && ./run.sh logs status) || true
else
  echo "Scanner runner not found/executable at $SCANNERS_DIR/run.sh"
fi

print_header "Database Growth Snapshot"
if ! command -v psql >/dev/null 2>&1; then
  echo "psql is not installed."
  exit 0
fi

PGHOST="${PGHOST:-$(read_env_value PGHOST)}"
PGPORT="${PGPORT:-$(read_env_value PGPORT)}"
PGDATABASE="${PGDATABASE:-$(read_env_value PGDATABASE)}"
PGUSER="${PGUSER:-$(read_env_value PGUSER)}"
PGPASSWORD="${PGPASSWORD:-$(read_env_value PGPASSWORD)}"

if [[ -z "${PGHOST:-}" || -z "${PGPORT:-}" || -z "${PGDATABASE:-}" || -z "${PGUSER:-}" || -z "${PGPASSWORD:-}" ]]; then
  echo "Missing DB credentials."
  echo "Set env vars or fill scanners/.env with PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD."
  exit 0
fi

export PGPASSWORD

psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT now() AS db_time;" || true
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT COUNT(*) AS total_rows FROM addresses;" || true
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT network, COUNT(*) FROM addresses GROUP BY network ORDER BY 2 DESC;" || true

# Build daily growth report: previous day total vs now.
mkdir -p "$STATE_DIR"
current_total="$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -Atc "SELECT COUNT(*) FROM addresses;" 2>/dev/null || echo "")"
today_utc="$(date -u '+%Y-%m-%d')"
yesterday_utc="$(date -u -d 'yesterday' '+%Y-%m-%d')"
yesterday_total="N/A"
delta_text="N/A"

if [[ "$current_total" =~ ^[0-9]+$ ]]; then
  touch "$DAILY_FILE"
  tmp_file="$(mktemp)"
  awk -F'\t' -v d="$today_utc" '$1 != d' "$DAILY_FILE" > "$tmp_file"
  printf "%s\t%s\n" "$today_utc" "$current_total" >> "$tmp_file"
  mv "$tmp_file" "$DAILY_FILE"

  y_val="$(awk -F'\t' -v d="$yesterday_utc" '$1 == d {print $2; exit}' "$DAILY_FILE")"
  if [[ "${y_val:-}" =~ ^[0-9]+$ ]]; then
    yesterday_total="$y_val"
    delta=$((current_total - y_val))
    if (( delta >= 0 )); then
      delta_text="+$delta"
    else
      delta_text="$delta"
    fi
  fi
fi

print_header "Latest Scanner Log Tail"
latest_log="$(ls -t "$SCANNERS_DIR"/logs/UnifiedScanner-*.log 2>/dev/null | head -1 || true)"
if [[ -n "$latest_log" ]]; then
  echo "Latest log: $latest_log"
  tail -n 40 "$latest_log" || true
else
  echo "No UnifiedScanner logs found yet."
fi

echo
echo "Health check finished."
echo "Daily report: previous day ${yesterday_total}, now ${current_total:-N/A}, delta ${delta_text}"

# Last cron unified run summary (start/end/duration/status)
last_cron_log="$(ls -t "$SCANNERS_DIR"/logs/cron-unified-*.log 2>/dev/null | head -1 || true)"
cron_start="N/A"
cron_end="N/A"
cron_duration="N/A"
cron_status="unknown"

if [[ -n "$last_cron_log" ]]; then
  cron_start="$(awk -F'STARTED: | ======' '/CRON UNIFIED PIPELINE STARTED/ {print $2; exit}' "$last_cron_log")"
  cron_end="$(awk -F'FINISHED: | ======' '/CRON UNIFIED PIPELINE FINISHED/ {val=$2} END {if (val) print val}' "$last_cron_log")"

  # Active if unified lock exists and scanner processes are running.
  if [[ -f /tmp/scanner-unified-parallel.lock ]] && pgrep -f "node.*core/UnifiedScanner.js" >/dev/null 2>&1; then
    cron_status="active"
  elif [[ -n "${cron_end:-}" ]]; then
    cron_status="finished"
  else
    cron_status="stopped_or_interrupted"
  fi

  if [[ -n "${cron_start:-}" && -n "${cron_end:-}" ]]; then
    start_epoch="$(date -u -d "$cron_start" +%s 2>/dev/null || true)"
    end_epoch="$(date -u -d "$cron_end" +%s 2>/dev/null || true)"
    if [[ -n "${start_epoch:-}" && -n "${end_epoch:-}" && "$end_epoch" -ge "$start_epoch" ]]; then
      diff=$((end_epoch - start_epoch))
      cron_duration="$(printf '%02dh:%02dm:%02ds' $((diff/3600)) $(((diff%3600)/60)) $((diff%60)))"
    fi
  fi
fi

echo "Last cron unified: from ${cron_start} to ${cron_end}, duration ${cron_duration}, status ${cron_status}"

# Next scanner cron run ETA (for scanner core jobs only).
# Includes: cron-unified, cron-funds, cron-funds-high, cron-revalidate, cron-all.
next_scanner_line="$(
python3 - <<'PY'
import datetime
import subprocess

def parse_field(field: str, min_v: int, max_v: int):
    vals = set()
    for part in field.split(","):
        part = part.strip()
        if not part:
            continue
        if part == "*":
            vals.update(range(min_v, max_v + 1))
            continue
        if "/" in part:
            base, step = part.split("/", 1)
            step = int(step)
            if base == "*":
                start, end = min_v, max_v
            elif "-" in base:
                a, b = base.split("-", 1)
                start, end = int(a), int(b)
            else:
                start, end = int(base), max_v
            vals.update(v for v in range(start, end + 1) if (v - start) % step == 0)
            continue
        if "-" in part:
            a, b = part.split("-", 1)
            vals.update(range(int(a), int(b) + 1))
            continue
        vals.add(int(part))
    return {v for v in vals if min_v <= v <= max_v}

def cron_match(dt, mins, hrs, doms, mons, dows):
    # Cron DOW: 0 or 7 = Sunday, Python weekday: Monday=0 ... Sunday=6
    cron_dow = (dt.weekday() + 1) % 7
    return (
        dt.minute in mins and
        dt.hour in hrs and
        dt.day in doms and
        dt.month in mons and
        (cron_dow in dows or (cron_dow == 0 and 7 in dows))
    )

try:
    raw = subprocess.check_output(["crontab", "-l"], text=True, stderr=subprocess.STDOUT)
except Exception:
    print("Next scanner run: N/A (cannot read crontab)")
    raise SystemExit(0)

jobs = []
for line in raw.splitlines():
    s = line.strip()
    if not s or s.startswith("#"):
        continue
    parts = s.split()
    if len(parts) < 6:
        continue
    expr = parts[:5]
    cmd = " ".join(parts[5:])
    if not any(x in cmd for x in [
        "cron-unified.sh",
        "cron-funds.sh",
        "cron-funds-high.sh",
        "cron-revalidate.sh",
        "cron-all.sh",
    ]):
        continue
    jobs.append((expr, cmd))

if not jobs:
    print("Next scanner run: N/A (no scanner cron entries)")
    raise SystemExit(0)

now = datetime.datetime.now(datetime.timezone.utc).replace(second=0, microsecond=0)
best_dt = None
best_cmd = None

for expr, cmd in jobs:
    m_f, h_f, dom_f, mon_f, dow_f = expr
    mins = parse_field(m_f, 0, 59)
    hrs = parse_field(h_f, 0, 23)
    doms = parse_field(dom_f, 1, 31)
    mons = parse_field(mon_f, 1, 12)
    dows = parse_field(dow_f, 0, 7)

    dt = now + datetime.timedelta(minutes=1)
    limit = now + datetime.timedelta(days=8)
    found = None
    while dt <= limit:
        if cron_match(dt, mins, hrs, doms, mons, dows):
            found = dt
            break
        dt += datetime.timedelta(minutes=1)

    if found and (best_dt is None or found < best_dt):
        best_dt = found
        best_cmd = cmd

if best_dt is None:
    print("Next scanner run: N/A (no match in lookahead window)")
    raise SystemExit(0)

delta = best_dt - now
mins_total = int(delta.total_seconds() // 60)
hours = mins_total // 60
mins = mins_total % 60
print(f"Next scanner run in {hours}h {mins}m at {best_dt.strftime('%Y-%m-%d %H:%M UTC')} ({best_cmd})")
PY
)"
echo "$next_scanner_line"
