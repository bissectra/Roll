#!/usr/bin/env python3
"""
Tiny static server to mimic a GitHub Pages style deploy locally.

Features:
- Serves the repo root under an optional URL prefix (default: /Roll).
- SPA-friendly fallback: routes without an explicit file extension return index.html (so /level/<id> works).
- Graceful 404: if a path truly does not exist, the local 404.html is returned with status 404.
- Auto-redirects to the configured prefix so the browser path matches how GitHub Pages hosts the repo.

Usage:
  python server.py            # http://127.0.0.1:8000/Roll/
  python server.py --prefix '' --port 9000  # root serve, no prefix
  python server.py --host 0.0.0.0 --port 4173
"""
from __future__ import annotations

import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent


class DeployHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory: str | None = None, prefix: str = "", **kwargs):
        self.prefix = prefix.strip("/")  # e.g., "Roll"
        super().__init__(*args, directory=directory, **kwargs)

    def _strip_prefix(self, path: str) -> str:
        if self.prefix and path.startswith("/" + self.prefix):
            return path[len(self.prefix) + 1 :] or "/"
        return path

    def _redirect(self, location: str):
        self.send_response(302)
        self.send_header("Location", location)
        self.end_headers()

    def do_GET(self):  # noqa: N802 - inherited name
        parsed = urlparse(self.path)
        path = parsed.path

        # Redirect bare "/" to the prefixed entrypoint so base href logic matches deploy
        if self.prefix and path in {"", "/"}:
            return self._redirect(f"/{self.prefix}/")
        if self.prefix and path == f"/{self.prefix}":
            return self._redirect(f"/{self.prefix}/")

        # Strip prefix (if present) for filesystem resolution
        rel_path = self._strip_prefix(path).lstrip("/")
        if rel_path == "" or rel_path.endswith("/"):
            rel_path = f"{rel_path}index.html" if rel_path else "index.html"

        fs_path = Path(self.directory or ROOT) / rel_path

        # Happy path: file exists
        if fs_path.is_file():
            self.path = "/" + rel_path
            return super().do_GET()

        # Allow accidental /level/* asset requests by stripping the leading segment
        if rel_path.startswith("level/"):
            alt_rel = rel_path[len("level/") :]
            alt_path = Path(self.directory or ROOT) / alt_rel
            if alt_path.is_file():
                self.path = "/" + alt_rel
                return super().do_GET()

        # SPA fallback for routes without an explicit extension (e.g., /level/traffic)
        if "." not in Path(rel_path).name:
            self.path = "/index.html"
            return super().do_GET()

        # Final fallback: custom 404 if available
        not_found = Path(self.directory or ROOT) / "404.html"
        if not_found.is_file():
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            with not_found.open("rb") as fh:
                self.wfile.write(fh.read())
            return

        # Default behavior (likely 404)
        return super().do_GET()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Serve the game locally as if deployed on GitHub Pages.")
    parser.add_argument("--host", default="127.0.0.1", help="Host interface to bind (default: 127.0.0.1)")
    parser.add_argument("--port", "-p", type=int, default=8000, help="Port to listen on (default: 8000)")
    parser.add_argument(
        "--prefix",
        default="Roll",
        help="URL prefix to emulate (default: Roll, meaning content lives under /Roll/). Use '' to serve at root.",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    handler = functools.partial(DeployHandler, directory=str(ROOT), prefix=args.prefix)
    server = ThreadingHTTPServer((args.host, args.port), handler)

    prefix_display = f"/{args.prefix.strip('/')}/" if args.prefix.strip("/") else "/"
    print(f"Serving {ROOT} at http://{args.host}:{args.port}{prefix_display}")
    print("Press Ctrl+C to stop.")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server…")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
