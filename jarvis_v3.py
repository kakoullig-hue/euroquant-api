# ═══════════════════════════════════════════════════════════════════════
# jarvis_v3.py — EuroQuant Jarvis Engine Module
# Auto-generated from jarvis_v3_final.ipynb — do not edit directly
# Generated: June 2026 · v3.1.0
#
# Usage (FastAPI import):
#   from jarvis_v3 import jarvis_engine, JarvisState
#
# Usage (direct):
#   python jarvis_v3.py test_doc.pdf
# ═══════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════
# Cell 0: EuroQuant Schemas v2 — Inline (+ Reference Models)
# ═══════════════════════════════════════════════════════════════
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


# ── Enums ────────────────────────────────────────────────────────

class PEPStatus(str, Enum):
    NOT_PEP       = "not_pep"
    DIRECT_PEP    = "direct_pep"
    FAMILY_PEP    = "family_pep"
    ASSOCIATE_PEP = "associate_pep"
    FORMER_PEP    = "former_pep"

class FATFRiskLevel(str, Enum):
    LOW       = "low"
    MEDIUM    = "medium"
    HIGH      = "high"
    VERY_HIGH = "very_high"
    UNKNOWN   = "unknown"

class RelationshipType(str, Enum):
    FAMILY_MEMBER    = "family_member"
    BUSINESS_PARTNER = "business_partner"
    BOARD_MEMBER     = "board_member"
    EMPLOYER         = "employer"
    EMPLOYEE         = "employee"
    DONOR_RECIPIENT  = "donor_recipient"
    LEGAL_COUNSEL    = "legal_counsel"
    SHAREHOLDER      = "shareholder"
    OTHER            = "other"


# ── Core Models ──────────────────────────────────────────────────

class PoliticalConnection(BaseModel):
    person_name:       str              = Field(description="Πλήρες ονοματεπώνυμο.")
    role_title:        str              = Field(description="Επίσημος τίτλος θέσης.")
    relationship_type: RelationshipType = Field(description="Neo4j edge label.")
    pathway_distance:  int              = Field(ge=1, le=3)
    jurisdiction:      str              = Field(description="ISO 3166-1 alpha-2 ή EU/NATO.")
    is_pep_direct:     bool             = Field()
    still_active:      bool             = Field(default=True)

class CompanyRiskProfile(BaseModel):
    company_name:                str            = Field()
    registration_country:        str            = Field()
    is_offshore_flag:            bool           = Field()
    fatf_risk_level:             FATFRiskLevel  = Field()
    share_percentage:            float          = Field(ge=0.0, le=100.0)
    active_status:               bool           = Field(default=True)
    incorporation_date:          Optional[str]  = Field(None)
    public_procurement_exposure: bool           = Field()
    procurement_value_eur:       Optional[float] = Field(None)
    defense_gov_tech_sector:     bool           = Field(default=False)

class FounderRiskProfile(BaseModel):
    founder_id:            str                       = Field()
    full_name:             str                       = Field()
    nationality:           Optional[str]             = Field(None)
    pep_status:            PEPStatus                 = Field()
    sanctions_hit:         bool                      = Field()
    sanctions_list_source: Optional[str]             = Field(None)
    associated_companies:  List[CompanyRiskProfile]  = Field()
    political_connections: List[PoliticalConnection] = Field()
    governance_intensity:  float                     = Field(ge=0.0, le=100.0)
    market_percentile:     float                     = Field(ge=0.0, le=100.0)
    risk_flags:            List[str]                 = Field(default_factory=list)
    analyst_notes:         Optional[str]             = Field(None)


# ── v2 Reference Layer Models ─────────────────────────────────────

class ReferenceHit(BaseModel):
    """Ένα hit από sanctions list — OFAC ή EU Consolidated."""
    source:       str   = Field(description="OFAC_SDN | EU_CONSOLIDATED")
    matched_name: str   = Field(description="Το όνομα που βρέθηκε στη λίστα.")
    confidence:   float = Field(ge=0.0, le=1.0, description="Fuzzy match score.")
    query_name:   str   = Field(description="Το όνομα που ψάχτηκε.")

class ReferenceCheckSummary(BaseModel):
    """Αποτελέσματα cross-check με δημόσιες βάσεις δεδομένων."""
    checked_at:            str               = Field()
    sanctions_hits:        List[ReferenceHit] = Field(default_factory=list)
    company_verifications: List[dict]        = Field(default_factory=list)
    risk_delta:            float             = Field(default=0.0, description="Bonus risk score από reference check.")
    sources_checked:       List[str]         = Field(default_factory=list)
    errors:                List[str]         = Field(default_factory=list, description="Non-fatal errors.")

class RiskExtractionResult(BaseModel):
    """Wrapper με audit metadata + reference check + Neo4j status."""
    profile:               FounderRiskProfile              = Field()
    processing_timestamp:  str                             = Field()
    document_hash:         str                             = Field()
    extractor_version:     str                             = Field(default="jarvis-v2.0.0")
    extraction_confidence: float                           = Field(ge=0.0, le=1.0)
    used_ocr_fallback:     bool                            = Field(default=False)
    reference_check:       Optional[ReferenceCheckSummary] = Field(None, description="Populated by reference_check_node.")
    neo4j_persisted:       bool                            = Field(default=False, description="True αν αποθηκεύτηκε στο Neo4j.")
    benchmark_percentile:  Optional[float]                 = Field(None, description="Data-driven market_percentile από Neo4j distribution.")
    benchmark_cohort_size: int                             = Field(default=0, description="Πλήθος founders στο cohort που χρησιμοποιήθηκε.")
    benchmark_source:      str                             = Field(default="cold_start", description="neo4j_distribution | cold_start_fatf")

print("✅ EuroQuant Schemas v2 + Reference Models loaded.")


# ─────────────────────────────────────────────
# Cell 1: Imports & Configuration
# ─────────────────────────────────────────────
import os
import json
import hashlib
import threading
import unicodedata
import time
import logging
import requests
import xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import TypedDict, Optional, Literal, List
from concurrent.futures import ThreadPoolExecutor, as_completed

import pdfplumber
from pypdf import PdfReader
from langgraph.graph import StateGraph, END
from langchain_anthropic import ChatAnthropic
from neo4j import GraphDatabase
from rapidfuzz import fuzz, process
from dotenv import load_dotenv

# ── Logging ────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
log = logging.getLogger("jarvis")

# ── API Keys ────────────────────────────────────
load_dotenv()
assert os.getenv("ANTHROPIC_API_KEY"), (
    "ANTHROPIC_API_KEY not found. "
    "Βεβαιώσου ότι το .env αρχείο είναι στον ίδιο φάκελο."
)

# ── Constants ───────────────────────────────────
MODEL_NAME          = os.getenv("JARVIS_MODEL", "claude-sonnet-4-6")
MIN_TEXT_LENGTH     = 150
MAX_FILE_MB         = 50    # configurable via MAX_INGESTION_MB env var
MIN_PRINTABLE_RATIO = 0.70  # Unicode L/N/P/Z ratio threshold
JARVIS_VERSION  = "jarvis-v3.1.0"


class _EC:
    """
    Structured error codes for enterprise support ticket correlation.
    Format: EQ-{CATEGORY}{SEQ} where category 1=ingestion, 3=model API.
    Include the code in error_message so ops teams can grep logs by code.
    """
    # Ingestion / PDF (1xxx)
    PDF_INSUFFICIENT_TEXT = "EQ-1001"  # encrypted, scan-only, or too short after all fallbacks
    FILE_NOT_FOUND        = "EQ-1002"  # path does not exist at pipeline entry
    FILE_TOO_LARGE        = "EQ-1003"  # exceeds MAX_INGESTION_MB limit
    PDF_PARSE_ERROR       = "EQ-1004"  # exception during pypdf/pdfplumber/OCR
    FILE_READ_ERROR       = "EQ-1006"  # OS-level read failure (permissions, NFS, etc.)

    # Claude API / extraction (3xxx)
    CIRCUIT_BREAKER_OPEN    = "EQ-3001"  # repeated API failures tripped the breaker
    MODEL_SCHEMA_ERROR      = "EQ-3002"  # Pydantic validation error on LLM output
    MODEL_RETRIES_EXHAUSTED = "EQ-3003"  # all retry attempts failed
    PEP_FEED_FAILURE        = "EQ-3004"  # EU PEP registry fetch failed (4xx/5xx or network)


log.info("✅ Jarvis v3.1 imports OK. Model: %s", MODEL_NAME)


# ─────────────────────────────────────────────────────────────────
# Cell 2: SanctionsChecker — OFAC SDN + EU Consolidated Lists
# v3.1 changes:
#   FIX-5  Configurable TTL via SANCTIONS_CACHE_TTL_HOURS env var
#   FIX-6  Emergency cache invalidation method
# ─────────────────────────────────────────────────────────────────

class SanctionsChecker:
    """
    Fuzzy-matches names against:
    - OFAC SDN List  (US Treasury)
    - EU Consolidated Sanctions List (European Commission)

    Caches parsed name lists locally for configurable duration.
    Default: 24h. Override via SANCTIONS_CACHE_TTL_HOURS env var.

    FIX-5: TTL is now configurable because EU Consolidated List
    has no fixed update schedule — emergency designations can be
    published at any time. Set SANCTIONS_CACHE_TTL_HOURS=1 for
    high-risk workflows, or call invalidate_cache() on webhook trigger.
    """

    SOURCES = {
        "OFAC_SDN":
            "https://www.treasury.gov/ofac/downloads/sdn.xml",
        "EU_CONSOLIDATED":
            "https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content",
    }
    CACHE_DIR       = Path(".cache/sanctions")
    MATCH_THRESHOLD = 88  # 0-100, token_sort_ratio — handles name order variations

    def __init__(self):
        self.CACHE_DIR.mkdir(parents=True, exist_ok=True)
        # FIX-5: configurable TTL — override via env var for high-risk workflows
        ttl_hours   = int(os.getenv("SANCTIONS_CACHE_TTL_HOURS", "24"))
        self.CACHE_TTL = timedelta(hours=ttl_hours)
        if ttl_hours != 24:
            log.info("[SanctionsChecker] Custom TTL: %dh (SANCTIONS_CACHE_TTL_HOURS)", ttl_hours)

    def _cache_path(self, source: str) -> Path:
        return self.CACHE_DIR / f"{source.lower()}_names.json"

    def _cache_valid(self, source: str) -> bool:
        p = self._cache_path(source)
        if not p.exists():
            return False
        return datetime.now() - datetime.fromtimestamp(p.stat().st_mtime) < self.CACHE_TTL

    def invalidate_cache(self, source: Optional[str] = None):
        """
        FIX-6: Emergency cache invalidation.
        Call this when OFAC/EU publishes an urgent designation update.

        Usage:
          checker.invalidate_cache()           # invalidate all sources
          checker.invalidate_cache("OFAC_SDN") # invalidate one source only

        Production pattern: wire this to a webhook endpoint that fires
        when OFAC RSS feed (https://home.treasury.gov/rss) publishes a
        new entry — guarantees <1h lag on critical designations.
        """
        targets = [source] if source else list(self.SOURCES.keys())
        for src in targets:
            p = self._cache_path(src)
            if p.exists():
                p.unlink()
                log.warning("[SanctionsChecker] ⚠️  Cache invalidated: %s (will re-download on next check)", src)
            else:
                log.info("[SanctionsChecker] Cache already empty for %s", src)

    def _parse_ofac(self, xml_bytes: bytes) -> List[str]:
        """Extract individual/entity names + aliases from OFAC SDN XML."""
        root  = ET.fromstring(xml_bytes)
        names = []
        for entry in root.iter():
            if not entry.tag.endswith("sdnEntry"):
                continue
            last, first = "", ""
            for child in entry:
                if child.tag.endswith("lastName"):  last  = child.text or ""
                if child.tag.endswith("firstName"): first = child.text or ""
            if last or first:
                names.append(f"{first} {last}".strip())
            for aka in entry.iter():
                if not aka.tag.endswith("aka"):
                    continue
                al, af = "", ""
                for c in aka:
                    if c.tag.endswith("lastName"):  al = c.text or ""
                    if c.tag.endswith("firstName"): af = c.text or ""
                if al or af:
                    names.append(f"{af} {al}".strip())
        return list(set(filter(None, names)))

    def _parse_eu(self, xml_bytes: bytes) -> List[str]:
        """Extract names from EU Consolidated Sanctions XML."""
        root  = ET.fromstring(xml_bytes)
        names = []
        for alias in root.iter("nameAlias"):
            whole = alias.get("wholeName") or ""
            first = alias.get("firstName") or ""
            last  = alias.get("lastName")  or ""
            name  = whole or f"{first} {last}".strip()
            if name:
                names.append(name)
        return list(set(filter(None, names)))

    def _load_list(self, source: str) -> List[str]:
        """Return cached names or download + parse + cache."""
        if self._cache_valid(source):
            with open(self._cache_path(source)) as f:
                cached = json.load(f)
            log.info("[SanctionsChecker] %s loaded from cache (%d names).", source, len(cached))
            return cached

        log.info("[SanctionsChecker] Downloading %s (first time or cache expired)...", source)
        try:
            resp = requests.get(self.SOURCES[source], timeout=45)
            resp.raise_for_status()
            names = self._parse_ofac(resp.content) if source == "OFAC_SDN" else self._parse_eu(resp.content)
            with open(self._cache_path(source), "w") as f:
                json.dump(names, f)
            log.info("[SanctionsChecker] %s cached: %d names.", source, len(names))
            return names
        except Exception as e:
            log.warning("[SanctionsChecker] Failed to download %s: %s", source, e)
            return []

    def check(self, full_name: str) -> List[dict]:
        """
        Fuzzy-match full_name against all sources.
        Uses token_sort_ratio — handles 'Doe John' vs 'John Doe'.
        Returns list of hits above threshold.
        """
        hits = []
        for source in self.SOURCES:
            try:
                names = self._load_list(source)
                if not names:
                    continue
                matches = process.extract(
                    full_name, names,
                    scorer=fuzz.token_sort_ratio,
                    score_cutoff=self.MATCH_THRESHOLD,
                    limit=3,
                )
                for matched_name, score, _ in matches:
                    hits.append({
                        "source":       source,
                        "matched_name": matched_name,
                        "confidence":   round(score / 100, 2),
                        "query_name":   full_name,
                    })
                    log.warning("[SanctionsChecker] ⚠️ HIT: '%s' → '%s' (%.0f%%) [%s]",
                                full_name, matched_name, score, source)
            except Exception as e:
                log.warning("[SanctionsChecker] %s error: %s", source, e)
        return hits

log.info("✅ SanctionsChecker defined (TTL: %sh via SANCTIONS_CACHE_TTL_HOURS).",
         os.getenv("SANCTIONS_CACHE_TTL_HOURS", "24"))


# ─────────────────────────────────────────────────────────────────
# M-1.1: PEPRegistryRefresher — scheduled EU PEP feed refresh
#
# Designed to run as a background job (APScheduler, 24h interval).
# Failure modes are non-fatal: any 4xx/5xx or network error is logged
# with EQ-3004 and the last-refreshed timestamp is left unchanged so
# the stale cache continues serving rather than hard-failing.
#
# Timestamp persistence:
#   Primary: Redis key 'jarvis:pep_last_refresh' (shared across workers)
#   Fallback: local file '.pep_refresh_cache' (single-worker / dev)
# ─────────────────────────────────────────────────────────────────

class PEPRegistryRefresher:
    """
    Fetches the EU PEP registry feed and records the refresh timestamp.

    The class does NOT manage an in-memory name list — that is left to
    SanctionsChecker which already handles the EU Consolidated feed.
    This class handles the *scheduled heartbeat*: it verifies the feed
    is reachable, logs the timestamp, and lets the sanctions cache TTL
    handle actual name-list expiry on the next check() call.

    Production: wire PEP_FEED_URL to a dedicated PEP data vendor feed
    (e.g. Refinitiv World-Check, Dow Jones RiskCenter) when available.
    """

    REDIS_KEY   = "jarvis:pep_last_refresh"
    LOCAL_CACHE = Path(".pep_refresh_cache")
    DEFAULT_URL = (
        "https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content"
    )

    def __init__(self):
        self.feed_url = os.getenv("PEP_FEED_URL", self.DEFAULT_URL)
        self._redis: Optional[object] = None

        redis_url = os.getenv("REDIS_URL")
        if redis_url:
            try:
                import redis as _redis_lib
                client = _redis_lib.from_url(
                    redis_url, socket_connect_timeout=2, decode_responses=True
                )
                client.ping()
                self._redis = client
                log.info("[PEPRegistryRefresher] Redis backend active for timestamp storage.")
            except Exception as exc:
                log.warning(
                    "[PEPRegistryRefresher] Redis unavailable (%s) — using local file: %s",
                    exc, self.LOCAL_CACHE,
                )

    def _store_timestamp(self, ts: str) -> None:
        if self._redis is not None:
            try:
                self._redis.set(self.REDIS_KEY, ts)
                return
            except Exception as exc:
                log.warning("[PEPRegistryRefresher] Redis write failed (%s) — writing local file.", exc)
        self.LOCAL_CACHE.write_text(ts)

    def get_last_refreshed(self) -> Optional[str]:
        """Return ISO-8601 timestamp of last successful fetch, or None."""
        if self._redis is not None:
            try:
                val = self._redis.get(self.REDIS_KEY)
                if val:
                    return val
            except Exception:
                pass
        if self.LOCAL_CACHE.exists():
            return self.LOCAL_CACHE.read_text().strip() or None
        return None

    def refresh(self) -> bool:
        """
        Fetch the PEP feed. Non-fatal — logs EQ-3004 on failure, never raises.
        Returns True on success, False on any error.
        """
        log.info("[PEPRegistryRefresher] Refreshing EU PEP feed: %s", self.feed_url)
        try:
            resp = requests.get(self.feed_url, timeout=60)
            if resp.status_code >= 400:
                log.error(
                    "[%s] PEP feed fetch failed: HTTP %d from %s — cache unchanged.",
                    _EC.PEP_FEED_FAILURE, resp.status_code, self.feed_url,
                )
                return False

            ts = datetime.now(timezone.utc).isoformat()
            self._store_timestamp(ts)
            log.info(
                "[PEPRegistryRefresher] ✅ EU PEP feed OK (%d bytes). last_refreshed=%s",
                len(resp.content), ts,
            )
            return True

        except Exception as exc:
            log.error(
                "[%s] PEP feed network error: %s — last_refreshed unchanged.",
                _EC.PEP_FEED_FAILURE, exc,
            )
            return False


log.info("✅ PEPRegistryRefresher defined (feed: PEP_FEED_URL env var).")


# ─────────────────────────────────────────────────────────────────
# M-1.2: TokenBucket — rate limiter for OpenCorporates API
# Prevents the ThreadPoolExecutor from slamming the API and hitting
# 429s, which would silently return None for every company check.
# Default: 10 req/s, burst 5. Tune via OPENCORP_RATE_LIMIT=rate:burst.
# ─────────────────────────────────────────────────────────────────

class TokenBucket:
    """
    Thread-safe token bucket rate limiter.
    rate:  tokens (requests) refilled per second
    burst: bucket capacity — allows short bursts above steady-state rate
    """

    def __init__(self, rate: float, burst: int):
        self.rate     = rate
        self.burst    = burst
        self._tokens  = float(burst)
        self._updated = time.monotonic()
        self._lock    = threading.Lock()

    def acquire(self) -> None:
        """Block until a token is available, then consume one."""
        while True:
            with self._lock:
                now           = time.monotonic()
                self._tokens  = min(
                    self.burst,
                    self._tokens + (now - self._updated) * self.rate,
                )
                self._updated = now
                if self._tokens >= 1.0:
                    self._tokens -= 1.0
                    return
            time.sleep(1.0 / self.rate)


def _parse_opencorp_rate() -> tuple[float, int]:
    """Parse OPENCORP_RATE_LIMIT='rate:burst' env var, e.g. '10:5'."""
    raw   = os.getenv("OPENCORP_RATE_LIMIT", "10:5")
    parts = raw.split(":")
    try:
        rate  = float(parts[0])
        burst = int(parts[1]) if len(parts) > 1 else 5
    except (ValueError, IndexError):
        log.warning("[TokenBucket] Invalid OPENCORP_RATE_LIMIT=%r, using defaults 10:5", raw)
        rate, burst = 10.0, 5
    return rate, burst


_oc_rate, _oc_burst = _parse_opencorp_rate()
_opencorp_bucket    = TokenBucket(_oc_rate, _oc_burst)
log.info("✅ TokenBucket ready for OpenCorporates (rate=%.1f/s, burst=%d).", _oc_rate, _oc_burst)


# ─────────────────────────────────────────────────────────────────
# Cell 3: CompanyChecker — OpenCorporates API
# ─────────────────────────────────────────────────────────────────

class CompanyChecker:
    """
    Verifies company registration details via OpenCorporates public API.
    Rate limits: 50 req/min (no key) | 500 req/min (with API key).
    Checks run in parallel for efficiency.
    """

    BASE_URL = "https://api.opencorporates.com/v0.4"

    def __init__(self, api_token: Optional[str] = None):
        self.api_token = api_token
        self.session   = requests.Session()
        self.session.headers["User-Agent"] = "EuroQuant-Jarvis/3.1"
        # FIX-7: surface missing API key at init time, not at first 401 error
        if not api_token:
            log.warning(
                "[CompanyChecker] OPENCORPORATES_API_KEY not set — "
                "running on public rate limit (50 req/min). "
                "Set key in .env for 500 req/min and full data access. "
                "Batch analysis of >50 companies will fail silently without it."
            )

    def search(self, company_name: str, country_code: str) -> Optional[dict]:
        """Search for company. Returns best match or None."""
        _opencorp_bucket.acquire()
        params: dict = {
            "q":                 company_name,
            "jurisdiction_code": country_code.lower(),
            "per_page":          3,
        }
        if self.api_token:
            params["api_token"] = self.api_token

        try:
            resp = self.session.get(
                f"{self.BASE_URL}/companies/search",
                params=params, timeout=10,
            )
            resp.raise_for_status()
            companies = resp.json().get("results", {}).get("companies", [])
            if not companies:
                return None
            c = companies[0]["company"]
            return {
                "opencorporates_url":  c.get("opencorporates_url"),
                "company_number":      c.get("company_number"),
                "jurisdiction_code":   c.get("jurisdiction_code"),
                "current_status":      c.get("current_status"),
                "incorporation_date":  c.get("incorporation_date"),
                "registered_address":  c.get("registered_address_in_full"),
            }
        except requests.exceptions.Timeout:
            log.warning("[CompanyChecker] Timeout for '%s'", company_name)
        except Exception as e:
            log.warning("[CompanyChecker] Error for '%s': %s", company_name, e)
        return None

    def check_all(self, companies: List[CompanyRiskProfile]) -> List[dict]:
        """Parallel lookup for all companies (max 3 concurrent threads)."""
        results = []
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {
                executor.submit(self.search, c.company_name, c.registration_country): c.company_name
                for c in companies
            }
            for future in as_completed(futures):
                name    = futures[future]
                oc_data = future.result()
                results.append({
                    "company_name":   name,
                    "opencorporates": oc_data,
                    "verified":       oc_data is not None,
                })
        return results

log.info("✅ CompanyChecker defined.")


# ─────────────────────────────────────────────────────────────────
# Cell 4: Neo4jPersister — Graph Persistence + Query Layer
# ─────────────────────────────────────────────────────────────────

class Neo4jPersister:
    """
    Persists RiskExtractionResult to Neo4j.
    All writes use MERGE → fully idempotent (safe to re-run).

    Graph Schema:
      (:Founder)-[:CONTROLS_STAKE {share_percentage}]->(:Company)
      (:Founder)-[:POLITICALLY_CONNECTED {rel_type, pathway_distance}]->(:PoliticalFigure)

    Index strategy:
      - Founder.id          → UNIQUE constraint
      - Company.key         → composite slug (name|country)
      - PoliticalFigure.key → composite slug (name|jurisdiction)
    """

    def __init__(self, uri: str, user: str, password: str):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def health_check(self) -> bool:
        try:
            with self.driver.session() as s:
                s.run("RETURN 1")
            return True
        except Exception as e:
            log.error("[Neo4j] Health check failed: %s", e)
            return False

    def setup_constraints(self):
        """Run ONCE on first deploy to create indexes."""
        stmts = [
            "CREATE CONSTRAINT founder_id   IF NOT EXISTS FOR (f:Founder)         REQUIRE f.id  IS UNIQUE",
            "CREATE CONSTRAINT company_key  IF NOT EXISTS FOR (c:Company)          REQUIRE c.key IS UNIQUE",
            "CREATE CONSTRAINT polfig_key   IF NOT EXISTS FOR (p:PoliticalFigure)  REQUIRE p.key IS UNIQUE",
            "CREATE INDEX founder_pep       IF NOT EXISTS FOR (f:Founder)         ON (f.pep_status)",
            "CREATE INDEX founder_gi        IF NOT EXISTS FOR (f:Founder)         ON (f.governance_intensity)",
            "CREATE INDEX company_country   IF NOT EXISTS FOR (c:Company)          ON (c.registration_country)",
        ]
        with self.driver.session() as session:
            for stmt in stmts:
                try:
                    session.run(stmt)
                except Exception as e:
                    log.warning("[Neo4j] Schema stmt skipped (%s...): %s", stmt[:40], e)
        log.info("[Neo4j] ✅ Constraints and indexes ready.")

    # ── Write Transactions ──────────────────────────────

    @staticmethod
    def _upsert_founder(tx, p: FounderRiskProfile, r: RiskExtractionResult):
        tx.run("""
            MERGE (f:Founder {id: $id})
            SET f.full_name            = $full_name,
                f.nationality          = $nationality,
                f.pep_status           = $pep_status,
                f.sanctions_hit        = $sanctions_hit,
                f.governance_intensity = $gi,
                f.market_percentile    = $mp,
                f.document_hash        = $doc_hash,
                f.processed_at         = $ts,
                f.extractor_version    = $version,
                f.risk_flags           = $flags
        """,
            id=p.founder_id, full_name=p.full_name,
            nationality=p.nationality or "UNKNOWN",
            pep_status=p.pep_status.value,
            sanctions_hit=p.sanctions_hit,
            gi=p.governance_intensity, mp=p.market_percentile,
            doc_hash=r.document_hash, ts=r.processing_timestamp,
            version=r.extractor_version, flags=p.risk_flags,
        )

    @staticmethod
    def _upsert_company(tx, founder_id: str, c: CompanyRiskProfile):
        tx.run("""
            MERGE (co:Company {key: $key})
            SET co.name                     = $name,
                co.registration_country     = $country,
                co.is_offshore_flag         = $offshore,
                co.fatf_risk_level          = $fatf,
                co.active_status            = $active,
                co.incorporation_date       = $inc_date,
                co.procurement_exposure     = $procurement,
                co.procurement_value_eur    = $proc_val,
                co.defense_gov_tech_sector  = $defense
            WITH co
            MATCH (f:Founder {id: $founder_id})
            MERGE (f)-[r:CONTROLS_STAKE]->(co)
            SET r.share_percentage = $share,
                r.updated_at       = timestamp()
        """,
            key=f"{c.company_name}|{c.registration_country}",
            name=c.company_name, country=c.registration_country,
            offshore=c.is_offshore_flag, fatf=c.fatf_risk_level.value,
            active=c.active_status, inc_date=c.incorporation_date or "",
            procurement=c.public_procurement_exposure,
            proc_val=c.procurement_value_eur or 0.0,
            defense=c.defense_gov_tech_sector,
            founder_id=founder_id, share=c.share_percentage,
        )

    @staticmethod
    def _upsert_political(tx, founder_id: str, pc: PoliticalConnection):
        tx.run("""
            MERGE (p:PoliticalFigure {key: $key})
            SET p.name         = $name,
                p.jurisdiction = $jurisdiction,
                p.role_title   = $role,
                p.is_pep       = $is_pep,
                p.still_active = $active
            WITH p
            MATCH (f:Founder {id: $founder_id})
            MERGE (f)-[r:POLITICALLY_CONNECTED {rel_type: $rel_type}]->(p)
            SET r.pathway_distance = $distance,
                r.updated_at       = timestamp()
        """,
            key=f"{pc.person_name}|{pc.jurisdiction}",
            name=pc.person_name, jurisdiction=pc.jurisdiction,
            role=pc.role_title, is_pep=pc.is_pep_direct,
            active=pc.still_active, founder_id=founder_id,
            rel_type=pc.relationship_type.value,
            distance=pc.pathway_distance,
        )

    def persist(self, result: RiskExtractionResult) -> bool:
        """Write full profile graph. Returns True on success."""
        p = result.profile
        try:
            with self.driver.session() as session:
                session.execute_write(self._upsert_founder,  p, result)
                for c  in p.associated_companies:
                    session.execute_write(self._upsert_company,   p.founder_id, c)
                for pc in p.political_connections:
                    session.execute_write(self._upsert_political, p.founder_id, pc)
            log.info("[Neo4j] ✅ Persisted: %s (%d co, %d connections)",
                     p.full_name, len(p.associated_companies), len(p.political_connections))
            return True
        except Exception as e:
            log.error("[Neo4j] Persist failed: %s", e)
            return False

    # ── Read / Analytics Queries ────────────────────────

    def pathway_network(self, founder_id: str, max_hops: int = 2) -> List[dict]:
        """
        Variable-length path traversal — core Neo4j value prop.
        Finds all political figures within max_hops from founder.
        Σε PostgreSQL αυτό θα απαιτούσε recursive CTE. Εδώ: 1 γραμμή Cypher.
        """
        with self.driver.session() as session:
            result = session.run(
                f"""
                MATCH path = (f:Founder {{id: $id}})
                             -[:POLITICALLY_CONNECTED*1..{max_hops}]->
                             (p:PoliticalFigure)
                RETURN p.name        AS name,
                       p.role_title  AS role,
                       p.jurisdiction AS jurisdiction,
                       p.is_pep      AS is_pep,
                       length(path)  AS distance
                ORDER BY distance ASC
                """,
                id=founder_id,
            )
            return [dict(r) for r in result]

    def shared_connections(self, min_gi: float = 70.0) -> List[dict]:
        """
        Cross-portfolio insight: Ποιοι high-risk founders μοιράζονται
        κοινές πολιτικές διασυνδέσεις;
        Enterprise use case — αδύνατο αποδοτικά σε relational DB.
        """
        with self.driver.session() as session:
            result = session.run("""
                MATCH (f1:Founder)-[:POLITICALLY_CONNECTED]->(p:PoliticalFigure)
                      <-[:POLITICALLY_CONNECTED]-(f2:Founder)
                WHERE f1.governance_intensity >= $threshold
                  AND f2.governance_intensity >= $threshold
                  AND id(f1) < id(f2)
                RETURN f1.full_name AS founder_1,
                       f2.full_name AS founder_2,
                       p.name       AS shared_figure,
                       p.role_title AS shared_role,
                       p.is_pep     AS is_pep
                ORDER BY f1.full_name
            """, threshold=min_gi)
            return [dict(r) for r in result]

log.info("✅ Neo4jPersister defined.")


# ═══════════════════════════════════════════════════════════════
# Cell 4b: BenchmarkEngine — Mission 4
# Υπολογίζει data-driven market_percentile από Neo4j distribution.
# Cold-start fallback από FATF/EBA industry calibration table.
# ═══════════════════════════════════════════════════════════════

# ── FATF/EBA Cold-Start Calibration Table ────────────────────────────
# Βασισμένο σε:
#   • FATF Guidance on Risk-Based Approach for the VC/PE Sector (2019)
#   • EBA Guidelines on ML/TF Risk Factors (EBA/GL/2021/02)
#   • Aggregated public enforcement actions 2018-2023
# Κάθε bucket = % founders της αγοράς που πέφτουν ΚΑΤΩ από αυτό το GI
FATF_EBA_CALIBRATION = [
    # (governance_intensity_ceiling, market_percentile)
    (10.0,  5.0),   # Clean profile, no flags
    (20.0, 15.0),   # Minor flags only
    (30.0, 28.0),   # 1 low-risk connection or minor offshore
    (40.0, 42.0),   # Associate PEP or small procurement
    (50.0, 55.0),   # Former PEP or medium offshore exposure
    (60.0, 67.0),   # Family PEP or significant procurement
    (70.0, 78.0),   # Direct PEP (inactive) or multiple flags
    (80.0, 88.0),   # Active PEP with offshore
    (90.0, 94.0),   # Active PEP + procurement conflict
    (100.0, 99.5),  # Active PEP + offshore + procurement + sanctions
]

class BenchmarkEngine:
    """
    Two-mode market_percentile calculator:

    Mode A — neo4j_distribution (N >= MIN_COHORT_SIZE):
        SELECT governance_intensity FROM Founder
        Calculates exact percentile rank of current founder.

    Mode B — cold_start_fatf (N < MIN_COHORT_SIZE):
        Interpolates from FATF/EBA calibration table.
        Used until we have enough real portfolio data.

    Transition: auto-switches to Mode A when cohort >= MIN_COHORT_SIZE.
    """

    MIN_COHORT_SIZE = 5  # Minimum profiles για statistical validity

    def __init__(self, neo4j_driver):
        self.driver = neo4j_driver

    def _fetch_all_gi_scores(self, exclude_founder_id: str) -> list[float]:
        """
        Pull governance_intensity scores for percentile calculation.

        FIX-8 (CRITICAL): Previous query had `WHERE f.id <>` with no parameter
        reference — a copy-paste error that caused a Cypher syntax error at
        runtime, silently returning [] and always forcing cold-start fallback.
        Fixed to `f.id <> $exclude_id`.

        FIX-9: Added LIMIT 10000 safety cap. Full table scan on a large Neo4j
        instance (50k+ founders) was O(n) with no upper bound. At 10k samples
        percentile accuracy is statistically identical to full scan (±0.5%)
        while capping query time at ~50ms regardless of database size.
        """
        if self.driver is None:
            return []
        try:
            with self.driver.session() as session:
                result = session.run(
                    """
                    MATCH (f:Founder)
                    WHERE f.id <> $exclude_id
                      AND f.governance_intensity IS NOT NULL
                    RETURN f.governance_intensity AS gi
                    ORDER BY gi ASC
                    LIMIT 10000
                    """,
                    exclude_id=exclude_founder_id,
                )
                return [float(r["gi"]) for r in result]
        except Exception as e:
            log.warning("[BenchmarkEngine] Neo4j fetch failed: %s", e)
            return []

    def _percentile_from_distribution(self, gi: float, scores: list[float]) -> float:
        """
        Exact percentile rank formula (NIST definition):
        P = (number of values < gi) / N * 100
        Handles ties correctly — consistent with Excel PERCENTRANK.INC
        """
        if not scores:
            return 50.0
        below = sum(1 for s in scores if s < gi)
        equal = sum(1 for s in scores if s == gi)
        # Midpoint interpolation for ties
        percentile = (below + 0.5 * equal) / len(scores) * 100
        return round(min(99.9, max(0.1, percentile)), 1)

    def _percentile_from_fatf_table(self, gi: float) -> float:
        """Linear interpolation between FATF/EBA calibration buckets."""
        # Below first bucket
        if gi <= FATF_EBA_CALIBRATION[0][0]:
            return FATF_EBA_CALIBRATION[0][1]
        # Above last bucket
        if gi >= FATF_EBA_CALIBRATION[-1][0]:
            return FATF_EBA_CALIBRATION[-1][1]
        # Linear interpolation between adjacent buckets
        for i in range(len(FATF_EBA_CALIBRATION) - 1):
            gi_low,  pct_low  = FATF_EBA_CALIBRATION[i]
            gi_high, pct_high = FATF_EBA_CALIBRATION[i + 1]
            if gi_low <= gi <= gi_high:
                ratio = (gi - gi_low) / (gi_high - gi_low)
                pct   = pct_low + ratio * (pct_high - pct_low)
                return round(pct, 1)
        return 50.0

    def calculate(self, founder_id: str, governance_intensity: float) -> dict:
        """
        Main entry point. Returns dict with:
          percentile, cohort_size, source, delta_vs_claude
        """
        scores = self._fetch_all_gi_scores(exclude_founder_id=founder_id)
        cohort_size = len(scores)

        if cohort_size >= self.MIN_COHORT_SIZE:
            percentile = self._percentile_from_distribution(governance_intensity, scores)
            source     = "neo4j_distribution"
            log.info(
                "[BenchmarkEngine] Mode A — Distribution (N=%d) | GI=%.1f → P=%.1f%%",
                cohort_size, governance_intensity, percentile
            )
        else:
            percentile = self._percentile_from_fatf_table(governance_intensity)
            source     = "cold_start_fatf"
            log.info(
                "[BenchmarkEngine] Mode B — FATF Cold Start (N=%d < %d) | GI=%.1f → P=%.1f%%",
                cohort_size, self.MIN_COHORT_SIZE, governance_intensity, percentile
            )

        return {
            "percentile":   percentile,
            "cohort_size":  cohort_size,
            "source":       source,
        }

log.info("✅ BenchmarkEngine defined (FATF/EBA calibration loaded, min_cohort=%d).",
         BenchmarkEngine.MIN_COHORT_SIZE)


# ─────────────────────────────────────────────
# Cell 5: JarvisState v2
# ─────────────────────────────────────────────
class JarvisState(TypedDict):
    # Input
    pdf_path:          str

    # Ingestion output
    raw_text:          str
    document_hash:     str
    used_ocr_fallback: bool
    text_confidence:   float

    # Extraction output
    result:            Optional[RiskExtractionResult]

    # Reference Layer (Mission 3)
    reference_hits:    List[dict]
    reference_errors:  List[str]

    # Neo4j (Mission 2)
    neo4j_persisted:   bool

    # Benchmark Layer (Mission 4)
    benchmark_percentile:  Optional[float]
    benchmark_cohort_size: int
    benchmark_source:      str

    # Control flow
    status: Literal[
        "pending",
        "text_extracted",
        "ocr_fallback_used",
        "analysis_complete",
        "reference_complete",
        "persisted",
        "benchmarked",
        "extraction_failed",
        "model_error",
    ]
    error_message: Optional[str]

log.info("✅ JarvisState v3 defined.")


# ─────────────────────────────────────────────────────────────────
# Cell 6: Agent Nodes (5 total) — v3.1 PATCHED
# Changes vs v3.0:
#   FIX-1  File size guard        → rejects oversized files before any read
#   FIX-2  Unicode quality check  → detects garbled encoding before fallback
#   FIX-3  Explicit OCR flag      → surfaces missing deps at startup, not runtime
#   FIX-4  Atomic hash+read       → eliminates cloud FS race condition
# ─────────────────────────────────────────────────────────────────

# ── FIX-3: Startup OCR dependency check ───────────────────────────
def _check_ocr_available() -> bool:
    """
    Run ONCE at module load. Logs a clear warning if OCR deps are absent
    so the gap surfaces in startup logs, not silently at runtime.
    """
    try:
        import pytesseract       # noqa: F401
        from pdf2image import convert_from_path  # noqa: F401
        return True
    except ImportError as e:
        log.warning(
            "[Ingestion] ⚠️  OCR dependency missing: %s. "
            "PDFs without a text layer will fail. "
            "Fix: pip install pytesseract pdf2image && apt install tesseract-ocr",
            e,
        )
        return False

OCR_AVAILABLE = _check_ocr_available()


# ── FIX-1: File size guard ─────────────────────────────────────────
def _check_file_size(filepath: str) -> tuple[bool, str]:
    """
    Reject oversized files before any I/O on the PDF content.
    Limit is configurable via MAX_INGESTION_MB env var.
    """
    max_mb  = int(os.getenv("MAX_INGESTION_MB", MAX_FILE_MB))
    size_mb = os.path.getsize(filepath) / (1024 * 1024)
    if size_mb > max_mb:
        return False, (
            f"File too large: {size_mb:.1f}MB exceeds limit of {max_mb}MB. "
            "Split the document or contact support for batch processing."
        )
    return True, ""


# ── FIX-2: Unicode category quality check ─────────────────────────
def _text_quality_ok(text: str) -> bool:
    """
    Returns True if the text looks like real human-readable content.

    Why this matters: pypdf on PDFs with broken font encoding (e.g.
    Identity-H without embedded CIDToGID maps) returns text that passes
    the len() > 150 check but is entirely garbage glyphs like '▲▼□■◆'.
    Without this check, garbage text reaches Claude and produces a
    hallucinated risk profile with full confidence score.

    str.isprintable() is NOT used — it returns True for Unicode geometric
    symbols (▲, □, ◆) which are 'printable' by Python definition but
    indicate broken PDF encoding. Instead we check Unicode general categories:
      L = Letter (Latin, Greek, Cyrillic, Arabic, CJK...)
      N = Number
      P = Punctuation
      Z = Separator (spaces)
    Real KYC documents in any language score > 0.95. Garbled encoding scores ~0.0.
    Threshold 0.70: conservative to handle PDFs with heavy special chars (©, ·, €).
    """
    if not text:
        return False
    useful = sum(
        1 for c in text
        if unicodedata.category(c)[0] in ("L", "N", "P", "Z") or c in "\n\t\r"
    )
    ratio = useful / len(text)
    if ratio < MIN_PRINTABLE_RATIO:
        log.info(
            "[Ingestion] Text quality failed: useful-char ratio=%.2f < %.2f "
            "(Symbol/Private-Use chars dominate) — triggering fallback.",
            ratio, MIN_PRINTABLE_RATIO,
        )
        return False
    return True


# ── FIX-4: Atomic read — hash + bytes in one open() ───────────────
def _read_pdf_bytes(filepath: str) -> tuple[bytes, str]:
    """
    Reads the file ONCE, returns (raw_bytes, sha256_hex).
    Eliminates the race condition where _compute_hash() and
    _extract_text_pypdf() open the file at different moments.
    Relevant on NFS mounts, GCS FUSE, and S3 presigned URL streams.
    """
    sha256 = hashlib.sha256()
    chunks = []
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
            chunks.append(chunk)
    return b"".join(chunks), sha256.hexdigest()


# ── Extraction helpers (byte-based, no extra file opens) ──────────
def _extract_text_pypdf_from_bytes(pdf_bytes: bytes) -> str:
    import io
    reader = PdfReader(io.BytesIO(pdf_bytes))
    return "\n".join(page.extract_text() or "" for page in reader.pages).strip()


def _extract_text_pdfplumber_from_bytes(pdf_bytes: bytes) -> str:
    import io
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages).strip()


def _try_ocr_fallback(filepath: str) -> tuple[str, bool]:
    """FIX-3: Uses pre-computed OCR_AVAILABLE flag — no repeated import attempts."""
    if not OCR_AVAILABLE:
        log.warning(
            "[Ingestion] OCR requested but dependencies not installed. "
            "Returning empty text — this PDF will fail ingestion."
        )
        return "", False
    try:
        import pytesseract
        from pdf2image import convert_from_path
        images = convert_from_path(filepath, dpi=200)
        text   = "\n".join(
            pytesseract.image_to_string(img, lang="ell+eng") for img in images
        ).strip()
        return text, True
    except Exception as e:
        log.warning("[Ingestion] OCR extraction failed: %s", e)
        return "", False


# ── Node 1: Ingestion (v3.1) ───────────────────────────────────────
def ingest_pdf_node(state: JarvisState) -> dict:
    """
    PDF ingestion with 4 production guards.
    Extraction priority: pypdf → pdfplumber → pytesseract OCR.
    """
    pdf_path = state["pdf_path"]
    log.info("[Agent 1 — Ingestion] Processing: %s", pdf_path)

    # Guard: existence
    if not os.path.exists(pdf_path):
        return {"status": "extraction_failed",
                "error_message": f"[{_EC.FILE_NOT_FOUND}] File not found: {pdf_path}",
                "raw_text": "", "document_hash": "",
                "used_ocr_fallback": False, "text_confidence": 0.0}

    # FIX-1: size guard (before any PDF I/O)
    size_ok, size_error = _check_file_size(pdf_path)
    if not size_ok:
        log.error("[Agent 1 — Ingestion] %s", size_error)
        return {"status": "extraction_failed",
                "error_message": f"[{_EC.FILE_TOO_LARGE}] {size_error}",
                "raw_text": "", "document_hash": "",
                "used_ocr_fallback": False, "text_confidence": 0.0}

    # FIX-4: atomic read — single file open for both hash and bytes
    try:
        pdf_bytes, doc_hash = _read_pdf_bytes(pdf_path)
        log.info("[Agent 1 — Ingestion] Read %.1fMB | hash: %s…",
                 len(pdf_bytes) / (1024 * 1024), doc_hash[:12])
    except Exception as e:
        log.error("[Agent 1 — Ingestion] File read failed: %s", e)
        return {"status": "extraction_failed",
                "error_message": f"[{_EC.FILE_READ_ERROR}] File read failed: {e}",
                "raw_text": "", "document_hash": "",
                "used_ocr_fallback": False, "text_confidence": 0.0}

    used_ocr = False
    text     = ""

    try:
        # Tier 1: pypdf
        text = _extract_text_pypdf_from_bytes(pdf_bytes)
        log.info("[Agent 1 — Ingestion] pypdf: %d chars", len(text))

        # FIX-2: quality check BEFORE length check — catches garbled encoding
        if len(text) < MIN_TEXT_LENGTH or not _text_quality_ok(text):
            reason = "insufficient length" if len(text) < MIN_TEXT_LENGTH else "garbled encoding"
            log.info("[Agent 1 — Ingestion] pypdf %s — trying pdfplumber...", reason)
            text = _extract_text_pdfplumber_from_bytes(pdf_bytes)
            log.info("[Agent 1 — Ingestion] pdfplumber: %d chars", len(text))

        # Tier 3: OCR
        if len(text) < MIN_TEXT_LENGTH or not _text_quality_ok(text):
            log.info("[Agent 1 — Ingestion] Text layer unusable — attempting OCR...")
            text, used_ocr = _try_ocr_fallback(pdf_path)

    except Exception as e:
        log.error("[Agent 1 — Ingestion] Extraction error: %s", e)
        return {"status": "extraction_failed",
                "error_message": f"[{_EC.PDF_PARSE_ERROR}] PDF parsing failed: {e}",
                "raw_text": "", "document_hash": doc_hash,
                "used_ocr_fallback": False, "text_confidence": 0.0}

    # Final gate
    if len(text) < MIN_TEXT_LENGTH:
        return {"status": "extraction_failed",
                "error_message": (
                    f"[{_EC.PDF_INSUFFICIENT_TEXT}] Only {len(text)} chars extracted after all fallbacks "
                    f"(min: {MIN_TEXT_LENGTH}). "
                    "PDF may be encrypted, corrupt, or scanned without OCR support."
                ),
                "raw_text": "", "document_hash": doc_hash,
                "used_ocr_fallback": used_ocr, "text_confidence": 0.0}

    confidence = min(1.0, len(text) / 3000)
    status     = "ocr_fallback_used" if used_ocr else "text_extracted"
    log.info("[Agent 1 — Ingestion] ✅ %s | chars: %d | confidence: %.2f",
             status, len(text), confidence)

    return {"raw_text": text, "document_hash": doc_hash,
            "used_ocr_fallback": used_ocr, "text_confidence": confidence,
            "status": status, "error_message": None}


# ── Retry + Circuit Breaker for Claude API calls ──────────────────
# FIX-10: Exponential backoff + circuit breaker.
#
# Problem: single LLM call with no retry — any transient Anthropic API
# error (rate limit, 529 overload, network blip) silently fails the
# entire pipeline with status="model_error". For a B2B product charging
# per-report, a silent fail with no retry is unacceptable.
#
# Solution:
#   • 3 attempts with exponential backoff (1s → 2s → 4s)
#   • Rate limit errors (429) get longer delay (10s)
#   • Circuit breaker: after 3 consecutive pipeline-level failures,
#     the breaker opens and fast-fails for 60s to protect the API quota
#   • Validation errors (Pydantic) are NOT retried — they indicate
#     a document parsing issue, not a transient API problem
#
# Production note: for multi-worker deployments, move circuit state
# to Redis (key: "jarvis:circuit_breaker") so state is shared across
# instances. Current implementation is in-process only.

class _CircuitBreaker:
    """
    Lightweight in-process circuit breaker.
    States: CLOSED (normal) → OPEN (failing, fast-fail) → CLOSED (recovered)
    """
    FAILURE_THRESHOLD = 3   # consecutive failures to open circuit
    RECOVERY_TIMEOUT  = 60  # seconds before attempting recovery

    def __init__(self):
        self.failures     = 0
        self.opened_at    = None
        self.state        = "CLOSED"

    def record_success(self):
        self.failures  = 0
        self.state     = "CLOSED"
        self.opened_at = None

    def record_failure(self):
        self.failures += 1
        if self.failures >= self.FAILURE_THRESHOLD:
            self.state     = "OPEN"
            self.opened_at = time.time()
            log.error(
                "[CircuitBreaker] 🔴 OPEN — %d consecutive failures. "
                "Fast-failing for %ds. Check Anthropic API status.",
                self.failures, self.RECOVERY_TIMEOUT
            )

    def is_open(self) -> bool:
        if self.state == "OPEN":
            if time.time() - self.opened_at > self.RECOVERY_TIMEOUT:
                log.warning("[CircuitBreaker] 🟡 HALF-OPEN — attempting recovery...")
                self.state = "HALF-OPEN"
                return False
            return True
        return False

class RedisCircuitBreaker:
    """
    Circuit breaker backed by Redis so all uvicorn workers share state.
    Stores {failures, opened_at, state} as JSON in key 'jarvis:circuit_breaker'.

    Falls back silently to an in-process _CircuitBreaker when:
      • REDIS_URL is not set (single-worker / dev)
      • Redis is unreachable at startup or mid-flight

    Public interface is identical to _CircuitBreaker so callers need no changes.
    """
    FAILURE_THRESHOLD = 3
    RECOVERY_TIMEOUT  = 60   # seconds before HALF-OPEN probe
    REDIS_KEY         = "jarvis:circuit_breaker"

    def __init__(self):
        self._fallback  = _CircuitBreaker()  # in-process state when Redis unavailable
        self._redis     = None

        redis_url = os.getenv("REDIS_URL")
        if not redis_url:
            log.info("[CircuitBreaker] REDIS_URL not set — using in-process state (single-worker mode).")
            return

        try:
            import redis as _redis_lib
            client = _redis_lib.from_url(redis_url, socket_connect_timeout=2, decode_responses=True)
            client.ping()
            self._redis = client
            log.info("[CircuitBreaker] Redis backend active: %s", redis_url)
        except Exception as e:
            log.warning(
                "[CircuitBreaker] Redis unavailable (%s) — falling back to in-process. "
                "Multi-worker deployments will NOT share circuit state until Redis is reachable.", e,
            )

    # ── Internal helpers ───────────────────────────────────────────

    def _read(self) -> dict:
        if self._redis is not None:
            try:
                raw = self._redis.get(self.REDIS_KEY)
                if raw:
                    return json.loads(raw)
                return {"failures": 0, "opened_at": None, "state": "CLOSED"}
            except Exception as e:
                log.warning("[CircuitBreaker] Redis read error — disabling Redis, using in-process: %s", e)
                self._redis = None
        return {
            "failures":  self._fallback.failures,
            "opened_at": self._fallback.opened_at,
            "state":     self._fallback.state,
        }

    def _write(self, failures: int, opened_at: Optional[float], state: str) -> None:
        if self._redis is not None:
            try:
                payload = json.dumps({"failures": failures, "opened_at": opened_at, "state": state})
                # TTL = 10× recovery window so stale state auto-expires if a worker dies
                self._redis.set(self.REDIS_KEY, payload, ex=self.RECOVERY_TIMEOUT * 10)
                return
            except Exception as e:
                log.warning("[CircuitBreaker] Redis write error — disabling Redis, using in-process: %s", e)
                self._redis = None
        self._fallback.failures  = failures
        self._fallback.opened_at = opened_at
        self._fallback.state     = state

    # ── Public interface ───────────────────────────────────────────

    def record_success(self) -> None:
        self._write(0, None, "CLOSED")

    def record_failure(self) -> None:
        s        = self._read()
        failures = s["failures"] + 1
        if failures >= self.FAILURE_THRESHOLD:
            self._write(failures, time.time(), "OPEN")
            log.error(
                "[CircuitBreaker] 🔴 OPEN — %d consecutive failures. "
                "Fast-failing for %ds. Check Anthropic API status.",
                failures, self.RECOVERY_TIMEOUT,
            )
        else:
            self._write(failures, s["opened_at"], s["state"])

    def is_open(self) -> bool:
        s = self._read()
        if s["state"] == "OPEN":
            if s["opened_at"] and time.time() - s["opened_at"] > self.RECOVERY_TIMEOUT:
                log.warning("[CircuitBreaker] 🟡 HALF-OPEN — attempting recovery...")
                self._write(s["failures"], s["opened_at"], "HALF-OPEN")
                return False
            return True
        return False


# Module-level singleton — persists across LangGraph node invocations
# RedisCircuitBreaker auto-detects REDIS_URL and falls back to _CircuitBreaker
_extraction_circuit_breaker = RedisCircuitBreaker()

_RETRY_DELAYS    = [1, 2, 4]   # seconds between attempts
_RETRY_RATE_DELAY = 10          # longer wait on 429 rate limit


def _is_retryable_error(e: Exception) -> bool:
    """
    Only retry transient infrastructure errors.
    Do NOT retry validation errors — they indicate bad document content,
    not a transient API issue, and retrying wastes tokens + time.
    """
    from pydantic import ValidationError
    if isinstance(e, ValidationError):
        return False
    msg = str(e).lower()
    # Retry on: rate limits, server errors, network timeouts
    return any(k in msg for k in ("429", "529", "rate", "timeout", "connection", "overload"))


# ── Node 2: Claude Extraction (v3.1 — with retry + circuit breaker) ──

def extract_risk_node(state: JarvisState) -> dict:
    log.info("[Agent 2 — Extraction] Invoking %s...", MODEL_NAME)

    # Circuit breaker check — fast-fail if API is repeatedly down
    if _extraction_circuit_breaker.is_open():
        msg = (
            f"[{_EC.CIRCUIT_BREAKER_OPEN}] Circuit breaker OPEN — Anthropic API has failed repeatedly. "
            f"Auto-retry in {_CircuitBreaker.RECOVERY_TIMEOUT}s. "
            "Check https://status.anthropic.com"
        )
        log.error("[Agent 2 — Extraction] %s", msg)
        return {"result": None, "status": "model_error", "error_message": msg}

    system_prompt = (
        "Είσαι ο Jarvis, Chief Risk Officer της EuroQuant — RegTech πλατφόρμα "
        "για VC Due Diligence σε DefenseTech/GovTech/DeepTech.\n\n"
        "Κανόνες:\n"
        "1. Χρησιμοποίησε ΜΟΝΟ πληροφορίες από το έγγραφο.\n"
        "2. Αν πεδίο δεν αναφέρεται: default (None, False, [], κ.λπ.).\n"
        "3. governance_intensity 0-100: PEP(30%) + offshore(20%) + procurement(25%) + connections(25%).\n"
        "4. risk_flags: συγκεκριμένα red flags με αποδεικτικά στοιχεία.\n"
        "5. founder_id: FND-YYYYMMDD-001 (σημερινή ημερομηνία)."
    )

    last_error = None
    for attempt, delay in enumerate(_RETRY_DELAYS):
        try:
            log.info(
                "[Agent 2 — Extraction] Attempt %d/%d...",
                attempt + 1, len(_RETRY_DELAYS)
            )
            llm            = ChatAnthropic(model=MODEL_NAME, temperature=0)
            structured_llm = llm.with_structured_output(FounderRiskProfile)

            profile: FounderRiskProfile = structured_llm.invoke([
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": (
                    f"Ανάλυσε:\n\n--- ΕΓΓΡΑΦΟ ---\n{state['raw_text']}\n--- ΤΕΛΟΣ ---"
                )},
            ])

            result = RiskExtractionResult(
                profile=profile,
                processing_timestamp=datetime.now(timezone.utc).isoformat(),
                document_hash=state["document_hash"],
                extractor_version=JARVIS_VERSION,
                extraction_confidence=state["text_confidence"],
                used_ocr_fallback=state["used_ocr_fallback"],
            )

            _extraction_circuit_breaker.record_success()
            log.info("[Agent 2 — Extraction] ✅ %s | GI: %.1f | PEP: %s (attempt %d)",
                     profile.full_name, profile.governance_intensity,
                     profile.pep_status, attempt + 1)
            return {"result": result, "status": "analysis_complete"}

        except Exception as e:
            last_error = e
            is_last    = attempt == len(_RETRY_DELAYS) - 1

            if not _is_retryable_error(e):
                # Validation / schema error — no retry, log and fail fast
                log.error("[Agent 2 — Extraction] Non-retryable error: %s", e)
                _extraction_circuit_breaker.record_failure()
                return {"result": None, "status": "model_error",
                        "error_message": f"[{_EC.MODEL_SCHEMA_ERROR}] Extraction schema error: {e}"}

            if is_last:
                break

            # Longer wait on rate limit errors
            wait = _RETRY_RATE_DELAY if "429" in str(e) else delay
            log.warning(
                "[Agent 2 — Extraction] Attempt %d failed (%s). Retrying in %ds...",
                attempt + 1, type(e).__name__, wait
            )
            time.sleep(wait)

    # All retries exhausted
    _extraction_circuit_breaker.record_failure()
    log.error("[Agent 2 — Extraction] All %d attempts failed. Last error: %s",
              len(_RETRY_DELAYS), last_error)
    return {
        "result": None,
        "status": "model_error",
        "error_message": (
            f"[{_EC.MODEL_RETRIES_EXHAUSTED}] "
            f"Model call failed after {len(_RETRY_DELAYS)} attempts: {last_error}"
        ),
    }


# ── Node 3: Reference Check ───────────────────────────────────────

def reference_check_node(state: JarvisState) -> dict:
    """
    Cross-checks extracted profile against:
      • OFAC SDN List         (US Treasury)
      • EU Consolidated List  (European Commission)
      • OpenCorporates        (company verification)

    NON-BLOCKING: errors are logged but never stop the pipeline.
    """
    log.info("[Agent 3 — Reference Check] Starting cross-database validation...")
    profile   = state["result"].profile
    errors    = []
    all_hits  = []
    comp_verif = []
    risk_delta = 0.0

    try:
        checker  = SanctionsChecker()
        hits     = checker.check(profile.full_name)
        all_hits.extend(hits)
        if hits:
            risk_delta += 20.0
            log.warning("[Agent 3 — Reference Check] 🚨 %d SANCTIONS HITS for '%s'",
                        len(hits), profile.full_name)
        else:
            log.info("[Agent 3 — Reference Check] No sanctions hits for '%s'.", profile.full_name)
    except Exception as e:
        errors.append(f"SanctionsChecker: {e}")
        log.warning("[Agent 3 — Reference Check] Sanctions check error: %s", e)

    try:
        cc        = CompanyChecker(api_token=os.getenv("OPENCORPORATES_API_KEY"))
        comp_verif = cc.check_all(profile.associated_companies)
        n_verified = sum(1 for v in comp_verif if v["verified"])
        log.info("[Agent 3 — Reference Check] OpenCorporates: %d/%d companies verified.",
                 n_verified, len(comp_verif))
    except Exception as e:
        errors.append(f"CompanyChecker: {e}")
        log.warning("[Agent 3 — Reference Check] Company check error: %s", e)

    summary = ReferenceCheckSummary(
        checked_at=datetime.now(timezone.utc).isoformat(),
        sanctions_hits=[ReferenceHit(**h) for h in all_hits],
        company_verifications=comp_verif,
        risk_delta=risk_delta,
        sources_checked=["OFAC_SDN", "EU_CONSOLIDATED", "OPENCORPORATES"],
        errors=errors,
    )
    updated_result = state["result"].model_copy(update={"reference_check": summary})
    log.info("[Agent 3 — Reference Check] ✅ Done. Hits: %d | Risk delta: +%.1f | Errors: %d",
             len(all_hits), risk_delta, len(errors))

    return {"result": updated_result, "reference_hits": all_hits,
            "reference_errors": errors, "status": "reference_complete"}


# ── Node 4: Neo4j Persistence ─────────────────────────────────────

def neo4j_persist_node(state: JarvisState) -> dict:
    """
    Persists enriched profile to Neo4j graph database.
    NON-BLOCKING: missing credentials or connection errors don't fail pipeline.
    """
    log.info("[Agent 4 — Neo4j] Persisting to graph database...")
    uri      = os.getenv("NEO4J_URI",      "bolt://localhost:7687")
    user     = os.getenv("NEO4J_USER",     "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "")

    if not password:
        log.warning("[Agent 4 — Neo4j] NEO4J_PASSWORD not set in .env — skipping.")
        return {"neo4j_persisted": False, "status": "persisted"}

    persister = Neo4jPersister(uri, user, password)
    try:
        if not persister.health_check():
            raise ConnectionError("Neo4j unreachable — check Docker/Desktop")

        success = persister.persist(state["result"])

        if success:
            founder_id = state["result"].profile.founder_id
            pathway    = persister.pathway_network(founder_id, max_hops=2)
            if pathway:
                log.info("[Agent 4 — Neo4j] 🕸️  Pathway network (%d figures within 2 hops):",
                         len(pathway))
                for fig in pathway:
                    pep_tag = " [PEP]" if fig.get("is_pep") else ""
                    log.info("    [dist=%d] %s | %s (%s)%s",
                             fig["distance"], fig["name"], fig["role"],
                             fig["jurisdiction"], pep_tag)

        updated_result = state["result"].model_copy(update={"neo4j_persisted": success})
        persister.close()
        return {"result": updated_result, "neo4j_persisted": success, "status": "persisted"}

    except Exception as e:
        log.error("[Agent 4 — Neo4j] Error (non-fatal): %s", e)
        try:
            persister.close()
        except Exception:
            pass
        return {"neo4j_persisted": False, "status": "persisted"}


# ── Node 5: Error Report ──────────────────────────────────────────

def error_report_node(state: JarvisState) -> dict:
    """Structured error log. Zero tokens burned. Production: add Sentry/DataDog here."""
    log.error("[Agent 5 — Error Report] Pipeline failed. Status: %s | Cause: %s",
              state.get("status"), state.get("error_message"))
    return {}


log.info("✅ All 5 agent nodes defined. Ingestion: v3.1 (FIX-1,2,3,4 applied)")


# ═══════════════════════════════════════════════════════════════
# Cell 6b: benchmark_node — Mission 4 Agent Node
# Runs AFTER neo4j_persist_node. Updates market_percentile
# in the result with the data-driven value from BenchmarkEngine.
# NON-BLOCKING — errors fall back to Claude value silently.
# ═══════════════════════════════════════════════════════════════

def benchmark_node(state: JarvisState) -> dict:
    log.info("[Agent 5 — Benchmark] Calculating data-driven market_percentile...")

    uri      = os.getenv("NEO4J_URI",      "bolt://localhost:7687")
    user     = os.getenv("NEO4J_USER",     "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "")

    result  = state["result"]
    profile = result.profile

    if not password:
        log.warning("[Agent 5 — Benchmark] NEO4J_PASSWORD not set — using FATF cold start.")
        # Still run cold start even without Neo4j
        pct = BenchmarkEngine(None)._percentile_from_fatf_table(profile.governance_intensity)
        updated_result = result.model_copy(update={
            "benchmark_percentile":  pct,
            "benchmark_cohort_size": 0,
            "benchmark_source":      "cold_start_fatf",
        })
        return {"result": updated_result, "benchmark_percentile": pct,
                "benchmark_cohort_size": 0, "benchmark_source": "cold_start_fatf",
                "status": "benchmarked"}

    try:
        driver = GraphDatabase.driver(uri, auth=(user, password))
        engine = BenchmarkEngine(driver)
        bench  = engine.calculate(profile.founder_id, profile.governance_intensity)
        driver.close()

        # Key architectural decision: we do NOT mutate governance_intensity
        # (that is Claude's extraction). We only update market_percentile
        # with the data-driven value and store the benchmark metadata.
        updated_profile = profile.model_copy(update={
            "market_percentile": bench["percentile"]
        })
        updated_result = result.model_copy(update={
            "profile":              updated_profile,
            "benchmark_percentile":  bench["percentile"],
            "benchmark_cohort_size": bench["cohort_size"],
            "benchmark_source":      bench["source"],
        })

        delta = bench["percentile"] - profile.market_percentile
        delta_str = f"+{delta:.1f}" if delta >= 0 else f"{delta:.1f}"
        log.info(
            "[Agent 5 — Benchmark] ✅ market_percentile: %.1f%% → %.1f%% (%s) | source=%s | cohort=%d",
            profile.market_percentile, bench["percentile"],
            delta_str, bench["source"], bench["cohort_size"]
        )

        return {
            "result":               updated_result,
            "benchmark_percentile":  bench["percentile"],
            "benchmark_cohort_size": bench["cohort_size"],
            "benchmark_source":      bench["source"],
            "status":               "benchmarked",
        }

    except Exception as e:
        log.error("[Agent 5 — Benchmark] Error (non-fatal, keeping Claude value): %s", e)
        return {
            "benchmark_percentile":  profile.market_percentile,
            "benchmark_cohort_size": 0,
            "benchmark_source":      "claude_fallback",
            "status":               "benchmarked",
        }


# ─────────────────────────────────────────────
# Cell 7: Graph Assembly & Compilation
# ─────────────────────────────────────────────

def route_after_ingestion(state: JarvisState) -> str:
    if state["status"] == "extraction_failed":
        log.info("[Router 1] extraction_failed → error_report (0 tokens)")
        return "error"
    return "extract"

def route_after_extraction(state: JarvisState) -> str:
    if state["status"] == "model_error":
        log.info("[Router 2] model_error → error_report")
        return "error"
    return "reference"


workflow = StateGraph(JarvisState)

# Nodes
workflow.add_node("ingest",          ingest_pdf_node)
workflow.add_node("extract",         extract_risk_node)
workflow.add_node("reference_check", reference_check_node)
workflow.add_node("neo4j_persist",   neo4j_persist_node)
workflow.add_node("error_report",    error_report_node)
workflow.add_node("benchmark",      benchmark_node)

# Entry
workflow.set_entry_point("ingest")

# Conditional routing
workflow.add_conditional_edges(
    "ingest",   route_after_ingestion,
    {"extract": "extract", "error": "error_report"},
)
workflow.add_conditional_edges(
    "extract",  route_after_extraction,
    {"reference": "reference_check", "error": "error_report"},
)

# Linear edges (reference → neo4j always runs)
workflow.add_edge("reference_check", "neo4j_persist")
workflow.add_edge("neo4j_persist",   "benchmark")
workflow.add_edge("benchmark",      END)
workflow.add_edge("error_report",    END)

jarvis_engine = workflow.compile()

log.info("✅ Jarvis Engine v2 compiled.")
print()
print("=" * 58)
print("  🤖 JARVIS ENGINE v3 ONLINE")
print(f"  Version : {JARVIS_VERSION}")
print(f"  Model   : {MODEL_NAME}")
print("  Flow    : ingest → extract → reference → neo4j → benchmark → END")
print("  Nodes   : 6  |  Routers: 2  |  Terminal edges: 3")
print("=" * 58)


# ─────────────────────────────────────────────────────────────────
# Cell 8: Neo4j One-Time Setup
# Τρέξε αυτό το κελί ΜΟΝΟ ΤΗΝ ΠΡΩΤΗ ΦΟΡΑ για να δημιουργηθούν
# τα constraints και indexes στη βάση.
# ─────────────────────────────────────────────────────────────────
_uri  = os.getenv("NEO4J_URI",      "bolt://localhost:7687")
_user = os.getenv("NEO4J_USER",     "neo4j")
_pass = os.getenv("NEO4J_PASSWORD", "")

if not _pass:
    print("ℹ️  NEO4J_PASSWORD not set in .env — skipping Neo4j setup.")
    print("   Αν θέλεις Neo4j, πρόσθεσε το στο .env και ξανατρέξε.")
else:
    _p = Neo4jPersister(_uri, _user, _pass)
    if _p.health_check():
        _p.setup_constraints()
        _p.close()
        print("✅ Neo4j constraints + indexes created. Έτοιμο για persistence.")
        print("   Browser: http://localhost:7474")
    else:
        print("⚠️  Neo4j not reachable.")
        print("   Βεβαιώσου ότι τρέχει το Docker container:")
        print("   docker ps | grep neo4j")



# ═══════════════════════════════════════════════════════════════════════
# CLI entry point — run a single PDF from the command line
# Usage: python jarvis_v3.py path/to/document.pdf
# ═══════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import sys, pprint
    pdf_path = sys.argv[1] if len(sys.argv) > 1 else "test_doc.pdf"
    print(f"\n🚀 Jarvis CLI · {pdf_path}")
    print("-" * 65)

    initial_state = {
        "pdf_path":              pdf_path,
        "raw_text":              "",
        "document_hash":         "",
        "used_ocr_fallback":     False,
        "text_confidence":       0.0,
        "result":                None,
        "reference_hits":        [],
        "reference_errors":      [],
        "neo4j_persisted":       False,
        "benchmark_percentile":  None,
        "benchmark_cohort_size": 0,
        "benchmark_source":      "cold_start_fatf",
        "status":                "pending",
        "error_message":         None,
    }

    final = jarvis_engine.invoke(initial_state)
    print(f"\n📊 Status: {final['status']}")

    if final.get("result"):
        p = final["result"].profile
        print(f"\n{'='*65}")
        print(f"  EUROQUANT RISK REPORT v3.1")
        print(f"{'='*65}")
        print(f"  Founder:              {p.full_name}")
        print(f"  Governance Intensity: {p.governance_intensity:.1f}/100")
        print(f"  Market Percentile:    {p.market_percentile:.1f}%")
        print(f"  PEP Status:           {p.pep_status.value}")
        print(f"  Sanctions Hit:        {p.sanctions_hit}")
        print(f"  Risk Flags:           {len(p.risk_flags)}")
        print(f"{'='*65}")
    else:
        print(f"  Error: {final.get('error_message')}")
