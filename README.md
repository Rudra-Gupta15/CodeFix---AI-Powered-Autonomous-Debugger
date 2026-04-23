# CodeFix — Multi-Language AI IDE (Ollama Powered)

A professional, fully-featured online compiler IDE that supports **10+ programming languages** and integrates local AI to **automatically detect, explain, and fix bugs** in your code using Ollama.

CodeFix operates using a local-first architecture:
- **Runtime-Assisted Local LLMs (Ollama)**: Free, offline debugging that feeds live execution tracebacks into models like `gemma2:9b` or `llama3` to catch hidden runtime logic errors.

![CodeFix Screenshot](frontend/index.html) <!-- Replace with an actual screenshot path if available -->

---

## ✨ Features

- **10+ Languages Supported**: Python, JavaScript, TypeScript, Java, C, C++, Go, PHP, Ruby, and Rust.
- **Live Code Execution**: Features a built-in terminal powered by the Piston API to run your code and display `stdout` / `stderr`.
- **Multi-File Explorer**: Dynamic file tabs allowing you to create, rename, edit, and switch between multiple files seamlessly.
- **Runtime-Assisted Debugging**: Automatically captures stack traces during code execution and injects them into the AI prompt for extremely accurate zero-shot bug fixing.
- **Click-to-Navigate Error Gutter**: AI returns specific line numbers; click an error card to jump exactly to the broken line in the CodeMirror editor.
- **Fully Local & Private**: No API keys required. Your code never leaves your machine (except for Piston execution if using the remote runner).

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
│   ├── app.py                ← Flask REST routes (/api/run)
│   ├── analysis.py           ← Static analysis integration
│   ├── sandbox.py            ← Secure code executor
│   ├── runner.py             ← Piston API integration logic
│   └── requirements.txt      
│
├── architecture.html         ← Detailed Visual Architecture & Docs
├── start_ollama.bat          ← Helper to launch Ollama with CORS
└── start_backend.bat         ← Helper to start Flask backend
```

---

## 🚀 Quick Start

CodeFix runs entirely locally using Ollama for AI and a Flask backend for code execution.

### Step 1: Install & Start Ollama
1. Install [Ollama](https://ollama.com/) and pull your preferred model (e.g., `ollama pull gemma2:9b`).
2. Close all instances of Ollama, and execute `start_ollama.bat`. This ensures Ollama is started with **CORS enabled** so the browser can connect to it.

### Step 2: Start the Flask Backend
The backend is required for code execution and providing runtime context to the AI.
1. Navigate to the backend directory:
   ```bash
   cd backend
   pip install -r requirements.txt
   python app.py
   ```

### Step 3: Launch the IDE
1. Open `frontend/index.html` in your browser.
2. Select your model (e.g., `gemma2:9b`) from the top navbar.
3. Write some code, click **Run** to execute it, or **AI Debug** to analyze and fix bugs!

---

## 📚 Technical Documentation

For a deep-dive into how the Piston compiler API is integrated and how to add new programming languages, open the `architecture.html` file in your browser.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + Enter` | Run AI Debug |
| `Escape` | Close connection modal or prompts |
| `Double Click Tab` | Rename active file |
| `Tab` | Indent 4 spaces in CodeMirror |
