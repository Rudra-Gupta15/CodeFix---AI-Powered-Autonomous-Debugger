"use strict";

/* ══════════════════════════════════════
   FILE SYSTEM (in-memory multi-file)
══════════════════════════════════════ */
const FileSystem = {
  files: [],
  nextId: 1,
  currentId: null,

  init(langId) {
    const lang = CODEFIX_CONCEPT.languages[langId];
    const first = { id: this.nextId++, name: `main.${lang.ext}`, content: lang.defaultCode, langId };
    this.files = [first];
    this.currentId = first.id;
  },

  current() { return this.files.find(f => f.id === this.currentId) || null; },

  get(id) { return this.files.find(f => f.id === id) || null; },

  add(langId) {
    const lang = CODEFIX_CONCEPT.languages[langId];
    const taken = new Set(this.files.map(f => f.name));
    let name = `file${this.files.length + 1}.${lang.ext}`;
    let i = 2;
    while (taken.has(name)) name = `file${this.files.length + i++}.${lang.ext}`;
    const f = { id: this.nextId++, name, content: lang.defaultCode, langId };
    this.files.push(f);
    return f;
  },

  delete(id) {
    if (this.files.length <= 1) return false;
    this.files = this.files.filter(f => f.id !== id);
    if (this.currentId === id) this.currentId = this.files[0].id;
    return true;
  },

  rename(id, newName) {
    const f = this.get(id);
    if (f) f.name = newName;
  },

  saveContent(id, content) {
    const f = this.get(id);
    if (f) f.content = content;
  },
};

/* ══════════════════════════════════════
   APP STATE
══════════════════════════════════════ */
const AppState = {
  fixedCode:        "",
  errorLineHandles: [],
  isDebugging:      false,
  isRunning:        false,
  currentLangId:    "python",
  consoleCollapsed: false,
};

let editor;

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  FileSystem.init("python");
  initEditor();
  initOllama();
  initLangSidebar();
  initFileTabs();
  initConsole();
  initEventListeners();
  renderFileTabs();
  setStatus(CODEFIX_CONCEPT.messages.ready);
});

/* ══════════════════════════════════════
   CODEMIRROR EDITOR
══════════════════════════════════════ */
function initEditor() {
  editor = CodeMirror.fromTextArea(document.getElementById("codeEditor"), {
    ...CODEFIX_CONCEPT.editorConfig,
    extraKeys: {
      "Ctrl-Enter": () => runDebug(),
      "Cmd-Enter":  () => runDebug(),
      Tab: (cm) => cm.replaceSelection("    "),
    },
  });

  const file = FileSystem.current();
  if (file) editor.setValue(file.content);

  editor.on("cursorActivity", () => {
    const c = editor.getCursor();
    const el = document.getElementById("cursorInfo");
    if (el) el.textContent = `Ln ${c.line + 1}, Col ${c.ch + 1}`;
  });

  editor.on("change", () => {
    const file = FileSystem.current();
    if (file) FileSystem.saveContent(file.id, editor.getValue());
  });
}

/* ══════════════════════════════════════
   LANGUAGE SIDEBAR
══════════════════════════════════════ */
function initLangSidebar() {
  document.querySelectorAll(".lang-icon-btn").forEach(btn => {
    btn.addEventListener("click", () => switchLanguage(btn.dataset.lang));
  });
}

function switchLanguage(langId) {
  if (!CODEFIX_CONCEPT.languages[langId]) return;
  AppState.currentLangId = langId;
  CODEFIX_CONCEPT.currentLanguage = CODEFIX_CONCEPT.languages[langId].label;

  // Add a new file with this language, then switch to it
  const f = FileSystem.add(langId);
  FileSystem.currentId = f.id;

  loadFileIntoEditor(f);
  renderFileTabs();
  resetResultsUI();
  clearConsole(true);
  updateLangBadges(langId);
  updateSidebarActive(langId);
  editor.focus();
}

function updateSidebarActive(langId) {
  document.querySelectorAll(".lang-icon-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === langId);
  });
}

function updateLangBadges(langId) {
  const lang = CODEFIX_CONCEPT.languages[langId];
  if (!lang) return;
  const eb = document.getElementById("editorLangBadge");
  const fl = document.getElementById("footerLangLabel");
  if (eb) eb.textContent = `${lang.label} ${lang.version}`;
  if (fl) fl.textContent = `${lang.label} ${lang.version}`;
}

/* ══════════════════════════════════════
   FILE TAB MANAGEMENT
══════════════════════════════════════ */
function initFileTabs() {
  document.getElementById("addFileBtn").addEventListener("click", () => {
    addFileDialog();
  });
}

function addFileDialog() {
  // Add new file with current language
  const f = FileSystem.add(AppState.currentLangId);
  FileSystem.currentId = f.id;
  loadFileIntoEditor(f);
  renderFileTabs();
  resetResultsUI();
  clearConsole(true);
  editor.focus();
}

function renderFileTabs() {
  const container = document.getElementById("fileTabs");
  container.innerHTML = "";

  FileSystem.files.forEach(f => {
    const lang = CODEFIX_CONCEPT.languages[f.langId] || {};
    const tab = document.createElement("button");
    tab.className = "file-tab" + (f.id === FileSystem.currentId ? " active" : "");
    tab.dataset.fileId = f.id;
    tab.innerHTML = `
      <span class="file-tab-icon">${lang.icon || "📄"}</span>
      <span class="file-tab-name">${escHtml(f.name)}</span>
      <span class="file-tab-close" data-close-id="${f.id}" title="Close file">×</span>
    `;

    // Click to switch
    tab.addEventListener("click", (e) => {
      if (e.target.closest(".file-tab-close")) return;
      switchToFile(f.id);
    });

    // Double-click to rename
    tab.querySelector(".file-tab-name").addEventListener("dblclick", (e) => {
      e.stopPropagation();
      showRenameDialog(f.id);
    });

    // Close
    tab.querySelector(".file-tab-close").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteFile(f.id);
    });

    container.appendChild(tab);
  });
}

function switchToFile(id) {
  const f = FileSystem.get(id);
  if (!f) return;
  FileSystem.currentId = id;
  loadFileIntoEditor(f);
  renderFileTabs();
  updateSidebarActive(f.langId);
  updateLangBadges(f.langId);
  AppState.currentLangId = f.langId;
  CODEFIX_CONCEPT.currentLanguage = CODEFIX_CONCEPT.languages[f.langId]?.label || "";
  clearConsole(true);
}

function loadFileIntoEditor(file) {
  const lang = CODEFIX_CONCEPT.languages[file.langId];
  if (lang) editor.setOption("mode", lang.mode);
  editor.setValue(file.content);
  clearErrorMarkers();
  AppState.fixedCode = "";

  const filenameEl = document.getElementById("fixedCodeFilename");
  if (filenameEl) filenameEl.textContent = `fixed.${lang?.ext || "txt"}`;
}

function deleteFile(id) {
  if (FileSystem.files.length <= 1) {
    showToast("Can't close the last file", "error");
    return;
  }
  FileSystem.delete(id);
  const current = FileSystem.current();
  if (current) {
    AppState.currentLangId = current.langId;
    loadFileIntoEditor(current);
    updateSidebarActive(current.langId);
    updateLangBadges(current.langId);
  }
  renderFileTabs();
  clearConsole(true);
}

/* Rename dialog */
function showRenameDialog(fileId) {
  const f = FileSystem.get(fileId);
  if (!f) return;
  const overlay = document.getElementById("renameOverlay");
  const input   = document.getElementById("renameInput");
  input.value   = f.name;
  overlay.style.display = "flex";
  input.focus();
  input.select();

  const confirm = () => {
    const newName = input.value.trim();
    if (newName) {
      FileSystem.rename(fileId, newName);
      renderFileTabs();
    }
    overlay.style.display = "none";
  };

  document.getElementById("renameConfirmBtn").onclick = confirm;
  document.getElementById("renameCancelBtn").onclick  = () => { overlay.style.display = "none"; };
  input.onkeydown = (e) => { if (e.key === "Enter") confirm(); if (e.key === "Escape") overlay.style.display = "none"; };
}

/* ══════════════════════════════════════
   CONSOLE / RUN CODE
══════════════════════════════════════ */
function initConsole() {
  document.getElementById("consoleClearBtn").addEventListener("click", () => clearConsole());
  document.getElementById("consoleToggleBtn").addEventListener("click", toggleConsole);
  document.getElementById("stdinToggle").addEventListener("change", (e) => {
    document.getElementById("stdinPanel").style.display = e.target.checked ? "block" : "none";
  });
}

function toggleConsole() {
  const panel = document.getElementById("consolePanel");
  AppState.consoleCollapsed = !AppState.consoleCollapsed;
  panel.classList.toggle("collapsed", AppState.consoleCollapsed);
  const icon = document.getElementById("consoleToggleIcon");
  if (icon) icon.querySelector("path").setAttribute("d", AppState.consoleCollapsed
    ? "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"
    : "M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"
  );
}

async function runCode() {
  if (AppState.isRunning) return;
  const code = editor.getValue().trim();
  if (!code) { showToast(CODEFIX_CONCEPT.messages.noCode, "error"); return; }

  AppState.isRunning = true;
  const btn = document.getElementById("runBtn");
  btn.disabled = true;
  btn.classList.add("running");
  btn.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Running…`;

  setStatus(CODEFIX_CONCEPT.messages.running);
  setConsoleStatus("running", "⊙ Running…");

  if (AppState.consoleCollapsed) toggleConsole();

  document.getElementById("consolePlaceholder").style.display = "none";
  const outputEl = document.getElementById("consoleOutput");
  outputEl.style.display = "block";
  outputEl.className = "console-output";
  outputEl.innerHTML = "";

  const stdin = document.getElementById("stdinInput")?.value || "";
  const lang  = CODEFIX_CONCEPT.languages[AppState.currentLangId];
  const file  = FileSystem.current();
  
  // URL to our backend run/proxy endpoint
  const backendUrl = "http://localhost:5000/api/run";

  try {
    const res = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: lang.id, // backend reads this (e.g., 'python', 'java')
        code:     editor.getValue(),
        stdin:    stdin || "",
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const stdout  = data.stdout || "";
    const stderr  = data.stderr || "";
    const code_   = data.code ?? 0;
    const elapsed = data.elapsed ?? 0;

    let html = "";
    if (stdout) html += `<span class="out-stdout">${escHtml(stdout)}</span>`;
    if (stderr) html += `<span class="out-stderr">${escHtml(stderr)}</span>`;
    if (!html)  html = `<span class="out-meta">✓ No output</span>`;

    const exitIcon = code_ === 0 ? "✓" : "✗";
    html += `<span class="out-meta">${exitIcon} Exited with code ${code_} · ${elapsed}ms</span>`;

    outputEl.innerHTML = html;
    if (code_ !== 0) outputEl.classList.add("has-error");

    const statusTxt = code_ === 0 ? `✓ Done  ${elapsed}ms` : `✗ Error  code ${code_}`;
    setConsoleStatus(code_ === 0 ? "success" : "error", statusTxt);
    setStatus(code_ === 0 ? CODEFIX_CONCEPT.messages.runDone(elapsed) : `Exited with error (code ${code_})`);

  } catch (err) {
    outputEl.innerHTML = `<span class="out-stderr">Failed to run: ${escHtml(err.message)}\n\nIs the backend server (Flask) running?</span>`;
    outputEl.classList.add("has-error");
    setConsoleStatus("error", "✗ Failed");
    setStatus(CODEFIX_CONCEPT.messages.networkErr(err.message));
    showToast("Run failed — check backend connection", "error");
  }

  btn.disabled = false;
  btn.classList.remove("running");
  btn.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13"><path fill="currentColor" d="M8 5v14l11-7z"/></svg> Run`;
  AppState.isRunning = false;
}

function setConsoleStatus(type, text) {
  const el = document.getElementById("consoleStatus");
  if (!el) return;
  el.textContent = text;
  el.className = `console-exec-status ${type}`;
}

function clearConsole(silent = false) {
  document.getElementById("consolePlaceholder").style.display = "";
  const out = document.getElementById("consoleOutput");
  out.style.display = "none";
  out.innerHTML = "";
  out.className = "console-output";
  if (!silent) setConsoleStatus("", "");
}

/* ══════════════════════════════════════
   OLLAMA / ENGINE
══════════════════════════════════════ */
function updateEngineBadge(model) {
  const eb = document.getElementById("engineBadge");
  if (!eb) return;
  eb.textContent = "Local Ollama";
  eb.className = "engine-badge";
}

function initOllama() {
  OllamaController.setBaseUrl(document.getElementById("ollamaUrl").value);

  async function checkAll() {
    OllamaController.checkStatus();
  }

  OllamaController.onStatusChange((online, models) => {
    const pip  = document.getElementById("statusPip");
    const txt  = document.getElementById("statusText");
    const sel  = document.getElementById("modelSelect");
    const tBtn = document.getElementById("troubleshootBtn");
    if (txt && !txt.textContent.includes("Agent")) {
      if (pip) pip.className = online ? "status-pip" : "status-pip offline";
      if (txt) txt.textContent = online ? CODEFIX_CONCEPT.messages.ollamaOnline : "Service Offline";
      if (tBtn) tBtn.style.display = online ? "none" : "flex";
    }
    if (online && models?.length) {
      const cur = sel.value;
      sel.innerHTML = "";
      models.forEach(m => {
        const o = document.createElement("option");
        o.value = m; o.textContent = m;
        sel.appendChild(o);
      });
      if (cur && Array.from(sel.options).some(o => o.value === cur)) sel.value = cur;
    }
    updateEngineBadge(sel.value);
  });

  checkAll();
  setInterval(checkAll, 10000);
}

/* ══════════════════════════════════════
   EVENT LISTENERS
══════════════════════════════════════ */
function initEventListeners() {
  document.getElementById("runBtn").addEventListener("click", runCode);
  document.getElementById("debugBtn").addEventListener("click", runDebug);
  document.getElementById("copyBtn").addEventListener("click", copyFixedCode);
  document.getElementById("applyBtn").addEventListener("click", applyFix);
  document.getElementById("footerApplyBtn").addEventListener("click", applyFix);

  document.getElementById("ollamaUrl").addEventListener("change", e => {
    OllamaController.setBaseUrl(e.target.value.trim());
    OllamaController.checkStatus();
  });
  document.getElementById("modelSelect").addEventListener("change", e => {
    OllamaController.setModel(e.target.value);
    updateEngineBadge(e.target.value);
  });

  document.querySelectorAll(".col-results .tab").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  const modal = document.getElementById("modalOverlay");
  document.getElementById("troubleshootBtn").addEventListener("click", () => modal.classList.add("active"));
  document.getElementById("modalClose").addEventListener("click", () => modal.classList.remove("active"));
  modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("active"); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { modal.classList.remove("active"); document.getElementById("renameOverlay").style.display = "none"; }
  });
}

/* ══════════════════════════════════════
   AI DEBUG
══════════════════════════════════════ */
async function runDebug() {
  if (AppState.isDebugging) return;
  const code = editor.getValue().trim();
  if (!code) { showToast(CODEFIX_CONCEPT.messages.noCode, "error"); return; }

  AppState.isDebugging = true;
  setDebugBtnLoading(true);
  const model = document.getElementById("modelSelect").value;
  setStatus(CODEFIX_CONCEPT.messages.analyzing(model));
  clearErrorMarkers();
  resetResultsUI();

  let result;
  OllamaController.setModel(model);
  
  // Auto-run the code to capture execution traceback to help Local Ollama catch runtime errors
  let traceback = null;
  try {
    const lang = CODEFIX_CONCEPT.languages[AppState.currentLangId];
    const runRes = await fetch("http://localhost:5000/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: lang.id, code: code, stdin: "" })
    });
    if (runRes.ok) {
      const runData = await runRes.json();
      // If there is an error code and stderr output, pass that to the LLM
      if (runData.code !== 0 && runData.stderr) {
        traceback = runData.stderr;
      }
    }
  } catch (e) {
    // Ignore run errors; if the backend is down, we'll let Ollama try static analysis
  }

  result = await OllamaController.debugCode(code, traceback);

  if (!result.ok) {
    if (result.rawText) {
      renderRawExplanation(result.rawText);
      showToast("Couldn't parse JSON — showing raw response", "info");
    } else {
      showToast(result.error, "error");
    }
    setStatus(result.error || "Parse error");
    setDebugBtnLoading(false);
    AppState.isDebugging = false;
    return;
  }

  renderResults(result);
  const n = result.errors.length;
  setStatus(n === 0 ? CODEFIX_CONCEPT.messages.noneFound : CODEFIX_CONCEPT.messages.done(n));
  showToast(n === 0 ? "No errors found!" : `${n} error${n!==1?"s":""} found`, n === 0 ? "success" : "error");
  setDebugBtnLoading(false);
  AppState.isDebugging = false;
}

function renderResults(result) {
  const { errors, fixed_code, explanation } = result;
  AppState.fixedCode = fixed_code || "";
  renderErrors(errors);
  if (fixed_code) {
    const lang = CODEFIX_CONCEPT.languages[AppState.currentLangId];
    document.getElementById("fixedCodeFilename").textContent = `fixed.${lang?.ext||"txt"}`;
    document.getElementById("fixedCodeBody").textContent = fixed_code;
    document.getElementById("fixedCodeBox").style.display = "block";
    showFooterApplyBtn(true);
  }
  if (explanation) {
    hide("explainEmptyState"); show("explainSection");
    renderExplanationBullets(explanation, document.getElementById("explainContent"));
  }
  switchTab("errors");
}

function renderErrors(errors) {
  const list = document.getElementById("errorsList");
  list.innerHTML = "";
  const empty = document.getElementById("errorsEmptyState");
  if (errors.length === 0) {
    empty.style.display = "";
    const g = empty.querySelector(".empty-glyph");
    const t = empty.querySelector(".empty-title");
    const s = document.getElementById("errorsEmptySub");
    if (g) g.textContent = "✓";
    if (t) t.textContent = "No errors found!";
    if (s) s.textContent = "Your code looks clean.";
    return;
  }
  empty.style.display = "none";
  const badge = document.getElementById("errorBadge");
  badge.textContent = errors.length;
  badge.classList.add("visible");

  errors.forEach(err => {
    if (err.line > 0) markErrorLine(err.line);
    const typeInfo = CODEFIX_CONCEPT.errorTypes[err.type] || {cssClass:"tag-syntax", label:err.type};
    const card = document.createElement("div");
    card.className = "error-card";
    card.innerHTML = `
      <div class="error-card-top">
        <span class="err-type-tag ${typeInfo.cssClass}">${typeInfo.label}</span>
        ${err.line > 0 ? `<span class="err-line-ref">Line ${err.line}</span>` : ""}
      </div>
      <p class="err-msg">${escHtml(err.message)}</p>
      ${err.fix ? `<p class="err-fix">→ ${escHtml(err.fix)}</p>` : ""}
    `;
    card.addEventListener("click", () => {
      if (err.line > 0) {
        editor.setCursor({line:err.line-1,ch:0});
        editor.focus();
        editor.scrollIntoView({line:err.line-1,ch:0}, 60);
      }
    });
    list.appendChild(card);
  });
}

function renderExplanationBullets(text, container) {
  if (!container) return;
  let pts = text.trim().split(/\.\s+/).flatMap(s => s.split(/\n+/))
    .map(s => s.replace(/^[-*•]\s*/,"").trim()).filter(s => s.length > 5)
    .map(s => s.endsWith(".")||s.endsWith("!")||s.endsWith("?")?s:s+".");
  if (pts.length <= 1) {
    container.innerHTML = `<p class="explain-paragraph">${escHtml(text.trim())}</p>`;
    return;
  }
  container.innerHTML = `
    <div class="explain-header"><svg viewBox="0 0 24 24" width="13" height="13"><path fill="currentColor" d="M11 17h2v-6h-2v6zm1-15C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-11h2V7h-2v2z"/></svg> AI Analysis</div>
    <ul class="explain-list">
      ${pts.map((p,i)=>`<li><span class="explain-bullet">${i+1}</span><span class="explain-text">${escHtml(p)}</span></li>`).join("")}
    </ul>`;
}

function renderRawExplanation(raw) {
  hide("explainEmptyState"); show("explainSection");
  const c = document.getElementById("explainContent");
  if (c) c.innerHTML = `<p class="explain-paragraph">${escHtml(raw)}</p>`;
  switchTab("explain");
}

/* ══════════════════════════════════════
   ERROR MARKERS
══════════════════════════════════════ */
function markErrorLine(lineNum) {
  const line = lineNum - 1;
  if (line < 0 || line >= editor.lineCount()) return;
  const dot = document.createElement("div");
  dot.className = "err-gutter-dot"; dot.textContent = "●"; dot.title = `Error line ${lineNum}`;
  dot.addEventListener("click", () => { editor.setCursor({line,ch:0}); editor.focus(); });
  editor.setGutterMarker(line, "error-gutter", dot);
  const h = editor.addLineClass(line, "background", "error-line-bg");
  AppState.errorLineHandles.push({line,handle:h});
}

function clearErrorMarkers() {
  editor.clearGutter("error-gutter");
  AppState.errorLineHandles.forEach(({line}) => editor.removeLineClass(line,"background","error-line-bg"));
  AppState.errorLineHandles = [];
}

/* ══════════════════════════════════════
   UI ACTIONS
══════════════════════════════════════ */
function switchTab(name) {
  document.querySelectorAll(".col-results .tab").forEach(t => {
    const on = t.dataset.tab === name;
    t.classList.toggle("active", on);
    t.setAttribute("aria-selected", String(on));
  });
  document.querySelectorAll(".tab-pane").forEach(p => {
    p.classList.toggle("active", p.id === `pane${cap(name)}`);
  });
}

function copyFixedCode() {
  if (!AppState.fixedCode) return;
  navigator.clipboard.writeText(AppState.fixedCode).then(() => {
    const btn = document.getElementById("copyBtn");
    const orig = btn.innerHTML;
    btn.innerHTML = "✓ Copied!"; btn.classList.add("copied");
    setTimeout(() => { btn.innerHTML = orig; btn.classList.remove("copied"); }, 2000);
  });
}

function applyFix() {
  if (!AppState.fixedCode) return;
  clearErrorMarkers();
  editor.setValue(AppState.fixedCode);
  const cur = FileSystem.current();
  if (cur) FileSystem.saveContent(cur.id, AppState.fixedCode);
  resetResultsUI();
  switchTab("errors");
  setStatus(CODEFIX_CONCEPT.messages.applied);
  showToast("Fixed code applied!", "success");
  editor.focus();
}

function resetResultsUI() {
  const empty = document.getElementById("errorsEmptyState");
  empty.style.display = "";
  const g = empty.querySelector(".empty-glyph");
  const t = empty.querySelector(".empty-title");
  const s = document.getElementById("errorsEmptySub");
  if (g) g.textContent = "⚡";
  if (t) t.textContent = "No analysis yet";
  if (s) s.textContent = "Hit AI Debug to analyze your code";

  const list = document.getElementById("errorsList");
  if (list) { list.innerHTML = ""; }

  const badge = document.getElementById("errorBadge");
  badge.textContent = ""; badge.classList.remove("visible");

  const box = document.getElementById("fixedCodeBox");
  if (box) box.style.display = "none";
  const body = document.getElementById("fixedCodeBody");
  if (body) body.textContent = "";

  show("explainEmptyState"); hide("explainSection");
  const ec = document.getElementById("explainContent");
  if (ec) ec.innerHTML = "";

  showFooterApplyBtn(false);
}

function showFooterApplyBtn(v) {
  const b = document.getElementById("footerApplyBtn");
  if (b) b.style.display = v ? "flex" : "none";
}

/* ══════════════════════════════════════
   TOAST + STATUS
══════════════════════════════════════ */
function showToast(msg, type = "") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show" + (type ? ` t-${type}` : "");
  setTimeout(() => { t.className = "toast"; }, CODEFIX_CONCEPT.toastDuration);
}

function setStatus(msg) {
  const el = document.getElementById("actionStatus");
  if (el) el.textContent = msg;
}

function setDebugBtnLoading(on) {
  const btn = document.getElementById("debugBtn");
  btn.disabled = on;
  btn.classList.toggle("loading", on);
  const lbl = btn.querySelector(".btn-label");
  if (lbl) lbl.textContent = on ? "Analyzing…" : "AI Debug";
}

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */
function show(id) { const e=document.getElementById(id); if(e) e.style.display=""; }
function hide(id) { const e=document.getElementById(id); if(e) e.style.display="none"; }
function cap(s)   { return s.charAt(0).toUpperCase()+s.slice(1); }
function escHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
