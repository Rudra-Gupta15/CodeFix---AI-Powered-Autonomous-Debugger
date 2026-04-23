/**
 * backend.js
 * ──────────────────────────────────────────────────────────
 * Handles all API communication with the Python/Flask backend.
 * ──────────────────────────────────────────────────────────
 */

"use strict";

const BackendController = {
  baseUrl: "http://localhost:5000",

  async checkStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      const data = await response.json();
      return data.status === "healthy";
    } catch (e) {
      return false;
    }
  },

  async debugCode(code) {
    try {
      const response = await fetch(`${this.baseUrl}/debug`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });

      if (!response.ok) {
        const errData = await response.json();
        return { ok: false, error: errData.error || "Backend error" };
      }

      const data = await response.json();

      // The agent returns { output: "...json string..." }
      try {
        const agentOutput = data.output;
        const jsonMatch = agentOutput.match(/\{[\s\S]*\}/);
        let jsonStr = jsonMatch ? jsonMatch[0] : agentOutput;
        
        const parsed = JSON.parse(jsonStr);

        return {
          ok: true,
          errors: parsed.errors || [],
          fixed_code: parsed.fixed_code || "",
          explanation: parsed.explanation || ""
        };
      } catch (e) {
        console.error("JSON parse failed on agent output:", e);
        return { ok: false, rawText: data.output || "Error parsing model response." };
      }

    } catch (e) {
      return { ok: false, error: "Could not connect to Backend server." };
    }
  }
};

