"""
M-5.2: Usage metering — per-tenant call tracking for billing.

Primary store: Redis hash  'jarvis:usage:{tenant_id}'  (shared across workers)
Fallback:      in-memory dict  (single-worker / dev, lost on restart)

tenant_id is the SHA-256 first 8 chars of the caller's API key — same
derivation as jarvis_v3._tenant_id so Neo4j subgraph and usage records
are correlated by the same partition key.
"""

import hashlib
import logging
import time
from typing import Optional

log = logging.getLogger("euroquant.usage")

REDIS_KEY_PREFIX = "jarvis:usage:"


def tenant_id_from_key(api_key: str) -> str:
    """SHA-256 first 8 chars of the API key — must match jarvis_v3._tenant_id."""
    return hashlib.sha256(api_key.encode()).hexdigest()[:8]


class UsageMeter:
    """
    Per-tenant usage counter.

    Writes to a Redis hash keyed by 'jarvis:usage:{tenant_id}':
      total_calls        — lifetime /analyze calls
      total_elapsed_ms   — cumulative processing time
      documents_analyzed — always equals total_calls on success path
      last_call_at       — ISO-8601 UTC timestamp of last record() call

    Falls back to an in-memory dict when Redis is unavailable.
    In-memory state is lost on process restart; acceptable for dev.
    """

    def __init__(self, redis_url: Optional[str] = None):
        self._redis = None
        self._mem: dict[str, dict] = {}

        if redis_url:
            try:
                import redis as _redis_lib
                client = _redis_lib.from_url(
                    redis_url, socket_connect_timeout=2, decode_responses=True
                )
                client.ping()
                self._redis = client
                log.info("[UsageMeter] Redis backend active.")
            except Exception as exc:
                log.warning("[UsageMeter] Redis unavailable (%s) — using in-memory fallback.", exc)

    def _redis_key(self, tenant_id: str) -> str:
        return f"{REDIS_KEY_PREFIX}{tenant_id}"

    def record(self, tenant_id: str, elapsed_ms: int) -> None:
        """Increment usage counters for tenant_id after a successful /analyze call."""
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        if self._redis is not None:
            try:
                key  = self._redis_key(tenant_id)
                pipe = self._redis.pipeline()
                pipe.hincrby(key, "total_calls", 1)
                pipe.hincrbyfloat(key, "total_elapsed_ms", elapsed_ms)
                pipe.hincrby(key, "documents_analyzed", 1)
                pipe.hset(key, "last_call_at", now_iso)
                pipe.execute()
                log.info("[UsageMeter] Recorded %dms for tenant=%s", elapsed_ms, tenant_id)
                return
            except Exception as exc:
                log.warning("[UsageMeter] Redis write failed (%s) — writing in-memory.", exc)
                self._redis = None

        bucket = self._mem.setdefault(tenant_id, {
            "total_calls":       0,
            "total_elapsed_ms":  0,
            "documents_analyzed": 0,
            "last_call_at":      None,
        })
        bucket["total_calls"]        += 1
        bucket["total_elapsed_ms"]   += elapsed_ms
        bucket["documents_analyzed"] += 1
        bucket["last_call_at"]        = now_iso

    def get(self, tenant_id: str) -> dict:
        """Return usage stats for tenant_id. Never raises — returns zeroed dict if unknown."""
        if self._redis is not None:
            try:
                raw = self._redis.hgetall(self._redis_key(tenant_id))
                if raw:
                    return {
                        "tenant_id":          tenant_id,
                        "total_calls":        int(raw.get("total_calls", 0)),
                        "total_elapsed_ms":   int(float(raw.get("total_elapsed_ms", 0))),
                        "documents_analyzed": int(raw.get("documents_analyzed", 0)),
                        "last_call_at":       raw.get("last_call_at"),
                    }
            except Exception as exc:
                log.warning("[UsageMeter] Redis read failed: %s", exc)

        bucket = self._mem.get(tenant_id, {})
        return {
            "tenant_id":          tenant_id,
            "total_calls":        bucket.get("total_calls", 0),
            "total_elapsed_ms":   int(bucket.get("total_elapsed_ms", 0)),
            "documents_analyzed": bucket.get("documents_analyzed", 0),
            "last_call_at":       bucket.get("last_call_at"),
        }
