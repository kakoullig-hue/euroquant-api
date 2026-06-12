# EuroQuant Risk Terminal — Claude Code Project Intelligence
> Version: 1.0 · June 2026 · Lead AI Engineer: Giorgos
> This file is the single source of truth for every Claude Code session in this repo.

---

## 1. WHAT THIS PROJECT IS

**EuroQuant** is a B2B Enterprise SaaS RegTech platform that automates regulatory Due Diligence for Venture Capital funds investing in DefenseTech, GovTech, and DeepTech.

**Core Value Prop:** Upload a private Cap Table → Jarvis analyzes it in RAM → outputs a Governance Intensity Score (0–100) benchmarked against the market → document is destroyed. Zero storage. Zero data leakage.

**Target Customer:** Managing Partners & DD Analysts at VC funds operating in CEE/Baltic markets.

**Current Phase:** Sprint 0 — Stabilization. Heading toward CEE Pilot (Poland DefenseTech VC).

---

## 2. REPOSITORY STRUCTURE

```
euroquant_v4/
├── jarvis_v3.py          # ← THE CORE ENGINE. Do not break this.
├── main.py               # FastAPI Gateway (REST wrapper around Jarvis)
├── pdf_generator.py      # PDF report builder (ReportLab)
├── App.jsx               # React frontend — Upload + Processing screens
├── EuroQuantDashboard.jsx# React dashboard — Risk report visualization
├── demo_data_synthetic.json # Synthetic demo data for frontend testing
├── .env                  # API keys — NEVER commit this
└── CLAUDE.md             # This file
```

---

## 3. SYSTEM ARCHITECTURE — THE JARVIS ENGINE

Jarvis is a **Deterministic DAG Multi-Agent System** built on LangGraph.

### Pipeline Flow (strict linear DAG):
```
PDF Input
    │
    ▼
[Agent 1] ingest_pdf_node
    • pypdf → pdfplumber → pytesseract OCR (fallback)
    • SHA-256 hash computed atomically
    • Max file size: 50MB
    │
    ▼
[Agent 2] extract_risk_node  ← Claude claude-sonnet-4-6 (UPGRADE NEEDED from 4-5)
    • Structured extraction via with_structured_output(FounderRiskProfile)
    • Circuit breaker (3 failures → 60s fast-fail)
    • Retry: 3 attempts, exponential backoff (1s→2s→4s), 429→10s delay
    │
    ▼
[Agent 3] reference_check_node
    • OFAC SDN List (US Treasury) — fuzzy match via rapidfuzz
    • EU Consolidated Sanctions List — fuzzy match
    • OpenCorporates company verification
    • Concurrent via ThreadPoolExecutor
    │
    ▼
[Agent 4] neo4j_persist_node
    • Stores founder + connections as graph nodes/edges
    • Pathway Distance alerts (D-1, D-2, D-3)
    • bolt://localhost:7687 (local) → AuraDB (production)
    │
    ▼
[Agent 5] benchmark_node
    • Mode A: Neo4j distribution (if N≥10 founders in DB)
    • Mode B: FATF cold-start table (fallback)
    • Updates market_percentile in result
    │
    ▼
RiskExtractionResult (Pydantic) → JSON → PDF Report
```

### Key Models (Pydantic):
- `FounderRiskProfile` — the core output schema
- `PoliticalConnection` — Neo4j edge (person, role, relationship_type, pathway_distance 1-3, jurisdiction)
- `CompanyRiskProfile` — associated companies (offshore flags, procurement exposure)
- `RiskExtractionResult` — wrapper with audit metadata, hash, confidence, reference check
- `JarvisState` — LangGraph TypedDict state passed between agents

---

## 4. TECH STACK

| Layer | Technology | Notes |
|---|---|---|
| AI Extraction | Claude claude-sonnet-4-6 (upgrade from 4-5) | via langchain_anthropic |
| Orchestration | LangGraph (DAG) | StateGraph + END |
| API Gateway | FastAPI + uvicorn | `main.py` |
| Graph DB | Neo4j (local bolt / AuraDB prod) | Pathway distance alerts |
| Vector DB | PostgreSQL + pgvector | Planned, not yet implemented |
| PDF Parsing | pdfplumber + pypdf + pytesseract | Fallback chain |
| Sanctions | OFAC SDN + EU Consolidated | 24h cache, configurable TTL |
| Company Check | OpenCorporates API | Rate-limited, ThreadPoolExecutor |
| Frontend | React (JSX) | No build tool — direct JSX |
| PDF Reports | ReportLab | `pdf_generator.py` |
| Auth | X-API-Key header | VALID_API_KEYS env var |

---

## 5. ENVIRONMENT VARIABLES (.env)

```bash
ANTHROPIC_API_KEY=sk-ant-...        # Jarvis engine — API billing
EUROQUANT_API_KEYS=key1,key2        # FastAPI gateway auth (comma-separated)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=...
SANCTIONS_CACHE_TTL_HOURS=24        # 1 for high-risk workflows
MAX_INGESTION_MB=50
LOG_LEVEL=INFO
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

⚠️ **CRITICAL:** Never hardcode API keys. Never commit `.env`. The `ANTHROPIC_API_KEY` is for Jarvis pipeline billing (API). Claude Code auth is separate (Pro subscription OAuth).

---

## 6. OPEN TECHNICAL DEBT — PRIORITY ORDER

These are the known issues. Work on them in this order:

### 🔴 CRITICAL (do before any client demo)
- **M-0.1** `MODEL_NAME = "claude-sonnet-4-5"` in `jarvis_v3.py` → upgrade to `"claude-sonnet-4-6"`. Make it env-var driven: `os.getenv("JARVIS_MODEL", "claude-sonnet-4-6")`
- **M-0.2** Circuit breaker is in-process only → breaks on uvicorn multi-worker. Must migrate state to Redis (`key: "jarvis:circuit_breaker"`). Current `_CircuitBreaker` class is at module level in `jarvis_v3.py`.
- **M-0.3** `VALID_API_KEYS` stored plaintext in env → hash at rest with bcrypt. Add `api_keys` table in PostgreSQL for per-key rate limits and rotation.

### 🟠 HIGH (before pilot)
- **M-1.1** EU PEP Registry refresh → scheduled cron job, alert on 4xx/5xx feed failure
- **M-1.2** OpenCorporates ThreadPoolExecutor has no backpressure → add token-bucket rate limiter
- **M-1.3** `POST /internal/sanctions/invalidate` endpoint for emergency EU/OFAC designations
- **M-1.4** Structured error codes: `EQ-1001: PDF_ENCRYPTED`, `EQ-2003: NEO4J_TIMEOUT`, etc. — needed for enterprise support tickets
- **M-2.1** `pdf_generator.py` exists but is not wired into the FastAPI pipeline → integrate as auto-generated report on every `/api/v1/analyze` call

### 🟡 MEDIUM (after pilot)
- **M-2.2** `GET /audit/{request_id}` endpoint — SHA-256 + timestamp + GI score, no document content
- **M-2.3** Neo4j graph visualization in `EuroQuantDashboard.jsx` (D-1/D-2/D-3 nodes already styled in design system)
- **M-5.1** Tenant isolation — per-API-key isolated subgraph in Neo4j
- **M-5.2** Usage metering — log every `/analyze` call per-tenant for future billing

---

## 7. CODE CONVENTIONS

### Python (jarvis_v3.py, main.py)
- All agent nodes return `dict` (partial JarvisState update), never mutate state directly
- Logging: always use `log.info("[Agent N — Name] message", args)` format
- Error handling: non-fatal errors → log.warning + continue; fatal → set `status="model_error"` + `error_message`
- Type hints: mandatory on all function signatures
- Pydantic models: use `Field(description=...)` on every field — the description IS the LLM prompt
- Never use `print()` in production code — use `log.*`

### React (App.jsx, EuroQuantDashboard.jsx)
- No external build tool — keep as single-file JSX
- All styles inline via the `styles` object or `C` color token object
- Color tokens (MUST follow — see Brand Identity):
  - Background: `#080c14` (Terminal Canvas)
  - Cards: `#0d1420` (Card Surface)
  - Primary: `#003399`
  - Accent: `#00F0FF` (Cyan — small elements only)
  - Text: `#e2e8f0`
  - Bright: `#f0f4ff`
- Fonts: `IBM Plex Sans` (display/body) + `DM Mono` (all data/scores/hashes)
- UX copy rules: "Ingest for Analysis" NOT "Upload", "EPHEMERAL MODE · ACTIVE" NOT "Processing..."

### General
- Production-first mindset: every line assumes Cloud/Enterprise deployment
- No magic numbers — use named constants or env vars
- Comments explain WHY, not WHAT

---

## 8. HOW TO RUN LOCALLY

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Start Neo4j (Docker)
docker run -d --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/yourpassword \
  neo4j:5

# 3. Run Jarvis directly (CLI test)
python jarvis_v3.py test_doc.pdf

# 4. Run FastAPI gateway
uvicorn main:app --reload --port 8000

# 5. Test the API
curl -X POST http://localhost:8000/api/v1/analyze \
  -H "X-API-Key: your-key" \
  -F "file=@test_doc.pdf"
```

---

## 9. DESIGN SYSTEM (Brand Identity Reference)

Full spec in `EuroQuant_Brand_Identity_v1.md`. Key rules:

| Token | Value | Use |
|---|---|---|
| Terminal Canvas | `#080c14` | Root background only |
| Card Surface | `#0d1420` | All cards/panels |
| Primary Blue | `#003399` | CTAs, active states |
| Cyber Cyan | `#00F0FF` | Accent only — max 8px elements |
| CRITICAL alert | `#ff3b3b` | D-1 PEP, Sanctions, GI>70 |
| HIGH alert | `#ff8c00` | D-2, Offshore, Procurement |
| MEDIUM alert | `#ffb700` | D-3, FATF elevated |
| CLEAR | `#00c896` | No flags, GI<40 |

---

## 10. WHAT NOT TO DO

- **Never store documents.** Ephemeral processing is the core differentiator. If you see code that persists raw document content anywhere, remove it.
- **Never commit `.env`** or any file containing API keys.
- **Never bypass the LangGraph DAG.** Do not call agent functions directly — always go through `jarvis_engine.invoke(initial_state)`.
- **Never use `print()` in Python modules** — use the `log` logger.
- **Never ignore circuit breaker state** — if it's OPEN, do not retry immediately.
- **Never remove the SHA-256 hash step** from ingestion — it's the audit trail anchor.

---

## 11. CURRENT SPRINT GOAL

**Sprint 0 — Stabilization (Weeks 1–2)**

When I ask you to work on something, assume we are in Sprint 0 unless I say otherwise. The priority is: fix critical technical debt → then add features.

First task when ready: upgrade `MODEL_NAME` to env-var driven + wire `pdf_generator.py` into the FastAPI analyze endpoint.

