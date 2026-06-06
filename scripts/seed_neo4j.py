#!/usr/bin/env python3
"""
Seeds Neo4j with the synthetic demo founder + connections so the dashboard's
graph visualization has real data on first launch.

Mirrors the exact write schema of Neo4jPersister in jarvis_v3.py:
  (:Founder)-[:CONTROLS_STAKE {share_percentage}]->(:Company)
  (:Founder)-[:POLITICALLY_CONNECTED {rel_type, pathway_distance}]->(:PoliticalFigure)

Usage:
  python scripts/seed_neo4j.py
  python scripts/seed_neo4j.py --reset   # wipe the demo subgraph first
"""

import argparse
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from neo4j import GraphDatabase

REPO_ROOT = Path(__file__).resolve().parent.parent
DEMO_DATA_PATH = REPO_ROOT / "demo_data_synthetic.json"

# Demo data is seeded into the "default" tenant subgraph — the same partition
# the API uses when no API key is supplied (see _tenant_id in jarvis_v3.py).
DEMO_TENANT_ID = os.getenv("DEMO_TENANT_ID", "default")

log_prefix = "[seed_neo4j]"


def _connect():
    load_dotenv(REPO_ROOT / "api" / ".env")
    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "euroquant_dev_only")
    driver = GraphDatabase.driver(uri, auth=(user, password))
    driver.verify_connectivity()
    print(f"{log_prefix} connected to {uri} as {user}")
    return driver


def _reset(tx, tenant_id: str):
    tx.run(
        """
        MATCH (n {tenant_id: $tenant_id})
        DETACH DELETE n
        """,
        tenant_id=tenant_id,
    )


def _upsert_founder(tx, profile: dict, doc_hash: str, tenant_id: str):
    tx.run(
        """
        MERGE (f:Founder {id: $id, tenant_id: $tenant_id})
        SET f.full_name            = $full_name,
            f.nationality          = $nationality,
            f.pep_status           = $pep_status,
            f.sanctions_hit        = $sanctions_hit,
            f.governance_intensity = $gi,
            f.market_percentile    = $mp,
            f.document_hash        = $doc_hash,
            f.tenant_id            = $tenant_id
        """,
        id=profile["founder_id"],
        tenant_id=tenant_id,
        full_name=profile["full_name"],
        nationality=profile.get("nationality") or "UNKNOWN",
        pep_status=profile["pep_status"],
        sanctions_hit=profile["sanctions_hit"],
        gi=profile["governance_intensity"],
        mp=profile["market_percentile"],
        doc_hash=doc_hash,
    )


def _upsert_company(tx, founder_id: str, company: dict, tenant_id: str):
    tx.run(
        """
        MERGE (co:Company {key: $key, tenant_id: $tenant_id})
        SET co.name                     = $name,
            co.registration_country     = $country,
            co.is_offshore_flag         = $offshore,
            co.fatf_risk_level          = $fatf,
            co.active_status            = $active,
            co.incorporation_date       = $inc_date,
            co.procurement_exposure     = $procurement,
            co.procurement_value_eur    = $proc_val,
            co.defense_gov_tech_sector  = $defense,
            co.tenant_id                = $tenant_id
        WITH co
        MATCH (f:Founder {id: $founder_id, tenant_id: $tenant_id})
        MERGE (f)-[r:CONTROLS_STAKE]->(co)
        SET r.share_percentage = $share
        """,
        key=f"{company['company_name']}|{company['registration_country']}",
        tenant_id=tenant_id,
        name=company["company_name"],
        country=company["registration_country"],
        offshore=company["is_offshore_flag"],
        fatf=company["fatf_risk_level"],
        active=company["active_status"],
        inc_date=company.get("incorporation_date") or "",
        procurement=company["public_procurement_exposure"],
        proc_val=company.get("procurement_value_eur") or 0.0,
        defense=company["defense_gov_tech_sector"],
        founder_id=founder_id,
        share=company["share_percentage"],
    )


def _upsert_political(tx, founder_id: str, conn: dict, tenant_id: str):
    tx.run(
        """
        MERGE (p:PoliticalFigure {key: $key, tenant_id: $tenant_id})
        SET p.name         = $name,
            p.jurisdiction = $jurisdiction,
            p.role_title   = $role,
            p.is_pep       = $is_pep,
            p.still_active = $active,
            p.tenant_id    = $tenant_id
        WITH p
        MATCH (f:Founder {id: $founder_id, tenant_id: $tenant_id})
        MERGE (f)-[r:POLITICALLY_CONNECTED {rel_type: $rel_type}]->(p)
        SET r.pathway_distance = $distance
        """,
        key=f"{conn['person_name']}|{conn['jurisdiction']}",
        tenant_id=tenant_id,
        name=conn["person_name"],
        jurisdiction=conn["jurisdiction"],
        role=conn["role_title"],
        is_pep=conn["is_pep_direct"],
        active=conn["still_active"],
        founder_id=founder_id,
        rel_type=conn["relationship_type"],
        distance=conn["pathway_distance"],
    )


def seed(reset: bool = False) -> None:
    if not DEMO_DATA_PATH.exists():
        print(f"{log_prefix} ERROR: {DEMO_DATA_PATH} not found", file=sys.stderr)
        sys.exit(1)

    with open(DEMO_DATA_PATH) as fh:
        demo = json.load(fh)

    profile = demo["profile"]
    doc_hash = demo.get("document_hash", "")

    driver = _connect()
    try:
        with driver.session() as session:
            if reset:
                session.execute_write(_reset, DEMO_TENANT_ID)
                print(f"{log_prefix} reset subgraph for tenant={DEMO_TENANT_ID}")

            session.execute_write(_upsert_founder, profile, doc_hash, DEMO_TENANT_ID)
            for company in profile["associated_companies"]:
                session.execute_write(_upsert_company, profile["founder_id"], company, DEMO_TENANT_ID)
            for conn in profile["political_connections"]:
                session.execute_write(_upsert_political, profile["founder_id"], conn, DEMO_TENANT_ID)

        print(
            f"{log_prefix} ✅ seeded {profile['full_name']} "
            f"({len(profile['associated_companies'])} companies, "
            f"{len(profile['political_connections'])} connections) "
            f"[tenant={DEMO_TENANT_ID}]"
        )
    finally:
        driver.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed Neo4j with synthetic demo data")
    parser.add_argument("--reset", action="store_true", help="wipe the demo tenant subgraph first")
    args = parser.parse_args()
    seed(reset=args.reset)
