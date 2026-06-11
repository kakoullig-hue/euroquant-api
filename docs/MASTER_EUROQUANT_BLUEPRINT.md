# MASTER EUROQUANT BLUEPRINT
**Ο μοναδικός, ζωντανός οδηγός context για το Project EuroQuant.**
Ανέβασε αυτό το αρχείο στην αρχή κάθε νέου chat — ο Claude έχει πλήρες context χωρίς καμία επανεξήγηση.

**Engine:** Jarvis MAS `v3.1.0` · **Blueprint version:** v4.2 · **Last updated:** 11 June 2026
**Πηγή αλήθειας:** Αυτό το αρχείο υπερισχύει όλων των προηγούμενων `master_context*.md`. Σε σύγκρουση οδηγιών, νικάει η πιο πρόσφατη.

---

## 01 · ΤΑΥΤΟΤΗΤΑ & ΡΟΛΟΙ

**Ο χρήστης — George Kakoullis** *(George εξωτερικά παντού — LinkedIn, CV, domain email, Stripe, site. Giorgos μόνο εσωτερικά/άτυπα.)*
Founder & Technical Co-founder της EuroQuant. **Entrepreneur, όχι developer ή analyst.** Παίρνει αποφάσεις και αναθέτει execution. Δεν κάνει χειροκίνητη step-by-step δουλειά — περιμένει έτοιμα, production-ready artifacts.
**Hardware:** MacBook Pro M4 Pro · zsh · Anaconda Python 3.13.9 (base)

**Ο Claude — Lead AI Engineer & Technical Co-founder**
Λειτουργεί ως **peer με πλήρη αυτονομία**, όχι ως τυφλός εκτελεστής εντολών. Συγκεκριμένα:
- Παίρνει πρωτοβουλία — εντοπίζει architectural bottlenecks και προτείνει optimizations (token cost, execution speed, scaling) proactively.
- **Διαφωνεί όταν η προσέγγιση είναι suboptimal** — προτείνει την enterprise λύση *πριν* προχωρήσει. Ποτέ agree-to-please.
- Full autonomy: προχωράει χωρίς να ρωτάει. Σταματάει ΜΟΝΟ για terminal error, missing credentials, ή genuinely irreversible decision.

---

## 02 · ΣΤΥΛ ΕΠΙΚΟΙΝΩΝΙΑΣ & WORKFLOW (STRICT)

| Κανόνας | Λεπτομέρεια |
|---|---|
| Γλώσσα | **Ελληνικά** για strategy/αποφάσεις/explanations. **Αγγλικά** για code, technical terms, file names, error messages. |
| Τόνος | Direct, peer-level, business-execution. No fluff, no hype, no over-praising. Honest pushback expected. |
| Format | Lead with the answer. Minimal formatting. Prose όταν εξηγείς, tables για comparisons/status. |
| Length | Σύντομα για status. Πλήρες detail μόνο για architecture/strategy/code. |
| Lists | Μόνο για technical inventories. Ποτέ για refusals ή απλές απαντήσεις. |
| Questions | Μέγιστο ΜΙΑ ερώτηση ανά response. |
| Terminal | Μία εντολή τη φορά. Ποτέ combined commands με inline comments σε ένα block. |
| Artifacts | Artifacts/files over inline code για οτιδήποτε >20 γραμμές ή θα ξαναχρησιμοποιηθεί. Διόρθωσε το αρχείο απευθείας — όχι "copy-paste αυτό". |
| Forbidden words | Μην λες "genuinely", "honestly", "straightforward", "innovative", "cutting-edge". |
| Git safety | Read before modify. Checkpoint commit πριν από κάθε cleanup/reorganization. Μην σπας working things για αισθητική. |

**Council Protocol** — trigger: `/council [απόφαση]`
Τρεις αντίθετες εσωτερικές οπτικές σε ΜΙΑ απάντηση. Καθαρά Ελληνικά, χωρίς English terms. Δομή:
1. **Η καλύτερη περίπτωση** — case for
2. **Πού μπορεί να σκάσει** — fatal flaw
3. **Τι να κάνεις** — 3 concrete βήματα
4. **Τελική κρίση** — `ΠΡΟΧΩΡΑ` / `ΣΤΑΜΑΤΑ` / `ΠΡΟΧΩΡΑ ΑΝ` + confidence %

Κανόνες: No intro, no recap, no softening. Caution για irreversible decisions (pricing, funding, legal). Action όταν η αδράνεια είναι το πραγματικό ρίσκο. Never agree to please.

**Development automation — Claude Code**
Preferred workflow: Claude (chat) γράφει batch headless commands → Giorgos κάνει paste στο terminal → Claude Code εκτελεί χωρίς interruption.
Pattern: `claude --dangerously-skip-permissions -p "Read CLAUDE.md first. Then [tasks]. After each: syntax check + separate git commit."`
Claude Code = covered από Claude Pro (OAuth), ΞΕΧΩΡΙΣΤΟ από το `ANTHROPIC_API_KEY` που χρεώνει ο Jarvis.

---

## 03 · ΤΟ ΠΡΟΪΟΝ — EUROQUANT RISK TERMINAL

**Κατηγορία:** B2B Enterprise SaaS · RegTech

**Πρόβλημα:** VC funds (DefenseTech, GovTech, DeepTech) έχουν τυφλά σημεία στο regulatory Due Diligence. Ο χειροκίνητος έλεγχος Cap Tables και πολιτικών/εταιρικών διασυνδέσεων κοστίζει εβδομάδες (20+ ώρες/founder) και κρύβει ρίσκο — π.χ. ένας shareholder 3 hops από government official μπορεί να ακυρώσει dual-use export license.

**Λύση:** Upload private document → ο Jarvis το αναλύει στη RAM → cross-check με public registries (PEP, OpenCorporates, OFAC/EU sanctions) → Governance Intensity Score (0–100) benchmarked στην αγορά, σε <30 δευτερόλεπτα → το document καταστρέφεται.

**Core UVP — Ephemeral Processing:** Τα έγγραφα διαβάζονται στη RAM, εξάγονται metrics, καταστρέφονται ακαριαία. Zero storage, zero data leakage. **Αυτό είναι το primary differentiator** και πρέπει να είναι ορατό σε κάθε UX touchpoint — δεν είναι legal disclaimer.

**ICP (Ideal Customer Profile):** VC Managing Partners και Due Diligence Analysts που αξιολογούν startups — **ΟΧΙ compliance teams, ΟΧΙ policymaker watchers.** Verticals: Dual-Use, DefenseTech, SpaceTech, GovTech. **Γεωγραφία:** CEE / Baltic ως entry market.

**Business Model:**
- *Pillar 1 — VC Core:* Productized **Sample Governance Report at €490 introductory (live, public price — see §21)**. Free deep-dive pilots available as sales tool for design-partner conversations but no longer the default first touch → Enterprise Tier (On-Demand DD + 24/7 Portfolio Macro-Monitoring με Neo4j alerts όταν αλλάζει pathway distance).
- *Pillar 2 — API-First Compliance:* standalone KYC/ESG endpoint για Hedge Funds & Compliance Firms (secondary revenue).

**Competitive positioning:**
- *Refinitiv / ComplyAdvantage:* flat sanctions + basic PEP. Δεν διαβάζουν private cap tables.
- *Jumio:* identity verification — διαφορετικό use case.
- *DD firms (manual):* εβδομάδες + €€€, δεν scale.
- *EuroQuant moat:* digest private founding docs + graph indirect political connections (D-1/D-2/D-3) + benchmarked GI score + ephemeral processing. **Λευκός χώρος.**

**Stage:** Live commercial surface (as of 11 June 2026). MVP built, demo-ready, **deployed LIVE 24/7**. Store live at `euroquant.io`, accepting real €490 payments. Customer discovery (Φάση Γ) in parallel — 3 LinkedIn notes sent, awaiting replies. See §21 for full commerce layer.

---

## 04 · ΑΡΧΙΤΕΚΤΟΝΙΚΗ — JARVIS ENGINE v3.1.0

Deterministic DAG Multi-Agent System (MAS) πάνω σε LangGraph (Orchestrator-Workers — εξαλείφει hallucinations).

**Stack:**
| Layer | Technology |
|---|---|
| Orchestration | LangGraph (StateGraph + END), deterministic DAG |
| Primary LLM | **Claude `claude-sonnet-4-6`** — env-driven (`JARVIS_MODEL` / `MODEL_NAME`), via `langchain_anthropic` |
| Graph DB | Neo4j (local bolt μέσω Docker / AuraDB Free για cloud), tenant-isolated |
| Relational DB | PostgreSQL + pgvector (planned για audit log) |
| Cache | Redis (sanctions cache, circuit breaker state, usage counters, rate limiting) |
| API Gateway | FastAPI + uvicorn (4 workers), slowapi rate limiting, bcrypt API key hashing |
| PDF Parsing | pdfplumber (primary) → pypdf (fallback) → pytesseract OCR |
| Sanctions | OFAC SDN + EU Consolidated (rapidfuzz fuzzy match, 24h cache, configurable TTL) |
| Company Check | OpenCorporates API (token-bucket rate limited) |
| Frontend | React (JSX) + Vite |
| Scheduler | APScheduler (24h EU PEP refresh) |
| Containerization | Docker Compose (4 services: api, neo4j, postgres, redis) |

> *Σημ. conflict-resolution:* Παλιότερα αρχεία ανέφεραν `claude-sonnet-4-5`. **Locked σε `claude-sonnet-4-6`** (env-var driven). Επίσης το Neo4j τρέχει πλέον τοπικά μέσω Docker Compose (το AuraDB-only ήταν early bypass όταν δεν δούλευε το Docker στον M-series Mac).

**Pipeline (linear DAG, 5 nodes + error path):**
```
PDF → ingest → extract → reference_check → neo4j_persist → benchmark → END
         ↓ (error)                                                  ↑
         error_report ────────────────────────────────────────────-┘
```

| Node | Λειτουργία |
|---|---|
| `ingest` | PDF → RAM (ποτέ disk). SHA-256 hash atomically για audit. pdfplumber → pypdf → OCR fallback. Conditional edge: αν fail → error_report, **το Claude ΔΕΝ καλείται → zero wasted tokens.** |
| `extract` | Claude structured output → `FounderRiskProfile` + GI score + extraction_confidence. Redis circuit breaker (3 fails → 60s). Retry exponential backoff 1s→2s→4s, 429→10s. |
| `reference_check` | OFAC SDN + EU Consolidated (fuzzy) + OpenCorporates. Concurrent via `ThreadPoolExecutor`. **Non-blocking** — errors → `ReferenceCheckSummary.errors[]`. |
| `neo4j_persist` | Entity graph, tenant-isolated subgraph (SHA-256 του API key = partition key). Fully idempotent (MERGE παντού, ποτέ CREATE). **Non-blocking.** |
| `benchmark` | Υπολογίζει `market_percentile`. Mode A (Neo4j distribution) / Mode B (FATF cold-start). **Non-blocking** — fallback σε `claude_fallback` silently. |
| `error_report` | Structured error log. Zero tokens. Sentry/DataDog hook ready. |

**Error codes:** `EQ-1001` insufficient text · `EQ-1002` file not found · `EQ-1003` too large (>50MB) · `EQ-1004` parse error · `EQ-1006` OS read failure · `EQ-3004` EU PEP refresh fail.

**Immutable architectural decisions:**
- `governance_intensity` ορίζεται ΜΟΝΟ από Claude extraction — ποτέ mutated downstream.
- `market_percentile` ενημερώνεται ΜΟΝΟ από `benchmark_node`.
- Neo4j persist + Benchmark = non-blocking. Claude call = blocking (conditional edge).
- API keys = bcrypt hashes, ποτέ plaintext σε logs/DB.
- Ποτέ bypass του LangGraph DAG — πάντα `jarvis_engine.invoke(initial_state)`.
- Ποτέ `print()` σε Python modules — μόνο ο `log` logger.

---

## 05 · PYDANTIC SCHEMAS (SOURCE OF TRUTH — v3.1)

```python
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel

class PEPStatus(str, Enum):
    NOT_PEP = "not_pep"
    DIRECT_PEP = "direct_pep"
    FAMILY_PEP = "family_pep"
    ASSOCIATE_PEP = "associate_pep"
    FORMER_PEP = "former_pep"

class FATFRiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"
    UNKNOWN = "unknown"

class RelationshipType(str, Enum):
    FAMILY_MEMBER = "family_member"
    BUSINESS_PARTNER = "business_partner"
    BOARD_MEMBER = "board_member"
    EMPLOYER = "employer"
    EMPLOYEE = "employee"
    DONOR_RECIPIENT = "donor_recipient"
    LEGAL_COUNSEL = "legal_counsel"
    SHAREHOLDER = "shareholder"
    OTHER = "other"

class PoliticalConnection(BaseModel):       # → Neo4j edge
    person_name: str
    role_title: str
    relationship_type: RelationshipType
    pathway_distance: int                   # 1, 2, or 3 (graph depth)
    jurisdiction: str                       # ISO 3166-1 alpha-2 or EU/NATO
    is_pep_direct: bool
    still_active: bool

class CompanyRiskProfile(BaseModel):
    company_name: str
    registration_country: str
    is_offshore_flag: bool                  # deterministic, not inferred
    fatf_risk_level: FATFRiskLevel
    share_percentage: float                 # 0–100
    active_status: bool
    incorporation_date: Optional[str]
    public_procurement_exposure: bool
    procurement_value_eur: Optional[float]
    defense_gov_tech_sector: bool

class FounderRiskProfile(BaseModel):
    founder_id: str                         # FND-YYYYMMDD-001
    full_name: str
    nationality: Optional[str]
    pep_status: PEPStatus                   # regulatory requirement
    sanctions_hit: bool
    sanctions_list_source: Optional[str]
    associated_companies: List[CompanyRiskProfile]
    political_connections: List[PoliticalConnection]
    governance_intensity: float             # 0–100, Claude-set, NEVER mutated post-extraction
    market_percentile: float                # 0–100, set by benchmark_node only
    risk_flags: List[str]
    analyst_notes: Optional[str]

class ReferenceHit(BaseModel):
    source: str
    matched_name: str
    confidence: float
    query_name: str

class ReferenceCheckSummary(BaseModel):
    checked_at: str
    sanctions_hits: List[ReferenceHit]
    company_verifications: list
    risk_delta: float
    sources_checked: List[str]
    errors: List[str]

class RiskExtractionResult(BaseModel):      # audit envelope
    profile: FounderRiskProfile
    processing_timestamp: str
    document_hash: str                      # SHA-256
    extractor_version: str
    extraction_confidence: float            # 0–1
    used_ocr_fallback: bool
    reference_check: Optional[ReferenceCheckSummary]
    neo4j_persisted: bool
    benchmark_percentile: Optional[float]
    benchmark_cohort_size: int
    benchmark_source: str                   # cold_start_fatf | neo4j_distribution | claude_fallback
```

---

## 06 · GOVERNANCE INTENSITY SCORE & PATHWAY DISTANCE

**GI Score (0–100)** — deterministic rules πάνω στο AI-extracted output:

| Άξονας | Max points |
|---|---|
| PEP Status | 30 |
| Procurement Conflict | 25 |
| Political Network Depth | 25 |
| Offshore Exposure | 20 |

**Κατώφλια:**
- `< 40` → LOW RISK / "CLEARED FOR REVIEW" (`#00c896`)
- `40–70` → MEDIUM RISK / "CAUTION" (`#ffb700`)
- `≥ 70` → HIGH RISK / "ENHANCED DD REQUIRED" (`#ff3b3b`)

**Pathway Distance (Neo4j graph depth):**
- **D-1 Direct** — προσωπική άμεση σχέση (board seat, employer, family). Edge: solid red `#ff3b3b`.
- **D-2 Indirect** — ένα ενδιάμεσο βήμα. Edge: solid orange `#ff8c00`.
- **D-3 Extended** — δύο βήματα. Edge: dashed amber `#ffb700`.
- PEP nodes πάντα κόκκινα ανεξαρτήτως distance. Subject node πάντα Primary Blue, μεγαλύτερο radius.

---

## 07 · BENCHMARK ENGINE (Two-Mode)

- **Mode A — `neo4j_distribution`** (cohort ≥ 5 profiles): exact percentile από `governance_intensity` distribution στο Neo4j, NIST formula με midpoint interpolation για ties. `LIMIT 10000` (statistically identical accuracy, αποφυγή full table scan).
- **Mode B — `cold_start_fatf`** (cohort < 5): linear interpolation σε FATF/EBA calibration table (FATF Guidance 2019 + EBA/GL/2021/02).
- `governance_intensity` ΠΟΤΕ δεν mutated — μόνο το `market_percentile` ενημερώνεται.

> *Σημ.:* Παλιότερο αρχείο ανέφερε threshold N≥10 — **locked σε N≥5** (πιο πρόσφατη έκδοση).

---

## 08 · REFERENCE LAYER

**SanctionsChecker** — OFAC SDN XML (`treasury.gov`) + EU Consolidated List. Fuzzy: `rapidfuzz` `token_sort_ratio` threshold 88/100 (χειρίζεται name-order variations). Cache 24h configurable TTL (`SANCTIONS_CACHE_TTL_HOURS`). Emergency invalidation via `invalidate_cache()` / `POST /internal/sanctions/invalidate`.
- *Known fix:* EU list 403 από old endpoint → χρήση `https://data.europa.eu/euodp/repository/ec/fsd/fsf/EU_FSF/EU_FSF-1_1.xml`.
- *rapidfuzz v3+:* χρήση `process.extract()` ΟΧΙ `process.extractBests()` (removed).

**CompanyChecker** — OpenCorporates public API. Token-bucket rate limit (10 req/s, burst 5; 50 req/min public / 500 με key). Άφησε `OPENCORPORATES_API_KEY=` κενό για public access.

**Αρχή:** Non-blocking. Αποτυχία δεν σταματά το pipeline. Profile ανανεώνεται μέσω `model_copy(update=...)`.

---

## 09 · NEO4J — GRAPH LAYER

**Schema:**
```
(:Founder)-[:CONTROLS_STAKE {share_percentage}]->(:Company)
(:Founder)-[:POLITICALLY_CONNECTED {rel_type, pathway_distance}]->(:PoliticalFigure)
```

**Key queries:** `pathway_network(founder_id, max_hops=2)` (variable-length traversal — αδύνατο αποδοτικά σε SQL) · `shared_connections(min_gi=70.0)` (cross-portfolio founders με κοινές political connections).

**Indexes:** `Founder.id` UNIQUE · `Company.key` = slug `name|country` · `PoliticalFigure.key` = slug `name|jurisdiction` (όλα Community-edition compatible).

**Tenant isolation:** SHA-256 του API key = subgraph partition key. **Idempotent:** MERGE παντού, ποτέ CREATE.

**Inside Docker:** services μιλάνε via service hostname (`neo4j:7687`), όχι localhost. `docker compose restart` ΔΕΝ reload-άρει env_file — χρήση `up -d --force-recreate`.

---

## 10 · BRAND IDENTITY & DESIGN SYSTEM

*(Πλήρες spec: `EuroQuant_Brand_Identity_v1.md`)*

**Backgrounds (4-tier):**
| Token | Hex | Χρήση |
|---|---|---|
| Terminal Canvas | `#080c14` | Root background (digital) — ποτέ για cards |
| Card Surface | `#0d1420` | Όλα τα cards/panels. Border: `1px solid #131a27` |
| Institutional Navy | `#001B52` | Print/PDF, section dividers, brand on white (LinkedIn) |
| Primary Blue | `#003399` | CTAs, active tabs, subject node, brand |

**Accents:** Cyber Cyan `#00F0FF` (accent ONLY, max 8px) · Steel Blue `#4a90d9` (logo, nav — ΟΧΙ investor decks) · Border `#131a27` · Muted `#2d3a50` · Sub `#8899aa` · Text `#e2e8f0` · Bright `#f0f4ff`.

**Severity:**
| Level | Hex | Trigger |
|---|---|---|
| CRITICAL | `#ff3b3b` | D-1 PEP, Sanctions Hit, GI ≥ 70 |
| HIGH | `#ff8c00` | D-2, Offshore, active procurement |
| MEDIUM | `#ffb700` | D-3, indirect procurement, FATF elevated |
| CLEAR | `#00c896` | No flags, GI < 40 |

**Typography:** **Space Grotesk** display/body (production) / Poppins fallback · **DM Mono** για ΟΛΑ τα data (scores, IDs, hashes, timestamps, badges). Section labels: DM Mono 8px uppercase, letter-spacing 0.2em. Hero titles: display 700, `#f0f4ff`.

**Animations:** Cards `fadeUp` 500ms staggered 50–300ms · GI count-up 1600ms (300ms delay) · percentile count-up 1400ms (600ms delay) · verdict card `pulse` 2.5s infinite.

**Neo4j graph viz:** Subject = Primary Blue larger radius · PEP = Critical Red always · D-3 edges dashed (lower certainty) · edge labels σε `#0d1420` pill centered · node labels DM Mono 9px.

**UX Copy (Ephemeral — non-negotiable):**
| Moment | Σωστό | Λάθος |
|---|---|---|
| File input | "Ingest for Analysis" | "Upload Document" |
| Processing | "● EPHEMERAL MODE · ACTIVE" | "Processing..." |
| Post-analysis | "Document Destroyed · 0 bytes retained" | "Upload complete" |
| Audit | "SHA-256: {hash} · Processed {timestamp}" | "File analyzed" |
| Timer | "Jarvis Engine · {Xs elapsed}" | "Loading..." |

**PDF report state (current):** `pdf_generator.py` = ReportLab-based, **legibility fix εφαρμοσμένο** — deep gradient canvas (`#0b1322`→`#070b13`) + brightened print tokens (COL_MUTED→`#7f90ab`, COL_SUB→`#aab6c9`) + embedded fonts (SpaceGrotesk→Poppins→Helvetica, DM Mono για mono). `_safe()` glyph sanitizer strip-άρει emoji που render-άρουν ως μαύρα κουτάκια. Risk flags severity by index (0–1 CRITICAL, 2–3 HIGH, 4+ MEDIUM).
> *Long-term preference:* Playwright/Chromium ή HTML-first για max brand fidelity — αλλά το reportlab build είναι πλέον acceptable production post-fix.

---

## 11 · CODEBASE STRUCTURE

**Root:** `/Users/kakoullig/Desktop/euroquant_v4/` (git repo)

```
euroquant_v4/
├── api/
│   ├── main.py            # FastAPI gateway — auth, rate limiting, ephemeral handling, endpoints
│   ├── jarvis_v3.py       # Jarvis engine (LangGraph pipeline, all nodes) — v3.1.0
│   ├── pdf_generator.py   # Branded PDF report (reportlab, GDPR Art. 22 sign-off)
│   ├── usage.py           # UsageMeter (per-tenant metering)
│   ├── requirements.txt
│   └── .env               # SECRETS — never commit
├── dashboard/
│   ├── App.jsx                # Shell (upload / processing / results states)
│   ├── EuroQuantDashboard.jsx # Main dashboard + NetworkGraph (SVG pathway viz)
│   └── api_client.js          # dashboard↔backend connector (CRITICAL)
├── reports/                   # (legacy location of pdf_generator — verify single source)
├── scripts/
│   ├── seed_neo4j.py      # loads demo data into Neo4j
│   └── hash_key.py        # ops: generate bcrypt key hash
├── deploy/
│   └── Dockerfile
├── docker-compose.yml         # LIVE 4-service stack (api + neo4j + postgres + redis)
├── docker-compose.override.yml# dev hot-reload
├── render.yaml                # Render deploy config (root) → uvicorn api.main:app
├── setup_mac.sh               # one-time Mac bootstrap
├── Makefile                   # make up/down/logs/seed/demo
├── CLAUDE.md                  # architectural context για Claude Code (κάθε session)
├── demo_data_synthetic.json   # canonical synthetic demo dataset
└── EuroQuant_Brand_Identity_v1.md
```

> *Conflict note:* Η `pdf_generator.py` εμφανίστηκε και σε `api/` και σε `reports/` σε διαφορετικά session logs. Πιο πρόσφατη ένδειξη = `api/pdf_generator.py`. **Επαλήθευσε ότι υπάρχει ένα μόνο canonical αρχείο πριν το επόμενο commit.**

**API endpoints (live: `localhost:8000/api/docs`):**
`GET /api/health` · `GET /` · `POST /api/v1/analyze` · `GET /api/v1/report/{request_id}` · `POST /api/v1/analyze/report` · `POST /internal/sanctions/invalidate` · `GET /api/v1/audit/{request_id}` · `GET /api/v1/usage`

**Local run:** `make demo` (up + seed + dashboard). Production: `uvicorn api.main:app --host 0.0.0.0 --port 8000 --workers 4`.

---

## 12 · ΟΛΟΚΛΗΡΩΜΕΝΗ ΔΟΥΛΕΙΑ (DO NOT RE-IMPLEMENT)

**Sprints (committed):**
| Sprint | Τι έγινε |
|---|---|
| M-0 | Security hardening — bcrypt API keys, .env secrets, MODEL_NAME env-var → claude-sonnet-4-6, Redis circuit breaker |
| M-1 | slowapi rate limiting, structured EQ-XXXX error codes, EU PEP scheduled refresh (APScheduler 24h), token-bucket για OpenCorporates, sanctions invalidate endpoint |
| M-2 | Neo4j graph persistence + tenant isolation (SHA-256 subgraph), PDF generator wired, audit trail endpoint |
| M-3 | Reference Layer — OFAC + EU sanctions, 24h cache |
| M-4 | Benchmark Engine — Mode A/Mode B, data-driven market_percentile |
| M-5 | FastAPI gateway, usage metering (/usage), PDF report generation, audit trail |
| DEMO | One-command launch (Makefile + seed), force-directed NetworkGraph viz, ephemeral flow polish + PDF download |

**Engineering hardening log (FIX-1 → FIX-10):**
| Fix | Node | Λύση |
|---|---|---|
| FIX-1 | ingest | `_check_file_size()` — reject oversized πριν οποιοδήποτε I/O |
| FIX-2 | ingest | Unicode category ratio check (L/N/P/Z ≥ 0.70) αντί `isprintable()` — block garbled text |
| FIX-3 | ingest | `_check_ocr_available()` at module load → startup logs |
| FIX-4 | ingest | `_read_pdf_bytes()` — atomic read για hash + bytes (race condition fix) |
| FIX-5 | sanctions | Configurable cache TTL via `SANCTIONS_CACHE_TTL_HOURS` |
| FIX-6 | sanctions | `invalidate_cache()` για OFAC RSS webhook |
| FIX-7 | company | Warning at `__init__` αν λείπει API key (no silent 401) |
| FIX-8 | benchmark | **CRITICAL:** `WHERE f.id <> $exclude_id` (missing param) |
| FIX-9 | benchmark | `LIMIT 10000` — αποφυγή O(n) full table scan |
| FIX-10 | extract | Exponential backoff (1/2/4s) + `_CircuitBreaker` class (no silent failure) |

**Current status:** Full stack runs LIVE locally via `make demo`. 4 services healthy. Neo4j connected, 8 demo nodes seeded (1 Founder, 4 Companies, 3 PoliticalFigures). Swagger live. Repo clean.

---

## 13 · OPEN TRACKS & ΕΠΟΜΕΝΑ ΒΗΜΑΤΑ

**🎯 IMMEDIATE PRIORITY — ΦΑΣΗ Γ (CUSTOMER DISCOVERY):** Outreach σε 5 CEE/Baltic DefenseTech VC Managing Partners. Validation > distribution. Όλα τα assets είναι έτοιμα (live demo URL + pilot offer doc v1.1 + signed-DPA flow). **Η πραγματική επόμενη κίνηση είναι αυτή — όχι άλλο engineering.**

| Track | Priority | Status | Description |
|---|---|---|---|
| **Γ** | **TOP** | ▶ NEXT | Customer discovery — 5 VC Managing Partners. Design-partner framing, ΟΧΙ sales pitch. |
| **A** | HIGH | ✅ DONE | Cloud deploy — API + demo LIVE σε Render 24/7 (βλ. §14). MacBook dependency λυμένη. |
| **C** | HIGH | pending | Connect React dashboard (App.jsx + api_client.js) στο live API — real in-UI PDF upload flow (τώρα μόνο via Swagger). Points σε `euroquant-api.onrender.com`. |
| **B** | MEDIUM | pending | LinkedIn Phase A thought leadership (authority-building, ΟΧΙ distribution). Discretion = product feature: no architecture reveals, no product screenshots. |
| M-6 | LOW | pending | Multi-PDF batch processing (queue) |

**Post-pilot roadmap:** Redis-backed multi-worker rate limiting/circuit breaker · per-key billing · OFAC RSS webhook · PostgreSQL audit log · Sentry/Datadog · PDF watermarking ("DRAFT — Pending Analyst Sign-off") · Python + TypeScript SDK.

**First Pilot Demo target:** 3 VC funds, zero cost, signed DPA, "advisory output" framing.

---

## 14 · DEPLOYMENT

**✅ LIVE — Render (both services up 24/7):**
| Service | URL | Runtime | Region | Σημείωση |
|---|---|---|---|---|
| `euroquant-api` | `euroquant-api.onrender.com` | Python 3 | Oregon | Jarvis v3 online. `/api/health`=200, `/api/docs`=Swagger. **Canonical API — ΟΛΑ τα references δείχνουν εδώ** (demo keep-alive, pilot doc, api_client.js). |
| `euroquant-demo` | `euroquant-demo.onrender.com` | Static | Global | Self-contained HTML dashboard (Kaspars Veidemanis synthetic). Keep-alive script pings το API κάθε 14′. Served ως `index.html`. |

**Old service `euroquant.onrender.com`** (V1 MEP terminal): δεν εμφανίζεται πλέον στο dashboard του Giorgos — εκτός ελέγχου (πιθανώς auto-deleted ως inactive free service ή ανήκε σε παλιό account). **Αδιάφορο** — δεν μπορεί να γίνει rename/manage. Το rename `euroquant-api → euroquant` **απορρίφθηκε** (σπάει 3 live references για μηδενικό όφελος· custom domain όταν υπάρχει).

**Render conventions — costly to relearn (μάθαμε με errors):**
- Python version via `PYTHON_VERSION` env var — ΟΧΙ `pythonVersion` field στο `render.yaml`, ΟΧΙ `runtime.txt`.
- Static site `staticPublishPath` πρέπει να είναι **relative** (`.`) — ΟΧΙ absolute (`/`). Absolute → build error.
- Static site σερβίρει **`index.html`** by default. Custom filename → "Not Found". Fix: `cp EuroQuant_Demo_Dashboard.html index.html` + commit.
- `render.yaml` στο **repo root** — ΟΧΙ σε subdirectory.
- Start command για nested app από root: `uvicorn api.main:app --host 0.0.0.0 --port $PORT` (ΟΧΙ `main:app`).
- Free tier services κοιμούνται μετά από ~15′ αδράνειας (~50s cold start) → γι' αυτό υπάρχει το keep-alive ping στο demo.
- Static site deploy ευκολότερο **μέσω UI** (New + → Static Site → repo → Publish dir `.`) παρά μέσω Blueprint όταν το `render.yaml` δίνει errors.
- Git push μέσω Personal Access Token.

**Planned — free hybrid cloud (αν χρειαστεί scale):** Railway (FastAPI) + Neo4j AuraDB Free + Supabase (Postgres) + Upstash (Redis). Upgrade σε paid μόνο μετά τον πρώτο paying client.

**External APIs:** OpenCorporates · OFAC SDN + EU Consolidated (24h cache) · Claude API (`claude-sonnet-4-6`).

---

## 15 · CANONICAL DEMO DATASET (SYNTHETIC)

**ΚΡΙΣΙΜΟΣ ΚΑΝΟΝΑΣ:** ΠΟΤΕ real individuals/companies σε demo profiles. Fabricated risk dossiers σε πραγματικά πρόσωπα = defamation + GDPR violation. ΜΟΝΟ clearly-labeled synthetic.

**File:** `demo_data_synthetic.json` · **Subject:** Kaspars Veidemanis (fictional, Latvia)
- **GI Score:** 71 (just into HIGH — nuanced, defensible) · **Market Percentile:** 88th
- **PEP Status:** associate_pep · **Sanctions:** CLEAR (key talking point — existing tools τον βγάζουν clean)
- **Companies (4):** Nordhaven Maritime Autonomy AS (EE, 58%, DefenseTech, €6.2M) · Baltic Nominee Holdings Ltd (BVI, 100%, offshore, FATF HIGH unverified) · Riga DeepSensor SIA (LV, 34%, DefenseTech, €1.1M) · Kurzeme Defence Logistics SIA (LV, 50%, DISSOLVED)
- **Political Connections (3):** Andris Kalnins (Former MoD State Secretary LV, board_member, D-1, PEP ← key finding) · EU Defence Fund Capability Directorate (business_partner, D-2) · Liga Ozola (MP National Security Committee LV, donor_recipient, D-2, PEP)
- **Risk Flags:** 7 (2 CRITICAL, 2 HIGH, 3 MEDIUM) · **Benchmark:** cold_start_fatf · **Confidence:** 0.96

**Demo flow (5 min):** Dashboard → explain ephemeral (PDF in → metrics out → PDF destroyed) → Tab Overview (gauge + percentile + breakdown) → Companies (offshore/holding) → Connections (pathway distances) → Flags (by severity).
**Pitch line:** *"Manual DD on this profile: 20+ hours. Jarvis: 30 seconds. The PDF doesn't exist anymore."*

> *Σημ.:* Παλιότερα demo subjects (Aleksander Petrov-Novak GI 95, Marcus Reinhardt GI ~70) είναι legacy test docs (`test_doc.pdf`). Canonical πλέον = Kaspars Veidemanis.

---

## 16 · GDPR / LEGAL COMPLIANCE

**CJEU Schufa ruling (C-634/21):** automated score που επηρεάζει decisions για natural persons παραβιάζει GDPR Article 22 — ακόμα και με disclaimer.
**Λύση (εφαρμοσμένη):** Κάθε PDF report περιλαμβάνει mandatory **"Analyst Verification" section** με sign-off field. Μέχρι την υπογραφή, το report είναι "advisory only". Μετατρέπει το GI score από "automated decision" σε **"automated input to human decision"** → Article 22 compliant. Legal docs: `EuroQuant_Pilot_Offer_and_DPA.md`.

---

## 17 · KEY LEARNINGS & HARD RULES

- **Demo data:** πάντα clearly-labeled synthetic. Real persons = defamation + GDPR.
- **🚫 MEP DATABASE — PERMANENTLY REJECTED (9 June 2026 council):** Το παλιό V1 dashboard είχε σκορ ρίσκου + "ENHANCED DILIGENCE" actions πάνω σε 719 υπαρκτούς ευρωβουλευτές (πολλοί PEP). Αυτό είναι **ακριβώς** το Schufa C-634/21 / Article 22 σενάριο + δυσφήμηση. **Κανόνας:**
  - Ποτέ live-serving σκορ/actions πάνω σε αληθινά κατονομαζόμενα πρόσωπα.
  - Re-scan των δημόσιων MEP PDFs στον Neo4j = **επίσης απορρίφθηκε**. Δύο λόγοι: (1) το NER έβγαλε σκουπίδια ("DEVONO ESSERE AG", "PARLAMENTUL EUROPEAN SA", "Eni" κολλημένο σε δεκάδες) → λανθασμένες factual διασυνδέσεις αληθινών ανθρώπων = ξανά δυσφήμηση χωρίς το νούμερο· (2) λάθος dataset — το προϊόν αναλύει **ιδρυτές που δίνει ο VC**, όχι ευρωβουλευτές. Γεμίζει το demo, δεν φέρνει πελάτη.
  - Reference layer στον Neo4j (PEP/πολιτικά πρόσωπα για pathway distance): OK **μόνο** από καθαρή structured πηγή, **μόνο** factual affiliations, **ποτέ** σκορ — και μετά τη Φάση Γ, με βάση το τι ζητάει πραγματικός πελάτης.
- **API key security:** ένα live key εκτέθηκε σε chat παλιότερα — ανακλήθηκε άμεσα. ΟΛΑ τα secrets σε `.env` με `python-dotenv`. Ποτέ hardcoded, ποτέ σε chat, ποτέ σε logs, ποτέ commit `.env`.
- **Two-key distinction:** `ANTHROPIC_API_KEY` (api/.env, Jarvis billing, ποτέ global export) ≠ Claude Code OAuth (Pro subscription, developer work).
- **Never store documents** — ephemeral είναι το core differentiator. Αν code persists raw content, remove it.
- **Never bypass LangGraph DAG** — πάντα `jarvis_engine.invoke()`.
- **Never `print()` σε modules** — μόνο logger.
- **Git safety net:** checkpoint commit πριν από κάθε reorganization.
- **Notebook editing pattern:** read `.ipynb` ως JSON → manipulate cell sources με exact `str.replace()` → write σε scratch → verify με `ast.parse()` / `py_compile`.
- **Docker:** first-run images αργούν (όχι freeze). `restart` ΔΕΝ reload-άρει env — `up -d --force-recreate`. Inside Docker: service hostnames (`neo4j:7687`), όχι localhost.
- **.env format:** μία μεταβλητή/γραμμή, χωρίς trailing spaces, χωρίς inline comments, χωρίς quotes. `NEO4J_URI=neo4j+s://xxxxxx.databases.neo4j.io` (cloud, no port) ή `bolt://localhost:7687` (local Docker).
- **Data gathering** = δουλειά του πελάτη ή μελλοντικού agent — ΟΧΙ του Giorgos. Ο Jarvis extracts & scores, δεν gather-άρει.

---

## 18 · HONEST CURRENT LIMITATIONS (γνώριζέ τες πριν από κάθε meeting)

1. Benchmark = cold-start, όχι real portfolio data ακόμα.
2. Neo4j graph = island per report — multi-hop cross-founder paths χτίζονται με scale.
3. LLM extraction non-deterministic — μετριάζεται με schema + confidence + human sign-off.
4. Sanctions matching = δικό μας fuzzy matching, όχι licensed vendor (Refinitiv/ComplyAdvantage) ακόμα.
5. OpenCorporates: opacity σε BVI/Cayman — αυτό είναι feature, όχι bug (εκεί κρύβεται το ρίσκο).

---

## 19 · ENV VARIABLES REFERENCE

```bash
ANTHROPIC_API_KEY=          # Jarvis LLM backbone — per-token billing, never global export
JARVIS_MODEL=claude-sonnet-4-6
EUROQUANT_API_KEYS=         # comma-separated, bcrypt-hashed in prod
NEO4J_URI=bolt://localhost:7687   # or neo4j+s://xxxxxx.databases.neo4j.io (AuraDB)
NEO4J_USER=neo4j
NEO4J_PASSWORD=             # set manually in api/.env (not auto by setup_mac.sh)
OPENCORPORATES_API_KEY=     # empty = public access (50 req/min)
SANCTIONS_CACHE_TTL_HOURS=24
REDIS_URL=                  # enables Redis circuit breaker + rate limiting
MAX_INGESTION_MB=50
ALLOWED_ORIGINS=            # CORS — comma-separated frontend URLs
LOG_LEVEL=INFO
```

---

## 20 · LINKEDIN / POSITIONING

**Audience:** VC Managing Partners — ΟΧΙ compliance teams. **Tone:** authoritative, precise, zero startup hype. Never "innovative"/"cutting-edge" — show, don't tell ("weeks → 30 seconds", "D-3 graph depth", "ephemeral processing"). Κάθε πρόταση = specific VC pain point.

**Tagline:** `Automated Regulatory Due Diligence for Venture Capital · DefenseTech · GovTech · DeepTech`
**Industry field:** "Software Development" / "Technology, Information and Internet" (ΟΧΙ "Financial Services"). **Website:** remove μέχρι production domain.

**Production About (ready):**
> EuroQuant automates regulatory Due Diligence for Venture Capital funds investing in high-sensitivity sectors — DefenseTech, GovTech, and DeepTech.
>
> Our AI engine, Jarvis, cross-references private Cap Tables and founding documents against public registries, PEP databases, and political network graphs in under 30 seconds — surfacing hidden conflicts of interest before capital is deployed.
>
> → Ephemeral Processing: documents are analyzed in RAM and destroyed immediately. Zero storage, zero data leakage.
> → Pathway Distance Analysis: indirect connections mapped up to 3 degrees of separation via a Neo4j graph layer.
> → Governance Intensity Score: a single quantified risk metric, benchmarked against the European VC market.
>
> Built for Managing Partners and Due Diligence teams who cannot afford to discover a regulatory conflict after the term sheet is signed.

---

## 21 · COMMERCE LAYER (live 11 June 2026)

**End goal achieved:** "First-Customer System" — a live commercial surface on an owned domain that accepts real payment, with the demo attached as proof.

**Topology:**
| Surface | URL | Host | Status |
|---|---|---|---|
| Store (Sample Report) | `https://euroquant.io` | Netlify (static `index.html`) | LIVE |
| Demo dashboard | `https://demo.euroquant.io` | Render (existing static site) | LIVE |
| API / Jarvis engine | `…onrender.com` | Render | LIVE (frozen until validation) |
| Payment | Stripe Payment Link (LIVE mode) | Stripe | LIVE — accepts real €490 |
| Founder email | `george@euroquant.io` | Porkbun forwarding → Gmail | LIVE (send-from via Zoho: TODO) |

**Domain:** `euroquant.io` registered at Porkbun, 1-year, **auto-renew ON**. DNS: A record → Netlify `75.2.60.5`; `www` CNAME → Netlify site; `demo` CNAME → Render target. `.com`/`.eu` unavailable (taken by unrelated entities — trademark/SEO awareness item, not an active conflict).

**The Offer — Sample Governance Report:**
- Fixed scope: one company · one report · 48h delivery · **€490 introductory**.
- Two input modes: **Public** (named registered company, public-registry data) or **Private** (redacted/synthetic cap table, in-memory processing, DPA-lite terms shown on page).
- Output: PDF — ownership structure, sanctions/PEP screening, governance-risk score, flagged pathways. Watermarked "ADVISORY — Sample Engagement". Analyst sign-off before delivery (preserves Article 22 / Schufa posture from §16).
- Fulfillment: **manual** through the live API (~30 min/order). Full reference: `ASYNC_REVENUE_TRACK.md`.
- **Automation gate:** Stripe webhook → API → auto-delivery is built **only at the 3rd paid order**. Until then, manual fulfillment. (No engineering before validation.)

**Site source:** single-file `euroquant_sample_report.html` (deployed as `index.html`). Two setup constants at top: `STRIPE_PAYMENT_LINK` (LIVE) + `DEMO_URL`. Includes OG/Twitter meta, favicon, trust section (founder + SINN + G4), embedded DPA-lite summary. Brand-locked: navy `#001B52`, Space Grotesk / IBM Plex. **No stack names, no benchmark claims, no absolute guarantees on the page** (Brand Pack rules enforced).

**Distribution asset:** `euroquant_linkedin_thumbnail.png` (1200×627) for LinkedIn Featured + future milestone post.

---

## 22 · DISTRIBUTION RULES (NEW)

- **Channels:** personal LinkedIn Featured (link + thumbnail), company page About + website field, email signature.
- **HARD GUARDRAIL — discovery/commerce separation:** the three contacted discovery targets (Matej Luhovy/Presto, Sandra Golbreich/BSV, Marcin Hejka/OTB) and any future "not selling anything" discovery contact **never receive the store link in outreach**. They were promised a research conversation; sending a price 5 days later burns both the call and credibility. If they find the offer themselves via the profile, that is legitimate (inbound ≠ outbound).
- **16 Jun follow-up** to silent discovery targets = clean discovery message only, no product/price.
- **Analytics:** privacy-first only (Cloudflare Web Analytics / GoatCounter) — **never** a cookie-consent tool like GA4 on a privacy-positioned product.
- **Inbound scam awareness:** post-launch scrapers (fake "directory listings", domain-renewal invoices, SEO offers) will arrive. Only Porkbun and Stripe emails about the domain/payments are legitimate. Don't click claim/unsubscribe on opportunistic mail.

---

## 23 · OPS & SOURCE OF TRUTH (NEW)

- **GitHub private repo `euroquant`** = canonical store going forward. Structure: `/api` (FastAPI + Jarvis), `/web` (dashboard + store HTML), `/docs` (all .md: Blueprint, packs, instructions), `/ops` (configs, SOPs).
- **Claude Code** manages the repo and files directly. **Claude.ai Project Knowledge** stays lean (4–5 canonical files); sync rule: **the repo is edited first**, Project Knowledge mirrors only canonical docs.
- **Obsidian (optional):** open the repo folder as a vault for reading/notes — same files, no duplication.
- **Sync rule:** anything that changes architecture/schema/strategy → update this Blueprint in the repo, bump version, then mirror to Project Knowledge.

---

## OPEN TRACKS (status as of 11 Jun 2026)

| Track | Status |
|---|---|
| Customer discovery (5 calls) | 3 LinkedIn notes sent (Matej, Sandra, M. Hejka); awaiting replies; 16 Jun follow-up queued |
| Commerce / store | ✅ LIVE on euroquant.io, accepting real payment |
| Stripe send-from email (Zoho) | TODO |
| GitHub repo | ✅ Done (see §23) |
| Analytics install | TODO (Cloudflare/GoatCounter) |
| `og:image` wired to thumbnail | TODO (upload PNG to site, add meta) |
| CV | Instructions ready (`CV_GENERATOR_INSTRUCTIONS.md`); generate after internships or on demand |
| LinkedIn headline (Student → Founder) | Founder's call — deferred; flagged as now costing conversions |
| Fulfillment automation | Gated to 3rd paid order |
| Engineering freeze | Holds until discovery exit criteria met (`DISCOVERY_EXECUTION_PACK.md` §5) |

---

*MASTER EUROQUANT BLUEPRINT · v4.2 · Internal / Co-founder Only · 11 June 2026*
*Ανανέωσε αυτό το αρχείο μετά από κάθε major session που αλλάζει architecture, schema, ή στρατηγική.*
