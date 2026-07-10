#!/usr/bin/env python3
"""
Local render server for the Indic League studio.

Serves studio.html (and the other static files) and adds a /render endpoint
that composites the browser-rendered overlay PNG over the uploaded video with
ffmpeg — far more reliable than the in-browser WebCodecs path.

Pure standard library. No pip install required. Just:

    python3 server.py

then open the URL it prints (default http://localhost:8000/studio.html).
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("PORT", "8000"))
FFMPEG = shutil.which("ffmpeg")
FFPROBE = shutil.which("ffprobe")
NODE = shutil.which("node")
HF_PROJECT = os.path.join(ROOT, "hf-backend", "project")
HF_COMPOSE = os.path.join(ROOT, "hf-backend", "compose.mjs")
HYPERFRAMES_OK = NODE is not None and os.path.isfile(HF_COMPOSE)
# HF_PROJECT is a single shared directory (index.html + media/input.mp4) that
# compose.mjs overwrites per render — two renders at once would clobber each
# other's files mid-flight. This lock keeps HyperFrames renders to one at a
# time; a second click while one is in flight is rejected immediately instead
# of silently piling up a competing GPU render (which is what starves disk/CPU
# and makes everything slower, not faster).
HF_LOCK = threading.Lock()


# ─────────────────────────── multipart parsing ───────────────────────────
def parse_multipart(body: bytes, boundary: bytes) -> dict:
    """Minimal, binary-safe multipart/form-data parser (stdlib only)."""
    fields = {}
    delim = b"--" + boundary
    for seg in body.split(delim):
        # Middle segments are framed as: \r\n<headers>\r\n\r\n<data>\r\n
        if not seg or seg in (b"--", b"--\r\n"):
            continue
        if seg.startswith(b"\r\n"):
            seg = seg[2:]
        if seg.endswith(b"\r\n"):
            seg = seg[:-2]
        head, _, data = seg.partition(b"\r\n\r\n")
        if not _:
            continue
        headers = head.decode("utf-8", "replace")
        m = re.search(r'name="([^"]*)"', headers)
        if not m:
            continue
        fields[m.group(1)] = data
    return fields


# ───────────────────────────── ffmpeg graph ──────────────────────────────
def has_audio(path: str) -> bool:
    """True if the file has at least one audio stream."""
    if not FFPROBE:
        return True  # can't tell — try, and let -map 0:a? stay optional elsewhere
    try:
        out = subprocess.run(
            [FFPROBE, "-v", "error", "-select_streams", "a",
             "-show_entries", "stream=index", "-of", "csv=p=0", path],
            capture_output=True, timeout=20,
        )
        return bool(out.stdout.strip())
    except Exception:
        return True


def probe_video_stream(path: str):
    """Return the first video stream dict from ffprobe JSON, else None."""
    if not FFPROBE:
        return None
    try:
        out = subprocess.run(
            [FFPROBE, "-v", "error", "-show_streams", "-of", "json", path],
            capture_output=True, timeout=30, text=True,
        )
        if out.returncode != 0:
            return None
        data = json.loads(out.stdout or "{}")
        for stream in data.get("streams", []):
            if stream.get("codec_type") == "video":
                return stream
        return None
    except Exception:
        return None


def maybe_make_compatible_mp4(src: str, dst: str):
    """Transcode only when HyperFrames output isn't broadly MP4-compatible."""
    stream = probe_video_stream(src)
    if not stream:
        raise RuntimeError("rendered file has no video stream")

    codec = (stream.get("codec_name") or "").lower()
    pix_fmt = (stream.get("pix_fmt") or "").lower()
    if codec == "h264" and pix_fmt in ("yuv420p", "yuvj420p"):
        shutil.copyfile(src, dst)
        return

    if not FFMPEG:
        raise RuntimeError(
            f"rendered video codec is '{codec or 'unknown'}' ({pix_fmt or 'unknown'}) and ffmpeg is unavailable for compatibility conversion"
        )

    cmd = [
        FFMPEG, "-y", "-i", src,
        "-map", "0:v:0", "-map", "0:a?",
        "-c:v", "libx264", "-preset", "medium", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        dst,
    ]
    proc = subprocess.run(cmd, capture_output=True)
    if proc.returncode != 0:
        tail = proc.stderr.decode("utf-8", "replace")[-1500:]
        raise RuntimeError(f"compatibility conversion failed:\n{tail}")


def build_video_filter(src: str, fit: str, W: int, H: int) -> str:
    """Reproduce studio.html's drawSourceBg() from label `src`, then overlay
    the caption PNG (input 1) on top. Returns a chain ending in [out]."""
    if fit == "blur":
        # cover-scaled, heavily blurred, darkened 30% (== *0.7 per channel),
        # with the contained foreground centered over it.
        graph = (
            f"[{src}]split=2[bgsrc][fgsrc];"
            f"[bgsrc]scale={W}:{H}:force_original_aspect_ratio=increase,"
            f"crop={W}:{H},gblur=sigma=40,"
            "colorchannelmixer=rr=0.7:gg=0.7:bb=0.7[bg];"
            f"[fgsrc]scale={W}:{H}:force_original_aspect_ratio=decrease[fg];"
            "[bg][fg]overlay=(W-w)/2:(H-h)/2[comp];"
        )
    elif fit == "cover":
        graph = (
            f"[{src}]scale={W}:{H}:force_original_aspect_ratio=increase,"
            f"crop={W}:{H}[comp];"
        )
    else:  # "contain"
        graph = (
            f"[{src}]scale={W}:{H}:force_original_aspect_ratio=decrease,"
            f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=black[comp];"
        )
    # PNG overlay carries the entire caption block (gradient/text/logo/grain).
    graph += "[comp][1:v]overlay=0:0:format=auto[out]"
    return graph


def render(video_path: str, overlay_path: str, params: dict, out_path: str):
    fmt = params.get("fmt", "square")
    fit = params.get("fit", "blur")
    t0 = float(params.get("t0", 0) or 0)
    t1 = float(params.get("t1", 0) or 0)
    muted = bool(params.get("muted", False))

    W = 1080
    H = 1080 if fmt == "square" else 1920
    do_trim = t1 > t0

    # Trim in the filtergraph — input-side -ss/-t is ignored once the video
    # passes through the overlay filter, so trimming must happen in-graph.
    parts = []
    src = "0:v"
    if do_trim:
        parts.append(f"[0:v]trim={t0:.3f}:{t1:.3f},setpts=PTS-STARTPTS[v]")
        src = "v"
    parts.append(build_video_filter(src, fit, W, H))

    want_audio = (not muted) and has_audio(video_path)
    if want_audio and do_trim:
        parts.append(f"[0:a]atrim={t0:.3f}:{t1:.3f},asetpts=PTS-STARTPTS[aout]")

    cmd = [FFMPEG, "-y", "-i", video_path, "-i", overlay_path,
           "-filter_complex", ";".join(parts), "-map", "[out]"]

    if not want_audio:
        cmd += ["-an"]
    else:
        cmd += ["-map", "[aout]" if do_trim else "0:a", "-c:a", "aac", "-b:a", "128k"]

    cmd += [
        "-c:v", "libx264", "-preset", "medium", "-b:v", "8M",
        "-pix_fmt", "yuv420p", "-r", "30",
        "-movflags", "+faststart",
        out_path,
    ]

    proc = subprocess.run(cmd, capture_output=True)
    if proc.returncode != 0:
        tail = proc.stderr.decode("utf-8", "replace")[-1500:]
        raise RuntimeError(f"ffmpeg failed:\n{tail}")


# ───────────────────────────── http handler ──────────────────────────────
class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stderr.write("  " + (fmt % args) + "\n")

    def _send(self, code, body=b"", ctype="text/plain; charset=utf-8", extra=None):
        # A long render (GPU compositing can take a minute+) gives the browser
        # plenty of time to give up, refresh, or navigate away before the
        # response is ready — that's a dropped client, not a server bug, so
        # swallow the resulting broken-pipe/reset instead of crashing the thread.
        try:
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            for k, v in (extra or {}).items():
                self.send_header(k, v)
            self.end_headers()
            if body:
                self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            sys.stderr.write("  (client disconnected before the response could be sent — render still completed server-side)\n")

    # ── static files + health ──
    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path in ("/api/health", "/render", "/render-hf"):
            ok = FFMPEG is not None or HYPERFRAMES_OK
            self._send(200 if ok else 503,
                       json.dumps({"ok": ok, "ffmpeg": FFMPEG, "hyperframes": HYPERFRAMES_OK,
                                   "node": NODE}).encode(),
                       "application/json")
            return
        if path == "/":
            path = "/studio.html"
        # prevent directory traversal
        rel = os.path.normpath(path.lstrip("/"))
        full = os.path.join(ROOT, rel)
        if not full.startswith(ROOT) or not os.path.isfile(full):
            self._send(404, b"Not found")
            return
        ctypes = {
            ".html": "text/html; charset=utf-8", ".js": "text/javascript",
            ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg",
            ".svg": "image/svg+xml", ".json": "application/json",
        }
        ext = os.path.splitext(full)[1].lower()
        with open(full, "rb") as f:
            data = f.read()
        self._send(200, data, ctypes.get(ext, "application/octet-stream"))

    # ── render ──
    def do_POST(self):
        path = self.path.split("?", 1)[0]
        if path == "/render":
            self._handle_render_ffmpeg()
        elif path == "/render-hf":
            self._handle_render_hyperframes()
        else:
            self._send(404, b"Not found")

    def _read_multipart(self):
        ctype = self.headers.get("Content-Type", "")
        m = re.search(r"boundary=([^;]+)", ctype)
        if "multipart/form-data" not in ctype or not m:
            return None
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length)
        return parse_multipart(body, m.group(1).strip('"').encode())

    def _handle_render_ffmpeg(self):
        if FFMPEG is None:
            self._send(503, b"ffmpeg not found on PATH")
            return
        fields = self._read_multipart()
        if fields is None:
            self._send(400, b"Expected multipart/form-data")
            return
        if "video" not in fields or "overlay" not in fields:
            self._send(400, b"Missing 'video' or 'overlay' field")
            return
        try:
            params = json.loads(fields.get("params", b"{}").decode() or "{}")
        except Exception:
            params = {}

        tmp = tempfile.mkdtemp(prefix="til-render-")
        try:
            vpath = os.path.join(tmp, "input.mp4")
            opath = os.path.join(tmp, "overlay.png")
            outp = os.path.join(tmp, "out.mp4")
            with open(vpath, "wb") as f:
                f.write(fields["video"])
            with open(opath, "wb") as f:
                f.write(fields["overlay"])

            render(vpath, opath, params, outp)

            with open(outp, "rb") as f:
                data = f.read()
            self._send(200, data, "video/mp4",
                       {"Content-Disposition": 'attachment; filename="til-video.mp4"'})
        except Exception as e:
            sys.stderr.write("  RENDER ERROR: " + str(e) + "\n")
            self._send(500, str(e).encode())
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def _handle_render_hyperframes(self):
        if not HYPERFRAMES_OK:
            self._send(503, b"HyperFrames backend not available (need Node.js + hf-backend/compose.mjs)")
            return
        fields = self._read_multipart()
        if fields is None:
            self._send(400, b"Expected multipart/form-data")
            return
        if "video" not in fields:
            self._send(400, b"Missing 'video' field")
            return
        try:
            params = json.loads(fields.get("params", b"{}").decode() or "{}")
        except Exception:
            params = {}

        if not HF_LOCK.acquire(blocking=False):
            self._send(429, b"A render is already in progress on this computer "
                             b"\xe2\x80\x94 please wait for it to finish before starting another.")
            return

        tmp = tempfile.mkdtemp(prefix="til-hf-render-")
        try:
            vpath = os.path.join(tmp, "input.mp4")
            ppath = os.path.join(tmp, "params.json")
            outp = os.path.join(tmp, "out.mp4")
            with open(vpath, "wb") as f:
                f.write(fields["video"])
            with open(ppath, "w") as f:
                json.dump(params, f)

            proc = subprocess.run(
                ["node", HF_COMPOSE, "--project", HF_PROJECT, "--video", vpath,
                 "--params-file", ppath, "--out", outp,
                 "--quality", params.get("quality", "standard")],
                capture_output=True, timeout=600,
            )
            if proc.returncode != 0 or not os.path.exists(outp):
                tail = (proc.stderr or proc.stdout).decode("utf-8", "replace")[-2000:]
                raise RuntimeError("hyperframes render failed:\n" + tail)

            compat_out = os.path.join(tmp, "out-compatible.mp4")
            maybe_make_compatible_mp4(outp, compat_out)
            with open(compat_out, "rb") as f:
                data = f.read()
            self._send(200, data, "video/mp4",
                       {"Content-Disposition": 'attachment; filename="til-video.mp4"'})
        except Exception as e:
            sys.stderr.write("  HF RENDER ERROR: " + str(e) + "\n")
            self._send(500, str(e).encode())
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
            HF_LOCK.release()


def main():
    if not HYPERFRAMES_OK:
        print("⚠  HyperFrames backend not available (need Node.js) — /render-hf will 503.")
    if FFMPEG is None:
        print("⚠  ffmpeg not found on PATH — install it (brew install ffmpeg).")
        print("   /render (ffmpeg fallback) will also 503.\n")
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    url = f"http://localhost:{PORT}/studio.html"
    print("╭─────────────────────────────────────────────╮")
    print("│  Indic League studio — local render server    │")
    print("╰─────────────────────────────────────────────╯")
    print(f"  hyperframes : {'GPU render ready' if HYPERFRAMES_OK else 'NOT AVAILABLE'}")
    print(f"  ffmpeg      : {FFMPEG or 'NOT FOUND (fallback only)'}")
    print(f"  open        : {url}")
    print("  stop   : Ctrl+C\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  bye 👋")
        server.shutdown()


def cli_render(argv):
    """`python3 server.py render --video V --overlay O --params JSON --out OUT`

    Same ffmpeg pipeline as the web /render endpoint, exposed for the
    hyperframe skill (or any script) to call headlessly."""
    import argparse
    ap = argparse.ArgumentParser(prog="server.py render")
    ap.add_argument("--video", required=True)
    ap.add_argument("--overlay", required=True)
    ap.add_argument("--params", default="{}", help="JSON: fmt,fit,t0,t1,muted")
    ap.add_argument("--out", required=True)
    a = ap.parse_args(argv)
    if FFMPEG is None:
        print("ffmpeg not found on PATH", file=sys.stderr)
        return 2
    try:
        params = json.loads(a.params or "{}")
    except Exception as e:
        print(f"bad --params JSON: {e}", file=sys.stderr)
        return 2
    render(a.video, a.overlay, params, a.out)
    print(a.out)
    return 0


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "render":
        sys.exit(cli_render(sys.argv[2:]))
    main()
