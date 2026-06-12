// ═══════════════════════════════════════════════════════════════════════
// EuroQuant API Client — Track C
// Connects the Risk Terminal UI to the live FastAPI gateway on Render.
//
// Configuration is env-only (web/.env.local, never committed):
//   VITE_API_BASE — gateway origin, defaults to the live deployment
//   VITE_API_KEY  — X-API-Key header value; without it the UI runs demo-only
// ═══════════════════════════════════════════════════════════════════════

export const API_BASE =
  import.meta.env?.VITE_API_BASE || "https://euroquant-api.onrender.com";

const API_KEY = import.meta.env?.VITE_API_KEY || "";

export function hasApiKey() {
  return API_KEY.length > 0;
}

/**
 * Analyze a PDF document via the Jarvis engine — POST /api/v1/analyze.
 *
 * @param {File} file - PDF from <input type="file"> or drag-drop
 * @param {Object} options
 * @param {Function} options.onProgress - called with elapsed seconds (0.1s tick)
 * @returns {Promise<{request_id, elapsed_ms, result}>}
 */
export async function analyzePdf(file, options = {}) {
  const { onProgress } = options;

  if (!file) throw new Error("No file provided");
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Only PDF files are supported");
  }
  // Mirror the API's 50MB ceiling client-side for fast feedback
  if (file.size > 50 * 1024 * 1024) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds 50MB`);
  }
  if (!hasApiKey()) {
    throw new Error("No API key configured — set VITE_API_KEY in web/.env.local, or use the demo analysis");
  }

  const formData = new FormData();
  formData.append("file", file);

  let progressTimer;
  if (onProgress) {
    const started = Date.now();
    progressTimer = setInterval(() => {
      onProgress(((Date.now() - started) / 1000).toFixed(1));
    }, 100);
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/analyze`, {
      method: "POST",
      headers: { "X-API-Key": API_KEY },
      body: formData,
    });

    if (!response.ok) {
      let detail;
      try {
        const errBody = await response.json();
        detail = errBody.detail || errBody.error || `HTTP ${response.status}`;
      } catch {
        detail = `HTTP ${response.status} ${response.statusText}`;
      }

      if (response.status === 401) throw new Error("Missing API key — check your environment configuration");
      if (response.status === 403) throw new Error("Invalid API key — contact your administrator");
      if (response.status === 413) throw new Error(`File too large: ${detail}`);
      if (response.status === 422) throw new Error(`Analysis failed: ${detail}`);
      if (response.status === 429) throw new Error("Rate limit exceeded — wait 60 seconds before retrying");
      if (response.status === 503) throw new Error("Jarvis engine is currently unavailable");

      throw new Error(detail);
    }

    return await response.json();
  } finally {
    if (progressTimer) clearInterval(progressTimer);
  }
}

/**
 * Fetch the branded PDF report cached by the gateway during /analyze —
 * GET /api/v1/report/{request_id}. The source document is already gone
 * (ephemeral by design); only the rendered report is held in memory.
 *
 * @param {string} requestId
 * @returns {Promise<Blob>}
 */
export async function downloadReport(requestId) {
  if (!requestId) throw new Error("No request_id provided");

  const response = await fetch(`${API_BASE}/api/v1/report/${requestId}`, {
    method: "GET",
    headers: { "X-API-Key": API_KEY },
  });

  if (!response.ok) {
    let detail;
    try {
      const errBody = await response.json();
      detail = errBody.detail || `HTTP ${response.status}`;
    } catch {
      detail = `HTTP ${response.status} ${response.statusText}`;
    }
    if (response.status === 404) throw new Error("Report expired or not found — re-run the analysis to regenerate it");
    throw new Error(detail);
  }

  return await response.blob();
}

/** Trigger a browser download of a PDF blob. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Health check — GET /api/health (no auth). Render free tier cold-starts,
 * so allow a generous window before declaring the API offline.
 */
export async function checkApiHealth() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    const response = await fetch(`${API_BASE}/api/health`, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return { ok: false, status: response.status };
    return { ok: true, ...(await response.json()) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
