#!/bin/bash
# Headless native diagnostic. Use web/start.sh to play in the browser.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
EXE="${1:-${NFSU1_DATA:+$NFSU1_DATA/Speed.exe}}"
[ -f "$EXE" ] || { echo 'usage: ./run.sh /path/to/Speed.exe' >&2; exit 2; }
[ -x "$ROOT/out/native/nfsu1_boot" ] || { echo 'Run ./build.sh first' >&2; exit 2; }
export NFSU1_SAVEDIR="${NFSU1_SAVEDIR:-$ROOT/out/save}"
mkdir -p "$NFSU1_SAVEDIR"
exec "$ROOT/out/native/nfsu1_boot" "$EXE"
