import subprocess
import tempfile
import os
import sys
import json

def run_pylint(code: str):
    with tempfile.NamedTemporaryFile(suffix=".py", delete=False) as tmp:
        tmp.write(code.encode('utf-8'))
        tmp_path = tmp.name

    try:
        # BUG FIX: Use sys.executable instead of bare 'python'.
        # 'python' may not exist in PATH on Windows or inside virtual environments,
        # while sys.executable always points to the current interpreter.
        result = subprocess.run(
            [sys.executable, '-m', 'pylint', tmp_path, '--output-format=json'],
            capture_output=True,
            text=True
        )
        if result.stdout:
            return json.loads(result.stdout)
        return []
    except Exception as e:
        return [{"message": f"Pylint error: {str(e)}", "type": "error"}]
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

def run_flake8(code: str):
    with tempfile.NamedTemporaryFile(suffix=".py", delete=False) as tmp:
        tmp.write(code.encode('utf-8'))
        tmp_path = tmp.name

    try:
        # BUG FIX: Same fix here — use sys.executable.
        result = subprocess.run(
            [sys.executable, '-m', 'flake8', tmp_path],
            capture_output=True,
            text=True
        )
        return result.stdout
    except Exception as e:
        return f"Flake8 error: {str(e)}"
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
