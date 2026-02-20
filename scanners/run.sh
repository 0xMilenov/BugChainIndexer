#!/usr/bin/env bash
# Unified Scanner Runner - Streamlined Version
# Usage: ./run.sh [scanner] [mode] [network]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCANNERS_DIR="$SCRIPT_DIR/core"
LOG_DIR="$SCRIPT_DIR/logs"

# Load backend .env so scanners use same DB as API (DATABASE_URL)
if [[ -f "$SCRIPT_DIR/../server/backend/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/../server/backend/.env"
  set +a
fi

# Configuration
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-7200}"
NETWORKS=(ethereum binance optimism base arbitrum polygon avalanche gnosis linea scroll mantle megaeth arbitrum-nova celo cronos moonbeam moonriver opbnb polygon-zkevm)

# Create logs directory
mkdir -p "$LOG_DIR"

# Global variables for process management
declare -a BACKGROUND_PIDS=()
CLEANUP_DONE=false

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_DIR/runner.log"
}

# Cleanup function for graceful shutdown
cleanup_and_exit() {
    local exit_code=${1:-130}  # Default to SIGINT exit code
    
    if [[ "$CLEANUP_DONE" == "true" ]]; then
        return
    fi
    CLEANUP_DONE=true
    
    log "🔄 Received termination signal. Cleaning up..."
    
    # Kill all background processes
    if [[ ${#BACKGROUND_PIDS[@]} -gt 0 ]]; then
        log "🔸 Terminating ${#BACKGROUND_PIDS[@]} background processes..."
        
        for pid in "${BACKGROUND_PIDS[@]}"; do
            if kill -0 "$pid" 2>/dev/null; then
                log "🔸 Killing process $pid"
                kill -TERM "$pid" 2>/dev/null || true
            fi
        done
        
        # Give processes time to terminate gracefully
        sleep 2
        
        # Force kill any remaining processes
        for pid in "${BACKGROUND_PIDS[@]}"; do
            if kill -0 "$pid" 2>/dev/null; then
                log "🔸 Force killing process $pid"
                kill -KILL "$pid" 2>/dev/null || true
            fi
        done
        
        log "✅ All background processes terminated"
    fi
    
    # Clean up any node processes that might be running
    pkill -f "node.*core/" 2>/dev/null || true
    
    # Release any locks
    find /tmp -name "scanner-*.lock" -delete 2>/dev/null || true
    
    log "🏁 Cleanup completed. Exiting with code $exit_code"
    exit $exit_code
}

# Set up signal handlers
trap 'cleanup_and_exit 130' SIGINT   # Ctrl+C
trap 'cleanup_and_exit 143' SIGTERM  # Termination
trap 'cleanup_and_exit 129' SIGHUP   # Hang up
trap 'cleanup_and_exit 131' SIGQUIT  # Quit signal

# Lock mechanism
lock_and_run() {
    local lock_name="$1"
    local command="$2"
    local lock_file="/tmp/scanner-${lock_name}.lock"
    
    exec 200>"$lock_file"
    if ! flock -n 200; then
        log "ERROR: $lock_name is already running"
        return 1
    fi
    
    eval "$command"
}

# Single network execution
run_network() {
    local scanner="$1"
    local network="$2"
    local log_file="$LOG_DIR/${scanner}-${network}-$(date +%Y%m%d_%H%M%S).log"
    
    log "🚀 Starting $scanner for $network... (log: $(basename "$log_file"))"
    
    # Run with timeout and capture exit code
    local start_time=$(date +%s)
    if timeout "${TIMEOUT_SECONDS}s" env NETWORK="$network" node "$SCANNERS_DIR/$scanner.js" > "$log_file" 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        local formatted_duration=$(printf "%02d:%02d:%02d" $((duration/3600)) $((duration%3600/60)) $((duration%60)))
        
        # Show brief summary from log file
        local summary=$(grep -E "(Found|Updated|Processed|completed)" "$log_file" 2>/dev/null | tail -2 | tr '\n' ' ' | sed 's/^[[:space:]]*//')
        log "✅ $scanner completed for $network (${formatted_duration}) - ${summary}"
        return 0
    else
        local exit_code=$?
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        local formatted_duration=$(printf "%02d:%02d:%02d" $((duration/3600)) $((duration%3600/60)) $((duration%60)))
        
        # Show last few lines of error log for quick diagnosis
        local error_preview=$(tail -3 "$log_file" 2>/dev/null | tr '\n' ' ' | sed 's/^[[:space:]]*//')
        if [[ -n "$error_preview" ]]; then
            log "❌ $scanner failed for $network (${formatted_duration}) - ${error_preview}"
        else
            log "❌ $scanner failed for $network (${formatted_duration}) - exit code: $exit_code"
        fi
        return 1
    fi
}

# Sequential execution
run_sequential() {
    local scanner="$1"
    log "🔄 Starting sequential execution for $scanner on ${#NETWORKS[@]} networks"
    
    for network in "${NETWORKS[@]}"; do
        if ! run_network "$scanner" "$network"; then
            log "🔴 ERROR: $scanner failed on network: $network"
            return 1
        fi
    done
    
    log "✅ All $scanner sequential executions completed successfully"
}

# Parallel execution
run_parallel() {
    local scanner="$1"
    local pids=()
    local failed=()
    
    log "🚀 Starting parallel execution for $scanner on ${#NETWORKS[@]} networks"
    
    # Start all networks
    for network in "${NETWORKS[@]}"; do
        run_network "$scanner" "$network" &
        local pid=$!
        pids+=($pid)
        BACKGROUND_PIDS+=($pid)  # Track globally for cleanup
        log "🔸 Started $scanner for $network (PID: $pid)"
    done
    
    log "⏳ Waiting for ${#pids[@]} parallel processes to complete..."
    
    local completed=0
    local total=${#pids[@]}
    
    # Wait for completion with interrupt handling and progress tracking
    for i in "${!pids[@]}"; do
        local pid=${pids[$i]}
        local network=${NETWORKS[$i]}
        
        if wait "$pid"; then
            completed=$((completed + 1))
            log "✅ $scanner completed successfully for $network ($completed/$total networks done)"
            # Remove from global tracking array
            BACKGROUND_PIDS=("${BACKGROUND_PIDS[@]/$pid}")
        else
            local exit_code=$?
            completed=$((completed + 1))
            log "❌ $scanner failed for $network (exit code: $exit_code) ($completed/$total networks done)"
            failed+=("$network")
            # Remove from global tracking array
            BACKGROUND_PIDS=("${BACKGROUND_PIDS[@]/$pid}")
        fi
    done
    
    if [[ ${#failed[@]} -gt 0 ]]; then
        log "🔴 ERROR: $scanner failed on networks (${#failed[@]}/${#NETWORKS[@]}): ${failed[*]}"
        return 1
    fi
    
    log "✅ All $scanner parallel executions completed successfully"
}

# Main execution
main() {
    local scanner="${1:-help}"
    local mode="${2:-auto}"
    local network="${3:-${NETWORK:-}}"
    
    case "$scanner" in
        "funds"|"FundUpdater")
            log "🏛️ Starting FundUpdater scanner${network:+ for $network} (parallel mode)..."
            if [[ -n "$network" ]]; then
                lock_and_run "funds-$network" "run_network FundUpdater $network"
            else
                lock_and_run "funds-parallel" "run_parallel FundUpdater"
            fi
            ;;
            
        "funds-all"|"FundUpdater-all")
            log "🏛️ Starting FundUpdater scanner with ALL_FLAG enabled${network:+ for $network}${network:+...}"

            # Set large batch size to update all addresses (default: 500000)
            local batch_size="${FUND_UPDATE_MAX_BATCH:-500000}"

            if [[ -n "$network" ]]; then
                log "📦 Batch size: $batch_size (will update all addresses)"
                lock_and_run "funds-all-$network" "env ALL_FLAG=true FUND_UPDATE_MAX_BATCH=\"$batch_size\" NETWORK=\"$network\" node \"$SCANNERS_DIR/FundUpdater.js\""
            else
                # Set environment variable and run parallel function
                export ALL_FLAG=true
                export FUND_UPDATE_MAX_BATCH="$batch_size"
                log "📦 Batch size: $batch_size per network (will update all addresses)"
                lock_and_run "funds-all-parallel" "run_parallel FundUpdater"
            fi
            ;;
            
        "funds-high"|"FundUpdater-high")
            log "🏛️ Starting FundUpdater scanner for high-value addresses (fund >= 100,000)${network:+ for $network}..."
            if [[ -n "$network" ]]; then
                lock_and_run "funds-high-$network" "env HIGH_FUND_FLAG=true ALL_FLAG=true NETWORK=\"$network\" node \"$SCANNERS_DIR/FundUpdater.js\""
            else
                # Set environment variables for high fund scanning with ALL_FLAG
                export HIGH_FUND_FLAG=true
                export ALL_FLAG=true
                lock_and_run "funds-high-parallel" "run_parallel FundUpdater"
            fi
            ;;
            
            
        "unified"|"UnifiedScanner")
            log "🔍 Starting UnifiedScanner pipeline${network:+ for $network} ($mode mode)..."
            if [[ -n "$network" ]]; then
                lock_and_run "unified-$network" "run_network UnifiedScanner $network"
            elif [[ "$mode" == "sequential" ]]; then
                lock_and_run "unified-sequential" "run_sequential UnifiedScanner"
            else
                lock_and_run "unified-parallel" "run_parallel UnifiedScanner"
            fi
            ;;
            
        "revalidate"|"data-revalidate"|"DataRevalidator")
            log "🔍 Starting DataRevalidator scanner${network:+ for $network}..."
            if [[ -n "$network" ]]; then
                lock_and_run "revalidate-$network" "run_network DataRevalidator $network"
            else
                lock_and_run "revalidate-parallel" "run_parallel DataRevalidator"
            fi
            ;;

        "erc20-backfill"|"erc20-backfill-address")
            log "💰 Backfilling ERC-20 balance for specific address..."
            if [[ -z "$network" ]]; then
              network="${NETWORK:-ethereum}"
            fi
            if [[ -z "${ADDRESS:-}" ]]; then
              log "ERROR: Set ADDRESS=0x... for single-address backfill"
              exit 1
            fi
            lock_and_run "erc20-backfill-$network" "env NETWORK=\"$network\" ADDRESS=\"$ADDRESS\" node \"$SCANNERS_DIR/../utils/backfill-erc20-balance.js\""
            ;;

        "erc20-backfill-all")
            log "💰 Backfilling ERC-20 balances across all networks..."
            lock_and_run "erc20-backfill-all" "node \"$SCANNERS_DIR/../utils/backfill-erc20-all-networks.js\""
            ;;

        "erc20-balances"|"ERC20TokenBalanceScanner")
            log "💰 Starting ERC20TokenBalanceScanner${network:+ for $network}..."
            if [[ -n "$network" ]]; then
                lock_and_run "erc20-balances-$network" "run_network ERC20TokenBalanceScanner $network"
            elif [[ "${ERC20_PARALLEL:-0}" == "1" ]]; then
                lock_and_run "erc20-balances-parallel" "run_parallel ERC20TokenBalanceScanner"
            else
                lock_and_run "erc20-balances-sequential" "run_sequential ERC20TokenBalanceScanner"
            fi
            ;;

        "all"|"suite")
            log "🚀 Starting complete scanner suite (unified + funds + revalidate + erc20)..."
            
            # Unified blockchain analysis with integrated verification (parallel)
            log "📊 [1/4] Running UnifiedScanner (parallel)..."
            lock_and_run "suite-unified" "run_parallel UnifiedScanner" || exit 1
            
            # Fund updates (sequential for stability)
            log "🏛️ [2/4] Running FundUpdater (sequential)..."
            lock_and_run "suite-funds" "run_sequential FundUpdater" || exit 1
            
            # ERC-20 token balances (sequential to avoid rate limits)
            log "💰 [3/4] Running ERC20TokenBalanceScanner (sequential)..."
            lock_and_run "suite-erc20" "run_sequential ERC20TokenBalanceScanner" || exit 1
            
            # Data revalidation (parallel)
            log "🔍 [4/4] Running DataRevalidator (parallel)..."
            lock_and_run "suite-revalidate" "run_parallel DataRevalidator" || exit 1
            
            log "✅ Complete scanner suite finished successfully"
            ;;
            
        "logs")
            case "${mode:-all}" in
                "error"|"errors")
                    grep -i "error\|failed" "$LOG_DIR"/*.log 2>/dev/null | tail -20 || echo "No errors found"
                    ;;
                "recent")
                    ls -t "$LOG_DIR"/*.log 2>/dev/null | head -5 | xargs tail -n 10 || echo "No recent logs"
                    ;;
                "status"|"running")
                    echo "🔍 Checking running scanner processes..."
                    echo ""
                    
                    # Check for running node processes
                    local running_scanners=$(ps aux | grep -E "node.*core/.*\.js" | grep -v grep)
                    if [[ -n "$running_scanners" ]]; then
                        echo "📊 Currently running scanners:"
                        echo "$running_scanners" | while read -r line; do
                            local pid=$(echo "$line" | awk '{print $2}')
                            local cpu=$(echo "$line" | awk '{print $3}')
                            local mem=$(echo "$line" | awk '{print $4}')
                            local cmd=$(echo "$line" | grep -o "node.*\.js")
                            local network=$(echo "$line" | grep -o "NETWORK=[a-z-]*" | cut -d= -f2)
                            local scanner=$(echo "$cmd" | grep -o "[A-Z][a-zA-Z]*\.js" | sed 's/\.js//')
                            
                            # Calculate runtime
                            local start_time=$(ps -o lstart= -p "$pid" 2>/dev/null | head -1)
                            local runtime=""
                            if [[ -n "$start_time" ]]; then
                                local start_epoch=$(date -d "$start_time" +%s 2>/dev/null)
                                local current_epoch=$(date +%s)
                                if [[ -n "$start_epoch" && "$start_epoch" -gt 0 ]]; then
                                    local duration=$((current_epoch - start_epoch))
                                    runtime=$(printf "%02d:%02d:%02d" $((duration/3600)) $((duration%3600/60)) $((duration%60)))
                                fi
                            fi
                            
                            echo "  🟢 PID:$pid $scanner${network:+ on $network} (CPU:${cpu}% MEM:${mem}%${runtime:+ Runtime:$runtime})"
                        done
                        echo ""
                    else
                        echo "⚪ No scanners currently running"
                        echo ""
                    fi
                    
                    # Check lock files
                    local locks=$(find /tmp -name "scanner-*.lock" 2>/dev/null)
                    if [[ -n "$locks" ]]; then
                        echo "🔒 Active locks:"
                        for lock in $locks; do
                            local lock_name=$(basename "$lock" | sed 's/scanner-//;s/\.lock//')
                            echo "  🔸 $lock_name"
                        done
                        echo ""
                    fi
                    
                    # Show recent log activity
                    echo "📋 Recent log activity (last 5 minutes):"
                    find "$LOG_DIR" -name "*.log" -mmin -5 -exec basename {} \; 2>/dev/null | head -10 | while read -r logfile; do
                        echo "  📄 $logfile"
                    done
                    ;;
                "tail"|"follow")
                    # Follow the most recent log file
                    local latest_log=$(ls -t "$LOG_DIR"/*.log 2>/dev/null | head -1)
                    if [[ -n "$latest_log" ]]; then
                        echo "📄 Following latest log: $(basename "$latest_log")"
                        echo "Press Ctrl+C to stop"
                        tail -f "$latest_log"
                    else
                        echo "No log files found"
                    fi
                    ;;
                *)
                    echo "📁 Log directory contents:"
                    ls -la "$LOG_DIR" 2>/dev/null || echo "No logs directory"
                    echo ""
                    echo "Available log commands:"
                    echo "  logs error   - Show recent errors"
                    echo "  logs recent  - Show recent log entries"
                    echo "  logs status  - Show running processes and locks"
                    echo "  logs tail    - Follow latest log file"
                    ;;
            esac
            ;;
            
        "clean")
            log "Cleaning old logs (>3 days)"
            find "$LOG_DIR" -name "*.log" -mtime +3 -delete 2>/dev/null || true
            ;;
            
        "db-optimize"|"optimize")
            log "🔧 Starting database optimization..."
            node "$SCRIPT_DIR/utils/db-optimize.js" --optimize
            ;;
            
        "db-optimize-fast"|"optimize-fast")
            log "🔧 Starting fast database optimization (skip VACUUM)..."
            node "$SCRIPT_DIR/utils/db-optimize.js" --optimize --fast
            ;;
            
        "db-analyze"|"analyze")
            log "📊 Analyzing database performance..."
            node "$SCRIPT_DIR/utils/db-optimize.js" --analyze
            ;;
            
        "db-cleanup"|"cleanup")
            log "🧹 Cleaning up database indexes..."
            node "$SCRIPT_DIR/utils/db-cleanup.js"
            ;;
            
        "db-normalize-addresses"|"normalize-addresses")
            log "🔤 Analyzing address normalization..."
            node "$SCRIPT_DIR/utils/db-normalize-addresses.js" --analyze
            ;;
            
        "db-normalize-addresses-dry"|"normalize-addresses-dry")
            log "🔤 Dry run address normalization..."
            node "$SCRIPT_DIR/utils/db-normalize-addresses.js" --dry-run
            ;;
            
        "db-normalize-addresses-force"|"normalize-addresses-force")
            log "🔤 Force address normalization..."
            node "$SCRIPT_DIR/utils/db-normalize-addresses.js" --force
            ;;
            
            
        "db-optimize-large"|"optimize-large")
            log "🚀 Starting large dataset optimization..."
            node "$SCRIPT_DIR/utils/db-optimize-large.js"
            ;;

        "db-reset"|"reset")
            log "🗑️ Database reset (dry run)..."
            node "$SCRIPT_DIR/utils/db-reset.js"
            ;;
        "db-reset-execute"|"reset-execute")
            log "🗑️ Database reset - DELETING ALL DATA..."
            node "$SCRIPT_DIR/utils/db-reset.js" --execute
            ;;

        "index-optimize"|"optimize-indexes"|"fillfactor")
            log "🔧 Optimizing index FILLFACTOR (reduces page splits and lock contention)..."
            node "$SCRIPT_DIR/utils/optimize-index-fillfactor.js"
            ;;

        "index-optimize-dry"|"optimize-indexes-dry"|"fillfactor-dry")
            log "🔍 Preview index FILLFACTOR optimization (dry run)..."
            node "$SCRIPT_DIR/utils/optimize-index-fillfactor.js" --dry-run
            ;;

        "remove-unused-indexes"|"cleanup-indexes")
            log "🗑️  Removing unused indexes to improve INSERT performance..."
            node "$SCRIPT_DIR/utils/remove-unused-indexes.js"
            ;;

        "remove-unused-indexes-dry"|"cleanup-indexes-dry")
            log "🔍 Preview unused index removal (dry run)..."
            node "$SCRIPT_DIR/utils/remove-unused-indexes.js" --dry-run
            ;;

        *)
            cat << EOF
Usage: $0 [SCANNER] [MODE] [NETWORK]

Available Scanners:
  funds         Update asset balances using Moralis API (parallel execution)
  funds-all     Update asset balances for ALL contracts (ALL_FLAG enabled, batch size: 500,000)
  funds-high    Update asset balances for high-value addresses (fund >= 100,000, includes ALL_FLAG)
  unified       Complete blockchain analysis pipeline: addresses + EOA + verification (parallel)
  revalidate    Revalidate existing data for consistency (data-revalidate, DataRevalidator)
  erc20-balances Fetch ERC-20 token balances for verified contracts via Etherscan API (sequential by default)
  erc20-backfill Populate ERC-20 for one address (use ADDRESS=0x... NETWORK=ethereum)
  erc20-backfill-all Seed ERC-20 balances across all networks (PER_NETWORK=100, TOKEN_LIMIT=100)
  all           Run complete scanner suite (unified + funds + revalidate)

Modes:
  auto          Default behavior for each scanner
  sequential    Run networks one by one
  parallel      Run all networks simultaneously

Networks:
  Specific network name (e.g., ethereum, polygon) or leave empty for all
  Supported: $(printf '%s, ' "${NETWORKS[@]}" | sed 's/, $//')

Examples:
  # Run on all networks
  $0 funds                    # Update funds for all networks using Moralis API
  $0 funds-all                # Update funds for ALL contracts (ALL_FLAG enabled)
  $0 funds-high               # Update funds for high-value addresses (fund >= 100,000) with ALL_FLAG
  $0 unified                  # Run unified blockchain analysis pipeline (recommended)
  $0 unified parallel         # Run unified pipeline on all networks in parallel
  $0 revalidate               # Run data revalidation for all networks
  $0 all                      # Full unified scanner suite

  # Run on specific network (RECOMMENDED METHOD)
  NETWORK=ethereum $0 funds        # Update funds for ethereum only
  NETWORK=ethereum $0 funds-all    # Update ALL contracts on ethereum only
  NETWORK=ethereum $0 funds-high   # Update high-value funds on ethereum with ALL_FLAG
  NETWORK=ethereum $0 unified      # Run unified analysis for ethereum only
  NETWORK=ethereum $0 revalidate   # Run revalidation for ethereum only
  NETWORK=ethereum $0 erc20-balances # Fetch ERC-20 balances for ethereum only
  ERC20_PILOT_LIMIT=10 NETWORK=ethereum $0 erc20-balances # Pilot: 10 contracts only (test before scaling)
  NETWORK=polygon $0 unified       # Run unified analysis for polygon only

  # Alternative method (use correct parameter order)
  $0 funds auto ethereum      # Update funds for ethereum only
  $0 unified auto ethereum    # Run unified analysis for ethereum only
  $0 revalidate auto ethereum # Run revalidation for ethereum only
  
Monitoring & Maintenance:
  $0 logs error               # Show recent errors
  $0 logs status              # Show running processes and locks
  $0 logs tail                # Follow latest log file
  $0 logs recent              # Show recent log entries
  $0 clean                    # Clean old logs (>3 days)
  $0 db-optimize              # Optimize database performance (with VACUUM)
  $0 db-optimize-fast         # Fast optimization (skip VACUUM - recommended for daily use)
  $0 db-optimize-large        # Large dataset optimization (10GB+) - monthly recommended
  $0 index-optimize           # Optimize index FILLFACTOR to reduce lock contention (70% less page splits)
  $0 index-optimize-dry       # Preview index optimization (dry run mode)
  $0 remove-unused-indexes    # Remove indexes that are never used (saves 1.5GB+ disk space)
  $0 remove-unused-indexes-dry # Preview unused index removal (dry run mode)
  $0 db-analyze               # Analyze database performance (read-only)
  $0 db-reset                 # Preview database reset (dry run)
  $0 db-reset-execute         # Reset database - delete all data, start fresh
  $0 db-cleanup               # Remove unused indexes and create optimized ones
  $0 db-normalize-addresses   # Analyze address normalization needs
  $0 db-normalize-addresses-dry # Dry run address normalization (preview only)
  $0 db-normalize-addresses-force # Execute address normalization with duplicates handling

Environment Variables:
  TIMEOUT_SECONDS=7200       Script timeout (default: 7200)
  NETWORK=network_name       Override network for single-network runs
  HIGH_FUND_FLAG=true        Enable high-value address filtering (fund >= 100,000)
  FUND_UPDATE_MAX_BATCH=50000 Maximum batch size for fund updates
  ALL_FLAG=true              Enable processing all addresses (for funds-all mode)
  DEFAULT_ETHERSCAN_KEYS     Required for Etherscan V2 (single key for all chains)
  ERC20_BATCH_SIZE=2000      Contracts per ERC-20 balance run (default: 2000)
  ERC20_PILOT_LIMIT=10       Pilot mode: process only N contracts (test before scaling)
  ERC20_CONTRACT_LIMIT=N     Max contracts per run (overrides batch size when set)
  ERC20_TOKEN_LIMIT=100      Max tokens per contract by rank (default: 100 = all tokens from JSON)
  ERC20_MAX_AGE_DAYS=7       Refresh balances older than N days (default: 7)
  ERC20_PARALLEL=1           Use parallel instead of sequential for erc20-balances
  ERC20_API_DELAY_MS=400     Delay between Etherscan calls (default: 400ms = 2.5 calls/sec)
  ERC20_INCLUDE_UNVERIFIED=1 Include unverified contracts (default: verified only)
  PER_NETWORK=100            Contracts per network for erc20-backfill-all (default: 100)
  TOKEN_LIMIT=100            Tokens per contract for erc20-backfill-all (default: 100)
  NETWORKS=a,b,c             Comma-separated networks for erc20-backfill-all

Available Core Scanners:
  - UnifiedScanner.js        Complete blockchain analysis pipeline
  - FundUpdater.js          Asset price and balance updates
  - DataRevalidator.js      Data consistency validation
  - ERC20TokenBalanceScanner.js  ERC-20 token balances via Etherscan API
EOF
            ;;
    esac
}

# Execute
main "$@"