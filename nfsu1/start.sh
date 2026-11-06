#!/bin/bash
# Serve the stock Underground 1 port locally. Ctrl-C stops the server.
set -euo pipefail
cd "$(dirname "$0")/.."
DATA="${NFSU1_DATA:-}" PORT=8080 BUILD=1
while [ $# -gt 0 ]; do
  case "$1" in
    --data) DATA="$2"; shift 2 ;;
    --http-port) PORT="$2"; shift 2 ;;
    --no-build) BUILD=0; shift ;;
    -h|--help) echo 'nfsu1/start.sh --data /path/to/game [--http-port 8080] [--no-build]'; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done
[ -f "$DATA/Speed.exe" ] || { echo 'Pass --data with the folder containing Speed.exe' >&2; exit 2; }
if [ "$BUILD" = 1 ]; then
  ./nfsu1/build.sh web
  node web/build-stock.mjs
fi
[ -f out/nfsu1/web/nfsu1.wasm ] && [ -f web/dist-nfsu1/stock.js ] || { echo 'Build the WASM module and web page first' >&2; exit 2; }
exec python3 web/server.py --data "$DATA" --port "$PORT"
