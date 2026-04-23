# CodeFix — Multi-Language AI Autonomous IDE

A professional, fully-featured online compiler IDE that supports **10+ programming languages** and integrates state-of-the-art AI to **automatically detect, explain, and fix bugs** in your code.

CodeFix operates using a dual-engine architecture:
- **Runtime-Assisted Local LLMs (Ollama)**: Free, offline debugging that feeds live execution tracebacks into models like `gemma2:9b` to catch hidden runtime logic errors.
- **Autonomous Agent (GPT-4o)**: A complex agentic loop that executes code, runs `pylint`, and iterates on fixes up to 5 times until the code runs perfectly.

![CodeFix Screenshot](frontend/index.html) <!-- Replace with an actual screenshot path if available -->

---

## ✨ Features

- **10+ Languages Supported**: Python, JavaScript, TypeScript, Java, C, C++, Go, PHP, Ruby, and Rust.
- **Live Code Execution**: Features a built-in terminal powered by the Piston API to actually run your code and display `stdout` / `stderr`.
- **Multi-File Explorer**: Dynamic file tabs allowing you to create, rename, edit, and switch between multiple files seamlessly.
- **Runtime-Assisted Debugging**: Automatically captures stack traces during code execution and injects them into the AI prompt for extremely accurate zero-shot bug fixing.
- **Autonomous Feedback Loop**: Advanced GPT-4o Python backend agent uses custom tools to recursively analyze and run code without human intervention.
- **Click-to-Navigate Error Gutter**: AI returns specific line numbers; click an error card to jump exactly to the broken line in the CodeMirror editor.

---

## 📁 Project Structure

```text
codefix/
├── frontend/                 ← The main IDE Interface
│   ├── index.html            
│   ├── css/style.css         
│   └── js/
│       ├── concept.js        ← Language configs & prompt templates
│       ├── ollama.js         ← Direct local Ollama communication
│       ├── backend.js        ← API wrappers to the Flask server
│       └── app.js            ← Main UI state and logic
│
├── backend/                  ← Python Flask Execution Server
│   ├── app.py                ← Flask REST routes (/api/run, /debug)
│   ├── agent.py              ← GPT-4o autonomous reasoning loops
│   ├── analysis.py           ← Pylint/Flake8 static analysis integration
│   ├── sandbox.py            ← Secure code executor
│   ├── runner.py             ← Piston API integration logic
│   ├── requirements.txt      
│   └── .env.example          ← Template for environment variables
│
├── architecture.html         ← Detailed Visual Architecture & Docs
├── start_ollama.bat          ← Helper to launch Ollama with CORS
└── start_backend.bat         ← Helper to start Flask backend
```

---

## 🚀 Quick Start

CodeFix allows you to run in **Local Mode** (no API keys, fully offline except for Piston code-running) or **Agent Mode**.

### Mode 1: Local Ollama (Free, Private)
1. Install [Ollama](https://ollama.com/) and pull your preferred model (e.g., `ollama pull gemma2:9b`).
2. Close all instances of Ollama, and execute `start_ollama.bat`. This ensures Ollama is started with **CORS enabled** so the browser can connect to it.
3. Start the Flask Backend (required for code execution/Piston):
   ```bash
   cd backend
   pip install -r requirements.txt
   python app.py
   ```
4. Open `frontend/index.html` in your browser.
5. Select your model from the top navbar. Write some code, click **Run** to execute it, or **AI Debug** to fix it!

### Mode 2: GPT-4o Autonomous Agent
1. Copy the example environment file:
   ```bash
   cd backend
   cp .env.example .env
   ```
2. Navigate to `backend/.env` and insert your API Key:
   ```env
   OPENAI_API_KEY=sk-your-real-key-here
   ```
3. Start the Flask Backend:
   ```bash
   cd backend
   pip install -r requirements.txt
   python app.py
   ```
4. Open `frontend/index.html` in your browser.
5. Select **GPT-4o (Autonomous)** from the model dropdown.
6. Watch the agent iteratively execute, test, and rewrite your code in the background!

---

## 📚 Technical Documentation

For a comprehensive deep-dive into how the AI Agent tools work, how the Piston compiler API is integrated, and how to add new programming languages, open the `architecture.html` file in your browser to view the interactive documentation.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + Enter` | Run AI Debug |
| `Escape` | Close connection modal or prompts |
| `Double Click Tab` | Rename active file |
| `Tab` | Indent 4 spaces in CodeMirror |
