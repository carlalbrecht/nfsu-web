#!/bin/bash
# Regressions that need no original game assets.
set -euo pipefail
cd "$(dirname "$0")/.."
PY="${PYTHON:-$PWD/.venv/bin/python}"
mkdir -p out/nfsu1/tests gen
"$PY" -m unittest discover -s tests -p 'test_nfsu1_*.py' -v
"$PY" tools/isatest.py
clang -O1 -Wno-unused-label -Iruntime gen/isatest.c runtime/mem.c -lm -o out/nfsu1/tests/isatest
out/nfsu1/tests/isatest
clang -O1 -Iruntime tests/nfsu1/win32.c runtime/nfsu1/win32.c runtime/nfsu1/datetime.c runtime/mem.c -lm -o out/nfsu1/tests/win32
out/nfsu1/tests/win32
clang -O1 -Iruntime tests/nfsu1/caps.c runtime/d3dcaps.c runtime/mem.c -lm -o out/nfsu1/tests/caps
out/nfsu1/tests/caps
mkdir -p out/nfsu1/tests/shaders
clang -O1 -DVSEMU_WGSL -DNFS_ENHANCED=0 -Iruntime tests/nfsu1/shader.c runtime/vsemu.c -lm -o out/nfsu1/tests/shader
out/nfsu1/tests/shader out/nfsu1/tests/shaders
npm --prefix web run check
