#!/bin/bash
# Generate locally from the user's verified Underground 1 executable.
set -euo pipefail
cd "$(dirname "$0")/.."
EXE="${1:-${NFSU1_DATA:+$NFSU1_DATA/Speed.exe}}"
[ -f "$EXE" ] || { echo "usage: ./nfsu1/gen.sh /path/to/Speed.exe" >&2; exit 2; }
PY="${PYTHON:-$PWD/.venv/bin/python}"
mkdir -p gen/nfsu1 out/nfsu1/analysis
printf 'incomplete\n' > gen/nfsu1/stamp.txt
"$PY" tools/discover.py "$EXE" --output out/nfsu1/analysis
cp out/nfsu1/analysis/game_profile.h gen/nfsu1/game_profile.h
# UG2's address-specific optimizations, hooks and overrides must not leak in.
unset FLAGABI INLINE_LIST
export NFS_TARGET=nfsu1 GENOUT=gen/nfsu1 IMPOUT=gen/nfsu1/impargs.c
export OVERRIDE='' HOOKS='' FTOL2INL=0 INLINE=0
export RELOCS=out/nfsu1/analysis/code-pointers.txt SEEDS=out/nfsu1/analysis/seeds.txt
export J="${J:-4}" X87PC=1 JTSWITCH=1 SCHEDULE=1 COVERAGE=1
"$PY" tools/genall.py "$EXE" "${NSHARD:-64}" > out/nfsu1/generation.log 2>&1 || { tail -40 out/nfsu1/generation.log; exit 1; }
STRICT=1 "$PY" tools/argcount.py "$EXE" > out/nfsu1/argcount.log 2>&1 || { tail -10 out/nfsu1/argcount.log; exit 1; }
"$PY" - "$EXE" <<'PY'
import hashlib,json,sys
from pathlib import Path
files=['profiles/underground1.json','tools/discover.py','tools/genall.py','tools/lift.py','tools/lregs.py','tools/argcount.py','nfsu1/gen.sh']
manifest={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in files}
manifest['executable_sha256']=hashlib.sha256(Path(sys.argv[1]).read_bytes()).hexdigest()
Path('gen/nfsu1/stamp.txt').write_text(json.dumps(manifest,indent=2)+'\n')
PY
"$PY" tools/coverage_manifest.py
tail -18 out/nfsu1/generation.log
echo 'Generated Underground 1 C sources in gen/nfsu1 (not a boot validation).'
