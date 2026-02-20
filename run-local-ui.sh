#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/server/backend"
FRONTEND_DIR="$ROOT_DIR/server/frontend-next"
STATE_DIR="$ROOT_DIR/.local-ui"
LOG_DIR="$STATE_DIR/logs"
BACKEND_PID_FILE="$STATE_DIR/backend.pid"
FRONTEND_PID_FILE="$STATE_DIR/frontend.pid"

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

mkdir -p "$LOG_DIR"

is_pid_running() {
  local pid="$1"
  kill -0 "$pid" 2>/dev/null
}

read_pid_file() {
  local f="$1"
  [[ -f "$f" ]] || return 1
  local pid
  pid="$(tr -d '[:space:]' < "$f")"
  [[ "$pid" =~ ^[0-9]+$ ]] || return 1
  echo "$pid"
}

start_backend() {
  local existing_pid
  if existing_pid="$(read_pid_file "$BACKEND_PID_FILE")" && is_pid_running "$existing_pid"; then
    echo "Backend already running (PID $existing_pid)"
    return
  fi

  echo "Starting backend on port $BACKEND_PORT..."
  (
    cd "$BACKEND_DIR"
    PORT="$BACKEND_PORT" nohup npm start > "$LOG_DIR/backend.log" 2>&1 &
    echo $! > "$BACKEND_PID_FILE"
  )
  echo "Backend started (PID $(cat "$BACKEND_PID_FILE"))"
}

start_frontend() {
  local existing_pid
  if existing_pid="$(read_pid_file "$FRONTEND_PID_FILE")" && is_pid_running "$existing_pid"; then
    echo "Frontend already running (PID $existing_pid)"
    return
  fi

  echo "Starting Next.js frontend on port $FRONTEND_PORT..."
  (
    cd "$FRONTEND_DIR"
    # Use production server if build exists (after deploy), else dev
    if [[ -d .next ]]; then
      PORT="$FRONTEND_PORT" nohup npm run start > "$LOG_DIR/frontend.log" 2>&1 &
    else
      PORT="$FRONTEND_PORT" nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
    fi
    echo $! > "$FRONTEND_PID_FILE"
  )
  echo "Frontend started (PID $(cat "$FRONTEND_PID_FILE"))"
}

stop_process() {
  local name="$1"
  local pid_file="$2"
  local port="$3"
  local pid
  if pid="$(read_pid_file "$pid_file")" && is_pid_running "$pid"; then
    echo "Stopping $name (PID $pid)..."
    kill "$pid" 2>/dev/null || true
    sleep 1
    if is_pid_running "$pid"; then
      echo "Force-stopping $name (PID $pid)..."
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$pid_file"
    echo "$name stopped."
  else
    rm -f "$pid_file"
    # Fallback: kill by port (Next.js/npm may spawn children; PID file can be stale)
    if [[ -n "$port" ]] && command -v fuser &>/dev/null; then
      if fuser "$port"/tcp &>/dev/null; then
        echo "Stopping $name (process on port $port)..."
        fuser -k "$port"/tcp 2>/dev/null || true
        sleep 1
        echo "$name stopped."
      else
        echo "$name is not running."
      fi
    else
      echo "$name is not running."
    fi
  fi
}

show_status() {
  local b_status="stopped"
  local f_status="stopped"

  local bpid=""
  if bpid="$(read_pid_file "$BACKEND_PID_FILE")" && is_pid_running "$bpid"; then
    b_status="running (PID $bpid)"
  fi

  local fpid=""
  if fpid="$(read_pid_file "$FRONTEND_PID_FILE")" && is_pid_running "$fpid"; then
    f_status="running (PID $fpid)"
  fi

  echo "Backend:  $b_status"
  echo "Frontend: $f_status"
  echo "Backend URL:  http://localhost:$BACKEND_PORT/health"
  echo "Frontend URL: http://localhost:$FRONTEND_PORT (Next.js)"
  echo "Logs:"
  echo "  $LOG_DIR/backend.log"
  echo "  $LOG_DIR/frontend.log"
}

case "${1:-start}" in
  start)
    start_backend
    start_frontend
    echo
    show_status
    ;;
  stop)
    stop_process "Frontend" "$FRONTEND_PID_FILE" "$FRONTEND_PORT"
    stop_process "Backend" "$BACKEND_PID_FILE" "$BACKEND_PORT"
    ;;
  restart)
    stop_process "Frontend" "$FRONTEND_PID_FILE" "$FRONTEND_PORT"
    stop_process "Backend" "$BACKEND_PID_FILE" "$BACKEND_PORT"
    start_backend
    start_frontend
    echo
    show_status
    ;;
  status)
    show_status
    ;;
  *)
    echo "Usage: $0 [start|stop|restart|status]"
    exit 1
    ;;
esac
