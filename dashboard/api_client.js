// ═══════════════════════════════════════════════════════════════════════
// EuroQuant API Client
// Connects the dashboard UI to the FastAPI Gateway (Mission 5)
// ═══════════════════════════════════════════════════════════════════════

// Configuration — override via env / config in production deployment
const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:8000";
const API_KEY  = import.meta.env?.VITE_API_KEY  || "dev-replace-with-real-key";

/**
 * Analyze a PDF document via the Jarvis engine.
 *
 * @param {File} file - PDF file from <input type="file"> or drag-drop
 * @param {Object} options - optional callbacks
 * @param {Function} options.onProgress - called with elapsed seconds
 * @returns {Promise<{request_id, elapsed_ms, result}>}
 */
export async function analyzePdf(file, options = {}) {
  const { onProgress } = options;

  if (!file) throw new Error("No file provided");
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Only PDF files are supported");
  }
  // Mirror the API's 50MB ceiling on the client side for fast feedback
  if (file.size > 50 * 1024 * 1024) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds 50MB`);
  }

  const formData = new FormData();
  formData.append("file", file);

  // Optional progress tick for UI countdown
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

      // Specific error code messaging
      if (response.status === 401) throw new Error("Missing API key — check your environment configuration");
      if (response.status === 403) throw new Error("Invalid API key — contact your administrator");
      if (response.status === 413) throw new Error(`File too large: ${detail}`);
      if (response.status === 422) throw new Error(`Analysis failed: ${detail}`);
      if (response.status === 429) throw new Error("Rate limit exceeded — wait 60 seconds before retrying");
      if (response.status === 503) throw new Error("Jarvis engine is currently unavailable");

      throw new Error(detail);
    }

    const body = await response.json();
    return body;
  } finally {
    if (progressTimer) clearInterval(progressTimer);
  }
}

/**
 * Fetch the branded PDF report the gateway cached during a prior /analyze
 * call — GET /api/v1/report/{request_id}. No re-upload needed: the source
 * document is already gone (ephemeral by design), but the rendered report
 * is held in-memory until the process restarts.
 *
 * @param {string} requestId - request_id returned by analyzePdf()
 * @returns {Promise<Blob>} - PDF blob, ready to save or open
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

/**
 * Trigger download of a PDF blob in the browser.
 */
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
 * Health check — used to decide whether to show "API unavailable" warning.
 */
export async function checkApiHealth() {
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    if (!response.ok) return { ok: false, status: response.status };
    return { ok: true, ...(await response.json()) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
