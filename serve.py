"""Local mirror of https://swarmengine.tech/

Serves the downloaded front-end and proxies anything else (API, badges,
client routes) to the live origin.
"""
import os
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT = os.path.dirname(os.path.abspath(__file__))
ORIGIN = "https://swarmengine.tech"
PORT = int(os.environ.get("PORT", "8787"))

MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".json": "application/json; charset=utf-8",
    ".ico": "image/x-icon",
}

HOP = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade", "content-length",
}


def local_file(url_path: str):
    clean = url_path.split("?", 1)[0]
    if "\x00" in clean or ".." in clean.split("/"):
        return None
    rel = "index.html" if clean in ("", "/") else clean.lstrip("/")
    file = os.path.realpath(os.path.join(ROOT, rel))
    if file != ROOT and not file.startswith(ROOT + os.sep):
        return None
    if os.path.isfile(file):
        return file
    return None


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        print("%s %s" % (self.command, self.path))

    def _serve_file(self, file):
        ext = os.path.splitext(file)[1].lower()
        data = open(file, "rb").read()
        self.send_response(200)
        self.send_header("Content-Type", MIME.get(ext, "application/octet-stream"))
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    def _proxy(self):
        length = int(self.headers.get("Content-Length", "0") or 0)
        body = self.rfile.read(length) if length else None
        headers = {
            k: v for k, v in self.headers.items()
            if k.lower() not in HOP and k.lower() != "host"
        }
        headers["Host"] = "swarmengine.tech"
        headers["Accept-Encoding"] = "identity"
        req = Request(ORIGIN + self.path, data=body, headers=headers, method=self.command)
        try:
            with urlopen(req, timeout=60) as resp:
                data = resp.read()
                self.send_response(resp.status)
                for k, v in resp.headers.items():
                    if k.lower() not in HOP:
                        self.send_header(k, v)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                if self.command != "HEAD":
                    self.wfile.write(data)
        except HTTPError as err:
            data = err.read()
            self.send_response(err.code)
            ctype = err.headers.get("Content-Type", "application/octet-stream")
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(data)
        except URLError as err:
            msg = ("proxy error: %s" % err.reason).encode()
            self.send_response(502)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(msg)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(msg)

    def _handle(self):
        file = local_file(self.path)
        if file:
            self._serve_file(file)
        else:
            self._proxy()

    def do_GET(self):
        self._handle()

    def do_HEAD(self):
        self._handle()

    def do_POST(self):
        self._handle()


if __name__ == "__main__":
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print("SWARM mirror  http://localhost:%d" % PORT)
    print("proxying missing paths to %s" % ORIGIN)
    httpd.serve_forever()
