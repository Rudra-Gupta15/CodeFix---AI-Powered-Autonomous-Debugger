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
  }
};

