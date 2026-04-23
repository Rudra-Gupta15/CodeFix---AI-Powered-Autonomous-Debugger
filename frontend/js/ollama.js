/**
 * ollama.js
 * ──────────────────────────────────────────────────────────
 * Handles ALL communication with the Ollama local API.
 *
 * Responsibilities:
 *   - Check if Ollama is running (/api/tags)
 *   - Send code to the selected model (/api/generate)
 *   - Parse and validate the JSON response
 *   - Expose a clean async API to app.js
 *
 * Depends on: concept.js (CODEFIX_CONCEPT)
 * Loaded SECOND — after concept.js.
 * ──────────────────────────────────────────────────────────
 */

"use strict";

const OllamaController = (() => {

  /* ── Internal State ── */
  let _baseUrl  = CODEFIX_CONCEPT.ollamaDefaults.defaultUrl;
  let _model    = "mistral";
  let _statusTimer = null;
  let _onStatusChange = null;  // callback(isOnline: bool, modelList: string[])

  /* ─────────────────────────────────
     PUBLIC: setBaseUrl(url)
  ───────────────────────────────── */
  function setBaseUrl(url) {
    _baseUrl = url.replace(/\/+$/, ""); // strip trailing slashes
  }

  /* ─────────────────────────────────
     PUBLIC: setModel(model)
  ───────────────────────────────── */
  function setModel(model) {
    _model = model;
  }

  /* ─────────────────────────────────
     PUBLIC: onStatusChange(cb)
     Register a callback for connection status changes.
     cb(isOnline: boolean, availableModels: string[])
  ───────────────────────────────── */
  function onStatusChange(cb) {
    _onStatusChange = cb;
  }

  /* ─────────────────────────────────
     PUBLIC: startStatusPolling()
     Immediately checks, then polls every N ms.
  ───────────────────────────────── */
  function startStatusPolling() {
    checkStatus();
    const interval = CODEFIX_CONCEPT.ollamaDefaults.statusCheckMs;
    _statusTimer = setInterval(checkStatus, interval);
  }

  /* ─────────────────────────────────
     PUBLIC: stopStatusPolling()
  ───────────────────────────────── */
  function stopStatusPolling() {
    if (_statusTimer) clearInterval(_statusTimer);
  }

  /* ─────────────────────────────────
     PUBLIC: checkStatus()
     Pings /api/tags. Fires onStatusChange callback.
  ───────────────────────────────── */
  async function checkStatus() {
    try {
      const res = await fetch(`${_baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const models = (data.models || []).map(m => m.name || m);

      if (_onStatusChange) _onStatusChange(true, models);
      return { online: true, models };

    } catch {
      if (_onStatusChange) _onStatusChange(false, []);
      return { online: false, models: [] };
    }
  }

  /* ─────────────────────────────────
     PUBLIC: debugCode(code)
     Sends code to Ollama and returns structured result.

     Returns:
       {
         ok: true,
         errors: [...],
         fixed_code: "...",
         explanation: "..."
       }
     OR on failure:
       {
         ok: false,
         rawText: "...",    // if response came but JSON parse failed
         error: "message"   // if network/HTTP error
       }
  ───────────────────────────────── */
  async function debugCode(code, traceback = null) {
    const prompt = CODEFIX_CONCEPT.buildPrompt(code, traceback);

    let response;
    try {
      response = await fetch(`${_baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model:   _model,
          prompt:  prompt,
          stream:  false,
          format:  "json",
          options: { 
            temperature: CODEFIX_CONCEPT.ollamaDefaults.temperature,
            num_ctx: CODEFIX_CONCEPT.ollamaDefaults.numCtx || 8192
          },
        }),
      });
    } catch (err) {
      return {
        ok: false,
        error: CODEFIX_CONCEPT.messages.networkErr(err.message),
      };
    }

    if (!response.ok) {
      let errMsg = `Ollama returned HTTP ${response.status}.`;
      try {
        const errData = await response.json();
        if (errData.error) errMsg += ` Error: ${errData.error}`;
      } catch (e) {
        // ignore
      }
      return {
        ok: false,
        error: errMsg,
      };
    }

    let data;
    try {
      data = await response.json();
    } catch {
      return { ok: false, error: "Could not parse Ollama response body." };
    }

    const rawText = (data.response || "").trim();
    return _parseModelResponse(rawText);
  }

  /* ─────────────────────────────────
     PRIVATE: _parseModelResponse(raw)
     Extracts the first JSON object from raw text.
  ───────────────────────────────── */
  function _parseModelResponse(raw) {
    // Find the outermost { ... } block
    const start = raw.indexOf("{");
    const end   = raw.lastIndexOf("}");

    if (start === -1 || end === -1 || end < start) {
      return { ok: false, rawText: raw, error: "No JSON object found in response." };
    }

    let jsonStr = raw.slice(start, end + 1);

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      try {
        // Try to fix unescaped literal newlines in strings by escaping ALL newlines 
        // that are NOT part of the structure.
        // A simple trick if standard parse fails: strip newlines overall
        // but that might break multiline strings. Let's just try to remove control chars.
        const cleaned = jsonStr.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ");
        parsed = JSON.parse(cleaned);
      } catch {
        return { ok: false, rawText: raw, error: "JSON parse failed even after cleanup." };
      }
    }

    // Validate required fields
    const errors     = Array.isArray(parsed.errors)   ? parsed.errors   : [];
    const fixedCode  = typeof parsed.fixed_code       === "string" ? parsed.fixed_code  : "";
    const explanation= typeof parsed.explanation      === "string" ? parsed.explanation : "";

    // Normalise each error object
    const normalisedErrors = errors.map(e => ({
      line:    Number(e.line)    || 0,
      type:    String(e.type    || "SyntaxError"),
      message: String(e.message || "Unknown error"),
      fix:     String(e.fix     || ""),
    }));

    return {
      ok:          true,
      errors:      normalisedErrors,
      fixed_code:  fixedCode,
      explanation: explanation,
    };
  }

  /* ── Public API ── */
  return {
    setBaseUrl,
    setModel,
    onStatusChange,
    startStatusPolling,
    stopStatusPolling,
    checkStatus,
    debugCode,
  };

})();

window.OllamaController = OllamaController;
