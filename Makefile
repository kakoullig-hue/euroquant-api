# EuroQuant Risk Terminal — one-command demo launch
# Usage: make demo

DEMO_DASHBOARD := EuroQuant_Demo_Dashboard.html

.PHONY: up down logs seed demo

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

seed:
	python3 scripts/seed_neo4j.py

# Brings up the stack, waits for the API to report healthy, seeds Neo4j
# with the synthetic demo founder, then opens the bundled dashboard.
demo: up
	@echo "[make demo] waiting for API to become healthy..."
	@until curl -fsS http://localhost:8000/api/health >/dev/null 2>&1; do sleep 2; done
	@$(MAKE) seed
	@echo "[make demo] opening dashboard..."
	@open $(DEMO_DASHBOARD) 2>/dev/null || xdg-open $(DEMO_DASHBOARD) 2>/dev/null || echo "Open $(DEMO_DASHBOARD) manually in your browser"
