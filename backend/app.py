import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from runner import run_code

# Setup path for frontend
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend'))

app = Flask(__name__, static_folder=frontend_dir, static_url_path='')
CORS(app)

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "engine": "Ollama Local IDE"})



@app.route('/api/run', methods=['POST'])
def api_run():
    """Execute code and return stdout/stderr. Supports 10 languages."""
    data = request.json or {}
    result = run_code(data)
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
