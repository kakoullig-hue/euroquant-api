# EuroQuant Risk Terminal — Brand Identity & Design System v1.0
**Classification:** Internal / Co-founder Reference  
**Engine:** Jarvis MAS v3.0  
**Issued:** June 2026  
**Scope:** LinkedIn · UI/UX · Investor Decks · AI Design Reference

---

## SECTION 01 — COLOR PALETTE SYSTEM

### 4-Tier Background Architecture
The UI uses 4 distinct dark layers, not 3. This was amended from the original brief to match the actual codebase.

| Token Name | Hex | Role |
|---|---|---|
| Terminal Canvas | `#080c14` | Root `background` of every page/viewport. Never use for cards. |
| Card Surface | `#0d1420` | All card and panel backgrounds. Border: `1px solid #131a27`. |
| Institutional Navy | `#001B52` | Section dividers, hover overlays. Primary brand color on white backgrounds (LinkedIn, investor PDFs, printed materials). |
| Primary Blue | `#003399` | CTA buttons, active tabs, primary links, progress bars, brand identity. |

### Accent & UI Tokens
| Token Name | Hex | Role |
|---|---|---|
| Cyber Neon Cyan | `#00F0FF` | **Accent only.** Graph highlights, LIVE badge pulse, Neo4j edge highlights, metric callouts, active state indicators. Never as a large fill. |
| UI Steel Blue | `#4a90d9` | Logo wordmark, nav tabs, informational badges. Derived from Primary. Do not use in investor decks — use `#003399` instead. |
| Border | `#131a27` | All card and component borders. |
| Muted | `#2d3a50` | Section labels, secondary UI text, monospace metadata labels. |
| Sub | `#8899aa` | Body descriptions, card body text, metadata values. |
| Text | `#e2e8f0` | Primary readable content. |
| Bright | `#f0f4ff` | Display headings, hero titles, subject names. |

### Alert Severity Palette (Standardized)
| Level | Hex | Trigger Conditions |
|---|---|---|
| CRITICAL | `#ff3b3b` | D-1 PEP connection, Sanctions Hit, GI > 70 |
| HIGH | `#ff8c00` | D-2 connection, Offshore flag, active procurement conflict |
| MEDIUM | `#ffb700` | D-3 connection, indirect procurement, FATF elevated |
| CLEAR | `#00c896` | No flags, Sanctions Clear, GI < 40 |

### Color Usage Rules
- `#080c14` is the root background in all digital UI. On print/PDF use `#001B52` instead to avoid solid black rendering.
- `#00F0FF` (Cyan) must never be used as a large fill — max 8px elements, borders, or data point highlights.
- `#4a90d9` (Steel Blue) is a derived UI token, not a primary brand color. Not for investor decks.
- Always pair Cyan accent elements with a dark background. Cyan on white has insufficient contrast for enterprise readability.

---

## SECTION 02 — TYPOGRAPHY SYSTEM

### Two Typefaces, Three Roles
| Typeface | Role | Usage |
|---|---|---|
| **Space Grotesk** | Display / Body | Section headings, subject names, body copy, readable prose. Weight 400 (body), 600–700 (display/hero). |
| **DM Mono** | Data / System | All machine-generated output: scores, IDs, hex hashes, timestamps, badge labels, section tags, metadata. Always monospaced. |

### Type Scale
| Element | Font | Size | Weight | Color |
|---|---|---|---|---|
| Hero / Cover title | Space Grotesk | 38px | 700 | `#f0f4ff` |
| Section heading | Space Grotesk | 22px | 600 | `#f0f4ff` |
| Subject name (H1) | Space Grotesk | 26px | 600 | `#f0f4ff` |
| Body text | Space Grotesk | 13.5px | 400 | `#8899aa` |
| Section tag label | DM Mono | 9px | 400 | `#2d3a50` — uppercase, letter-spacing 0.2em |
| Badge / chip label | DM Mono | 10px | 700 | varies by severity |
| Data value (large) | DM Mono | 42px | 700 | varies by severity |
| Metadata / sub-label | DM Mono | 9px | 400 | `#2d3a50` |

---

## SECTION 03 — COMPONENT RULES

### Risk Badges (Standard States)
All badges: `font-family: DM Mono`, `font-size: 10px`, `letter-spacing: 0.1em`, `font-weight: 700`, `border-radius: 4px`, `padding: 3px 9px`.

| State | Text Color | Background | Border |
|---|---|---|---|
| CRITICAL RISK | `#ff3b3b` | `#ff3b3b18` | `1px solid #ff3b3b44` |
| HIGH RISK | `#ff8c00` | `#ff8c0018` | `1px solid #ff8c0044` |
| MEDIUM RISK | `#ffb700` | `#ffb70018` | `1px solid #ffb70044` |
| CLEAR | `#00c896` | `#00c89618` | `1px solid #00c89644` |
| LIVE | `#00F0FF` | `#00F0FF07` | `1px solid #00F0FF30` |
| PEP CONFIRMED | `#4a90d9` | `#4a90d918` | `1px solid #4a90d930` |
| SANCTIONS HIT | `#ff3b3b` | `#ff3b3b18` | `1px solid #ff3b3b44` |
| OFFSHORE | `#ff3b3b` | `#ff3b3b18` | `1px solid #ff3b3b44` |
| DEFENSTECH | `#ff8c00` | `#ff8c0018` | `1px solid #ff8c0044` |
| DISSOLVED | `#888888` | `#88888818` | `1px solid #88888844` |

### Governance Intensity Score Gauge
| GI Range | Arc Color | Verdict Label | Sub-verdict |
|---|---|---|---|
| > 70 | `#ff3b3b` | HIGH RISK | DO NOT INVEST |
| 40 – 70 | `#ffb700` | MEDIUM RISK | CAUTION |
| < 40 | `#00c896` | LOW RISK | CLEARED FOR REVIEW |

- Always animate count-up on first render: 1.4–1.6s duration, 80–300ms delay.
- Market percentile displayed as integer + `th` suffix (e.g. `94th`). No decimal.
- Score gauge: SVG arc, stroke-width varies by viewport, background track color `#131a27`.

### Score Breakdown Bars
- Track: `background: #131a27`, `height: 3px`, `border-radius: 2px`
- Fill: color matches severity of that factor
- Value label: `DM Mono`, `font-size: 10px`, same color as fill
- Categories: PEP Status (max 30) · Offshore Exposure (max 20) · Procurement Conflict (max 25) · Political Network (max 25)

### Card Components
```
background: #0d1420
border: 1px solid #131a27
border-radius: 8px
padding: 20px 22px
```
- Hover state: `background: #131a2788`
- Left-accent variant (for risk flags): `border-left: 3px solid {severity_color}`, `padding-left: 16px`

### Topbar (Sticky Navigation)
```
background: #0a0f1a
border-bottom: 1px solid #131a27
padding: 14px 32px
position: sticky; top: 0; z-index: 100
```
- Logo: `DM Mono`, `font-size: 13px`, `letter-spacing: 0.18em`, `color: #4a90d9`, `font-weight: 700`
- Separator: `color: #1e2535`, `font-size: 12px`
- Sub-label "RISK TERMINAL": `DM Mono`, `font-size: 11px`, `color: #2d3a50`

### Tabs (Navigation)
```
Active:   color: #4a90d9 · background: #4a90d91a · border: 1px solid #4a90d933
Inactive: color: #2d3a50 · background: transparent · border: 1px solid transparent
Font: DM Mono, 10px, letter-spacing 0.12em
Padding: 6px 14px · border-radius: 4px
```

---

## SECTION 04 — NEO4J GRAPH VISUALIZATION RULES

### Pathway Distance — Node & Edge Encoding
| Distance | Edge Style | Edge Color | Node Fill | Node Border |
|---|---|---|---|---|
| D-1 (Direct) | Solid line, 1.5px | `#ff3b3b` | `#ff3b3b22` | `#ff3b3b` solid |
| D-2 (Indirect) | Solid line, 1.5px | `#ff8c00` | `#ff8c0018` | `#ff8c00` solid |
| D-3 (Extended) | Dashed line, 1.5px | `#ffb700` | `#ffb70010` | `#ffb700` dashed |

### Node Types
| Node Type | Fill | Border | Label Color | Size |
|---|---|---|---|---|
| Subject (Founder) | `#003399` + 33% opacity | `#003399` solid | `#4a90d9` | Larger radius (+6px) |
| PEP | `#ff3b3b22` | `#ff3b3b` solid | `#ff3b3b` | Standard |
| Government Official | `#ff8c0018` | `#ff8c00` solid | `#ff8c00` | Standard |
| Shell / Offshore | `#ffb70010` | `#ffb700` dashed | `#ffb700` | Standard |
| Clean Entity | `#00c89618` | `#00c896` solid | `#00c896` | Standard |

### Graph Rules
- PEP nodes are always rendered in Critical Red (`#ff3b3b`) regardless of pathway distance.
- Subject node is always Primary Blue (`#003399`), always larger than connection nodes.
- D-3 edges use dashed lines to visually communicate lower certainty/directness.
- Edge labels (`D-1`, `D-2`, `D-3`) displayed on a `#0d1420` background pill centered on the edge.
- Node label: `DM Mono`, 9px, centered. Sub-label below node: `Sans`, 7px, `#2d3a50`.

---

## SECTION 05 — LINKEDIN COPY (PRODUCTION)

### About Section — English — Ready to Publish

> EuroQuant automates regulatory Due Diligence for Venture Capital funds investing in high-sensitivity sectors — DefenseTech, GovTech, and DeepTech.
>
> Our AI engine, Jarvis, cross-references private Cap Tables and founding documents against public registries, PEP databases, and political network graphs in under 30 seconds — surfacing hidden conflicts of interest before capital is deployed.
>
> **What makes EuroQuant different:**
> → Ephemeral Processing: documents are analyzed in RAM and destroyed immediately — zero storage, zero data leakage risk.
> → Pathway Distance Analysis: we map indirect connections up to 3 degrees of separation using a Neo4j graph layer.
> → Governance Intensity Score: a single quantified risk metric benchmarked against the market.
>
> *For VC funds operating in regulated European markets where one undisclosed conflict can destroy a portfolio company.*

### Tone Guidelines
- Language: English (European B2B audience)
- Tone: Authoritative, precise — zero startup hype
- Each sentence addresses a specific VC pain point (weeks → 30 seconds, indirect connections → D-3 graph depth, data security → ephemeral processing)
- Never say "innovative" or "cutting-edge" — show, don't tell

---

## SECTION 06 — UX COPY RULES (EPHEMERAL PROCESSING)

| UI Moment | Correct Copy | Incorrect Copy |
|---|---|---|
| File input button | "Ingest for Analysis" | "Upload Document" |
| Processing state badge | "● EPHEMERAL MODE · ACTIVE" | "Processing..." |
| Post-analysis confirmation | "Document Destroyed · 0 bytes retained" | "Upload complete" |
| Audit trail display | "SHA-256: {hash} · Processed {timestamp}" | "File analyzed" |
| Processing timer | "Jarvis Engine · {Xs elapsed}" | "Loading..." |

### Ephemeral UX Principle
Every touchpoint where the user interacts with a private document must reinforce the core value prop: the document is temporary and leaves no trace. This is not a legal disclaimer — it is the product's primary differentiator and must be visible at every step.

---

## SECTION 07 — LAYOUT & SPACING SYSTEM

| Token | Value |
|---|---|
| Base grid unit | 8px |
| Content max-width | 1100px (centered) |
| Page horizontal padding | 24px (mobile) / 32px (desktop) |
| Card internal padding | 20px 22px |
| Card border-radius | 8px |
| Section gap | 20px |
| Component gap (within card) | 12px |
| Section label margin-bottom | 14px |
| Scrollbar width | 4px · track `#080c14` · thumb `#1e2535` |

### Animations
| Element | Animation | Duration | Delay |
|---|---|---|---|
| Page load (cards) | `fadeUp` (opacity 0→1, translateY 12px→0) | 500ms | staggered 50–300ms |
| GI Score count-up | numeric interpolation | 1600ms | 300ms |
| Market percentile count-up | numeric interpolation | 1400ms | 600ms |
| Verdict card | `pulse` box-shadow | 2.5s infinite | — |

### Fade-up Keyframe
```css
@keyframes fadeUp {
  to { opacity: 1; transform: translateY(0); }
}
.fade-in {
  opacity: 0;
  transform: translateY(12px);
  animation: fadeUp 0.5s ease forwards;
}
```

---

## SECTION 08 — REFERENCE LAYER & DATA SOURCES (UI DISPLAY)

When displaying data source verification in the UI, use these labels:

| Source | Display Label | Badge Color |
|---|---|---|
| OpenCorporates | `OPENCORPORATES` | `#00c896` (CLEAR) |
| EU PEP Registry | `EU PEP REGISTRY` | `#00c896` or `#ff3b3b` depending on hit |
| FATF Blacklist | `FATF BLACKLIST` | `#ff3b3b` if hit |
| Neo4j Graph | `GRAPH NETWORK` | `#4a90d9` |
| Internal Benchmark | `BENCHMARK LAYER` | `#4a90d9` |

---

*EuroQuant Risk Terminal · Brand Identity v1.0 · Internal Reference · June 2026*
