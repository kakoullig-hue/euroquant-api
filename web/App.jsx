// ═══════════════════════════════════════════════════════════════════════
// EuroQuant Risk Terminal — App Shell (design v2)
//
// Three states:
//   1. UPLOAD     — ingest landing (drag-drop / picker / instant demo)
//   2. PROCESSING — Jarvis pipeline progress, ephemeral messaging
//   3. RESULTS    — full dashboard rendering analysis output
//
// UX copy is contractual (Blueprint §10): "Ingest for Analysis",
// "● EPHEMERAL MODE · ACTIVE", "Document Destroyed · 0 bytes retained".
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import EuroQuantDashboard from "./EuroQuantDashboard";
import { analyzePdf, downloadReport, downloadBlob, checkApiHealth, hasApiKey, API_BASE } from "./api_client";
import demoData from "./demo_data_synthetic.json";
import { C, FONT_DISPLAY, FONT_MONO, injectGlobalStyles, badge, card } from "./theme";

injectGlobalStyles();

export default function App() {
  const [view, setView]               = useState("upload");      // upload | processing | results
  const [file, setFile]               = useState(null);
  const [result, setResult]           = useState(null);
  const [requestId, setRequestId]     = useState(null);          // null ⇒ synthetic demo
  const [error, setError]             = useState(null);
  const [elapsed, setElapsed]         = useState(0);
  const [apiHealthy, setApiHealthy]   = useState(null);          // null | true | false
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    checkApiHealth().then((h) => setApiHealthy(h.ok));
  }, []);

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

  const handleDemo = useCallback(() => {
    setResult(demoData);
    setRequestId(null);
    setView("results");
  }, []);

  const handleReset = useCallback(() => {
    setView("upload");
    setFile(null);
    setResult(null);
    setRequestId(null);
    setError(null);
    setElapsed(0);
  }, []);

  // PDF report — GET /api/v1/report/{request_id}. The gateway caches the
  // rendered report during /analyze; the source document is already gone.
  const handleDownloadReport = useCallback(async () => {
    if (!requestId) return;
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

  return (
    <div style={{ minHeight: "100vh", background: C.canvas }}>
      <ResultsBar
        founderName={result?.profile?.full_name || "Demo Subject"}
        isDemo={!requestId}
        onReset={handleReset}
        onDownload={handleDownloadReport}
        downloading={downloading}
        hasReport={!!requestId}
      />
      <EuroQuantDashboard data={result || demoData} isDemo={!requestId} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SHARED CHROME
// ═══════════════════════════════════════════════════════════════════════

function Wordmark() {
  return (
    <span style={S.logo}>
      EUROQUANT
      <span style={{ color: "#1e2535", margin: "0 8px" }}>·</span>
      <span style={{ color: C.muted }}>RISK TERMINAL</span>
    </span>
  );
}

function Topbar({ right }) {
  return (
    <div style={S.topbar}>
      <Wordmark />
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>{right}</div>
    </div>
  );
}

function StatusDot({ color, pulse }) {
  return (
    <span
      className={pulse ? "eq-pulse" : undefined}
      style={{
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 6px ${color}`,
        flexShrink: 0,
      }}
    />
  );
}

function ApiHealthBadge({ healthy }) {
  const state = healthy === null
    ? { color: C.muted, label: "CHECKING API…" }
    : healthy
      ? { color: C.clear, label: "JARVIS ENGINE · ONLINE" }
      : { color: C.critical, label: "API · OFFLINE (DEMO ONLY)" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.12em", color: C.sub }}>
      <StatusDot color={state.color} pulse={healthy === null} />
      {state.label}
    </div>
  );
}

// Blueprint §10 — exact ephemeral state copy. Cyan is reserved for the
// ≤8px dot; label text stays in subdued palette.
function EphemeralBadge({ children }) {
  return (
    <div style={S.ephemeralBadge}>
      <StatusDot color={C.cyan} pulse />
      <span>{children}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// UPLOAD SCREEN
// ═══════════════════════════════════════════════════════════════════════

function UploadScreen({ onAnalyze, onDemo, error, apiHealthy }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const keyMissing = !hasApiKey();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onAnalyze(f);
  };

  return (
    <div style={S.root}>
      <Topbar right={<ApiHealthBadge healthy={apiHealthy} />} />

      <div style={S.center}>
        <div className="eq-fade" style={{ "--d": "50ms" }}>
          <div style={S.heroLabel}>REGULATORY DUE DILIGENCE · CEE & BALTICS</div>
          <h1 style={S.hero}>Ingest for Analysis</h1>
          <p style={S.subline}>
            Drop a Cap Table, founding document, or KYC PDF below. Jarvis analyses it
            entirely in RAM — the document is destroyed the moment extraction completes.
            Nothing is written to disk, by design.
          </p>
        </div>

        <div
          className="eq-fade"
          style={{
            "--d": "130ms",
            ...S.dropzone,
            ...(dragOver ? S.dropzoneActive : {}),
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <Bracket pos="tl" active={dragOver} /><Bracket pos="tr" active={dragOver} />
          <Bracket pos="bl" active={dragOver} /><Bracket pos="br" active={dragOver} />
          <div style={S.dropIcon}>▲</div>
          <div style={S.dropTitle}>{dragOver ? "Release to ingest" : "Drop PDF here, or click to select"}</div>
          <div style={S.dropSub}>MAX 50MB · PDF ONLY · SHA-256 AUDIT ANCHOR</div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files[0]; if (f) onAnalyze(f); }}
          />
        </div>

        {error && (
          <div style={S.errorBox}>
            <span style={S.errorLabel}>ERROR</span>
            <span style={S.errorText}>{error}</span>
          </div>
        )}

        {keyMissing && !error && (
          <div className="eq-fade" style={{ "--d": "180ms", ...S.noticeBox }}>
            <span style={{ ...S.errorLabel, color: C.medium }}>CONFIG</span>
            <span style={S.errorText}>
              No API key configured — set <span style={{ fontFamily: FONT_MONO }}>VITE_API_KEY</span> in{" "}
              <span style={{ fontFamily: FONT_MONO }}>web/.env.local</span> for live ingestion. Demo mode is available below.
            </span>
          </div>
        )}

        <div className="eq-fade" style={{ "--d": "200ms", ...S.footerRow }}>
          <button className="eq-btn" style={S.demoBtn} onClick={onDemo}>
            VIEW DEMO ANALYSIS →
          </button>
          <EphemeralBadge>EPHEMERAL MODE · ACTIVE</EphemeralBadge>
        </div>

        <div className="eq-fade" style={{ "--d": "280ms", ...S.featureRow }}>
          <FeatureCard label="REFERENCE LAYER" value="OFAC · EU" sub="Sanctions cross-check, 24h cache" />
          <FeatureCard label="GRAPH NETWORK" value="D-1 → D-3" sub="Neo4j pathway distance alerts" />
          <FeatureCard label="BENCHMARK" value="FATF / EBA" sub="Market percentile, two-mode engine" />
        </div>
      </div>

      <div style={S.pageFooter}>
        <span>© 2026 EUROQUANT · ADVISORY OUTPUT</span>
        <span style={{ fontFamily: FONT_MONO }}>{API_BASE.replace(/^https?:\/\//, "")}</span>
      </div>
    </div>
  );
}

// Corner brackets give the dropzone its terminal "target lock" frame.
function Bracket({ pos, active }) {
  const c = active ? C.steel : C.muted;
  const base = { position: "absolute", width: 18, height: 18, transition: "border-color 0.2s ease" };
  const map = {
    tl: { top: 10, left: 10, borderTop: `2px solid ${c}`, borderLeft: `2px solid ${c}` },
    tr: { top: 10, right: 10, borderTop: `2px solid ${c}`, borderRight: `2px solid ${c}` },
    bl: { bottom: 10, left: 10, borderBottom: `2px solid ${c}`, borderLeft: `2px solid ${c}` },
    br: { bottom: 10, right: 10, borderBottom: `2px solid ${c}`, borderRight: `2px solid ${c}` },
  };
  return <div style={{ ...base, ...map[pos] }} />;
}

function FeatureCard({ label, value, sub }) {
  return (
    <div className="eq-card-hover" style={card({ padding: "18px 20px" })}>
      <div style={S.featureLabel}>{label}</div>
      <div style={S.featureValue}>{value}</div>
      <div style={S.featureSub}>{sub}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PROCESSING SCREEN
// ═══════════════════════════════════════════════════════════════════════

const PIPELINE_STAGES = [
  ["01", "INGEST",    "Reading document into volatile memory"],
  ["02", "EXTRACT",   "Structured risk extraction via Claude"],
  ["03", "REFERENCE", "OFAC SDN + EU Consolidated cross-check"],
  ["04", "GRAPH",     "Persisting pathway network to Neo4j"],
  ["05", "BENCHMARK", "Computing market percentile"],
];

function ProcessingScreen({ file, elapsed }) {
  const stageIdx = Math.min(PIPELINE_STAGES.length - 1, Math.floor(elapsed / 4));

  return (
    <div style={S.root}>
      <Topbar right={<EphemeralBadge>EPHEMERAL MODE · ACTIVE</EphemeralBadge>} />

      <div style={{ ...S.center, textAlign: "center" }}>
        <div style={S.pulseWrap}>
          <div style={{ ...S.pulseRing, animation: "eqRing 2s ease-out infinite" }} />
          <div style={{ ...S.pulseRing, inset: 18, animation: "eqRing 2s ease-out infinite 0.5s" }} />
          <div style={S.pulseCore}><StatusDot color={C.cyan} pulse /></div>
        </div>

        <h2 style={S.procTitle}>Jarvis Engine · {elapsed}s elapsed</h2>
        <div style={S.procFile}>{file?.name}</div>

        <div style={S.stageCard}>
          <div style={S.scanTrack}><div style={S.scanBar} /></div>
          {PIPELINE_STAGES.map(([num, code, desc], i) => {
            const state = i < stageIdx ? "done" : i === stageIdx ? "active" : "pending";
            const color = state === "done" ? C.clear : state === "active" ? C.bright : C.muted;
            return (
              <div key={num} style={{ ...S.stageRow, color }}>
                <span style={{ ...S.stageNum, color: state === "active" ? C.steel : C.muted }}>{num}</span>
                <span style={{ ...S.stageCode, color }}>{code}</span>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 13 }}>{desc}</span>
                <span style={{ marginLeft: "auto", fontFamily: FONT_MONO, fontSize: 11 }}>
                  {state === "done" ? "✓" : state === "active" ? "●" : "○"}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.muted, letterSpacing: "0.12em" }}>
          DOCUMENT HELD IN RAM ONLY · DESTROYED ON COMPLETION
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// RESULTS TOP BAR
// ═══════════════════════════════════════════════════════════════════════

function ResultsBar({ founderName, isDemo, onReset, onDownload, downloading, hasReport }) {
  return (
    <div style={S.resultsBar}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={S.resultsLabel}>ANALYSIS COMPLETE</span>
        <span style={S.resultsName}>{founderName}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {isDemo && <span style={badge(C.medium)}>SYNTHETIC DEMO</span>}
        {hasReport && (
          // Blueprint §10 — exact post-analysis confirmation copy.
          <div style={S.destroyBadge}>
            <span style={{ color: C.clear, marginRight: 8 }}>✓</span>
            Document Destroyed · 0 bytes retained
          </div>
        )}
        {hasReport && (
          <button className="eq-btn" style={S.downloadBtn} onClick={onDownload} disabled={downloading}>
            {downloading ? "FETCHING…" : "↓ PDF REPORT"}
          </button>
        )}
        <button className="eq-btn" style={S.newBtn} onClick={onReset}>+ NEW ANALYSIS</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════

const S = {
  root: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    color: C.text,
    fontFamily: FONT_DISPLAY,
    background: `
      radial-gradient(900px 600px at 12% -5%, #0b2a6b1f, transparent 60%),
      radial-gradient(800px 600px at 100% 8%, #00204f2e, transparent 55%),
      ${C.canvas}`,
  },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 32px",
    background: "#0a0f1acc",
    backdropFilter: "blur(8px)",
    borderBottom: `1px solid ${C.border}`,
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  logo: {
    fontFamily: FONT_MONO,
    fontSize: 13,
    fontWeight: 500,
    color: C.steel,
    letterSpacing: "0.22em",
  },

  center: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "64px 24px 40px",
    flex: 1,
    width: "100%",
  },
  heroLabel: {
    fontFamily: FONT_MONO,
    fontSize: 8,
    color: C.muted,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    marginBottom: 16,
  },
  hero: {
    fontFamily: FONT_DISPLAY,
    fontSize: 42,
    fontWeight: 700,
    color: C.bright,
    margin: "0 0 16px 0",
    letterSpacing: "-0.015em",
  },
  subline: {
    fontSize: 14,
    color: C.sub,
    lineHeight: 1.65,
    marginBottom: 40,
    maxWidth: 560,
  },

  dropzone: {
    position: "relative",
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "58px 40px",
    textAlign: "center",
    background: C.card,
    cursor: "pointer",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },
  dropzoneActive: {
    borderColor: C.primary,
    boxShadow: `0 0 0 4px ${C.primary}26, 0 18px 48px rgba(0, 8, 30, 0.5)`,
  },
  dropIcon: { fontSize: 30, color: C.steel, marginBottom: 14 },
  dropTitle: { fontSize: 16, fontWeight: 600, color: C.bright, marginBottom: 8 },
  dropSub: { fontFamily: FONT_MONO, fontSize: 9, color: C.muted, letterSpacing: "0.15em" },

  errorBox: {
    marginTop: 16,
    padding: "12px 16px",
    background: `${C.critical}11`,
    border: `1px solid ${C.critical}44`,
    borderRadius: 6,
    display: "flex",
    alignItems: "baseline",
    gap: 12,
  },
  noticeBox: {
    marginTop: 16,
    padding: "12px 16px",
    background: `${C.medium}0d`,
    border: `1px solid ${C.medium}33`,
    borderRadius: 6,
    display: "flex",
    alignItems: "baseline",
    gap: 12,
  },
  errorLabel: {
    fontFamily: FONT_MONO,
    fontSize: 9,
    color: C.critical,
    letterSpacing: "0.15em",
    flexShrink: 0,
  },
  errorText: { fontSize: 13, color: C.text, lineHeight: 1.5 },

  footerRow: {
    marginTop: 32,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  demoBtn: {
    background: C.primary,
    border: `1px solid ${C.primary}`,
    color: C.bright,
    fontFamily: FONT_MONO,
    fontSize: 10,
    letterSpacing: "0.15em",
    fontWeight: 500,
    padding: "11px 20px",
    borderRadius: 5,
    cursor: "pointer",
  },
  ephemeralBadge: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontFamily: FONT_MONO,
    fontSize: 10,
    color: C.sub,
    letterSpacing: "0.15em",
    border: `1px solid ${C.cyan}26`,
    background: `${C.cyan}06`,
    padding: "7px 13px",
    borderRadius: 5,
  },

  featureRow: {
    marginTop: 48,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
  },
  featureLabel: {
    fontFamily: FONT_MONO,
    fontSize: 8,
    color: C.muted,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  featureValue: {
    fontFamily: FONT_MONO,
    fontSize: 16,
    fontWeight: 500,
    color: C.bright,
    marginBottom: 5,
  },
  featureSub: { fontSize: 11, color: C.sub, lineHeight: 1.45 },

  pageFooter: {
    display: "flex",
    justifyContent: "space-between",
    padding: "16px 32px",
    borderTop: `1px solid ${C.border}`,
    fontFamily: FONT_MONO,
    fontSize: 9,
    color: C.muted,
    letterSpacing: "0.12em",
  },

  // ── Processing ──
  pulseWrap: { width: 110, height: 110, position: "relative", margin: "40px auto 36px" },
  pulseRing: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    border: `1px solid ${C.cyan}55`,
  },
  pulseCore: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  procTitle: {
    fontFamily: FONT_MONO,
    fontSize: 14,
    color: C.bright,
    letterSpacing: "0.14em",
    fontWeight: 500,
    margin: "0 0 8px 0",
  },
  procFile: { fontFamily: FONT_MONO, fontSize: 11, color: C.muted, marginBottom: 36 },
  stageCard: {
    position: "relative",
    overflow: "hidden",
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "22px 22px 16px",
    maxWidth: 480,
    margin: "0 auto 28px",
    textAlign: "left",
  },
  scanTrack: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    overflow: "hidden",
  },
  scanBar: {
    width: "26%",
    height: "100%",
    background: `linear-gradient(90deg, transparent, ${C.cyan}, transparent)`,
    animation: "eqScan 2.4s ease-in-out infinite",
  },
  stageRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "9px 0",
    transition: "color 0.3s ease",
  },
  stageNum: { fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.1em" },
  stageCode: {
    fontFamily: FONT_MONO,
    fontSize: 10,
    letterSpacing: "0.15em",
    width: 84,
    flexShrink: 0,
  },

  // ── Results bar ──
  resultsBar: {
    background: "#0a0f1acc",
    backdropFilter: "blur(8px)",
    borderBottom: `1px solid ${C.border}`,
    padding: "12px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 100,
    flexWrap: "wrap",
    gap: 10,
  },
  resultsLabel: {
    fontFamily: FONT_MONO,
    fontSize: 8,
    color: C.clear,
    letterSpacing: "0.2em",
  },
  resultsName: { fontSize: 16, fontWeight: 600, color: C.bright, fontFamily: FONT_DISPLAY },
  destroyBadge: {
    display: "flex",
    alignItems: "center",
    fontFamily: FONT_MONO,
    fontSize: 10,
    color: C.clear,
    letterSpacing: "0.08em",
    border: `1px solid ${C.clear}30`,
    background: `${C.clear}0c`,
    padding: "8px 13px",
    borderRadius: 5,
  },
  downloadBtn: {
    background: C.primary,
    border: `1px solid ${C.primary}`,
    color: C.bright,
    fontFamily: FONT_MONO,
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: "0.12em",
    padding: "9px 16px",
    borderRadius: 5,
    cursor: "pointer",
  },
  newBtn: {
    background: "transparent",
    border: `1px solid ${C.steel}40`,
    color: C.steel,
    fontFamily: FONT_MONO,
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: "0.12em",
    padding: "9px 14px",
    borderRadius: 5,
    cursor: "pointer",
  },
};
