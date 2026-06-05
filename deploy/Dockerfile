FROM python:3.11-slim

# System deps for OCR fallback (FIX-3) and health probe
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-ell \
    tesseract-ocr-eng \
    poppler-utils \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user before app setup so COPY --chown works in one layer
RUN useradd -m -u 1001 -s /bin/bash euroquant

WORKDIR /app

# Install Python dependencies first — separate layer keeps cache hot on code changes
COPY api/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code, owned by non-root user
COPY --chown=euroquant:euroquant . .

USER euroquant

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -fsS http://localhost:8000/api/health || exit 1

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
