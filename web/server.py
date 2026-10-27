#!/usr/bin/env python3
"""Local development host: compiled page + Wasm + read-only game assets."""
import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", required=True, type=Path)
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()
    data = args.data.resolve()
    if not data.is_dir():
        parser.error("--data must be a game installation directory")
    manifest = json.dumps({"files": [
        {"p": str(p.relative_to(data)), **({"d": 1} if p.is_dir() else {"s": p.stat().st_size, "m": int(p.stat().st_mtime)})}
        for p in sorted(data.rglob("*")) if not p.is_symlink() and not any(part.startswith(".") for part in p.relative_to(data).parts)
    ]}).encode()

    class Handler(BaseHTTPRequestHandler):
        def end_headers(self):
            self.send_header("Cross-Origin-Opener-Policy", "same-origin")
            self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
            self.send_header("Cache-Control", "no-store")
            super().end_headers()

        def do_HEAD(self):
            self.do_GET()

        def do_GET(self):
            url = unquote(urlsplit(self.path).path)
            if url == "/data-manifest":
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(manifest)))
                self.end_headers()
                if self.command != "HEAD": self.wfile.write(manifest)
                return
            root = data if url.startswith("/data/") else ROOT / "web/dist"
            relative = url[6:] if url.startswith("/data/") else url.lstrip("/") or "index.html"
            if url == "/game.wasm":
                root, relative = ROOT / "out/web", "nfsu1.wasm"
            file = (root / relative).resolve()
            if not file.is_relative_to(root.resolve()) or not file.is_file():
                self.send_error(404); return
            size = file.stat().st_size
            start, end, partial = 0, size - 1, False
            requested = self.headers.get("Range")
            if requested:
                match = re.fullmatch(r"bytes=(\d+)-(\d*)", requested)
                if not match:
                    self.send_error(416); return
                start = int(match[1]); end = min(int(match[2]) if match[2] else end, end)
                if start > end:
                    self.send_error(416); return
                partial = True
            self.send_response(206 if partial else 200)
            self.send_header("Content-Type", "application/wasm" if file.suffix == ".wasm" else mimetypes.guess_type(file.name)[0] or "application/octet-stream")
            self.send_header("Content-Length", str(max(0, end-start+1)))
            self.send_header("Accept-Ranges", "bytes")
            if partial: self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.end_headers()
            if self.command == "HEAD": return
            try:
                with file.open("rb") as stream:
                    stream.seek(start)
                    left = end-start+1
                    while left > 0:
                        chunk = stream.read(min(left, 1024*1024))
                        if not chunk: break
                        self.wfile.write(chunk); left -= len(chunk)
            except (BrokenPipeError, ConnectionResetError):
                pass

        def log_message(self, fmt, *params):
            if params and len(params) > 1 and str(params[1]) not in ("200", "206"):
                super().log_message(fmt, *params)

    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"Underground development build: http://127.0.0.1:{server.server_port}/", flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()


if __name__ == "__main__":
    main()
