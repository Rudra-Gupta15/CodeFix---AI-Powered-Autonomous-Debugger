import subprocess
import sys
import tempfile
import os

def execute_python_code(code: str, timeout: int = 5):
    """
    Executes Python code in a separate process and returns the output/errors.
    """
    with tempfile.NamedTemporaryFile(suffix=".py", delete=False) as tmp:
        tmp.write(code.encode('utf-8'))
        tmp_path = tmp.name

    try:
        result = subprocess.run(
            [sys.executable, tmp_path],
            capture_output=True,
            text=True,
            timeout=timeout
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode
        }
    except subprocess.TimeoutExpired:
        return {
            "stdout": "",
            "stderr": f"Execution timed out after {timeout} seconds.",
            "exit_code": 1
        }
    except Exception as e:
        return {
            "stdout": "",
            "stderr": str(e),
            "exit_code": 1
        }
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
