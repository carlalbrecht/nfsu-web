#!/bin/bash
# Generate locally from the user's verified Underground 1 executable.
set -euo pipefail
cd "$(dirname "$0")"
EXE="${1:-${NFSU1_DATA:+$NFSU1_DATA/Speed.exe}}"
[ -f "$EXE" ] || { echo "usage: ./gen.sh /path/to/Speed.exe" >&2; exit 2; }
PY="${PYTHON:-$PWD/.venv/bin/python}"
mkdir -p gen/all out/analysis
printf 'incomplete\n' > gen/all/stamp.txt
"$PY" tools/discover.py "$EXE"
cp out/analysis/game_profile.h gen/all/game_profile.h
# UG2's address-specific optimizations, hooks and overrides must not leak in.
unset FLAGABI INLINE_LIST
export OVERRIDE='' HOOKS='' FTOL2INL=0 INLINE=0
export RELOCS=out/analysis/code-pointers.txt SEEDS=out/analysis/seeds.txt
export J="${J:-4}" X87PC=1 JTSWITCH=1 SCHEDULE=1
"$PY" tools/genall.py "$EXE" "${NSHARD:-64}" > out/generation.log 2>&1 || { tail -40 out/generation.log; exit 1; }
STRICT=1 "$PY" tools/argcount.py "$EXE" > out/argcount.log 2>&1 || { tail -10 out/argcount.log; exit 1; }
"$PY" - "$EXE" <<'PY'
import hashlib,json,sys
from pathlib import Path
files=['profiles/underground1.json','tools/discover.py','tools/genall.py','tools/lift.py','tools/lregs.py','tools/argcount.py','gen.sh']
manifest={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in files}
manifest['executable_sha256']=hashlib.sha256(Path(sys.argv[1]).read_bytes()).hexdigest()
Path('gen/all/stamp.txt').write_text(json.dumps(manifest,indent=2)+'\n')
PY
tail -18 out/generation.log
echo 'Generated Underground 1 C sources in gen/all (not a boot validation).'
