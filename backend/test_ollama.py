import urllib.request
import json

url = 'http://127.0.0.1:11434/api/generate'
data = {
    "model": "qwen2.5-coder:7b",
    "prompt": "Test"
}

req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json', 'Origin': 'file://'})

try:
    with urllib.request.urlopen(req) as response:
        print("Success:", response.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTPError {e.code}: {e.read().decode()}")
except Exception as e:
    print("Error:", str(e))
