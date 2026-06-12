// ═══════════════════════════════════════════════════════════════════════
// EuroQuant Risk Terminal — Dashboard (design v2)
// Renders a RiskExtractionResult (live Jarvis output or the synthetic
// demo dataset). Brand rules per Blueprint §10: DM Mono for ALL data,
// severity palette, graph rules (subject = Primary Blue larger, PEP =
// red always, D-3 edges dashed), cards fadeUp staggered 50–300ms.
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useMemo } from "react";
import demoData from "./demo_data_synthetic.json";
import {
  C, FONT_DISPLAY, FONT_MONO, DISTANCE_COLOR,
  giLevel, badge, card, injectGlobalStyles,
} from "./theme";

injectGlobalStyles();

// ── Utilities ──────────────────────────────────────────────────────────
const fmt = (n) =>
  n >= 1_000_000 ? `€${(n / 1_000_000).toFixed(1)}M` : `€${(n / 1_000).toFixed(0)}K`;

const PEP_LABELS = {
  direct_pep:    { label: "DIRECT PEP",    color: C.critical },
  family_pep:    { label: "FAMILY PEP",    color: C.high },
  associate_pep: { label: "ASSOCIATE PEP", color: C.medium },
  former_pep:    { label: "FORMER PEP",    color: C.medium },
  not_pep:       { label: "CLEAN",         color: C.clear },
};

const FATF_COLORS = {
  low: C.clear, medium: C.medium, high: C.high, very_high: C.critical, unknown: C.sub,
};

const REL_LABELS = {
  employer: "Employer", family_member: "Family", business_partner: "Partner",
  board_member: "Board", shareholder: "Shareholder", legal_counsel: "Counsel",
  donor_recipient: "Donor", other: "Other",
};

// Severity by flag index — mirrors pdf_generator.py: 0–1 CRITICAL,
// 2–3 HIGH, 4+ MEDIUM. Keep the two surfaces consistent.
const flagSeverity = (i) =>
  i < 2 ? { label: "CRITICAL", color: C.critical }
  : i < 4 ? { label: "HIGH", color: C.high }
  : { label: "MEDIUM", color: C.medium };

// ── Animated counter (Blueprint §10 timing contract) ───────────────────
function useCountUp(target, duration = 1400, delay = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    let raf;
    const timeout = setTimeout(() => {
      const step = (ts) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(ease * target * 10) / 10);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => { clearTimeout(timeout); cancelAnimationFrame(raf); };
  }, [target, duration, delay]);
  return val;
}

// ── GaugeArc — GI score dial, count-up 1600ms / 300ms delay ────────────
// Form per ui-ux-pro-max chart DB ("Performance vs Target", AA): single-KPI
// gauge with clearly differentiated threshold zones, value + regime always
// visible as text, screen-reader summary on the SVG, reduced-motion respected.
// Zone colors are the Blueprint §10 severity palette — they override the
// skill's suggested palette.
const GI_ZONES = [
  { from: 0,  to: 40,  color: C.clear,    label: "LOW" },
  { from: 40, to: 70,  color: C.medium,   label: "MEDIUM" },
  { from: 70, to: 100, color: C.critical, label: "HIGH" },
];

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function GaugeArc({ value, size = 210 }) {
  const reduced = prefersReducedMotion();
  const animated = useCountUp(value, reduced ? 0 : 1600, reduced ? 0 : 300);
  const r = 84;
  const cx = size / 2;
  const cy = size / 2 + 8;
  const startAngle = -210;
  const totalArc = 240;
  const angleOf = (v) => startAngle + totalArc * (v / 100);
  const toRad = (d) => (d * Math.PI) / 180;
  const polar = (angle, radius) => ({
    x: cx + radius * Math.cos(toRad(angle)),
    y: cy + radius * Math.sin(toRad(angle)),
  });
  const arcPath = (from, to, radius) => {
    const s = polar(from, radius);
    const e = polar(to, radius);
    const large = to - from > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const zone = GI_ZONES.find((z) => animated < z.to) || GI_ZONES[GI_ZONES.length - 1];
  const fillEnd = Math.max(angleOf(animated), startAngle + 0.1);
  const ZONE_GAP = 2.5; // degrees of breathing room between regime segments

  return (
    <svg
      width={size}
      height={size * 0.85}
      viewBox={`0 0 ${size} ${size * 0.85}`}
      role="img"
      aria-label={`Governance Intensity ${value.toFixed(0)} of 100 — ${zone.label} regime. Thresholds: medium at 40, high at 70.`}
    >
      <defs>
        <filter id="gaugeGlow">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Regime zone track — three differentiated segments, severity palette */}
      {GI_ZONES.map((z, i) => (
        <path
          key={z.label}
          d={arcPath(
            angleOf(z.from) + (i > 0 ? ZONE_GAP : 0),
            angleOf(z.to) - (i < GI_ZONES.length - 1 ? ZONE_GAP : 0),
            r
          )}
          fill="none"
          stroke={z.color}
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.32"
        />
      ))}

      {/* Progress fill in the active regime color, inset under the track.
          The rounded terminus is the position indicator — no needle to
          collide with the value text. */}
      <path d={arcPath(startAngle, angleOf(100), r - 12)} fill="none" stroke="#1e2535" strokeWidth="10" strokeLinecap="round" />
      <path d={arcPath(startAngle, fillEnd, r - 12)} fill="none" stroke={zone.color} strokeWidth="10" strokeLinecap="round" filter="url(#gaugeGlow)" />

      {/* Threshold ticks + scale labels at regime boundaries */}
      {[0, 40, 70, 100].map((v) => {
        const a = angleOf(v);
        const inner = polar(a, r + 7);
        const outer = polar(a, r + 13);
        const label = polar(a, r + 23);
        const boundary = v === 40 || v === 70;
        return (
          <g key={v}>
            <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={boundary ? C.sub : C.muted} strokeWidth={boundary ? 2 : 1.5} />
            <text x={label.x} y={label.y + 3} textAnchor="middle" fill={boundary ? C.sub : C.muted} fontSize="8" fontFamily="'DM Mono', monospace">{v}</text>
          </g>
        );
      })}

      {/* Value + regime — always visible as text, never color-only */}
      <text x={cx} y={cy} textAnchor="middle" fill={zone.color} fontSize="38" fontFamily="'DM Mono', monospace" fontWeight="500">
        {animated.toFixed(0)}<tspan fontSize="13" fill={C.muted}> /100</tspan>
      </text>
      <text x={cx} y={cy + 19} textAnchor="middle" fill={zone.color} fontSize="10" fontFamily="'DM Mono', monospace" letterSpacing="2">{zone.label}</text>
      <text x={cx} y={cy + 34} textAnchor="middle" fill={C.muted} fontSize="8" fontFamily="'DM Mono', monospace" letterSpacing="1.5">GOVERNANCE INTENSITY</text>
    </svg>
  );
}

// ── Pathway row (connections tab) ──────────────────────────────────────
function PathwayRow({ distance, label, role, active }) {
  const c = DISTANCE_COLOR[distance] || C.sub;
  return (
    <div className="eq-row-hover" style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "8px 8px", borderRadius: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, marginTop: 5, boxShadow: `0 0 8px ${c}`, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontFamily: FONT_MONO, color: C.text, fontWeight: 500 }}>
          {label}
          {!active && <span style={{ color: C.muted, marginLeft: 8, fontSize: 9 }}>INACTIVE</span>}
        </div>
        <div style={{ fontSize: 10, color: C.sub, marginTop: 2, lineHeight: 1.45 }}>{role}</div>
      </div>
      <span style={{ marginLeft: "auto", flexShrink: 0, fontSize: 9, color: c, fontFamily: FONT_MONO, border: `1px solid ${c}33`, padding: "2px 8px", borderRadius: 3 }}>
        D-{distance}
      </span>
    </div>
  );
}

// ── Tiny seeded PRNG — keeps the initial graph layout stable across renders ──
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── useForceSimulation — minimal force-directed layout (no d3 dependency) ──
// Repulsion (Coulomb) + edge springs + center gravity, cooled over time.
// Dragging pins a node at the pointer and reheats the simulation.
function useForceSimulation(nodeDefs, edgeDefs, width, height) {
  const [, bump] = useState(0);
  const rerender = () => bump((x) => x + 1);

  const key = nodeDefs.map((n) => n.id).join("|");
  const simRef = useRef(null);
  if (!simRef.current || simRef.current.key !== key) {
    const rand = mulberry32(1337);
    const nodes = nodeDefs.map((def, i) => {
      const angle = (i / nodeDefs.length) * Math.PI * 2;
      const radius = def.kind === "subject" ? 0 : 90 + rand() * 50;
      return {
        ...def,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0, vy: 0,
      };
    });
    simRef.current = { key, nodes, alpha: 1, dragId: null };
  }

  useEffect(() => {
    let raf;
    const sim = simRef.current;

    const tick = () => {
      sim.alpha = sim.dragId
        ? Math.min(1, sim.alpha + 0.06)
        : Math.max(0, sim.alpha - 0.012);

      const { nodes } = sim;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = Math.max(dx * dx + dy * dy, 1);
          const force = (2400 * sim.alpha) / d2;
          const d = Math.sqrt(d2);
          const fx = (dx / d) * force, fy = (dy / d) * force;
          a.vx += fx; a.vy += fy;
          b.vx -= fx; b.vy -= fy;
        }
      }
      for (const e of edgeDefs) {
        const a = nodes.find((n) => n.id === e.source);
        const b = nodes.find((n) => n.id === e.target);
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const diff = (d - e.length) * 0.045 * sim.alpha;
        const fx = (dx / d) * diff, fy = (dy / d) * diff;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }
      for (const n of nodes) {
        if (n.id === sim.dragId) { n.vx = 0; n.vy = 0; continue; }
        n.vx += (width / 2 - n.x) * 0.0015;
        n.vy += (height / 2 - n.y) * 0.0015;
        n.vx *= 0.78; n.vy *= 0.78;
        n.x += n.vx; n.y += n.vy;
        const pad = n.r + 14;
        n.x = Math.min(width - pad, Math.max(pad, n.x));
        n.y = Math.min(height - pad, Math.max(pad, n.y));
      }

      rerender();
      if (sim.alpha > 0.01 || sim.dragId) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key, width, height]);

  return {
    nodes: simRef.current.nodes,
    pin(id, x, y) {
      const n = simRef.current.nodes.find((nd) => nd.id === id);
      if (n) { n.x = x; n.y = y; n.vx = 0; n.vy = 0; }
      simRef.current.dragId = id;
      rerender();
    },
    release() { simRef.current.dragId = null; },
  };
}

// ── NetworkGraph — Neo4j pathway visualization ──────────────────────────
// Graph rules (Blueprint §10): subject = Primary Blue, larger radius ·
// PEP nodes = Critical Red, always · D-3 edges dashed · edge labels in
// #0d1420 pills, centered · node labels DM Mono 9px.
function NetworkGraph({ connections, companies, verifications, subjectName }) {
  const W = 560, H = 420;
  const svgRef = useRef(null);
  const dragId = useRef(null);
  const distWidth = { 1: 2.4, 2: 1.4, 3: 1.4 };

  const { nodeDefs, edgeDefs } = useMemo(() => {
    const nd = [{ id: "subject", kind: "subject", label: (subjectName || "SUBJECT").split(" ")[0], r: 28 }];
    const ed = [];
    (connections || []).forEach((c, i) => {
      const id = `pc${i}`;
      nd.push({
        id, kind: "connection", label: c.person_name, sub: c.jurisdiction,
        r: 19, isPep: c.is_pep_direct,
      });
      ed.push({
        source: "subject", target: id, distance: c.pathway_distance,
        color: DISTANCE_COLOR[c.pathway_distance] || C.sub,
        length: 100 + c.pathway_distance * 36,
      });
    });
    (companies || []).forEach((co, i) => {
      const id = `co${i}`;
      const v = (verifications || []).find((x) => x.company_name === co.company_name);
      nd.push({
        id, kind: "company", label: co.company_name, sub: co.registration_country,
        r: 17, offshore: co.is_offshore_flag, verified: v?.verified, share: co.share_percentage,
      });
      ed.push({
        source: "subject", target: id, color: "#3a4a63",
        length: 150, share: co.share_percentage,
      });
    });
    return { nodeDefs: nd, edgeDefs: ed };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections, companies, verifications, subjectName]);

  const { nodes, pin, release } = useForceSimulation(nodeDefs, edgeDefs, W, H);
  const byId = (id) => nodes.find((n) => n.id === id);

  const toLocal = (evt) => {
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: ((evt.clientX - rect.left) / rect.width) * W,
      y: ((evt.clientY - rect.top) / rect.height) * H,
    };
  };

  const nodeColor = (n) => {
    if (n.kind === "subject") return C.primary;
    if (n.kind === "connection") return n.isPep ? C.critical : C.clear;
    return n.offshore ? C.high : C.steel; // offshore vehicles escalate to HIGH
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: "auto", display: "block", touchAction: "none" }}
      onPointerMove={(e) => { if (dragId.current) { const { x, y } = toLocal(e); pin(dragId.current, x, y); } }}
      onPointerUp={(e) => { if (dragId.current) { svgRef.current.releasePointerCapture?.(e.pointerId); dragId.current = null; release(); } }}
      onPointerLeave={() => { if (dragId.current) { dragId.current = null; release(); } }}
    >
      <defs>
        <filter id="ngGlow"><feGaussianBlur stdDeviation="2.6" /></filter>
      </defs>

      {edgeDefs.map((e, i) => {
        const a = byId(e.source), b = byId(e.target);
        if (!a || !b) return null;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const isPathway = e.distance != null;
        const label = isPathway ? `D-${e.distance}` : `${e.share}%`;
        const pillW = isPathway ? 28 : 34;
        return (
          <g key={`e${i}`}>
            <line
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={e.color}
              strokeWidth={isPathway ? distWidth[e.distance] : 1.3}
              strokeDasharray={e.distance === 3 ? "5 5" : "0"}
              opacity={isPathway ? 0.75 : 0.4}
            />
            <rect x={mx - pillW / 2} y={my - 9} width={pillW} height="18" rx="4" fill={C.card} stroke={e.color} strokeWidth="1" opacity={isPathway ? 1 : 0.8} />
            <text x={mx} y={my + 4} textAnchor="middle" fill={e.color} fontSize="9" fontFamily="'DM Mono', monospace" fontWeight="500">{label}</text>
          </g>
        );
      })}

      {nodes.map((n) => {
        const col = nodeColor(n);
        const isSubject = n.kind === "subject";
        const nm = n.label && n.label.length > 18 ? n.label.slice(0, 17) + "…" : n.label;
        const labelY = n.y + n.r + 13;
        return (
          <g
            key={n.id}
            style={{ cursor: "grab" }}
            onPointerDown={(e) => {
              e.preventDefault();
              dragId.current = n.id;
              svgRef.current.setPointerCapture?.(e.pointerId);
              pin(n.id, n.x, n.y);
            }}
          >
            {isSubject && <circle cx={n.x} cy={n.y} r={n.r + 5} fill={`${C.primary}22`} filter="url(#ngGlow)" />}
            <circle cx={n.x} cy={n.y} r={n.r} fill={`${col}22`} stroke={col} strokeWidth={isSubject ? 2.4 : 1.6} />
            {isSubject && <text x={n.x} y={n.y - 1} textAnchor="middle" fill={C.steel} fontSize="9" fontFamily="'DM Mono', monospace" fontWeight="500">SUBJECT</text>}
            {n.kind === "connection" && n.isPep && <text x={n.x} y={n.y + 3} textAnchor="middle" fill={col} fontSize="8" fontFamily="'DM Mono', monospace" fontWeight="500">PEP</text>}
            {n.kind === "company" && n.offshore && <text x={n.x} y={n.y + 3} textAnchor="middle" fill={col} fontSize="7" fontFamily="'DM Mono', monospace" fontWeight="500">OFFSHORE</text>}
            <text x={n.x} y={isSubject ? n.y + 11 : labelY} textAnchor="middle" fill={C.text} fontSize="9" fontFamily="'DM Mono', monospace">{nm}</text>
            {!isSubject && <text x={n.x} y={labelY + 11} textAnchor="middle" fill="#56657f" fontSize="7.5" fontFamily="'DM Mono', monospace">{n.sub}</text>}
          </g>
        );
      })}
    </svg>
  );
}

// ── Distance legend (shared by connections + network tabs) ─────────────
function DistanceLegend() {
  const rows = [
    [1, C.critical, "Direct connection", "Subject personally connected"],
    [2, C.high, "1 intermediary", "Connected via one entity"],
    [3, C.medium, "2 intermediaries", "Connected via two entities — dashed edge, lower certainty"],
  ];
  return (
    <>
      {rows.map(([d, c, lbl, desc]) => (
        <div key={d} style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "flex-start" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: c + "1a", border: `1px solid ${c}55`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontFamily: FONT_MONO, color: c, fontWeight: 500 }}>{d}</span>
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.text, fontWeight: 500 }}>{lbl}</div>
            <div style={{ fontSize: 10, color: C.sub, marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Indicative factor decomposition — derived from the profile so the
// breakdown tracks real data instead of hardcoded demo values.
function deriveFactors(p) {
  const pepPts = { direct_pep: 30, family_pep: 25, associate_pep: 18, former_pep: 10, not_pep: 0 }[p.pep_status] ?? 0;
  const offshore = (p.associated_companies || []).some((c) => c.is_offshore_flag) ? 20 : 0;
  const procurementEur = (p.associated_companies || []).reduce((s, c) => s + (c.procurement_value_eur || 0), 0);
  const procurement = Math.min(25, Math.round(procurementEur / 1_000_000) * 3);
  const network = Math.min(
    25,
    (p.political_connections || []).reduce((s, c) => s + ({ 1: 10, 2: 5, 3: 2 }[c.pathway_distance] || 0), 0)
  );
  return [
    ["PEP Status", pepPts, 30, C.critical],
    ["Offshore Exposure", offshore, 20, C.high],
    ["Procurement Conflict", procurement, 25, C.medium],
    ["Political Network", network, 25, C.steel],
  ];
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════

export default function EuroQuantDashboard({ data = demoData, isDemo = true }) {
  const p = data.profile;
  const mp = useCountUp(p.market_percentile, 1400, 600);
  const riskLevel = giLevel(p.governance_intensity);
  const pep = PEP_LABELS[p.pep_status] || PEP_LABELS.not_pep;
  const totalProcurement = p.associated_companies.reduce((s, c) => s + (c.procurement_value_eur || 0), 0);
  const factors = useMemo(() => deriveFactors(p), [p]);
  const [activeTab, setActiveTab] = useState("overview");

  const ts = new Date(data.processing_timestamp);
  const tsStr =
    ts.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " + ts.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) + " UTC";

  const verifications = data.reference_check?.company_verifications || [];
  const unverified = verifications.filter((v) => !v.verified).length;
  const sourceStatus = (src) => {
    if (src === "OPENCORPORATES") {
      return unverified > 0
        ? { color: C.medium, label: `${unverified} UNVERIFIED` }
        : { color: C.clear, label: "✓ VERIFIED" };
    }
    return (data.reference_check?.sanctions_hits || []).length > 0
      ? { color: C.critical, label: "⚠ HIT" }
      : { color: C.clear, label: "✓ CLEAR" };
  };

  return (
    <div style={D.root}>
      {/* ── Topbar ── */}
      <div style={D.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={D.logo}>EUROQUANT</span>
          <span style={{ color: "#1e2535", fontSize: 12 }}>|</span>
          <span style={{ fontSize: 10, color: C.muted, fontFamily: FONT_MONO, letterSpacing: "0.15em" }}>RISK TERMINAL</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isDemo
            ? <span style={badge(C.medium)}>SYNTHETIC DEMO</span>
            : <span style={badge(C.clear)}>● LIVE ANALYSIS</span>}
          <span style={{ fontSize: 10, color: C.muted, fontFamily: FONT_MONO }}>{data.extractor_version}</span>
        </div>
      </div>

      {/* ── Audit strip — Blueprint §10 exact audit copy ── */}
      <div style={D.auditStrip}>
        SHA-256: {data.document_hash || "—"} · Processed {tsStr}
        {data.used_ocr_fallback ? " · OCR FALLBACK" : ""}
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px 0" }}>

        {/* ── Subject header ── */}
        <div className="eq-fade" style={{ "--d": "50ms", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={D.label}>Due Diligence Subject</div>
              <h1 style={D.subjectName}>{p.full_name}</h1>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={badge(pep.color)}>{pep.label}</span>
                {p.sanctions_hit
                  ? <span style={badge(C.critical)}>⚠ SANCTIONS HIT</span>
                  : <span style={badge(C.clear)}>✓ SANCTIONS CLEAR</span>}
                <span style={badge(C.steel)}>ID: {p.founder_id}</span>
                <span style={{ fontSize: 10, color: C.muted, fontFamily: FONT_MONO }}>{p.nationality}</span>
              </div>
            </div>
            <div
              className="eq-verdict"
              style={{
                "--pulse-color": riskLevel.color + "33",
                background: riskLevel.bg,
                border: `1px solid ${riskLevel.color}44`,
                borderRadius: 10,
                padding: "16px 24px",
                textAlign: "center",
                minWidth: 160,
              }}
            >
              <div style={{ fontSize: 8, fontFamily: FONT_MONO, color: riskLevel.color, letterSpacing: "0.2em", marginBottom: 4 }}>JARVIS VERDICT</div>
              <div style={{ fontSize: 17, fontWeight: 500, color: riskLevel.color, fontFamily: FONT_MONO }}>{riskLevel.label}</div>
              <div style={{ fontSize: 9, color: riskLevel.color + "99", marginTop: 3, fontFamily: FONT_MONO }}>
                {p.governance_intensity >= 70 ? "ENHANCED DD REQUIRED" : p.governance_intensity >= 40 ? "CAUTION" : "CLEARED FOR REVIEW"}
              </div>
            </div>
          </div>
        </div>

        {/* ── Score row ── */}
        <div className="eq-fade" style={{ "--d": "120ms", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          <div className="eq-card-hover" style={{ ...card({ padding: "20px 24px 16px" }), gridColumn: "span 2", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", width: "100%" }}>
              <span style={D.label}>Governance Intensity Score</span>
              <span style={{ fontSize: 8, color: C.muted, fontFamily: FONT_MONO, letterSpacing: "0.1em" }}>
                THRESHOLDS 40 / 70 · FATF-ALIGNED
              </span>
            </div>
            <div style={{ alignSelf: "center" }}>
              <GaugeArc value={p.governance_intensity} size={210} />
            </div>
            {/* Regime strip — active regime highlighted; text + color, never color alone */}
            <div style={{ display: "flex", gap: 8, width: "100%", marginTop: 4 }}>
              {GI_ZONES.map((z) => {
                const active = z === (GI_ZONES.find((x) => p.governance_intensity < x.to) || GI_ZONES[2]);
                return (
                  <div
                    key={z.label}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      padding: "5px 0 4px",
                      borderRadius: 5,
                      border: `1px solid ${active ? z.color + "55" : C.border}`,
                      background: active ? z.color + "12" : "transparent",
                    }}
                  >
                    <div style={{ fontSize: 8, color: active ? z.color : C.muted, fontFamily: FONT_MONO, letterSpacing: "0.15em" }}>
                      {z.label}{active ? " ●" : ""}
                    </div>
                    <div style={{ fontSize: 8, color: C.muted, fontFamily: FONT_MONO, marginTop: 1 }}>
                      {z.from}–{z.to}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="eq-card-hover" style={{ ...card(), display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={D.label}>Market Percentile</div>
            <div>
              <div style={{ fontSize: 44, fontFamily: FONT_MONO, fontWeight: 500, color: riskLevel.color, lineHeight: 1 }}>
                {mp.toFixed(0)}<span style={{ fontSize: 18 }}>th</span>
              </div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 6, fontFamily: FONT_MONO }}>
                {data.benchmark_source === "neo4j_distribution"
                  ? `PORTFOLIO N=${data.benchmark_cohort_size}`
                  : "FATF/EBA COLD-START"}
              </div>
            </div>
            <div>
              <div style={{ background: C.border, borderRadius: 3, height: 4, marginTop: 12 }}>
                <div style={{ width: `${p.market_percentile}%`, height: "100%", background: `linear-gradient(90deg, ${C.clear}, ${C.critical})`, borderRadius: 3, transition: "width 1.4s cubic-bezier(0.16,1,0.3,1)" }} />
              </div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 5 }}>vs European VC/PE market</div>
            </div>
          </div>

          <div className="eq-card-hover" style={{ ...card(), display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              ["Confidence", `${(data.extraction_confidence * 100).toFixed(0)}%`, C.steel],
              ["Procurement", fmt(totalProcurement), C.high],
              ["Companies", p.associated_companies.length, C.text],
              ["Connections", p.political_connections.length, C.text],
            ].map(([lbl, val, col]) => (
              <div key={lbl} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, color: C.sub }}>{lbl}</span>
                <span style={{ fontSize: 13, fontFamily: FONT_MONO, color: col, fontWeight: 500 }}>{val}</span>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: C.sub }}>Neo4j</span>
              <span style={{ fontSize: 10, fontFamily: FONT_MONO, color: data.neo4j_persisted ? C.clear : C.medium }}>
                {data.neo4j_persisted ? "● PERSISTED" : "○ LOCAL"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Tabs — active state Primary Blue (Blueprint §10) ── */}
        <div className="eq-fade" style={{ "--d": "180ms", display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {["overview", "companies", "connections", "network", "flags"].map((t) => (
            <button key={t} className={`eq-tab${activeTab === t ? " eq-tab-active" : ""}`} style={D.tab(activeTab === t)} onClick={() => setActiveTab(t)}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="eq-fade" style={{ "--d": "240ms" }}>

          {activeTab === "overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="eq-card-hover" style={{ ...card({ borderLeft: `3px solid ${riskLevel.color}` }), gridColumn: "span 2" }}>
                <div style={D.sectionTitle}>Analyst Assessment</div>
                <p style={{ fontSize: 12.5, lineHeight: 1.75, color: C.sub, margin: 0 }}>{p.analyst_notes}</p>
              </div>

              <div className="eq-card-hover" style={card()}>
                <div style={D.sectionTitle}>Reference Layer</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {(data.reference_check?.sources_checked || []).map((src) => {
                    const st = sourceStatus(src);
                    return (
                      <div key={src} className="eq-row-hover" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 8px", borderRadius: 6 }}>
                        <span style={{ fontSize: 11, fontFamily: FONT_MONO, color: C.sub }}>{src}</span>
                        <span style={badge(st.color)}>{st.label}</span>
                      </div>
                    );
                  })}
                </div>
                {(data.reference_check?.errors || []).map((err, i) => (
                  <div key={i} style={{ marginTop: 12, padding: "8px 12px", background: `${C.medium}0c`, border: `1px solid ${C.medium}26`, borderRadius: 6, fontSize: 10, color: C.sub, lineHeight: 1.5 }}>
                    {err}
                  </div>
                ))}
              </div>

              <div className="eq-card-hover" style={card()}>
                <div style={D.sectionTitle}>Score Decomposition</div>
                {factors.map(([lbl, val, max, col]) => (
                  <div key={lbl} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: C.sub }}>{lbl}</span>
                      <span style={{ fontSize: 10, fontFamily: FONT_MONO, color: col }}>{val}/{max}</span>
                    </div>
                    <div style={{ background: C.border, borderRadius: 2, height: 3 }}>
                      <div style={{ width: `${(val / max) * 100}%`, height: "100%", background: col, borderRadius: 2, transition: "width 1s cubic-bezier(0.16,1,0.3,1)" }} />
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: 8, color: C.muted, fontFamily: FONT_MONO, letterSpacing: "0.1em", marginTop: 8 }}>
                  INDICATIVE FACTOR DECOMPOSITION
                </div>
              </div>
            </div>
          )}

          {activeTab === "companies" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {p.associated_companies.map((c, i) => {
                const rail = c.is_offshore_flag ? C.high : !c.active_status ? C.muted : FATF_COLORS[c.fatf_risk_level] || C.border;
                const v = verifications.find((x) => x.company_name === c.company_name);
                return (
                  <div key={i} className="eq-card-hover" style={{ ...card({ borderLeft: `3px solid ${rail}` }), display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "start" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>{c.company_name}</span>
                        {c.is_offshore_flag && <span style={badge(C.high)}>OFFSHORE</span>}
                        {c.defense_gov_tech_sector && <span style={badge(C.steel)}>DEFENSETECH</span>}
                        {!c.active_status && <span style={badge(C.muted)}>DISSOLVED</span>}
                        {v && !v.verified && <span style={badge(C.medium)}>UNVERIFIED</span>}
                      </div>
                      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                        {[
                          ["COUNTRY", c.registration_country, C.sub],
                          ["STAKE", `${c.share_percentage}%`, C.sub],
                          ["INCORPORATED", c.incorporation_date || "—", C.sub],
                          ["FATF", c.fatf_risk_level.toUpperCase().replace("_", " "), FATF_COLORS[c.fatf_risk_level]],
                        ].map(([l, val, col]) => (
                          <div key={l}>
                            <div style={{ fontSize: 8, color: C.muted, fontFamily: FONT_MONO, letterSpacing: "0.15em" }}>{l}</div>
                            <div style={{ fontSize: 11, color: col, fontFamily: FONT_MONO, marginTop: 2 }}>{val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {c.public_procurement_exposure && c.procurement_value_eur && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 8, color: C.high, fontFamily: FONT_MONO, letterSpacing: "0.15em" }}>PROCUREMENT</div>
                        <div style={{ fontSize: 19, fontFamily: FONT_MONO, fontWeight: 500, color: C.high, marginTop: 2 }}>{fmt(c.procurement_value_eur)}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "connections" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="eq-card-hover" style={card()}>
                <div style={D.sectionTitle}>Political Network</div>
                {p.political_connections.map((pc, i) => (
                  <PathwayRow
                    key={i}
                    distance={pc.pathway_distance}
                    label={pc.person_name}
                    role={`${REL_LABELS[pc.relationship_type] || pc.relationship_type} · ${pc.jurisdiction} · ${pc.role_title}`}
                    active={pc.still_active}
                  />
                ))}
              </div>
              <div className="eq-card-hover" style={card()}>
                <div style={D.sectionTitle}>Pathway Distance</div>
                <DistanceLegend />
                <div style={{ marginTop: 16, padding: "12px 12px", background: C.canvas, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 8, color: C.muted, fontFamily: FONT_MONO, marginBottom: 8, letterSpacing: "0.2em" }}>NEO4J GRAPH</div>
                  <div style={{ fontSize: 11, color: C.sub, fontFamily: FONT_MONO }}>
                    {p.political_connections.filter((c) => c.pathway_distance === 1).length} direct ·{" "}
                    {p.political_connections.filter((c) => c.pathway_distance > 1).length} indirect ·{" "}
                    {p.political_connections.filter((c) => c.is_pep_direct).length} PEP nodes
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "network" && (
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
              <div className="eq-card-hover" style={card()}>
                <div style={D.sectionTitle}>Neo4j Pathway Graph</div>
                <div style={{ fontSize: 9, color: "#56657f", fontFamily: FONT_MONO, letterSpacing: "0.1em", marginBottom: 8 }}>
                  DRAG NODES TO EXPLORE · FORCE-DIRECTED LAYOUT
                </div>
                <NetworkGraph
                  connections={p.political_connections}
                  companies={p.associated_companies}
                  verifications={verifications}
                  subjectName={p.full_name}
                />
              </div>
              <div className="eq-card-hover" style={card()}>
                <div style={D.sectionTitle}>Distance Legend</div>
                <DistanceLegend />
                <div style={{ marginTop: 16, padding: "12px 12px", background: C.canvas, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 8, color: C.muted, fontFamily: FONT_MONO, marginBottom: 8, letterSpacing: "0.2em" }}>NODE KEY</div>
                  {[[C.primary, "Subject (larger radius)"], [C.critical, "PEP — always red"], [C.high, "Offshore vehicle"], [C.steel, "Company"], [C.clear, "Non-PEP contact"]].map(([col, lbl]) => (
                    <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: col, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: C.sub }}>{lbl}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "flags" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {p.risk_flags.map((flag, i) => {
                const sev = flagSeverity(i);
                return (
                  <div key={i} className="eq-card-hover" style={{ ...card({ borderLeft: `3px solid ${sev.color}`, padding: "16px 20px" }), display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 80 }}>
                      <span style={badge(sev.color)}>{sev.label}</span>
                    </div>
                    <p style={{ fontSize: 11.5, lineHeight: 1.65, color: C.sub, margin: 0 }}>{flag}</p>
                  </div>
                );
              })}
              <div style={{ ...card({ borderColor: `${C.steel}33`, marginTop: 8 }) }}>
                <div style={D.sectionTitle}>Processing Metadata</div>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                  {[
                    ["EXTRACTOR", data.extractor_version],
                    ["CONFIDENCE", `${(data.extraction_confidence * 100).toFixed(0)}%`],
                    ["SHA-256", (data.document_hash || "—").slice(0, 24) + "…"],
                    ["OCR FALLBACK", data.used_ocr_fallback ? "YES" : "NO"],
                    ["BENCHMARK", data.benchmark_source === "neo4j_distribution" ? `NEO4J N=${data.benchmark_cohort_size}` : "FATF COLD-START"],
                  ].map(([l, val]) => (
                    <div key={l}>
                      <div style={{ fontSize: 8, color: C.muted, fontFamily: FONT_MONO, letterSpacing: "0.15em" }}>{l}</div>
                      <div style={{ fontSize: 11, fontFamily: FONT_MONO, color: C.sub, marginTop: 4 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════

const D = {
  root: {
    minHeight: "100vh",
    background: `
      radial-gradient(900px 600px at 12% -5%, #0b2a6b22, transparent 60%),
      radial-gradient(800px 600px at 100% 8%, #00204f33, transparent 55%),
      ${C.canvas}`,
    color: C.text,
    fontFamily: FONT_DISPLAY,
    paddingBottom: 60,
  },
  topbar: {
    borderBottom: `1px solid ${C.border}`,
    padding: "12px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#0a0f1a",
  },
  logo: {
    fontFamily: FONT_MONO,
    fontSize: 13,
    letterSpacing: "0.22em",
    color: C.steel,
    fontWeight: 500,
  },
  auditStrip: {
    fontFamily: FONT_MONO,
    fontSize: 9,
    letterSpacing: "0.08em",
    color: C.muted,
    background: "#0a0f1a",
    borderBottom: `1px solid ${C.border}`,
    padding: "8px 32px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  label: {
    fontFamily: FONT_MONO,
    fontSize: 8,
    letterSpacing: "0.2em",
    color: C.muted,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  subjectName: {
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: C.bright,
    margin: "0 0 8px 0",
    fontFamily: FONT_DISPLAY,
  },
  sectionTitle: {
    fontFamily: FONT_MONO,
    fontSize: 8,
    letterSpacing: "0.2em",
    color: C.muted,
    textTransform: "uppercase",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottom: `1px solid ${C.border}`,
  },
  tab: (active) => ({
    fontFamily: FONT_MONO,
    fontSize: 10,
    letterSpacing: "0.12em",
    color: active ? C.bright : C.muted,
    background: active ? C.primary : "transparent",
    border: active ? `1px solid ${C.primary}` : `1px solid ${C.border}`,
    padding: "8px 16px",
    borderRadius: 5,
    cursor: "pointer",
  }),
};
