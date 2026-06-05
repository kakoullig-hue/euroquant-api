#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# EuroQuant Risk Terminal — Mac Setup Script
# Run once: chmod +x setup_mac.sh && ./setup_mac.sh
# ═══════════════════════════════════════════════════════════════════════

set -e  # Stop on any error

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
RESET='\033[0m'

echo ""
echo -e "${CYAN}  ███████╗██╗   ██╗██████╗  ██████╗  ██████╗ ██╗   ██╗ █████╗ ███╗   ██╗████████╗${RESET}"
echo -e "${CYAN}  EUROQUANT RISK TERMINAL — LOCAL SETUP${RESET}"
echo ""

# ── Step 1: Check Python ───────────────────────────────────────────────
echo -e "${CYAN}[1/6]${RESET} Checking Python version..."
PYTHON=$(which python3 || which python)
PY_VER=$($PYTHON --version 2>&1)
echo -e "      ${GREEN}✓ Found: $PY_VER${RESET}"

# ── Step 2: Create virtual environment ────────────────────────────────
echo -e "${CYAN}[2/6]${RESET} Creating virtual environment..."
if [ ! -d ".venv" ]; then
    $PYTHON -m venv .venv
    echo -e "      ${GREEN}✓ Created .venv${RESET}"
else
    echo -e "      ${YELLOW}⚡ .venv already exists — skipping${RESET}"
fi
source .venv/bin/activate

# ── Step 3: Install Python dependencies ───────────────────────────────
echo -e "${CYAN}[3/6]${RESET} Installing dependencies (this takes ~2 min first time)..."
pip install --quiet --upgrade pip
pip install --quiet -r api/requirements.txt
echo -e "      ${GREEN}✓ Dependencies installed${RESET}"

# ── Step 4: Tesseract (OCR fallback) ──────────────────────────────────
echo -e "${CYAN}[4/6]${RESET} Checking Tesseract OCR..."
if command -v tesseract &> /dev/null; then
    echo -e "      ${GREEN}✓ Tesseract found: $(tesseract --version 2>&1 | head -1)${RESET}"
else
    echo -e "      ${YELLOW}⚠ Tesseract not found — OCR fallback will be unavailable${RESET}"
    echo -e "      ${YELLOW}  Install later via: brew install tesseract tesseract-lang${RESET}"
fi

# ── Step 5: Set up .env ───────────────────────────────────────────────
echo -e "${CYAN}[5/6]${RESET} Configuring environment..."
if [ ! -f "api/.env" ]; then
    cp api/.env.example api/.env
    # Generate a random dev API key
    DEV_KEY=$(python3 -c "import secrets; print('dev-' + secrets.token_urlsafe(16))")
    # macOS-compatible sed (no -i '')
    sed -i '' "s/replace_with_generated_key_1/$DEV_KEY/" api/.env
    echo -e "      ${GREEN}✓ Created api/.env with dev key: ${YELLOW}$DEV_KEY${RESET}"
    echo -e "      ${YELLOW}  → Edit api/.env and add your ANTHROPIC_API_KEY to run live analyses${RESET}"
else
    echo -e "      ${YELLOW}⚡ api/.env already exists — not overwriting${RESET}"
fi

# ── Step 6: Verify module ─────────────────────────────────────────────
echo -e "${CYAN}[6/6]${RESET} Checking Jarvis module..."
if [ -f "jarvis_v3.py" ]; then
    python3 -c "import ast; ast.parse(open('jarvis_v3.py').read()); print('ok')" > /dev/null
    echo -e "      ${GREEN}✓ jarvis_v3.py syntax OK${RESET}"
else
    echo -e "      ${YELLOW}⚠ jarvis_v3.py not found — running nbconvert...${RESET}"
    jupyter nbconvert --to script jarvis_v3_final.ipynb --output jarvis_v3 2>/dev/null || \
        echo -e "      ${RED}✗ nbconvert failed — place jarvis_v3.py manually${RESET}"
fi

echo ""
echo -e "${GREEN}══════════════════════════════════════════════${RESET}"
echo -e "${GREEN}  ✅  SETUP COMPLETE${RESET}"
echo -e "${GREEN}══════════════════════════════════════════════${RESET}"
echo ""
echo -e "  ${YELLOW}To start the API:${RESET}"
echo -e "  ${CYAN}  source .venv/bin/activate${RESET}"
echo -e "  ${CYAN}  uvicorn api.main:app --reload --port 8000${RESET}"
echo ""
echo -e "  ${YELLOW}Then open:${RESET}"
echo -e "  ${CYAN}  http://localhost:8000/api/docs${RESET}  ← Swagger UI"
echo -e "  ${CYAN}  http://localhost:8000/api/health${RESET} ← Health check"
echo ""
echo -e "  ${YELLOW}Test with curl:${RESET}"
echo -e "  ${CYAN}  curl -X POST http://localhost:8000/api/v1/analyze/report \\"
echo -e "    -H 'X-API-Key: \$(grep EUROQUANT_API_KEYS api/.env | cut -d= -f2 | cut -d, -f1)' \\"
echo -e "    -F 'file=@test_doc.pdf' -o report.pdf${RESET}"
echo ""
