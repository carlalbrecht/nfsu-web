#!/bin/bash
# Headless native diagnostic. Use nfsu1/start.sh to play in the browser.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXE="${1:-${NFSU1_DATA:+$NFSU1_DATA/Speed.exe}}"
[ -f "$EXE" ] || { echo 'usage: ./nfsu1/run.sh /path/to/Speed.exe' >&2; exit 2; }
[ -x "$ROOT/out/nfsu1/native/nfsu1_boot" ] || { echo 'Run ./nfsu1/build.sh native first' >&2; exit 2; }
export NFSU1_SAVEDIR="${NFSU1_SAVEDIR:-$ROOT/out/nfsu1/save}"
mkdir -p "$NFSU1_SAVEDIR"
exec "$ROOT/out/nfsu1/native/nfsu1_boot" "$EXE"
