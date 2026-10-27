#!/bin/bash
# build.sh compiles and links the selected stock runtime.
set -euo pipefail
exec "$(dirname "$0")/build.sh" "$@"
