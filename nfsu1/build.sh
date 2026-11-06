#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
exec "${PYTHON:-$PWD/.venv/bin/python}" tools/build.py "$@"
