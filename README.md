# EuroQuant Risk Terminal — v4 Release

**Status:** Production-hardened backend + REST API + branded PDF output + integrated dashboard
**Engine:** Jarvis MAS v3.1.0 (FIX-1 → FIX-10 applied)
**Date:** June 2026

---

## What shipped in this release

### Mission 5 — FastAPI Gateway (`api/`)
REST API wrapping the Jarvis engine.

- `POST /api/v1/analyze` — upload PDF, get JSON `RiskExtractionResult`
- `POST /api/v1/analyze/report` — upload PDF, get branded PDF report
- `GET  /api/health` — liveness probe (no auth)
- API key auth via `X-API-Key` header
- In-process rate limiting (30 req/min/key — replace with Redis in prod)
- Ephemeral file handling — temp file deleted in `finally` even on exception
- Audit logging by request_id (no document content logged)
- CORS configured for dashboard origins

### Mission 6 — Dashboard Integration (`dashboard/`)
Three-state React UI connecting to the FastAPI gateway.

- **Upload screen** — drag-drop PDF, demo mode button, API health badge
- **Processing screen** — branded loader with Jarvis pipeline stage progress
- **Results screen** — full dashboard + PDF download button
- `api_client.js` — typed fetch wrappers with specific error messaging
- Demo mode still works when the API is offline (uses sample data)

### Mission 7 — Branded PDF Report Generator (`reports/`)
ReportLab-based PDF output mirroring the dashboard's brand identity.

7 sections:
1. **Cover** — subject ID, generated timestamp, verdict pill
2. **Executive Summary** — GI gauge + key facts + Jarvis verdict
3. **Risk Flags** — severity-coded card list
4. **Associated Companies** — tabular view with FATF + procurement columns
5. **Political Network** — D-1/D-2/D-3 pathway distance encoding
6. **Reference Layer** — OFAC/EU/OpenCorporates verification summary
7. **Analyst Verification** — **GDPR Article 22 compliance fix**
8. **Audit Trail** — SHA-256, timestamps, ephemeral confirmation

---

## GDPR Article 22 fix — the compliance unlock

Per the CJEU Schufa ruling (C-634/21), an automated risk score that
influences third-party decisions violates Article 22 even with a
disclaimer. The fix in v4: every PDF report now includes a mandatory
**Analyst Verification** section that must be physically signed before
the report is considered "issued." This transforms the GI score from
"automated decision-making" into "automated input to human decision."

Until signed, the report is explicitly **advisory only** and cannot be
used as a basis for an investment decision. This satisfies Article 22
while preserving the product's core value proposition.

---

## Quick start

### Local development (Docker)

```bash
cd deploy/
cp ../api/.env.example ../api/.env
# Edit ../api/.env with your ANTHROPIC_API_KEY and EUROQUANT_API_KEYS
docker compose up -d

# API on http://localhost:8000
# Neo4j browser on http://localhost:7474
# Docs on http://localhost:8000/api/docs
```

### Local development (no Docker)

```bash
# 1. Convert Jarvis notebook to importable module
jupyter nbconvert --to script jarvis_v3.ipynb --output jarvis_v3

# 2. Install dependencies
pip install -r api/requirements.txt

# 3. Set environment variables
cp api/.env.example api/.env
# edit api/.env

# 4. Run the API
uvicorn api.main:app --reload --port 8000

# 5. In another terminal — run the dashboard
cd dashboard/
# (assuming Vite/Next setup — wire App.jsx as your root component)
npm run dev
```

### Generate a PDF report via curl

```bash
curl -X POST http://localhost:8000/api/v1/analyze/report \
  -H "X-API-Key: your-api-key-here" \
  -F "file=@test_doc.pdf" \
  -o report.pdf
```

---

## Architecture notes

```
                      ┌──────────────────┐
                      │   Dashboard UI   │  React (Vite/Next)
                      │   (Upload + UI)  │
                      └────────┬─────────┘
                               │ X-API-Key + multipart
                               ▼
                      ┌──────────────────┐
                      │  FastAPI Gateway │  Mission 5
                      │   ・auth          │
                      │   ・rate limit    │
                      │   ・ephemeral I/O │
                      └────────┬─────────┘
                               │
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
        ┌─────────────┐ ┌──────────────┐ ┌──────────────┐
        │ JSON output │ │  PDF output  │ │  Audit log   │
        │ (analyze)   │ │   (report)   │ │  (request_id │
        │             │ │   Mission 7  │ │   only)      │
        └─────────────┘ └──────────────┘ └──────────────┘
                               │
                               ▼
                      ┌──────────────────┐
                      │  Jarvis Engine   │  v3.1.0 (FIX-1→10)
                      │   ・ingest        │
                      │   ・extract       │
                      │   ・reference     │
                      │   ・neo4j         │
                      │   ・benchmark     │
                      └──────────────────┘
                               │
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
          ┌─────────┐    ┌─────────┐    ┌──────────┐
          │ Claude  │    │  Neo4j  │    │   OFAC   │
          │   API   │    │ (graph) │    │ EU · OC  │
          └─────────┘    └─────────┘    └──────────┘
```

### Why these choices

| Decision | Rationale |
|---|---|
| FastAPI over Flask | Native async, OpenAPI auto-docs, Pydantic integration |
| ReportLab over WeasyPrint | No browser dependency, smaller container, programmatic layout |
| In-process rate limiting | Sufficient for single-instance; swap to Redis for multi-worker |
| Ephemeral via `finally` | Guarantees delete even on exception — auditable |
| Separate analyze + report endpoints | Allows JSON consumers (integrators) without forcing PDF gen |
| Dashboard `data` prop with default | Preserves demo mode while supporting API integration |
| Analyst sign-off as PDF section | Enforces GDPR compliance at the deliverable level, not just UI |

---

## What's next (post-v4 roadmap)

Once v4 hits first pilot:

1. **Redis-backed rate limiting + circuit breaker** — multi-worker safe
2. **Per-key usage tracking** — billing foundation
3. **Webhook for sanctions emergency updates** — wire to OFAC RSS feed
4. **PostgreSQL audit log** — request_id, key_id, founder_id, timestamp
5. **Sentry/Datadog integration** — replace stub `error_report_node`
6. **PDF watermarking** — "DRAFT — Pending Analyst Sign-off" until verified
7. **Multi-language PDF** — currently English; add Greek and French
8. **SDK** — Python + TypeScript clients for VC integrators

---

## File inventory

```
euroquant_v4/
├── api/
│   ├── main.py              # FastAPI gateway (Mission 5)
│   ├── requirements.txt
│   └── .env.example
├── reports/
│   └── pdf_generator.py     # Branded PDF generator (Mission 7)
├── dashboard/
│   ├── App.jsx              # Upload + Processing + Results shell (Mission 6)
│   ├── EuroQuantDashboard.jsx  # Original dashboard, patched to accept `data` prop
│   └── api_client.js        # Fetch wrappers with error handling
└── deploy/
    ├── Dockerfile
    └── docker-compose.yml
```

---

*EuroQuant Risk Terminal v4 — Production Release — June 2026*
