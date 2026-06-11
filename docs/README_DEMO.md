# EuroQuant — 2-Minute Demo Launch

Everything below brings up the full stack, loads a synthetic demo founder
into the graph database, and opens the dashboard — locally, with zero cloud
dependencies beyond your Anthropic API key.

## Prerequisites

- Docker Desktop (or compatible engine) running
- `api/.env` populated — copy `api/.env.example` and fill in `ANTHROPIC_API_KEY`
  and `EUROQUANT_API_KEYS` (see `api/.env.example` for the full list)
- Python 3.11+ with `neo4j` and `python-dotenv` installed
  (`pip install -r api/requirements.txt`)

## One command

```bash
make demo
```

This will:

1. `docker compose up -d` — starts all 4 services (`api`, `neo4j`, `postgres`, `redis`)
2. Wait for `GET /api/health` to report healthy
3. Run `scripts/seed_neo4j.py` — loads `demo_data_synthetic.json` (founder
   "Kaspars Veidemanis" + 4 companies + 3 political connections) into Neo4j,
   so the dashboard's graph view has real, queryable data on first launch
4. Open `EuroQuant_Demo_Dashboard.html` in your default browser

Total time: under 2 minutes on a warm Docker image cache.

## Step by step (if you want more control)

```bash
make up      # docker compose up -d  — start the 4-service stack
make seed    # populate Neo4j with the synthetic demo founder
make logs    # tail logs from all services
make down    # stop and remove containers
```

## Verifying the stack

```bash
curl http://localhost:8000/api/health        # API liveness
open http://localhost:7474                   # Neo4j Browser (neo4j / euroquant_dev_only)
```

In Neo4j Browser, run this to confirm the seed worked:

```cypher
MATCH (f:Founder {tenant_id: "default"})-[r]->(n)
RETURN f, r, n
```

You should see "Kaspars Veidemanis" connected to 4 `Company` nodes via
`CONTROLS_STAKE` and 3 `PoliticalFigure` nodes via `POLITICALLY_CONNECTED`.

## Running a real analysis

The dashboard's **VIEW DEMO ANALYSIS** button works without the API (it
renders the bundled synthetic profile). To run the full Jarvis pipeline
against a real PDF:

```bash
curl -X POST http://localhost:8000/api/v1/analyze \
  -H "X-API-Key: <your-key-from-EUROQUANT_API_KEYS>" \
  -F "file=@test_doc.pdf"
```

Or drag-drop a PDF directly onto the dashboard's ingestion zone — the
**EPHEMERAL MODE** badge confirms the document never touches disk and is
destroyed the moment extraction completes.

## Troubleshooting

- **`make demo` hangs on "waiting for API to become healthy"** — run
  `make logs` and check the `api` service; the most common cause is a
  missing or malformed `api/.env`.
- **Neo4j seed fails to connect** — confirm `neo4j` is healthy
  (`docker compose ps`) and that `NEO4J_PASSWORD` in `api/.env` matches
  the value in `docker-compose.yml` (`NEO4J_AUTH`, default
  `neo4j/euroquant_dev_only`).
- **Dashboard shows "API · OFFLINE (demo only)"** — the bundled HTML still
  renders the synthetic profile; check `curl http://localhost:8000/api/health`
  to bring the live pipeline online.
