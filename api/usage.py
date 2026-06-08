"""
═══════════════════════════════════════════════════════════════════════
EuroQuant Risk Terminal — Usage Metering (usage.py)
───────────────────────────────────────────────────────────────────────
Per-tenant usage counters for the FastAPI gateway.

Design:
  • tenant_id = first 8 hex chars of SHA-256(api_key) — stable, non-reversible.
  • UsageMeter records (call_count, total_ms, last_call) per tenant.
  • Backed by Redis when REDIS_URL is set; falls back to an in-process
    dict otherwise (fine for single-worker free-tier deployments).

This module was reconstructed to match the interface main.py expects:
    from usage import UsageMeter, tenant_id_from_key
    meter = UsageMeter(redis_url=os.getenv("REDIS_URL"))
    meter.record(tenant_id, elapsed_ms)
    stats = meter.get(tenant_id)   # -> dict
═══════════════════════════════════════════════════════════════════════
"""

from __future__ import annotations

import hashlib
import logging
import threading
import time
from typing import Optional

log = logging.getLogger("euroquant.usage")


def tenant_id_from_key(api_key: str) -> str:
    """Stable, non-reversible tenant id derived from the API key."""
    if not api_key:
        return "anonymous"
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()[:8]


class UsageMeter:
    """
    Records per-tenant usage. Uses Redis if a URL is provided and the
    redis package is importable; otherwise uses an in-process dict.

    Stored fields per tenant:
        calls       : int   total /analyze calls
        total_ms    : int   cumulative processing time
        avg_ms      : float calls>0 ? total_ms/calls : 0
        last_call   : float unix timestamp of most recent call
    """

    def __init__(self, redis_url: Optional[str] = None):
        self._redis = None
        self._lock = threading.Lock()
        self._mem: dict[str, dict] = {}

        if redis_url:
            try:
                import redis  # type: ignore
                self._redis = redis.from_url(redis_url, decode_responses=True)
                self._redis.ping()
                log.info("[UsageMeter] ✅ Redis backend active.")
            except Exception as e:
                log.warning(
                    "[UsageMeter] Redis unavailable (%s) — falling back to in-memory.", e
                )
                self._redis = None
        else:
            log.info("[UsageMeter] No REDIS_URL — using in-memory backend.")

    # ── Public API ────────────────────────────────────────────────────
    def record(self, tenant_id: str, elapsed_ms: int) -> None:
        """Record one billable call for a tenant."""
        try:
            if self._redis is not None:
                key = f"eq:usage:{tenant_id}"
                pipe = self._redis.pipeline()
                pipe.hincrby(key, "calls", 1)
                pipe.hincrby(key, "total_ms", int(elapsed_ms))
                pipe.hset(key, "last_call", time.time())
                pipe.execute()
            else:
                with self._lock:
                    rec = self._mem.setdefault(
                        tenant_id, {"calls": 0, "total_ms": 0, "last_call": 0.0}
                    )
                    rec["calls"] += 1
                    rec["total_ms"] += int(elapsed_ms)
                    rec["last_call"] = time.time()
        except Exception as e:
            # Metering must never break the request path.
            log.error("[UsageMeter] record failed (non-fatal): %s", e)

    def get(self, tenant_id: str) -> dict:
        """Return usage stats for a tenant. Always returns a dict."""
        try:
            if self._redis is not None:
                key = f"eq:usage:{tenant_id}"
                raw = self._redis.hgetall(key) or {}
                calls = int(raw.get("calls", 0))
                total_ms = int(raw.get("total_ms", 0))
                last_call = float(raw.get("last_call", 0.0))
            else:
                with self._lock:
                    rec = self._mem.get(
                        tenant_id, {"calls": 0, "total_ms": 0, "last_call": 0.0}
                    )
                    calls = int(rec["calls"])
                    total_ms = int(rec["total_ms"])
                    last_call = float(rec["last_call"])
        except Exception as e:
            log.error("[UsageMeter] get failed (non-fatal): %s", e)
            calls, total_ms, last_call = 0, 0, 0.0

        return {
            "tenant_id": tenant_id,
            "calls": calls,
            "total_ms": total_ms,
            "avg_ms": round(total_ms / calls, 1) if calls else 0.0,
            "last_call": last_call,
        }
