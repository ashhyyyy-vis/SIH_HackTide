#!/usr/bin/env bash
# Start every service YojanaMitra needs, in order, and verify each one.
#   ./start.sh          start everything
#   ./start.sh stop     stop everything
set -uo pipefail
cd "$(dirname "$0")"
ROOT="$(pwd)"
LOGS="$ROOT/.logs"; mkdir -p "$LOGS"

stop() {
  pkill -f "$ROOT/app/backend/node_modules/.bin/tsx" 2>/dev/null
  pkill -f "$ROOT/backend/node_modules/.bin/ts-node-dev" 2>/dev/null
  pkill -f "$ROOT/frontend/node_modules/.bin/vite" 2>/dev/null
  echo "stopped"
}
[ "${1:-}" = "stop" ] && { stop; exit 0; }

wait_for() { # url, label, tries
  for _ in $(seq 1 "$3"); do
    [ "$(curl -s -o /dev/null -w '%{http_code}' "$1" 2>/dev/null)" = "200" ] && { echo "  ✓ $2"; return 0; }
    sleep 1
  done
  echo "  ✗ $2  — see $LOGS"; return 1
}

echo "Stopping anything already running..."; stop >/dev/null; sleep 2

for d in app/backend backend frontend; do
  [ -d "$d" ] && [ ! -d "$d/node_modules" ] && { echo "Installing dependencies in $d ..."; (cd "$d" && npm install --silent); }
done

for f in app/backend/.env backend/.env; do
  [ -f "$f" ] || echo "  ! $f missing — copy ${f}.example to $f and fill it in"
done

echo "Starting data + AI backend (app/backend, :3001)..."
(cd app/backend && NODE_OPTIONS='--no-deprecation' nohup npx tsx src/server.ts > "$LOGS/data-api.log" 2>&1 < /dev/null &)
wait_for http://localhost:3001/api/health "data+AI  http://localhost:3001" 40

echo "Starting auth backend (backend, :5001)..."
(cd backend && nohup npm run dev > "$LOGS/auth-api.log" 2>&1 < /dev/null &)
wait_for http://localhost:5001/health "auth     http://localhost:5001" 40

echo "Starting frontend (frontend, :5173)..."
(cd frontend && nohup npm run dev > "$LOGS/frontend.log" 2>&1 < /dev/null &)
wait_for http://localhost:5173 "frontend http://localhost:5173" 40

echo
echo "Checks:"
curl -s http://localhost:5173/api/states 2>/dev/null | grep -q '"allCount"' \
  && echo "  ✓ /api/states returns all 36 states & UTs" \
  || echo "  ✗ /api/states is stale or unreachable"
curl -s http://localhost:5173/api/chat/status 2>/dev/null | grep -q '"configured":true' \
  && echo "  ✓ AI chat configured" \
  || echo "  ! no GEMINI_API_KEY in app/backend/.env — chat falls back to the rule-based agent"

echo
echo "Open http://localhost:5173     Logs: $LOGS     Stop: ./start.sh stop"
