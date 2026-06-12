// ═══════════════════════════════════════════════════════════════════════
// EuroQuant Design System — single source of truth for brand tokens
// Mirrors Blueprint §10 / EuroQuant_Brand_Identity_v1.md. Do not fork
// these values inside components.
// ═══════════════════════════════════════════════════════════════════════

export const C = {
  canvas:   "#080c14",   // Terminal Canvas — root background only
  card:     "#0d1420",   // Card Surface — all cards/panels
  navy:     "#001B52",   // Institutional Navy — dividers, brand on white
  primary:  "#003399",   // Primary Blue — CTAs, active tabs, subject node
  cyan:     "#00F0FF",   // Cyber Cyan — accent ONLY, max 8px elements
  steel:    "#4a90d9",   // Steel Blue — logo, nav
  border:   "#131a27",
  muted:    "#2d3a50",
  sub:      "#8899aa",
  text:     "#e2e8f0",
  bright:   "#f0f4ff",
  critical: "#ff3b3b",   // D-1 PEP, Sanctions Hit, GI ≥ 70
  high:     "#ff8c00",   // D-2, Offshore, active procurement
  medium:   "#ffb700",   // D-3, indirect procurement, FATF elevated
  clear:    "#00c896",   // No flags, GI < 40
};

// ── Display face ────────────────────────────────────────────────────────
// "IBM Plex Sans" adopted 12 Jun 2026 (ui-ux-pro-max "Financial Trust"
// pairing) — written into Blueprint §10 and propagated to the store
// (web/index.html) and pdf_generator.py. DM Mono stays for ALL data.
// Changing this constant is a brand change: move all three surfaces together.
const DISPLAY_FACE = "IBM Plex Sans";

export const FONT_DISPLAY = `'${DISPLAY_FACE}', 'Poppins', sans-serif`;
export const FONT_MONO    = "'DM Mono', 'JetBrains Mono', monospace";

// Shared a11y guard — components snap animations to their end state when set.
export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const SEVERITY = {
  CRITICAL: C.critical,
  HIGH:     C.high,
  MEDIUM:   C.medium,
  CLEAR:    C.clear,
};

export const DISTANCE_COLOR = { 1: C.critical, 2: C.high, 3: C.medium };

export function giLevel(gi) {
  if (gi >= 70) return { label: "HIGH RISK",   color: C.critical, bg: "rgba(255,59,59,0.10)" };
  if (gi >= 40) return { label: "MEDIUM RISK", color: C.medium,   bg: "rgba(255,183,0,0.10)" };
  return         { label: "LOW RISK",    color: C.clear,    bg: "rgba(0,200,150,0.10)" };
}

// Section label — DM Mono 8px uppercase, letter-spacing 0.2em (Blueprint §10)
export const sectionLabel = {
  fontFamily: FONT_MONO,
  fontSize: 8,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: C.muted,
};

export const badge = (color, bg) => ({
  fontSize: 10,
  fontFamily: FONT_MONO,
  letterSpacing: "0.1em",
  color,
  background: bg || color + "16",
  border: `1px solid ${color}44`,
  padding: "4px 8px",
  borderRadius: 4,
  fontWeight: 500,
  whiteSpace: "nowrap",
});

// Card padding tiers (4/8px rhythm): default "20px 24px", compact rows
// pass PAD_COMPACT. Don't invent per-card values.
export const PAD_COMPACT = "16px 20px";

export const card = (extra = {}) => ({
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: "20px 24px",
  ...extra,
});

// ── Global stylesheet — keyframes + the hover/entry states inline styles
// can't express. Injected once per document.
const GLOBAL_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; background: ${C.canvas}; }
  ::selection { background: ${C.primary}66; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: ${C.canvas}; }
  ::-webkit-scrollbar-thumb { background: #1e2535; border-radius: 3px; }

  @keyframes eqFadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes eqPulse {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.35; }
  }
  @keyframes eqVerdictPulse {
    0%, 100% { box-shadow: 0 0 0 0 var(--pulse-color, #ff3b3b33); }
    50%      { box-shadow: 0 0 0 9px transparent; }
  }
  @keyframes eqRing {
    0%   { transform: scale(0.82); opacity: 0.9; }
    100% { transform: scale(1.45); opacity: 0; }
  }
  @keyframes eqScan {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(420%); }
  }

  /* Cards fadeUp 500ms, staggered 50–300ms via --d (Blueprint §10) */
  .eq-fade { opacity: 0; animation: eqFadeUp 0.5s ease forwards; animation-delay: var(--d, 0ms); }
  .eq-pulse { animation: eqPulse 2s ease-in-out infinite; }
  .eq-verdict { animation: eqVerdictPulse 2.5s ease-in-out infinite; }

  .eq-card-hover { transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease; }
  .eq-card-hover:hover {
    border-color: #1f2c44 !important;
    transform: translateY(-1px);
    box-shadow: 0 12px 32px rgba(0, 8, 30, 0.45);
  }
  .eq-row-hover { transition: background 0.15s ease; }
  .eq-row-hover:hover { background: #131a2788 !important; }

  .eq-btn { transition: filter 0.15s ease, border-color 0.15s ease, transform 0.15s ease; }
  .eq-btn:hover { filter: brightness(1.25); transform: translateY(-1px); }
  .eq-btn:active { transform: translateY(0); }
  .eq-btn:disabled { opacity: 0.55; cursor: default; transform: none; }

  .eq-tab { transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease; }
  /* !important beats the inline idle styles; scoped so the active tab keeps its Primary Blue fill */
  .eq-tab:not(.eq-tab-active):hover { color: ${C.text} !important; border-color: ${C.muted} !important; }
  .eq-tab:active { transform: translateY(1px); }

  .eq-focus:focus-visible { outline: 2px solid #4a90d9; outline-offset: 3px; }
  button:focus-visible { outline: 2px solid #4a90d9; outline-offset: 2px; }

  @media (prefers-reduced-motion: reduce) {
    .eq-fade { animation: none; opacity: 1; }
    .eq-pulse, .eq-verdict { animation: none; }
  }
`;

export function injectGlobalStyles() {
  if (typeof document === "undefined" || document.getElementById("eq-global-css")) return;
  const el = document.createElement("style");
  el.id = "eq-global-css";
  el.textContent = GLOBAL_CSS;
  document.head.appendChild(el);
}
