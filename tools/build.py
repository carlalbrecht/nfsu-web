#!/usr/bin/env python3
"""Build the Underground 1 runtime with bounded, content-addressed compilation."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("target", choices=("native", "web"))
    parser.add_argument("--jobs", type=int, default=int(os.environ.get("J", "4")))
    args = parser.parse_args()
    os.chdir(ROOT)
    stamp = Path("gen/all/stamp.txt")
    try:
        manifest = json.loads(stamp.read_text())
    except (OSError, ValueError):
        parser.exit(1, "Run ./gen.sh with the supported executable first\n")
    for source, digest in manifest.items():
        if source != "executable_sha256" and hashlib.sha256(Path(source).read_bytes()).hexdigest() != digest:
            parser.exit(1, f"Generated sources are stale: {source} changed; rerun ./gen.sh\n")
    out = Path("out") / args.target
    out.mkdir(parents=True, exist_ok=True)
    common = "mem dispatch genexec heap watchdog win32 win32_ext com d3dcaps debug res fileio vsemu lifecycle dinput_pad dikeys keyboard dinput_kbd winsock module modheap enhance"
    sources = [Path(f"runtime/{name}.c") for name in common.split()]
    sources += [Path(f"runtime/nfsu1/{name}.c") for name in ("entry", "stock", "win32", "datetime")]
    sources += [Path("runtime/web/null_platform.c"), Path("runtime/web/sha256.c")]
    sources += sorted(Path("gen/all").glob("*.c"))
    flags = shlex.split(os.environ.get("OPT", "-O1"))
    flags += ["-DNFSU1", "-DNFS_ENHANCED=0", "-Iruntime", "-Igen/all", "-Wno-unused-label", "-Wno-parentheses-equality"]
    if args.target == "web":
        wasi = Path(os.environ.get("WASI", "deps/wasi-sdk-34.0-arm64-macos"))
        cc = str(wasi / "bin/clang")
        flags += ["--target=wasm32-wasip1-threads", "-pthread", "-msimd128", "-mbulk-memory", "-mnontrapping-fptoint", "-mtail-call", "-mexception-handling", "-mllvm", "-wasm-enable-sjlj", "-mllvm", "-wasm-use-legacy-eh=false", "-D_WASI_EMULATED_MMAN", "-D_WASI_EMULATED_SIGNAL", "-D_WASI_EMULATED_PROCESS_CLOCKS", "-fno-delete-null-pointer-checks", "-include", "runtime/web/compat/wasm_plat.h", "-Iruntime/web/compat"]
        sources += [Path(f"runtime/web/{name}.c") for name in ("tz", "thread_exit", "stackprobe", "net_lan", "shader_dump", "gpu_web", "audio_web", "input_web")]
        link_flags = ["-Wl,--import-memory,--export-memory,--shared-memory,--max-memory=4294967296", "-Wl,--initial-memory=1073741824,--global-base=671088640", "-Wl,-z,stack-size=16777216,--no-stack-first", "-lsetjmp", "-lwasi-emulated-mman", "-lwasi-emulated-signal", "-lwasi-emulated-process-clocks"]
        binary = out / "nfsu1.wasm"
    else:
        cc = os.environ.get("CC", "clang")
        flags += ["-ffunction-sections", "-fdata-sections"]
        sources += [Path("runtime/net_vlan.c")]
        link_flags = ["-Wl,-dead_strip", "-lm", "-lpthread"]
        binary = out / "nfsu1_boot"
    headers = b"".join(p.read_bytes() for p in sorted(Path("runtime").rglob("*.h")))
    headers += b"".join(p.read_bytes() for p in sorted(Path("gen/all").glob("*.h")))
    headers += subprocess.check_output([cc, "--version"])
    header_hash = hashlib.sha256(headers).digest()

    def compile_one(source):
        obj = out / (str(source).replace("/", "_").removesuffix(".c") + ".o")
        key = obj.with_suffix(".sum")
        local_flags = list(flags)
        if source.name == "thread_exit.c":
            index = local_flags.index("-include")
            del local_flags[index:index+2]
        digest = hashlib.sha256(source.read_bytes() + header_hash + repr(local_flags).encode()).hexdigest()
        if obj.exists() and key.exists() and key.read_text() == digest:
            return obj
        proc = subprocess.run([cc, *local_flags, "-c", str(source), "-o", str(obj)], capture_output=True, text=True)
        if proc.returncode:
            print(proc.stderr, file=sys.stderr)
            raise RuntimeError(f"Compilation failed: {source}")
        key.write_text(digest)
        print(f"compiled {source}", flush=True)
        return obj

    with ThreadPoolExecutor(max_workers=max(1, args.jobs)) as pool:
        objects = list(pool.map(compile_one, sources))
    result = subprocess.run([cc, *flags, *map(str, objects), *link_flags, "-o", str(binary)], capture_output=True, text=True)
    (out / "link.log").write_text(result.stdout + result.stderr)
    if result.returncode:
        print(result.stderr, file=sys.stderr)
        return result.returncode
    print(f"Built {binary} ({binary.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (RuntimeError, OSError) as error:
        sys.exit(str(error))
