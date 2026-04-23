"""
runner.py — Multi-language code execution for CodeFix backend.
- Python / JavaScript (Node.js): executed locally via subprocess
- All other languages: proxied to Piston API server-side (no CORS)
"""

import subprocess
import tempfile
import os
import sys
import time

try:
    import requests as _requests
    _has_requests = True
except ImportError:
    _has_requests = False

PISTON_API = "https://emkc.org/api/v2/piston/execute"
TIMEOUT_SECONDS = 10

# Languages handled locally (no external API needed)
LOCAL_LANGS = {
    "python": {
        "cmd": [sys.executable],
        "ext": "py",
    },
    "javascript": {
        "cmd": ["node"],
        "ext": "js",
    },
}

# Languages forwarded to Piston from server-side
PISTON_LANGS = {
    "typescript": {"piston_id": "typescript", "piston_version": "5.0.3",  "ext": "ts"},
    "java":       {"piston_id": "java",        "piston_version": "15.0.2", "ext": "java"},
    "c":          {"piston_id": "c",           "piston_version": "10.2.0", "ext": "c"},
    "cpp":        {"piston_id": "c++",         "piston_version": "10.2.0", "ext": "cpp"},
    "go":         {"piston_id": "go",          "piston_version": "1.16.2", "ext": "go"},
    "php":        {"piston_id": "php",         "piston_version": "8.2.3",  "ext": "php"},
    "ruby":       {"piston_id": "ruby",        "piston_version": "3.2.1",  "ext": "rb"},
    "rust":       {"piston_id": "rust",        "piston_version": "1.68.2", "ext": "rs"},
}


def run_code(data: dict) -> dict:
    """Main entry point. Returns {stdout, stderr, code, elapsed}."""
    lang  = data.get("language", "python")
    code  = data.get("code", "")
    stdin = data.get("stdin", "")

    if not code.strip():
        return {"stdout": "", "stderr": "No code provided.", "code": 1, "elapsed": 0}

    if lang in LOCAL_LANGS:
        return _run_locally(LOCAL_LANGS[lang], code, stdin)

    if lang in PISTON_LANGS:
        return _run_via_piston(PISTON_LANGS[lang], code, stdin)

    return {
        "stdout": "",
        "stderr": f"Language '{lang}' is not supported.",
        "code": 1,
        "elapsed": 0,
    }


def _run_locally(config: dict, code: str, stdin: str) -> dict:
    """Execute code in a local subprocess (Python or Node.js)."""
    ext = config["ext"]
    cmd = config["cmd"]

    tmp_file = None
    try:
        with tempfile.NamedTemporaryFile(
            suffix=f".{ext}", delete=False, mode="w", encoding="utf-8"
        ) as f:
            f.write(code)
            tmp_file = f.name

        start = time.time()
        proc = subprocess.run(
            cmd + [tmp_file],
            input=stdin.encode("utf-8") if stdin else None,
            capture_output=True,
            timeout=TIMEOUT_SECONDS,
        )
        elapsed = int((time.time() - start) * 1000)

        return {
            "stdout":  proc.stdout.decode("utf-8", errors="replace"),
            "stderr":  proc.stderr.decode("utf-8", errors="replace"),
            "code":    proc.returncode,
            "elapsed": elapsed,
        }

    except subprocess.TimeoutExpired:
        return {
            "stdout": "",
            "stderr": f"⏱ Execution timed out ({TIMEOUT_SECONDS}s limit).",
            "code": -1,
            "elapsed": TIMEOUT_SECONDS * 1000,
        }
    except FileNotFoundError:
        runtime = cmd[0]
        return {
            "stdout": "",
            "stderr": (
                f"Runtime not found: '{runtime}'.\n"
                f"{'Install Node.js and add it to PATH.' if runtime == 'node' else 'Python not found in PATH.'}"
            ),
            "code": -1,
            "elapsed": 0,
        }
    finally:
        if tmp_file and os.path.exists(tmp_file):
            try:
                os.unlink(tmp_file)
            except OSError:
                pass


def _run_via_piston(config: dict, code: str, stdin: str) -> dict:
    """Forward execution to Piston API server-side (no browser CORS issues)."""
    if not _has_requests:
        return {
            "stdout": "",
            "stderr": "Server missing 'requests' package. Run: pip install requests",
            "code": 1,
            "elapsed": 0,
        }

    try:
        start = time.time()
        resp = _requests.post(
            PISTON_API,
            json={
                "language": config["piston_id"],
                "version":  config["piston_version"],
                "files":    [{"name": f"main.{config['ext']}", "content": code}],
                "stdin":    stdin or "",
            },
            timeout=20,
        )
        elapsed = int((time.time() - start) * 1000)
        resp.raise_for_status()

        data = resp.json()
        run     = data.get("run", {})
        compile_ = data.get("compile", {})

        stderr = (compile_.get("stderr") or "") + (run.get("stderr") or "")

        return {
            "stdout":  run.get("stdout") or "",
            "stderr":  stderr,
            "code":    run.get("code", 0),
            "elapsed": elapsed,
        }

    except Exception as exc:
        return {
            "stdout": "",
            "stderr": f"Execution service error: {exc}",
            "code":   -1,
            "elapsed": 0,
        }
