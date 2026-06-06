// ═══════════════════════════════════════════════════════════════════════
// EuroQuant Risk Terminal — App Shell
// Mission 6: Dashboard integration with FastAPI gateway
//
// Three states:
//   1. UPLOAD    — drag-drop / file picker landing
//   2. PROCESSING — branded loader with ephemeral messaging
//   3. RESULTS   — full dashboard rendering analysis output
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import EuroQuantDashboard from "./EuroQuantDashboard";
import { analyzePdf, downloadReport, downloadBlob, checkApiHealth } from "./api_client";

// ── Brand tokens (mirror Brand Identity v1.0) ──────────────────────────
const C = {
  canvas:   "#080c14",
  card:     "#0d1420",
  primary:  "#003399",
  steel:    "#4a90d9",
  cyan:     "#00F0FF",
  border:   "#131a27",
  muted:    "#2d3a50",
  sub:      "#8899aa",
  text:     "#e2e8f0",
  bright:   "#f0f4ff",
  critical: "#ff3b3b",
  clear:    "#00c896",
};

const FONT_DISPLAY = "'Space Grotesk', 'DM Sans', sans-serif";
const FONT_MONO    = "'DM Mono', 'JetBrains Mono', monospace";

// ═══════════════════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export default function App() {
  const [view, setView]               = useState("upload");      // upload | processing | results
  const [file, setFile]               = useState(null);
  const [result, setResult]           = useState(null);
  const [requestId, setRequestId]     = useState(null);
  const [error, setError]             = useState(null);
  const [elapsed, setElapsed]         = useState(0);
  const [apiHealthy, setApiHealthy]   = useState(null);          // null | true | false
  const [downloading, setDownloading] = useState(false);

  // ── Health check on mount ────────────────────────────────────────────
  useEffect(() => {
    checkApiHealth().then(h => setApiHealthy(h.ok));
  }, []);

  // ── File submission ─────────────────────────────────────────────────
  const handleAnalyze = useCallback(async (selectedFile) => {
    setFile(selectedFile);
    setError(null);
    setView("processing");
    setElapsed(0);

    try {
      const response = await analyzePdf(selectedFile, {
        onProgress: (sec) => setElapsed(sec),
      });
      setResult(response.result);
      setRequestId(response.request_id || null);
      setView("results");
    } catch (e) {
      setError(e.message);
      setView("upload");
    }
  }, []);

  // ── Demo mode (bypass API) ──────────────────────────────────────────
  const handleDemo = useCallback(() => {
    setResult(null);            // null triggers dashboard's default sample data
    setRequestId(null);
    setView("results");
  }, []);

  // ── Reset to upload screen ──────────────────────────────────────────
  const handleReset = useCallback(() => {
    setView("upload");
    setFile(null);
    setResult(null);
    setRequestId(null);
    setError(null);
    setElapsed(0);
  }, []);

  // ── PDF report download — GET /api/v1/report/{request_id} ───────────
  // Pulls the report the gateway already generated and cached during
  // /analyze, rather than re-uploading the (now-destroyed) source file.
  const handleDownloadReport = useCallback(async () => {
    if (!requestId) {
      setError("No report available for this analysis — re-run to generate one");
      return;
    }
    setDownloading(true);
    try {
      const blob = await downloadReport(requestId);
      const founderId = result?.profile?.founder_id || requestId;
      downloadBlob(blob, `EuroQuant_Risk_Report_${founderId}.pdf`);
    } catch (e) {
      setError(`Report download failed: ${e.message}`);
    } finally {
      setDownloading(false);
    }
  }, [requestId, result]);

  // ════════════════════════════════════════════════════════════════════
  if (view === "upload") {
    return (
      <UploadScreen
        onAnalyze={handleAnalyze}
        onDemo={handleDemo}
        error={error}
        apiHealthy={apiHealthy}
      />
    );
  }

  if (view === "processing") {
    return <ProcessingScreen file={file} elapsed={elapsed} />;
  }

  // view === "results"
  return (
    <div style={{ minHeight: "100vh", background: C.canvas }}>
      <ResultsBar
        founderName={result?.profile?.full_name || "Demo Subject"}
        onReset={handleReset}
        onDownload={handleDownloadReport}
        downloading={downloading}
        hasReport={!!requestId}
      />
      <EuroQuantDashboard data={result || undefined} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// UPLOAD SCREEN
// ═══════════════════════════════════════════════════════════════════════

function UploadScreen({ onAnalyze, onDemo, error, apiHealthy }) {
  const [dragOver, setDragOver]   = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onAnalyze(f);
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) onAnalyze(f);
  };

  return (
    <div style={styles.uploadRoot}>
      <div style={styles.uploadTopbar}>
        <span style={styles.logo}>
          E U R O Q U A N T<span style={styles.logoDot}> · </span>
          <span style={styles.logoSub}>RISK TERMINAL</span>
        </span>
        <ApiHealthBadge healthy={apiHealthy} />
      </div>

      <div style={styles.uploadCenter}>
        <div style={styles.uploadHeroLabel}>
          R E G U L A T O R Y &nbsp; D U E &nbsp; D I L I G E N C E
        </div>
        <h1 style={styles.uploadHero}>Ingest Document for Analysis</h1>
        <p style={styles.uploadSubline}>
          Drag a Cap Table, founding document, or KYC PDF below. Jarvis will analyse
          it in RAM — the file is destroyed the moment extraction completes.
        </p>

        <div
          style={{
            ...styles.dropzone,
            ...(dragOver ? styles.dropzoneActive : {}),
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div style={styles.dropzoneIcon}>▲</div>
          <div style={styles.dropzoneTitle}>Drop PDF here, or click to select</div>
          <div style={styles.dropzoneSub}>Maximum 50MB · PDF only</div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </div>

        {error && (
          <div style={styles.errorBox}>
            <span style={styles.errorLabel}>ERROR</span>
            <span style={styles.errorText}>{error}</span>
          </div>
        )}

        <div style={styles.uploadFooter}>
          <button style={styles.demoBtn} onClick={onDemo}>
            VIEW DEMO ANALYSIS &nbsp;→
          </button>
          <div style={styles.ephemeralBadge}>
            <span style={styles.ephemeralDot}>●</span>
            EPHEMERAL MODE · ACTIVE
          </div>
        </div>

        <div style={styles.featureRow}>
          <FeatureCard
            label="REFERENCE LAYER"
            value="OFAC · EU"
            sub="Sanctions cross-check"
          />
          <FeatureCard
            label="GRAPH NETWORK"
            value="D-1 to D-3"
            sub="Neo4j pathway analysis"
          />
          <FeatureCard
            label="BENCHMARK"
            value="FATF / EBA"
            sub="Market percentile"
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ label, value, sub }) {
  return (
    <div style={styles.featureCard}>
      <div style={styles.featureLabel}>{label}</div>
      <div style={styles.featureValue}>{value}</div>
      <div style={styles.featureSub}>{sub}</div>
    </div>
  );
}

function ApiHealthBadge({ healthy }) {
  if (healthy === null) {
    return (
      <div style={styles.healthBadge}>
        <span style={{ color: C.muted }}>● CHECKING API…</span>
      </div>
    );
  }
  if (healthy) {
    return (
      <div style={styles.healthBadge}>
        <span style={{ color: C.clear }}>●</span>
        <span style={{ color: C.sub, marginLeft: 6 }}>JARVIS ENGINE · ONLINE</span>
      </div>
    );
  }
  return (
    <div style={styles.healthBadge}>
      <span style={{ color: C.critical }}>●</span>
      <span style={{ color: C.sub, marginLeft: 6 }}>API · OFFLINE (demo only)</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PROCESSING SCREEN
// ═══════════════════════════════════════════════════════════════════════

function ProcessingScreen({ file, elapsed }) {
  // Cycle through Jarvis pipeline stage labels for visual feedback
  const stages = [
    "Reading document into memory",
    "Extracting risk profile via Claude",
    "Cross-checking OFAC + EU sanctions",
    "Verifying companies on OpenCorporates",
    "Calculating market percentile",
  ];
  const stageIdx = Math.min(
    stages.length - 1,
    Math.floor(elapsed / 4)   // Roughly 4s per stage on typical doc
  );

  return (
    <div style={styles.uploadRoot}>
      <div style={styles.uploadTopbar}>
        <span style={styles.logo}>
          E U R O Q U A N T<span style={styles.logoDot}> · </span>
          <span style={styles.logoSub}>RISK TERMINAL</span>
        </span>
      </div>

      <div style={styles.uploadCenter}>
        <div style={styles.processingPulse}>
          <div style={styles.pulseRing} />
          <div style={styles.pulseRing2} />
          <div style={styles.pulseDot}>●</div>
        </div>

        <h2 style={styles.processingTitle}>JARVIS ENGINE · {elapsed}s ELAPSED</h2>
        <div style={styles.processingFile}>{file?.name}</div>

        <div style={styles.stageList}>
          {stages.map((stage, i) => (
            <div
              key={i}
              style={{
                ...styles.stageItem,
                ...(i < stageIdx ? styles.stageDone :
                    i === stageIdx ? styles.stageActive : styles.stagePending)
              }}
            >
              <span style={styles.stageMarker}>
                {i < stageIdx ? "✓" : i === stageIdx ? "◉" : "○"}
              </span>
              {stage}
            </div>
          ))}
        </div>

        <div style={styles.ephemeralBadge}>
          <span style={styles.ephemeralDot}>●</span>
          EPHEMERAL MODE · DOCUMENT IN RAM
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// RESULTS TOP BAR — shows above the dashboard
// ═══════════════════════════════════════════════════════════════════════

function ResultsBar({ founderName, onReset, onDownload, downloading, hasReport }) {
  return (
    <div style={styles.resultsBar}>
      <div style={styles.resultsBarLeft}>
        <span style={styles.resultsBarLabel}>ANALYSIS COMPLETE</span>
        <span style={styles.resultsBarName}>{founderName}</span>
      </div>
      <div style={styles.resultsBarActions}>
        {hasReport && <DestructionBadge />}
        {hasReport && (
          <button
            style={styles.downloadBtn}
            onClick={onDownload}
            disabled={downloading}
          >
            {downloading ? "FETCHING…" : "⬇ DOWNLOAD PDF REPORT"}
          </button>
        )}
        <button style={styles.newBtn} onClick={onReset}>
          + NEW ANALYSIS
        </button>
      </div>
    </div>
  );
}

// Brand Identity §06 — exact post-analysis confirmation copy.
// Shown only after a real document was ingested and destroyed server-side
// (hasReport implies a live /analyze call returned a request_id).
function DestructionBadge() {
  return (
    <div style={styles.destructionBadge}>
      <span style={{ color: C.clear, marginRight: 8 }}>✓</span>
      Document Destroyed · 0 bytes retained
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════

const styles = {
  uploadRoot: {
    minHeight: "100vh",
    background: C.canvas,
    color: C.text,
    fontFamily: FONT_DISPLAY,
    display: "flex",
    flexDirection: "column",
  },
  uploadTopbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 32px",
    background: "#0a0f1a",
    borderBottom: `1px solid ${C.border}`,
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  logo: {
    fontFamily: FONT_MONO,
    fontSize: 13,
    fontWeight: 700,
    color: C.steel,
    letterSpacing: "0.18em",
  },
  logoDot:  { color: "#1e2535", fontSize: 12 },
  logoSub:  { fontFamily: FONT_MONO, fontSize: 11, color: C.muted, letterSpacing: "0.18em" },
  healthBadge: {
    fontFamily: FONT_MONO,
    fontSize: 10,
    letterSpacing: "0.1em",
  },

  // ── Upload center ──
  uploadCenter: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "60px 24px",
    flex: 1,
    width: "100%",
  },
  uploadHeroLabel: {
    fontFamily: FONT_MONO,
    fontSize: 9,
    color: C.muted,
    letterSpacing: "0.3em",
    marginBottom: 16,
  },
  uploadHero: {
    fontFamily: FONT_DISPLAY,
    fontSize: 38,
    fontWeight: 700,
    color: C.bright,
    margin: "0 0 16px 0",
    letterSpacing: "-0.01em",
  },
  uploadSubline: {
    fontFamily: FONT_DISPLAY,
    fontSize: 14,
    color: C.sub,
    lineHeight: 1.6,
    marginBottom: 40,
    maxWidth: 560,
  },

  // ── Dropzone ──
  dropzone: {
    border: `2px dashed ${C.border}`,
    borderRadius: 8,
    padding: "60px 40px",
    textAlign: "center",
    background: C.card,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  dropzoneActive: {
    borderColor: C.primary,
    background: "#0d1420",
    boxShadow: `0 0 0 4px ${C.primary}22`,
  },
  dropzoneIcon: {
    fontSize: 32,
    color: C.steel,
    marginBottom: 16,
  },
  dropzoneTitle: {
    fontFamily: FONT_DISPLAY,
    fontSize: 16,
    fontWeight: 600,
    color: C.bright,
    marginBottom: 8,
  },
  dropzoneSub: {
    fontFamily: FONT_MONO,
    fontSize: 10,
    color: C.muted,
    letterSpacing: "0.1em",
  },

  // ── Error ──
  errorBox: {
    marginTop: 16,
    padding: "12px 16px",
    background: `${C.critical}11`,
    border: `1px solid ${C.critical}44`,
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  errorLabel: {
    fontFamily: FONT_MONO,
    fontSize: 9,
    color: C.critical,
    letterSpacing: "0.15em",
    fontWeight: 700,
  },
  errorText: { fontFamily: FONT_DISPLAY, fontSize: 13, color: C.text },

  // ── Footer row ──
  uploadFooter: {
    marginTop: 32,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  demoBtn: {
    background: "transparent",
    border: `1px solid ${C.steel}33`,
    color: C.steel,
    fontFamily: FONT_MONO,
    fontSize: 10,
    letterSpacing: "0.15em",
    fontWeight: 700,
    padding: "10px 18px",
    borderRadius: 4,
    cursor: "pointer",
  },
  ephemeralBadge: {
    fontFamily: FONT_MONO,
    fontSize: 10,
    color: C.cyan,
    letterSpacing: "0.15em",
    border: `1px solid ${C.cyan}30`,
    background: `${C.cyan}07`,
    padding: "6px 12px",
    borderRadius: 4,
  },
  ephemeralDot: {
    color: C.cyan,
    marginRight: 8,
    animation: "pulse 2s infinite",
  },
  destructionBadge: {
    fontFamily: FONT_MONO,
    fontSize: 10,
    color: C.clear,
    letterSpacing: "0.1em",
    border: `1px solid ${C.clear}30`,
    background: `${C.clear}0c`,
    padding: "9px 14px",
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
  },

  // ── Feature row ──
  featureRow: {
    marginTop: 48,
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
  },
  featureCard: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "18px 20px",
  },
  featureLabel: {
    fontFamily: FONT_MONO,
    fontSize: 9,
    color: C.muted,
    letterSpacing: "0.2em",
    marginBottom: 6,
  },
  featureValue: {
    fontFamily: FONT_MONO,
    fontSize: 16,
    fontWeight: 700,
    color: C.bright,
    marginBottom: 4,
  },
  featureSub: { fontFamily: FONT_DISPLAY, fontSize: 11, color: C.sub },

  // ── Processing screen ──
  processingPulse: {
    width: 120,
    height: 120,
    position: "relative",
    margin: "60px auto 40px auto",
  },
  pulseRing: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    border: `2px solid ${C.cyan}40`,
    animation: "pulse-ring 2s infinite",
  },
  pulseRing2: {
    position: "absolute",
    inset: 20,
    borderRadius: "50%",
    border: `2px solid ${C.cyan}60`,
    animation: "pulse-ring 2s infinite 0.5s",
  },
  pulseDot: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 36,
    color: C.cyan,
  },
  processingTitle: {
    fontFamily: FONT_MONO,
    fontSize: 13,
    color: C.bright,
    letterSpacing: "0.18em",
    fontWeight: 700,
    textAlign: "center",
    margin: "0 0 8px 0",
  },
  processingFile: {
    fontFamily: FONT_MONO,
    fontSize: 11,
    color: C.muted,
    textAlign: "center",
    marginBottom: 40,
  },
  stageList: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: 20,
    maxWidth: 480,
    margin: "0 auto 32px auto",
  },
  stageItem: {
    fontFamily: FONT_DISPLAY,
    fontSize: 13,
    padding: "8px 0",
    display: "flex",
    alignItems: "center",
    gap: 12,
    transition: "all 0.3s ease",
  },
  stageMarker: {
    fontFamily: FONT_MONO,
    fontSize: 12,
    width: 16,
    display: "inline-block",
    textAlign: "center",
  },
  stageDone:    { color: C.clear },
  stageActive:  { color: C.cyan, fontWeight: 600 },
  stagePending: { color: C.muted },

  // ── Results bar ──
  resultsBar: {
    background: "#0a0f1a",
    borderBottom: `1px solid ${C.border}`,
    padding: "14px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  resultsBarLeft:    { display: "flex", flexDirection: "column", gap: 2 },
  resultsBarLabel:   {
    fontFamily: FONT_MONO,
    fontSize: 9,
    color: C.clear,
    letterSpacing: "0.2em",
  },
  resultsBarName:    {
    fontFamily: FONT_DISPLAY,
    fontSize: 16,
    fontWeight: 600,
    color: C.bright,
  },
  resultsBarActions: { display: "flex", gap: 12 },
  downloadBtn: {
    background: C.primary,
    border: `1px solid ${C.primary}`,
    color: C.bright,
    fontFamily: FONT_MONO,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.12em",
    padding: "9px 16px",
    borderRadius: 4,
    cursor: "pointer",
  },
  newBtn: {
    background: "transparent",
    border: `1px solid ${C.steel}33`,
    color: C.steel,
    fontFamily: FONT_MONO,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.12em",
    padding: "9px 14px",
    borderRadius: 4,
    cursor: "pointer",
  },
};

// ── Inject keyframes once ───────────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("eq-keyframes")) {
  const style = document.createElement("style");
  style.id = "eq-keyframes";
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    @keyframes pulse-ring {
      0%   { transform: scale(0.8); opacity: 1; }
      100% { transform: scale(1.4); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}
