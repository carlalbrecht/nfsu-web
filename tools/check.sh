#!/bin/bash
# Regressions that need no original game assets.
set -euo pipefail
cd "$(dirname "$0")/.."
PY="${PYTHON:-$PWD/.venv/bin/python}"
mkdir -p out/tests gen
"$PY" -m unittest discover -s tests -p 'test_nfsu1_*.py' -v
"$PY" tools/isatest.py
clang -O1 -Wno-unused-label -Iruntime gen/isatest.c runtime/mem.c -lm -o out/tests/isatest
out/tests/isatest
clang -O1 -Iruntime tests/nfsu1/win32.c runtime/nfsu1/win32.c runtime/mem.c -lm -o out/tests/win32
out/tests/win32
clang -O1 -Iruntime tests/nfsu1/caps.c runtime/d3dcaps.c runtime/mem.c -lm -o out/tests/caps
out/tests/caps
npm --prefix web run check
