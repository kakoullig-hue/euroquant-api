import { useState, useEffect, useRef, useMemo } from "react";

// ── Sample data — paste your Jarvis JSON output here ──────────────────
const JARVIS_OUTPUT = {
  "profile": {
    "founder_id": "FND-SYNTH-BALT-014",
    "full_name": "Kaspars Veidemanis",
    "nationality": "LV",
    "pep_status": "associate_pep",
    "sanctions_hit": false,
    "sanctions_list_source": null,
    "associated_companies": [
      {
        "company_name": "Nordhaven Maritime Autonomy AS",
        "registration_country": "EE",
        "is_offshore_flag": false,
        "fatf_risk_level": "low",
        "share_percentage": 58.0,
        "active_status": true,
        "incorporation_date": "2020-02-18",
        "public_procurement_exposure": true,
        "procurement_value_eur": 6200000.0,
        "defense_gov_tech_sector": true
      },
      {
        "company_name": "Baltic Nominee Holdings Ltd",
        "registration_country": "VG",
        "is_offshore_flag": true,
        "fatf_risk_level": "high",
        "share_percentage": 100.0,
        "active_status": true,
        "incorporation_date": "2018-09-30",
        "public_procurement_exposure": false,
        "procurement_value_eur": null,
        "defense_gov_tech_sector": false
      },
      {
        "company_name": "Riga DeepSensor SIA",
        "registration_country": "LV",
        "is_offshore_flag": false,
        "fatf_risk_level": "low",
        "share_percentage": 34.0,
        "active_status": true,
        "incorporation_date": "2021-05-11",
        "public_procurement_exposure": true,
        "procurement_value_eur": 1100000.0,
        "defense_gov_tech_sector": true
      },
      {
        "company_name": "Kurzeme Defence Logistics SIA",
        "registration_country": "LV",
        "is_offshore_flag": false,
        "fatf_risk_level": "medium",
        "share_percentage": 50.0,
        "active_status": false,
        "incorporation_date": "2016-04-02",
        "public_procurement_exposure": false,
        "procurement_value_eur": null,
        "defense_gov_tech_sector": true
      }
    ],
    "political_connections": [
      {
        "person_name": "Andris Kalnins",
        "role_title": "Former State Secretary, Ministry of Defence (LV)",
        "relationship_type": "board_member",
        "pathway_distance": 1,
        "jurisdiction": "LV",
        "is_pep_direct": true,
        "still_active": false
      },
      {
        "person_name": "EU Defence Fund - Capability Directorate",
        "role_title": "EDF Capability Programme Office (Brussels)",
        "relationship_type": "business_partner",
        "pathway_distance": 2,
        "jurisdiction": "EU",
        "is_pep_direct": false,
        "still_active": true
      },
      {
        "person_name": "Liga Ozola",
        "role_title": "MP, National Security Committee (LV)",
        "relationship_type": "donor_recipient",
        "pathway_distance": 2,
        "jurisdiction": "LV",
        "is_pep_direct": true,
        "still_active": true
      }
    ],
    "governance_intensity": 71.0,
    "market_percentile": 88.0,
    "risk_flags": [
      "DIRECT BOARD-LEVEL PEP LINK: Former MoD State Secretary (LV) holds a non-executive board seat at Nordhaven, an active EU / Estonian defence procurement bidder (EUR 6.2M pipeline).",
      "LAYERED OFFSHORE CONTROL: 100% of founder equity routed through Baltic Nominee Holdings Ltd (BVI, FATF HIGH) - beneficial ownership obscured behind a nominee structure.",
      "INDIRECT PEP (D-2): Pathway link to a sitting MP on the National Security Committee via a political donation record - potential procurement-influence channel.",
      "DEFENCETECH DUAL-USE EXPOSURE: Autonomous maritime C2 / sensor stack is dual-use, EU Defence Fund co-financed, with NATO-adjacent supply-chain exposure.",
      "CUMULATIVE PUBLIC PROCUREMENT: EUR 7.3M across Nordhaven + Riga DeepSensor - concentration in a single Ministry-of-Defence buyer.",
      "DISSOLVED ENTITY TRAIL: Kurzeme Defence Logistics SIA dissolved 2023 holding prior MoD contracts - discontinuity in the audit trail.",
      "ADVERSE MEDIA (UNVERIFIED): 1 regional outlet alleges an undisclosed advisor relationship - single source, not corroborated."
    ],
    "analyst_notes": "ELEVATED GOVERNANCE RISK - ENHANCED DUE DILIGENCE REQUIRED before term sheet. Subject is sanctions-clear but exhibits a board-level PEP link and an offshore ownership layer that together breach institutional governance thresholds. Recommended pre-conditions: (1) confirm beneficial ownership of the BVI vehicle, (2) obtain a conflict-of-interest waiver covering MoD procurement, (3) verify the board member's post-public-office cooling-off compliance. JARVIS VERDICT: HIGH RISK / CONDITIONAL."
  },
  "processing_timestamp": "2026-06-04T09:14:08.221904+00:00",
  "document_hash": "9f2b7c41 ae08d3 55e1c9 0b6a4f2e8d7c1a93 4e5f6a7b8c9d0e1f",
  "extractor_version": "jarvis-v3.1.0",
  "extraction_confidence": 0.96,
  "used_ocr_fallback": false,
  "neo4j_persisted": true,
  "benchmark_percentile": 88.0,
  "benchmark_cohort_size": 0,
  "benchmark_source": "cold_start_fatf",
  "reference_check": {
    "checked_at": "2026-06-04T09:14:05.880210+00:00",
    "sanctions_hits": [],
    "company_verifications": [
      {
        "company_name": "Nordhaven Maritime Autonomy AS",
        "verified": true
      },
      {
        "company_name": "Riga DeepSensor SIA",
        "verified": true
      },
      {
        "company_name": "Kurzeme Defence Logistics SIA",
        "verified": true
      },
      {
        "company_name": "Baltic Nominee Holdings Ltd",
        "verified": false
      }
    ],
    "risk_delta": 6.0,
    "sources_checked": [
      "OFAC_SDN",
      "EU_CONSOLIDATED",
      "OPENCORPORATES"
    ],
    "errors": [
      "OpenCorporates: no public filing located for Baltic Nominee Holdings Ltd (VG) - jurisdiction opacity"
    ]
  }
};

// ── Utilities ──────────────────────────────────────────────────────────
const fmt = (n) =>
  n >= 1_000_000
    ? `€${(n / 1_000_000).toFixed(1)}M`
    : `€${(n / 1_000).toFixed(0)}K`;

const pepLabels = {
  direct_pep: { label: "DIRECT PEP", color: "#ff3b3b" },
  family_pep: { label: "FAMILY PEP", color: "#ff8c00" },
  associate_pep: { label: "ASSOCIATE PEP", color: "#ffb700" },
  former_pep: { label: "FORMER PEP", color: "#f0c040" },
  not_pep: { label: "CLEAN", color: "#00c896" },
};

const fatfColors = {
  low: "#00c896",
  medium: "#ffb700",
  high: "#ff8c00",
  very_high: "#ff3b3b",
  unknown: "#888",
};

const relLabels = {
  employer: "Employer",
  family_member: "Family",
  business_partner: "Partner",
  board_member: "Board",
  shareholder: "Shareholder",
  legal_counsel: "Counsel",
  other: "Other",
};

function getRiskLevel(gi) {
  if (gi >= 70) return { label: "HIGH RISK", color: "#ff3b3b", bg: "rgba(255,59,59,0.10)" };
  if (gi >= 40) return { label: "MEDIUM RISK", color: "#ffb700", bg: "rgba(255,183,0,0.10)" };
  return { label: "LOW RISK", color: "#00c896", bg: "rgba(0,200,150,0.10)" };
}

// ── Animated counter ───────────────────────────────────────────────────
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

// ── GaugeArc ───────────────────────────────────────────────────────────
function GaugeArc({ value, size = 200 }) {
  const animated = useCountUp(value, 1600, 300);
  const r = 80;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const startAngle = -210;
  const endAngle = 30;
  const totalArc = endAngle - startAngle;
  const pct = animated / 100;
  const toRad = (d) => (d * Math.PI) / 180;
  const arcPath = (from, to, radius) => {
    const s = { x: cx + radius * Math.cos(toRad(from)), y: cy + radius * Math.sin(toRad(from)) };
    const e = { x: cx + radius * Math.cos(toRad(to)), y: cy + radius * Math.sin(toRad(to)) };
    const large = to - from > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  };
  const fillEnd = startAngle + totalArc * pct;
  const riskColor = animated >= 70 ? "#ff3b3b" : animated >= 40 ? "#ffb700" : "#00c896";
  // Needle
  const needleAngle = startAngle + totalArc * pct;
  const needleLen = r - 8;
  const nx = cx + needleLen * Math.cos(toRad(needleAngle));
  const ny = cy + needleLen * Math.sin(toRad(needleAngle));

  return (
    <svg width={size} height={size * 0.72} viewBox={`0 0 ${size} ${size * 0.72}`}>
      <defs>
        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00c896" />
          <stop offset="50%" stopColor="#ffb700" />
          <stop offset="100%" stopColor="#ff3b3b" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Track */}
      <path d={arcPath(startAngle, endAngle, r)} fill="none" stroke="#1e2535" strokeWidth="14" strokeLinecap="round" />
      {/* Gradient fill */}
      <path d={arcPath(startAngle, fillEnd, r)} fill="none" stroke="url(#gaugeGrad)" strokeWidth="14" strokeLinecap="round" filter="url(#glow)" />
      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={riskColor} strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
      <circle cx={cx} cy={cy} r="5" fill={riskColor} />
      {/* Value */}
      <text x={cx} y={cy - 22} textAnchor="middle" fill={riskColor} fontSize="30" fontFamily="'DM Mono', monospace" fontWeight="700">{animated.toFixed(0)}</text>
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#4a5568" fontSize="9" fontFamily="'DM Mono', monospace" letterSpacing="2">GOVERNANCE INTENSITY</text>
    </svg>
  );
}

// ── PathwayNode ─────────────────────────────────────────────────────────
function PathwayDot({ distance, label, role, active }) {
  const colors = { 1: "#ff3b3b", 2: "#ff8c00", 3: "#ffb700" };
  const c = colors[distance] || "#888";
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: c, marginTop: 4, boxShadow: `0 0 8px ${c}` }} />
      </div>
      <div>
        <div style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: "#e2e8f0", fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 10, color: "#4a5568", marginTop: 1 }}>{role}</div>
      </div>
      <div style={{ marginLeft: "auto", fontSize: 9, color: c, fontFamily: "'DM Mono', monospace", border: `1px solid ${c}33`, padding: "1px 6px", borderRadius: 3 }}>D-{distance}</div>
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
// Dragging a node pins it at the pointer and reheats the simulation so
// neighbors settle around the new position — this is what makes the graph feel
// "alive" without pulling in a heavyweight physics library.
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

      // Coulomb repulsion — keeps nodes from overlapping
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
      // Edge springs — pull connected nodes toward their target distance
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
      // Integrate — gravity toward center, damping, bounds
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

// ── NetworkGraph — Neo4j pathway visualization (Brand Identity §04) ──────
// Interactive, force-directed: subject + political connections + controlled
// companies, rendered straight to SVG with a lightweight in-house simulation
// (no charting library — keeps the dashboard a single-file JSX component).
function NetworkGraph({ connections, companies, verifications, subjectName }) {
  const W = 560, H = 420;
  const svgRef = useRef(null);
  const dragId = useRef(null);
  const distColor = { 1: "#ff3b3b", 2: "#ff8c00", 3: "#ffb700" };
  const distWidth = { 1: 2.4, 2: 1.4, 3: 1.4 };

  // Build node + edge definitions once per data change — identity stability
  // is what lets useForceSimulation keep its running layout across re-renders.
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
        color: distColor[c.pathway_distance] || "#888",
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
    if (n.kind === "subject") return "#003399";
    if (n.kind === "connection") return n.isPep ? "#ff3b3b" : "#00c896";
    return "#ff8c00"; // company nodes — Brand §04 risk palette
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

      {/* edges — drawn first so nodes sit on top */}
      {edgeDefs.map((e, i) => {
        const a = byId(e.source), b = byId(e.target);
        if (!a || !b) return null;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const isPathway = e.distance != null;
        const label = isPathway ? `D-${e.distance}` : `${e.share}%`;
        const pillW = isPathway ? 28 : 32;
        return (
          <g key={`e${i}`}>
            <line
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={e.color}
              strokeWidth={isPathway ? distWidth[e.distance] : 1.3}
              strokeDasharray={e.distance === 3 ? "5 5" : "0"}
              opacity={isPathway ? 0.75 : 0.4}
            />
            <rect x={mx - pillW / 2} y={my - 9} width={pillW} height="18" rx="4" fill="#0d1420" stroke={e.color} strokeWidth="1" opacity={isPathway ? 1 : 0.8} />
            <text x={mx} y={my + 4} textAnchor="middle" fill={e.color} fontSize="9" fontFamily="'DM Mono', monospace" fontWeight="700">{label}</text>
          </g>
        );
      })}

      {/* nodes */}
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
            {isSubject && <circle cx={n.x} cy={n.y} r={n.r + 5} fill="#00339922" filter="url(#ngGlow)" />}
            <circle cx={n.x} cy={n.y} r={n.r} fill={`${col}22`} stroke={col} strokeWidth={isSubject ? 2.4 : 1.6} />
            {isSubject && <text x={n.x} y={n.y - 1} textAnchor="middle" fill="#4a90d9" fontSize="9" fontFamily="'DM Mono', monospace" fontWeight="700">SUBJECT</text>}
            {n.kind === "connection" && n.isPep && <text x={n.x} y={n.y + 3} textAnchor="middle" fill={col} fontSize="8" fontFamily="'DM Mono', monospace" fontWeight="700">PEP</text>}
            {n.kind === "company" && n.offshore && <text x={n.x} y={n.y + 3} textAnchor="middle" fill={col} fontSize="7" fontFamily="'DM Mono', monospace" fontWeight="700">OFFSHORE</text>}
            <text x={n.x} y={isSubject ? n.y + 11 : labelY} textAnchor="middle" fill="#e2e8f0" fontSize="9" fontFamily="'DM Mono', monospace">{nm}</text>
            {!isSubject && <text x={n.x} y={labelY + 11} textAnchor="middle" fill="#56657f" fontSize="7.5">{n.sub}</text>}
          </g>
        );
      })}
    </svg>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────
export default function EuroQuantDashboard({ data = JARVIS_OUTPUT }) {
  const p = data.profile;
  const gi = useCountUp(p.governance_intensity, 1600, 300);
  const mp = useCountUp(p.market_percentile, 1400, 600);
  const riskLevel = getRiskLevel(p.governance_intensity);
  const pep = pepLabels[p.pep_status] || pepLabels.not_pep;
  const totalProcurement = p.associated_companies.reduce((s, c) => s + (c.procurement_value_eur || 0), 0);
  const [activeTab, setActiveTab] = useState("overview");
  const [visible, setVisible] = useState(false);

  useEffect(() => { setTimeout(() => setVisible(true), 80); }, []);

  const ts = new Date(data.processing_timestamp);
  const tsStr = ts.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " + ts.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) + " UTC";

  const styles = {
    root: {
      minHeight: "100vh",
      background: `
        radial-gradient(900px 600px at 12% -5%, #0b2a6b22, transparent 60%),
        radial-gradient(800px 600px at 100% 8%, #00204f33, transparent 55%),
        #080c14`,
      color: "#e2e8f0",
      fontFamily: "'DM Sans', sans-serif",
      padding: "0 0 60px 0",
    },
    topbar: {
      borderBottom: "1px solid #131a27",
      padding: "14px 32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: "#0a0f1a",
      position: "sticky",
      top: 0,
      zIndex: 100,
    },
    logo: {
      fontFamily: "'DM Mono', monospace",
      fontSize: 13,
      letterSpacing: "0.18em",
      color: "#4a90d9",
      fontWeight: 700,
    },
    badge: (color, bg) => ({
      fontSize: 10,
      fontFamily: "'DM Mono', monospace",
      letterSpacing: "0.1em",
      color,
      background: bg || color + "18",
      border: `1px solid ${color}44`,
      padding: "3px 9px",
      borderRadius: 4,
      fontWeight: 700,
    }),
    card: (extra = {}) => ({
      background: "#0d1420",
      border: "1px solid #131a27",
      borderRadius: 8,
      padding: "20px 22px",
      ...extra,
    }),
    label: {
      fontSize: 9,
      fontFamily: "'DM Mono', monospace",
      letterSpacing: "0.15em",
      color: "#2d3a50",
      textTransform: "uppercase",
      marginBottom: 6,
    },
    sectionTitle: {
      fontSize: 10,
      fontFamily: "'DM Mono', monospace",
      letterSpacing: "0.2em",
      color: "#2d3a50",
      textTransform: "uppercase",
      marginBottom: 14,
      paddingBottom: 8,
      borderBottom: "1px solid #131a27",
    },
    tab: (active) => ({
      fontSize: 10,
      fontFamily: "'DM Mono', monospace",
      letterSpacing: "0.12em",
      color: active ? "#4a90d9" : "#2d3a50",
      background: active ? "#4a90d91a" : "transparent",
      border: active ? "1px solid #4a90d933" : "1px solid transparent",
      padding: "6px 14px",
      borderRadius: 4,
      cursor: "pointer",
      transition: "all 0.15s",
    }),
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #080c14; }
        ::-webkit-scrollbar-thumb { background: #1e2535; border-radius: 2px; }
        .fade-in { opacity: 0; transform: translateY(12px); animation: fadeUp 0.5s ease forwards; }
        @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
        .row-hover:hover { background: #131a2788 !important; }
        .verdict-pulse { animation: pulse 2.5s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 #ff3b3b33} 50%{box-shadow:0 0 0 8px transparent} }
      `}</style>

      <div style={styles.root}>
        {/* ── Topbar ── */}
        <div style={styles.topbar}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={styles.logo}>EUROQUANT</span>
            <span style={{ color: "#1e2535", fontSize: 12 }}>|</span>
            <span style={{ fontSize: 11, color: "#2d3a50", fontFamily: "'DM Mono', monospace" }}>RISK TERMINAL</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={styles.badge("#ffb700")}>SYNTHETIC DEMO</span>
            <span style={{ fontSize: 10, color: "#2d3a50", fontFamily: "'DM Mono', monospace" }}>{data.extractor_version}</span>
            <span style={styles.badge("#00c896")}>● LIVE</span>
          </div>
        </div>

        {/* ── Main content ── */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 0" }}>

          {/* ── Subject header ── */}
          <div className="fade-in" style={{ animationDelay: "0.05s", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={styles.label}>Due Diligence Subject</div>
                <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: "#f0f4ff", marginBottom: 6 }}>
                  {p.full_name}
                </h1>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={styles.badge(pep.color)}>{pep.label}</span>
                  {p.sanctions_hit
                    ? <span style={styles.badge("#ff3b3b")}>⚠ SANCTIONS HIT</span>
                    : <span style={styles.badge("#00c896")}>✓ SANCTIONS CLEAR</span>}
                  <span style={styles.badge("#4a90d9")}>ID: {p.founder_id}</span>
                  <span style={{ fontSize: 10, color: "#2d3a50", fontFamily: "'DM Mono', monospace", padding: "3px 0" }}>{tsStr}</span>
                </div>
              </div>
              {/* Verdict */}
              <div className="verdict-pulse" style={{
                background: riskLevel.bg,
                border: `1px solid ${riskLevel.color}44`,
                borderRadius: 8,
                padding: "14px 22px",
                textAlign: "center",
                minWidth: 140,
              }}>
                <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: riskLevel.color, letterSpacing: "0.15em", marginBottom: 4 }}>VERDICT</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: riskLevel.color, fontFamily: "'DM Mono', monospace" }}>{riskLevel.label}</div>
                <div style={{ fontSize: 9, color: riskLevel.color + "99", marginTop: 3 }}>{p.governance_intensity >= 70 ? "ENHANCED DD REQUIRED" : p.governance_intensity >= 40 ? "CAUTION" : "CLEARED FOR REVIEW"}</div>
              </div>
            </div>
          </div>

          {/* ── Score row ── */}
          <div className="fade-in" style={{ animationDelay: "0.12s", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
            {/* GI Gauge */}
            <div style={{ ...styles.card(), gridColumn: "span 2", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <GaugeArc value={p.governance_intensity} size={200} />
              <div style={{ display: "flex", gap: 20, marginTop: -6 }}>
                {[["LOW", "<40", "#00c896"], ["MEDIUM", "40–70", "#ffb700"], ["HIGH", ">70", "#ff3b3b"]].map(([l, r, c]) => (
                  <div key={l} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 8, color: c, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>{l}</div>
                    <div style={{ fontSize: 8, color: "#2d3a50" }}>{r}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Market Percentile */}
            <div style={{ ...styles.card(), display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={styles.label}>Market Percentile</div>
              <div>
                <div style={{ fontSize: 42, fontFamily: "'DM Mono', monospace", fontWeight: 700, color: "#ff3b3b", lineHeight: 1 }}>
                  {mp.toFixed(0)}<span style={{ fontSize: 18 }}>th</span>
                </div>
                <div style={{ fontSize: 9, color: "#2d3a50", marginTop: 6 }}>
                  {data.benchmark_source === "neo4j_distribution"
                    ? `Portfolio N=${data.benchmark_cohort_size}`
                    : "FATF/EBA cold-start"}
                </div>
              </div>
              {/* Bar */}
              <div style={{ background: "#131a27", borderRadius: 3, height: 4, marginTop: 12 }}>
                <div style={{ width: `${p.market_percentile}%`, height: "100%", background: "linear-gradient(90deg, #00c896, #ff3b3b)", borderRadius: 3, transition: "width 1.4s cubic-bezier(0.16,1,0.3,1)" }} />
              </div>
              <div style={{ fontSize: 9, color: "#2d3a50", marginTop: 4 }}>vs European VC/PE market</div>
            </div>

            {/* Quick stats */}
            <div style={{ ...styles.card(), display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                ["Confidence", `${(data.extraction_confidence * 100).toFixed(0)}%`, "#4a90d9"],
                ["Procurement", fmt(totalProcurement), "#ff8c00"],
                ["Companies", p.associated_companies.length, "#e2e8f0"],
                ["Connections", p.political_connections.length, "#e2e8f0"],
              ].map(([lbl, val, col]) => (
                <div key={lbl} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "#2d3a50" }}>{lbl}</span>
                  <span style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color: col, fontWeight: 600 }}>{val}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid #131a27", paddingTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "#2d3a50" }}>Neo4j</span>
                  <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: data.neo4j_persisted ? "#00c896" : "#ff3b3b" }}>
                    {data.neo4j_persisted ? "● PERSISTED" : "○ LOCAL"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="fade-in" style={{ animationDelay: "0.18s", display: "flex", gap: 6, marginBottom: 16 }}>
            {["overview", "companies", "connections", "network", "flags"].map((t) => (
              <button key={t} style={styles.tab(activeTab === t)} onClick={() => setActiveTab(t)}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          {/* ── Tab content ── */}
          <div className="fade-in" style={{ animationDelay: "0.22s" }}>

            {/* OVERVIEW */}
            {activeTab === "overview" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {/* Analyst verdict */}
                <div style={{ ...styles.card({ borderColor: "#ff3b3b33" }), gridColumn: "span 2" }}>
                  <div style={styles.sectionTitle}>Analyst Assessment</div>
                  <p style={{ fontSize: 12, lineHeight: 1.7, color: "#8899aa" }}>
                    {p.analyst_notes?.split("\n")[0]}
                  </p>
                </div>

                {/* Reference check */}
                <div style={styles.card()}>
                  <div style={styles.sectionTitle}>Reference Layer</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {data.reference_check.sources_checked.map((src) => (
                      <div key={src} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }} className="row-hover">
                        <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#4a5568" }}>{src}</span>
                        <span style={styles.badge("#00c896")}>✓ CLEAR</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Score breakdown */}
                <div style={styles.card()}>
                  <div style={styles.sectionTitle}>Score Breakdown</div>
                  {[
                    ["PEP Status", 30, 30, "#ff3b3b"],
                    ["Offshore Exposure", 20, 20, "#ff8c00"],
                    ["Procurement Conflict", 25, 25, "#ffb700"],
                    ["Political Network", 20, 25, "#4a90d9"],
                  ].map(([lbl, val, max, col]) => (
                    <div key={lbl} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: "#4a5568" }}>{lbl}</span>
                        <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: col }}>{val}/{max}</span>
                      </div>
                      <div style={{ background: "#131a27", borderRadius: 2, height: 3 }}>
                        <div style={{ width: `${(val / max) * 100}%`, height: "100%", background: col, borderRadius: 2 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COMPANIES */}
            {activeTab === "companies" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {p.associated_companies.map((c, i) => (
                  <div key={i} style={{ ...styles.card(), display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "start" }} className="row-hover">
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{c.company_name}</span>
                        {c.is_offshore_flag && <span style={styles.badge("#ff3b3b")}>OFFSHORE</span>}
                        {c.defense_gov_tech_sector && <span style={styles.badge("#ff8c00")}>DEFENSTECH</span>}
                        {!c.active_status && <span style={styles.badge("#888")}>DISSOLVED</span>}
                      </div>
                      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                        {[
                          ["Country", c.registration_country],
                          ["Stake", `${c.share_percentage}%`],
                          ["Incorporated", c.incorporation_date || "—"],
                          ["FATF", c.fatf_risk_level.toUpperCase()],
                        ].map(([l, v]) => (
                          <div key={l}>
                            <div style={{ fontSize: 9, color: "#2d3a50", fontFamily: "'DM Mono', monospace" }}>{l}</div>
                            <div style={{ fontSize: 11, color: l === "FATF" ? fatfColors[c.fatf_risk_level] : "#8899aa", fontFamily: "'DM Mono', monospace" }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {c.public_procurement_exposure && c.procurement_value_eur && (
                        <div>
                          <div style={{ fontSize: 9, color: "#ff8c00", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>PROCUREMENT</div>
                          <div style={{ fontSize: 18, fontFamily: "'DM Mono', monospace", fontWeight: 700, color: "#ff8c00" }}>{fmt(c.procurement_value_eur)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CONNECTIONS */}
            {activeTab === "connections" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={styles.card()}>
                  <div style={styles.sectionTitle}>Political Network</div>
                  {p.political_connections.map((pc, i) => (
                    <PathwayDot
                      key={i}
                      distance={pc.pathway_distance}
                      label={pc.person_name}
                      role={`${relLabels[pc.relationship_type] || pc.relationship_type} · ${pc.jurisdiction} · ${pc.role_title}`}
                      active={pc.still_active}
                    />
                  ))}
                </div>
                <div style={styles.card()}>
                  <div style={styles.sectionTitle}>Distance Legend</div>
                  {[[1, "#ff3b3b", "Direct connection", "Subject personally connected"], [2, "#ff8c00", "1 intermediary", "Connected via one entity"], [3, "#ffb700", "2 intermediaries", "Connected via two entities"]].map(([d, c, lbl, desc]) => (
                    <div key={d} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: c + "1a", border: `1px solid ${c}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: c, fontWeight: 700 }}>{d}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 500 }}>{lbl}</div>
                        <div style={{ fontSize: 10, color: "#4a5568", marginTop: 2 }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 16, padding: "10px 12px", background: "#080c14", borderRadius: 6, border: "1px solid #131a27" }}>
                    <div style={{ fontSize: 9, color: "#2d3a50", fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>NEO4J GRAPH</div>
                    <div style={{ fontSize: 10, color: "#4a5568" }}>
                      {p.political_connections.filter(c => c.pathway_distance === 1).length} direct ·{" "}
                      {p.political_connections.filter(c => c.pathway_distance === 2).length} indirect ·{" "}
                      {p.political_connections.filter(c => c.is_pep_direct).length} PEP nodes
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* NETWORK */}
            {activeTab === "network" && (
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14 }}>
                <div style={styles.card()}>
                  <div style={styles.sectionTitle}>Neo4j Pathway Graph</div>
                  <div style={{ fontSize: 9, color: "#56657f", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", marginBottom: 8 }}>
                    DRAG NODES TO EXPLORE · FORCE-DIRECTED LAYOUT
                  </div>
                  <NetworkGraph
                    connections={p.political_connections}
                    companies={p.associated_companies}
                    verifications={data.reference_check?.company_verifications}
                    subjectName={p.full_name}
                  />
                </div>
                <div style={styles.card()}>
                  <div style={styles.sectionTitle}>Distance Legend</div>
                  {[[1, "#ff3b3b", "Direct connection", "Subject personally connected"], [2, "#ff8c00", "1 intermediary", "Connected via one entity"], [3, "#ffb700", "2 intermediaries", "Connected via two entities"]].map(([d, c, lbl, desc]) => (
                    <div key={d} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: c + "1a", border: `1px solid ${c}55`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: c, fontWeight: 700 }}>{d}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 500 }}>{lbl}</div>
                        <div style={{ fontSize: 10, color: "#56657f", marginTop: 2 }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 12, padding: "11px 13px", background: "#070d18", borderRadius: 8, border: "1px solid #131a27" }}>
                    <div style={{ fontSize: 9, color: "#7f90ab", fontFamily: "'DM Mono', monospace", marginBottom: 6, letterSpacing: "0.1em" }}>GRAPH NETWORK</div>
                    <div style={{ fontSize: 11, color: "#aab6c9" }}>
                      {p.political_connections.filter(c => c.pathway_distance === 1).length} direct ·{" "}
                      {p.political_connections.filter(c => c.pathway_distance === 2).length} indirect ·{" "}
                      {p.political_connections.filter(c => c.is_pep_direct).length} PEP nodes
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FLAGS */}
            {activeTab === "flags" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {p.risk_flags.map((flag, i) => {
                  const severity = i < 2 ? "#ff3b3b" : i < 4 ? "#ff8c00" : "#ffb700";
                  const sLabel = i < 2 ? "CRITICAL" : i < 4 ? "HIGH" : "MEDIUM";
                  return (
                    <div key={i} style={{ ...styles.card({ borderLeft: `3px solid ${severity}`, paddingLeft: 16 }), display: "flex", gap: 14, alignItems: "flex-start" }} className="row-hover">
                      <div style={{ minWidth: 60 }}>
                        <span style={styles.badge(severity)}>{sLabel}</span>
                      </div>
                      <p style={{ fontSize: 11, lineHeight: 1.6, color: "#8899aa" }}>{flag}</p>
                    </div>
                  );
                })}
                <div style={{ ...styles.card({ borderColor: "#4a90d933", marginTop: 8 }) }}>
                  <div style={{ fontSize: 9, color: "#2d3a50", fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>PROCESSING METADATA</div>
                  <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                    {[
                      ["Extracted by", data.extractor_version],
                      ["Confidence", `${(data.extraction_confidence * 100).toFixed(0)}%`],
                      ["Doc hash", data.processing_timestamp ? data.processing_timestamp.slice(0, 10) : "—"],
                      ["OCR fallback", data.used_ocr_fallback ? "Yes" : "No"],
                    ].map(([l, v]) => (
                      <div key={l}>
                        <div style={{ fontSize: 9, color: "#2d3a50" }}>{l}</div>
                        <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#4a5568" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
