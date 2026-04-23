import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from agent import get_debug_agent
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
    return jsonify({"status": "healthy", "engine": "OpenAI GPT-4o Agent"})

@app.route('/debug', methods=['POST'])
def debug():
    data = request.json
    code = data.get('code', '')
    if not code:
        return jsonify({"error": "No code provided"}), 400
    try:
        agent = get_debug_agent()
        response = agent.invoke({"input": code})
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/run', methods=['POST'])
def api_run():
    """Execute code and return stdout/stderr. Supports 10 languages."""
    data = request.json or {}
    result = run_code(data)
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
