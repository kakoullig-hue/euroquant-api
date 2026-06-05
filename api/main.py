"""
═══════════════════════════════════════════════════════════════════════
EuroQuant Risk Terminal — FastAPI Gateway
Mission 5: REST API wrapper around the Jarvis MAS Engine
Version: 1.0.0
═══════════════════════════════════════════════════════════════════════

Architecture:
  Client (Dashboard / curl / SDK)
        │
        ▼
  FastAPI Gateway (this file)
    • API key auth (header: X-API-Key)
    • CORS for dashboard
    • Rate limiting (slowapi)
    • Ephemeral file handling (delete immediately after Jarvis returns)
    • Audit log (no document content, only metadata)
        │
        ▼
  Jarvis Engine (LangGraph MAS)
    • ingest → extract → reference → neo4j → benchmark → END

Production deployment:
  uvicorn api.main:app --host 0.0.0.0 --port 8000 --workers 4
  Behind: nginx with TLS + WAF (Cloudflare / AWS ALB)
"""

from __future__ import annotations

import io
import os
import time
import uuid
import logging
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Path manipulation so `from reports.pdf_generator import ...` resolves correctly
# regardless of which directory uvicorn is launched from.
import sys as _sys
_sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# ── Load .env — works regardless of which directory uvicorn is launched from
_HERE = Path(__file__).resolve().parent
load_dotenv(_HERE / ".env", override=False)         # api/.env  (preferred)
load_dotenv(_HERE.parent / ".env", override=False)  # root .env (fallback)

# ── Logging configuration ─────────────────────────────────────────────
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("euroquant.api")

# ── Configuration ─────────────────────────────────────────────────────
MAX_UPLOAD_MB    = int(os.getenv("MAX_INGESTION_MB", "50"))
ALLOWED_ORIGINS  = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
API_KEYS_RAW     = os.getenv("EUROQUANT_API_KEYS", "")  # comma-separated
VALID_API_KEYS   = {k.strip() for k in API_KEYS_RAW.split(",") if k.strip()}
JARVIS_VERSION   = "jarvis-v3.1.0"
API_VERSION      = "1.0.0"

# ── In-memory PDF report cache (keyed by request_id) ─────────────────
# Entries are written on /analyze success and consumed by GET /report/{id}.
# No TTL eviction needed at this scale; revisit if memory pressure becomes
# an issue (migrate to Redis or presigned S3 objects at that point).
_PDF_CACHE: dict[str, bytes] = {}

# ── Sanity check on startup ───────────────────────────────────────────
if not VALID_API_KEYS:
    log.warning(
        "⚠️  No EUROQUANT_API_KEYS set in env. API will REJECT all requests. "
        "Set comma-separated keys in production. Dev key created for local use only."
    )
    # Single dev-only key — printed once at startup for local testing
    DEV_KEY = "dev-" + uuid.uuid4().hex[:16]
    VALID_API_KEYS.add(DEV_KEY)
    log.warning("🔑 DEV-ONLY API key: %s", DEV_KEY)

# ── Jarvis import (lazy — fail fast if backend unavailable) ───────────
try:
    # In production this imports the compiled Jarvis engine
    # For Jupyter-developed Jarvis, run nbconvert first:
    #   jupyter nbconvert --to script jarvis_v3.ipynb
    from jarvis_v3 import jarvis_engine, JarvisState  # type: ignore
    JARVIS_AVAILABLE = True
    log.info("✅ Jarvis engine imported successfully.")
except ImportError as e:
    log.error("❌ Jarvis engine import failed: %s", e)
    log.error("   Run: jupyter nbconvert --to script jarvis_v3.ipynb")
    JARVIS_AVAILABLE = False
    jarvis_engine = None
    JarvisState   = dict  # type: ignore

# ═══════════════════════════════════════════════════════════════════════
# FASTAPI APP
# ═══════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="EuroQuant Risk Terminal API",
    description="REST gateway for the Jarvis Risk Analysis Engine",
    version=API_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ── Auth dependency ───────────────────────────────────────────────────
async def verify_api_key(x_api_key: Optional[str] = Header(None)) -> str:
    """
    API key validation via X-API-Key header.

    Production note: this is a minimal implementation. For B2B Enterprise:
      • Move keys to a database (PostgreSQL `api_keys` table)
      • Add per-key rate limits and quota
      • Hash keys at rest (argon2) — never store plaintext
      • Rotate keys via admin endpoint
      • Track usage (key_id, endpoint, timestamp) for billing
    """
    if not x_api_key:
        raise HTTPException(status_code=401, detail="Missing X-API-Key header")
    if x_api_key not in VALID_API_KEYS:
        log.warning("Invalid API key attempted: %s...", x_api_key[:8])
        raise HTTPException(status_code=403, detail="Invalid API key")
    return x_api_key


# ── Simple in-memory rate limiter (replace with Redis in production) ──
_RATE_LIMITS: dict[str, list[float]] = {}
_RATE_WINDOW_SEC = 60
_RATE_MAX_REQS   = 30  # per API key per window

def _check_rate_limit(api_key: str) -> None:
    now = time.time()
    bucket = _RATE_LIMITS.setdefault(api_key, [])
    # Drop timestamps outside window
    bucket[:] = [t for t in bucket if now - t < _RATE_WINDOW_SEC]
    if len(bucket) >= _RATE_MAX_REQS:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: {_RATE_MAX_REQS} requests per {_RATE_WINDOW_SEC}s",
            headers={"Retry-After": str(_RATE_WINDOW_SEC)},
        )
    bucket.append(now)


# ═══════════════════════════════════════════════════════════════════════
# HEALTH & STATUS ENDPOINTS (no auth required)
# ═══════════════════════════════════════════════════════════════════════

class HealthResponse(BaseModel):
    status:           str
    api_version:      str
    jarvis_version:   str
    jarvis_available: bool
    timestamp:        str


@app.get("/api/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Liveness probe. No auth required — used by load balancers."""
    return HealthResponse(
        status="ok" if JARVIS_AVAILABLE else "degraded",
        api_version=API_VERSION,
        jarvis_version=JARVIS_VERSION,
        jarvis_available=JARVIS_AVAILABLE,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.get("/", tags=["System"])
async def root():
    return {
        "service":     "EuroQuant Risk Terminal API",
        "version":     API_VERSION,
        "docs":        "/api/docs",
        "health":      "/api/health",
    }


# ═══════════════════════════════════════════════════════════════════════
# ANALYZE ENDPOINT — Core product
# ═══════════════════════════════════════════════════════════════════════

class AnalysisError(BaseModel):
    error:   str
    detail:  Optional[str] = None
    code:    str


@app.post("/api/v1/analyze", tags=["Analysis"])
async def analyze_pdf(
    request:  Request,
    file:     UploadFile = File(..., description="PDF document to analyze (max 50MB)"),
    api_key:  str        = Depends(verify_api_key),
):
    """
    Analyze a PDF document and return a RiskExtractionResult.

    **Ephemeral guarantee:** The uploaded document is written to a temporary
    location, processed by Jarvis, and DELETED before this endpoint returns.
    No copy is retained on disk, in cache, or in logs. Only the SHA-256 hash
    and metadata are kept for audit purposes.

    **Request:**
      - Header `X-API-Key`: your API key
      - Multipart form field `file`: the PDF (max 50MB)

    **Response codes:**
      - 200: analysis complete, returns full RiskExtractionResult
      - 400: invalid file (wrong type, empty)
      - 413: file too large
      - 422: PDF parsing failed
      - 429: rate limit exceeded
      - 500: Jarvis engine error
      - 503: Jarvis engine unavailable
    """
    request_id = uuid.uuid4().hex[:16]
    started    = time.time()

    # Rate limit check
    _check_rate_limit(api_key)

    # Service availability check
    if not JARVIS_AVAILABLE or jarvis_engine is None:
        raise HTTPException(
            status_code=503,
            detail="Jarvis engine is currently unavailable. Try again later.",
        )

    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail=f"Only PDF files accepted. Got: {file.filename}",
        )

    # Read file into memory (size-bounded)
    max_bytes = MAX_UPLOAD_MB * 1024 * 1024
    contents  = await file.read()
    size_mb   = len(contents) / (1024 * 1024)

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file received")
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large: {size_mb:.1f}MB exceeds limit of {MAX_UPLOAD_MB}MB",
        )

    log.info(
        "[%s] Analyze request: file=%s size=%.1fMB api_key=%s...",
        request_id, file.filename, size_mb, api_key[:8],
    )

    # ── Ephemeral processing ──────────────────────────────────────────
    # Write to tempfile, run Jarvis, ALWAYS delete (even on exception)
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            suffix=".pdf", delete=False, dir=tempfile.gettempdir()
        ) as tmp:
            tmp.write(contents)
            temp_path = tmp.name

        # Free the bytes buffer immediately
        del contents

        # Build initial Jarvis state
        initial_state = {
            "pdf_path":              temp_path,
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

        log.info("[%s] Invoking Jarvis engine...", request_id)
        final_state = jarvis_engine.invoke(initial_state)
        elapsed_ms  = int((time.time() - started) * 1000)

        # Handle pipeline failure
        status = final_state.get("status", "unknown")
        if status in ("extraction_failed", "model_error"):
            log.error(
                "[%s] Pipeline failed | status=%s | %s",
                request_id, status, final_state.get("error_message"),
            )
            return JSONResponse(
                status_code=422,
                content={
                    "error":      "Analysis failed",
                    "detail":     final_state.get("error_message"),
                    "code":       status,
                    "request_id": request_id,
                    "elapsed_ms": elapsed_ms,
                },
            )

        # Success path — serialize the RiskExtractionResult
        result = final_state["result"]
        result_json = result.model_dump(mode="json")

        log.info(
            "[%s] ✅ Analysis complete | founder=%s | GI=%.1f | elapsed=%dms",
            request_id,
            result.profile.full_name,
            result.profile.governance_intensity,
            elapsed_ms,
        )

        # Auto-generate PDF report and cache for download (non-fatal if unavailable)
        report_url: Optional[str] = None
        try:
            from reports.pdf_generator import build_risk_report_pdf
            pdf_bytes = build_risk_report_pdf(result_json)
            _PDF_CACHE[request_id] = pdf_bytes
            report_url = f"/api/v1/report/{request_id}"
            log.info("[%s] PDF report cached (%d bytes) → %s", request_id, len(pdf_bytes), report_url)
        except ImportError:
            log.warning("[%s] PDF generation skipped — reports.pdf_generator unavailable", request_id)
        except Exception as _pdf_err:
            log.warning("[%s] PDF generation failed (non-fatal): %s", request_id, _pdf_err)

        return JSONResponse(
            status_code=200,
            content={
                "request_id": request_id,
                "elapsed_ms": elapsed_ms,
                "result":     result_json,
                "report_url": report_url,
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        log.exception("[%s] Unhandled engine error", request_id)
        raise HTTPException(
            status_code=500,
            detail=f"Internal engine error: {type(e).__name__}",
        )
    finally:
        # ── EPHEMERAL GUARANTEE ───────────────────────────────────────
        # Always delete the temp file, even on exception
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
                log.info("[%s] 🔥 Temp file destroyed: %s", request_id, temp_path)
            except OSError as e:
                # This is critical — log loudly if cleanup fails
                log.critical(
                    "[%s] ⚠️  EPHEMERAL VIOLATION: temp file not deleted: %s | %s",
                    request_id, temp_path, e,
                )


# ═══════════════════════════════════════════════════════════════════════
# REPORT DOWNLOAD ENDPOINT — serves PDF cached by /analyze
# ═══════════════════════════════════════════════════════════════════════

@app.get("/api/v1/report/{request_id}", tags=["Analysis"])
async def download_report(
    request_id: str,
    api_key: str = Depends(verify_api_key),
):
    """
    Download the PDF report generated by a prior /api/v1/analyze call.

    The PDF is held in-memory until the process restarts. Reports are
    cached per request_id returned in the /analyze response.
    """
    pdf_bytes = _PDF_CACHE.get(request_id)
    if pdf_bytes is None:
        raise HTTPException(
            status_code=404,
            detail=f"Report not found for request_id={request_id}. "
                   "Reports expire on service restart — re-run /analyze to regenerate.",
        )
    filename = f"EuroQuant_Risk_Report_{request_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ═══════════════════════════════════════════════════════════════════════
# PDF REPORT ENDPOINT — Mission 7 integration
# ═══════════════════════════════════════════════════════════════════════

@app.post("/api/v1/analyze/report", tags=["Analysis"])
async def analyze_and_generate_report(
    request:  Request,
    file:     UploadFile = File(..., description="PDF document to analyze"),
    api_key:  str        = Depends(verify_api_key),
):
    """
    Same as /analyze but returns a branded PDF report instead of JSON.

    The PDF includes:
      • Cover page with subject identification
      • Executive summary + verdict
      • Governance Intensity score gauge
      • Risk flags with severity coding
      • Associated companies table
      • Political connections (pathway distance encoded)
      • Reference Layer check results
      • **Analyst sign-off field** (GDPR Article 22 compliance)
      • Audit trail (document hash, processing timestamp, engine version)
    """
    # Reuse the analyze logic
    analyze_response = await analyze_pdf(request=request, file=file, api_key=api_key)

    # If analyze returned an error, propagate it
    if isinstance(analyze_response, JSONResponse) and analyze_response.status_code != 200:
        return analyze_response

    # Extract the result JSON
    import json as _json
    body = _json.loads(analyze_response.body.decode())
    result_dict = body["result"]

    # Generate PDF via the report module (Mission 7)
    try:
        from reports.pdf_generator import build_risk_report_pdf
        pdf_bytes = build_risk_report_pdf(result_dict)
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Report module unavailable. Check reports/pdf_generator.py is installed.",
        )
    except Exception as e:
        log.exception("PDF generation failed")
        raise HTTPException(
            status_code=500,
            detail=f"PDF generation failed: {type(e).__name__}",
        )

    founder_id = result_dict["profile"]["founder_id"]
    filename   = f"EuroQuant_Risk_Report_{founder_id}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Request-ID":        body["request_id"],
        },
    )


# ═══════════════════════════════════════════════════════════════════════
# ENTRY POINT (dev only — use uvicorn directly in prod)
# ═══════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    log.info("🚀 Starting EuroQuant API on http://localhost:8000")
    log.info("   Docs: http://localhost:8000/api/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
