#!/bin/sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
SERVER="$ROOT/server"

if [ ! -d "$SERVER/node_modules" ]; then
  echo "Installing server dependencies…"
  (cd "$SERVER" && npm install)
fi

(cd "$SERVER" && npm run dev) &
API_PID=$!

cleanup() {
  kill "$API_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

cd "$ROOT"
vite --host
