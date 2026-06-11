# EuroQuant Risk Terminal

**B2B Enterprise SaaS · RegTech · Automated Regulatory Due Diligence for VC**
Engine: Jarvis MAS v3.1.0 · Blueprint: v4.2 · June 2026

Live: [euroquant.io](https://euroquant.io) · API: euroquant-api.onrender.com · Demo: demo.euroquant.io

---

## Repository Structure

```
euroquant_v4/
├── api/                          # FastAPI gateway + Jarvis engine
│   ├── jarvis_v3.py              # Jarvis MAS (LangGraph pipeline, all nodes)
│   ├── main.py                   # FastAPI gateway — auth, rate limiting, endpoints
│   ├── pdf_generator.py          # Branded PDF report (ReportLab)
│   ├── usage.py                  # Per-tenant usage metering
│   ├── requirements.txt
│   ├── .env.example              # Template — copy to .env, fill secrets, never commit
│   └── .env                      # SECRETS — gitignored
│
├── web/                          # Frontend — dashboard JSX + store HTML + demo assets
│   ├── App.jsx                   # Upload / Processing / Results shell
│   ├── EuroQuantDashboard.jsx    # Risk report dashboard + NetworkGraph viz
│   ├── api_client.js             # Typed fetch wrappers (dashboard ↔ API)
│   ├── EuroQuant_Demo_Dashboard.html  # Self-contained demo (served at demo.euroquant.io)
│   ├── index.html                # Store page (deployed to euroquant.io via Netlify)
│   ├── demo_data_synthetic.json  # Canonical synthetic demo dataset (Kaspars Veidemanis)
│   └── EuroQuant_DemoReport.pdf  # Cached demo PDF for instant download
│
├── docs/                         # All documentation and operational markdown files
│   ├── MASTER_EUROQUANT_BLUEPRINT.md   # ← Primary context doc (upload to Claude.ai)
│   ├── PHASE_A_DISCOVERY_KIT.md
│   ├── ASYNC_REVENUE_TRACK.md
│   ├── EuroQuant_Pilot_Offer_and_DPA.md
│   ├── EuroQuant_Brand_Identity_v1.md
│   ├── EUROQUANT_LINKEDIN_BRAND_PACK.md
│   ├── README_DEMO.md
│   └── archive/                  # Superseded file versions
│
├── ops/                          # Infrastructure, configs, scripts, SOPs
│   ├── scripts/
│   │   ├── seed_neo4j.py         # Load demo data into Neo4j
│   │   └── hash_key.py           # Generate bcrypt API key hash
│   ├── deploy/
│   │   └── Dockerfile
│   └── setup_mac.sh              # One-time Mac bootstrap
│
├── CLAUDE.md                     # Claude Code project intelligence (session context)
├── README.md                     # This file
├── render.yaml                   # Render deploy config (must stay at root)
├── docker-compose.yml            # 4-service local stack (api, neo4j, postgres, redis)
├── docker-compose.override.yml   # Dev hot-reload override
├── Makefile                      # make up / down / logs / seed / demo
├── .gitignore
└── .env.example                  # Root-level env template
```

---

## Quick Start

```bash
# Start the full local stack
make up       # docker compose up -d (api + neo4j + postgres + redis)
make seed     # load synthetic demo data into Neo4j
make demo     # up + seed + open dashboard
```

API docs: `http://localhost:8000/api/docs`
Neo4j browser: `http://localhost:7474`

### Test the API

```bash
curl -X POST http://localhost:8000/api/v1/analyze \
  -H "X-API-Key: your-key" \
  -F "file=@test_doc.pdf"
```

---

## Key Constraints

- **Never store documents** — ephemeral processing is the core differentiator.
- **Never commit `.env`** — secrets in `api/.env` only.
- **Never bypass LangGraph DAG** — always `jarvis_engine.invoke(initial_state)`.
- `render.yaml` must remain at repo root (Render requirement).
- `docker-compose.yml` must remain at repo root (Docker convention).

---

*EuroQuant Risk Terminal · Internal / Co-founder Only · 11 June 2026*
