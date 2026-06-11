"""
═══════════════════════════════════════════════════════════════════════
EuroQuant Risk Terminal — PDF Report Generator
Mission 7: Branded PDF deliverable for VC clients
Version: 1.0.0
═══════════════════════════════════════════════════════════════════════

Brand identity compliance:
  • Colors:     Terminal Canvas #080c14, Card #0d1420, Primary #003399
  • Severity:   CRITICAL #ff3b3b, HIGH #ff8c00, MEDIUM #ffb700, CLEAR #00c896
  • Typography: Space Grotesk (display) + DM Mono (data)
                Falls back to Helvetica + Courier if fonts not embedded.

GDPR Article 22 compliance (Schufa v. CJEU C-634/21):
  Every report includes an "Analyst Verification" section that must be
  manually signed off before the report is considered "issued." This
  transforms the automated GI score from "automated decision-making"
  into "automated input to human decision," satisfying Article 22.

Output: PDF as bytes, ready to stream via FastAPI Response.
"""

from __future__ import annotations

import io
import os
from datetime import datetime, timezone
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, Flowable,
)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


# ═══════════════════════════════════════════════════════════════════════
# BRAND TOKENS (mirrors EuroQuant_Brand_Identity_v1.md)
# ═══════════════════════════════════════════════════════════════════════

# Background layers (PDF uses Institutional Navy instead of Terminal Canvas
# per Brand Identity SECTION 01 — "On print/PDF use #001B52 instead to
# avoid solid black rendering")
COL_BACKGROUND  = colors.HexColor("#001B52")  # Institutional Navy (print)
COL_CARD        = colors.HexColor("#0d1420")  # Card Surface
COL_PRIMARY     = colors.HexColor("#003399")  # Primary Blue
COL_STEEL       = colors.HexColor("#4a90d9")  # UI Steel Blue
COL_BORDER      = colors.HexColor("#131a27")
COL_MUTED       = colors.HexColor("#2d3a50")
COL_SUB         = colors.HexColor("#8899aa")
COL_TEXT        = colors.HexColor("#e2e8f0")
COL_BRIGHT      = colors.HexColor("#f0f4ff")

# Severity palette
COL_CRITICAL = colors.HexColor("#ff3b3b")
COL_HIGH     = colors.HexColor("#ff8c00")
COL_MEDIUM   = colors.HexColor("#ffb700")
COL_CLEAR    = colors.HexColor("#00c896")

# Severity background fills (Brand Identity rules: 18% opacity tint)
COL_CRITICAL_BG = colors.HexColor("#ff3b3b").clone(alpha=0.10)
COL_HIGH_BG     = colors.HexColor("#ff8c00").clone(alpha=0.10)
COL_MEDIUM_BG   = colors.HexColor("#ffb700").clone(alpha=0.10)
COL_CLEAR_BG    = colors.HexColor("#00c896").clone(alpha=0.10)

# Layout (Brand Identity SECTION 07)
PAGE_PADDING = 18 * mm
CARD_RADIUS  = 4 * mm
CARD_PADDING = 6 * mm


def _resolve_severity(gi: float) -> tuple[colors.Color, str, str]:
    """Returns (color, verdict_label, sub_verdict) per Brand Identity."""
    if gi >= 70:
        return COL_CRITICAL, "HIGH RISK",   "DO NOT INVEST"
    if gi >= 40:
        return COL_MEDIUM,   "MEDIUM RISK", "CAUTION"
    return COL_CLEAR, "LOW RISK", "CLEARED FOR REVIEW"


# ═══════════════════════════════════════════════════════════════════════
# FONT REGISTRATION — fallback to built-in if TTF unavailable
# ═══════════════════════════════════════════════════════════════════════

FONT_DISPLAY = "Helvetica"
FONT_DISPLAY_BOLD = "Helvetica-Bold"
FONT_MONO    = "Courier"
FONT_MONO_BOLD = "Courier-Bold"

# Attempt to register Space Grotesk + DM Mono if available
# Production: ship the .ttf files in /fonts/ and register here
_FONT_DIR = os.path.join(os.path.dirname(__file__), "fonts")
try:
    if os.path.exists(os.path.join(_FONT_DIR, "SpaceGrotesk-Regular.ttf")):
        pdfmetrics.registerFont(TTFont("SpaceGrotesk", os.path.join(_FONT_DIR, "SpaceGrotesk-Regular.ttf")))
        pdfmetrics.registerFont(TTFont("SpaceGrotesk-Bold", os.path.join(_FONT_DIR, "SpaceGrotesk-Bold.ttf")))
        FONT_DISPLAY = "SpaceGrotesk"
        FONT_DISPLAY_BOLD = "SpaceGrotesk-Bold"
    if os.path.exists(os.path.join(_FONT_DIR, "DMMono-Regular.ttf")):
        pdfmetrics.registerFont(TTFont("DMMono", os.path.join(_FONT_DIR, "DMMono-Regular.ttf")))
        pdfmetrics.registerFont(TTFont("DMMono-Bold", os.path.join(_FONT_DIR, "DMMono-Medium.ttf")))
        FONT_MONO = "DMMono"
        FONT_MONO_BOLD = "DMMono-Bold"
except Exception:
    pass  # Fallback to Helvetica/Courier — fonts still readable


# ═══════════════════════════════════════════════════════════════════════
# PARAGRAPH STYLES
# ═══════════════════════════════════════════════════════════════════════

def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "hero": ParagraphStyle(
            "hero", parent=base["Normal"],
            fontName=FONT_DISPLAY_BOLD, fontSize=28, leading=34,
            textColor=COL_BRIGHT, alignment=0,
        ),
        "subtitle": ParagraphStyle(
            "subtitle", parent=base["Normal"],
            fontName=FONT_MONO, fontSize=9, leading=12,
            textColor=COL_MUTED, alignment=0,
        ),
        "section_label": ParagraphStyle(
            "section_label", parent=base["Normal"],
            fontName=FONT_MONO, fontSize=8, leading=12,
            textColor=COL_MUTED, alignment=0, spaceAfter=4,
        ),
        "section_heading": ParagraphStyle(
            "section_heading", parent=base["Normal"],
            fontName=FONT_DISPLAY_BOLD, fontSize=16, leading=22,
            textColor=COL_BRIGHT, alignment=0, spaceAfter=8,
        ),
        "subject_name": ParagraphStyle(
            "subject_name", parent=base["Normal"],
            fontName=FONT_DISPLAY_BOLD, fontSize=20, leading=26,
            textColor=COL_BRIGHT, alignment=0,
        ),
        "body": ParagraphStyle(
            "body", parent=base["Normal"],
            fontName=FONT_DISPLAY, fontSize=10, leading=14,
            textColor=COL_SUB,
        ),
        "body_strong": ParagraphStyle(
            "body_strong", parent=base["Normal"],
            fontName=FONT_DISPLAY, fontSize=10, leading=14,
            textColor=COL_TEXT,
        ),
        "metadata": ParagraphStyle(
            "metadata", parent=base["Normal"],
            fontName=FONT_MONO, fontSize=8, leading=11,
            textColor=COL_MUTED,
        ),
        "data_value": ParagraphStyle(
            "data_value", parent=base["Normal"],
            fontName=FONT_MONO_BOLD, fontSize=14, leading=18,
            textColor=COL_TEXT,
        ),
        "verdict": ParagraphStyle(
            "verdict", parent=base["Normal"],
            fontName=FONT_DISPLAY_BOLD, fontSize=16, leading=22,
            textColor=COL_BRIGHT, alignment=1,
        ),
        "risk_flag": ParagraphStyle(
            "risk_flag", parent=base["Normal"],
            fontName=FONT_DISPLAY, fontSize=9.5, leading=13,
            textColor=COL_TEXT, leftIndent=6,
        ),
        "footer": ParagraphStyle(
            "footer", parent=base["Normal"],
            fontName=FONT_MONO, fontSize=7, leading=10,
            textColor=COL_MUTED, alignment=1,
        ),
        "disclaimer": ParagraphStyle(
            "disclaimer", parent=base["Normal"],
            fontName=FONT_DISPLAY, fontSize=8, leading=11,
            textColor=COL_MUTED, alignment=0,
        ),
    }


# ═══════════════════════════════════════════════════════════════════════
# CUSTOM FLOWABLES
# ═══════════════════════════════════════════════════════════════════════

class GaugeFlowable(Flowable):
    """
    SVG-style governance intensity gauge rendered directly to PDF canvas.
    Half-arc dial (-210° to +30°) matching the Brand Identity dashboard widget.
    """

    def __init__(self, value: float, size: float = 110 * mm):
        super().__init__()
        self.value = max(0.0, min(100.0, value))
        self.size  = size
        self.width = size
        self.height = size * 0.62

    def wrap(self, *_args):
        return self.width, self.height

    def draw(self):
        import math
        c = self.canv
        cx = self.size / 2
        cy = self.size * 0.45
        r  = self.size * 0.36

        color, _, _ = _resolve_severity(self.value)

        # Background track
        c.setStrokeColor(COL_BORDER)
        c.setLineWidth(8)
        c.setLineCap(1)
        self._arc(c, cx, cy, r, -210, 30)

        # Fill arc (proportional to score)
        c.setStrokeColor(color)
        end = -210 + (240 * self.value / 100)
        self._arc(c, cx, cy, r, -210, end)

        # Center text — score
        c.setFillColor(color)
        c.setFont(FONT_MONO_BOLD, 42)
        c.drawCentredString(cx, cy - 6, f"{self.value:.0f}")

        # Label below
        c.setFillColor(COL_MUTED)
        c.setFont(FONT_MONO, 8)
        c.drawCentredString(cx, cy - 24, "GOVERNANCE INTENSITY")

    def _arc(self, c, cx, cy, r, start_deg, end_deg):
        """Draw arc using Bezier approximation. ReportLab arc takes box."""
        import math
        # ReportLab path arc — convert center+radius to bbox+angles
        c.setLineCap(1)
        p = c.beginPath()
        steps = max(2, int(abs(end_deg - start_deg) / 5))
        for i in range(steps + 1):
            ang = math.radians(start_deg + (end_deg - start_deg) * i / steps)
            x = cx + r * math.cos(ang)
            y = cy + r * math.sin(ang)
            if i == 0:
                p.moveTo(x, y)
            else:
                p.lineTo(x, y)
        c.drawPath(p, stroke=1, fill=0)


class SeverityBadge(Flowable):
    """Inline severity badge — colored pill with text label."""

    def __init__(self, label: str, color: colors.Color, width: float = 70 * mm):
        super().__init__()
        self.label = label
        self.color = color
        self.width = width
        self.height = 10 * mm

    def wrap(self, *_args):
        return self.width, self.height

    def draw(self):
        c = self.canv
        # Background fill (low opacity)
        bg = self.color.clone(alpha=0.15)
        c.setFillColor(bg)
        c.setStrokeColor(self.color)
        c.setLineWidth(0.6)
        c.roundRect(0, 0, self.width, self.height, 2, stroke=1, fill=1)
        # Text
        c.setFillColor(self.color)
        c.setFont(FONT_MONO_BOLD, 9)
        c.drawCentredString(self.width / 2, self.height / 2 - 3, self.label)


# ═══════════════════════════════════════════════════════════════════════
# PAGE TEMPLATE — Background + footer drawn on every page
# ═══════════════════════════════════════════════════════════════════════

def _draw_page_background(canv, doc):
    """Draw Institutional Navy background and footer on every page."""
    w, h = A4
    canv.saveState()

    # Full-page background
    canv.setFillColor(COL_BACKGROUND)
    canv.rect(0, 0, w, h, stroke=0, fill=1)

    # Top brand strip
    canv.setFillColor(COL_PRIMARY)
    canv.rect(0, h - 6 * mm, w, 6 * mm, stroke=0, fill=1)

    # Footer
    canv.setFillColor(COL_MUTED)
    canv.setFont(FONT_MONO, 7)
    canv.drawString(
        PAGE_PADDING, 10 * mm,
        "EUROQUANT RISK TERMINAL · CONFIDENTIAL · INTERNAL VC USE ONLY",
    )
    canv.drawRightString(
        w - PAGE_PADDING, 10 * mm,
        f"PAGE {canv.getPageNumber()} · GENERATED {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
    )

    # Bottom accent line
    canv.setStrokeColor(COL_BORDER)
    canv.setLineWidth(0.5)
    canv.line(PAGE_PADDING, 14 * mm, w - PAGE_PADDING, 14 * mm)

    canv.restoreState()


# ═══════════════════════════════════════════════════════════════════════
# SECTION BUILDERS
# ═══════════════════════════════════════════════════════════════════════

def _section_label(text: str, st: dict) -> Paragraph:
    # ReportLab paraparser doesn't accept letterSpacing — we space manually
    spaced = " ".join(text.upper())
    return Paragraph(spaced, st["section_label"])


def _cover_section(result: dict, st: dict) -> list:
    """Cover page: brand identity + subject name + verdict pill."""
    profile = result["profile"]
    gi      = profile["governance_intensity"]
    color, verdict, sub = _resolve_severity(gi)

    elements = []
    elements.append(Spacer(1, 30 * mm))
    elements.append(Paragraph(
        f"<font face='{FONT_MONO_BOLD}' color='#4a90d9' size='13'>EUROQUANT · RISK TERMINAL</font>",
        st["subtitle"]
    ))
    elements.append(Spacer(1, 8 * mm))
    elements.append(Paragraph("REGULATORY DUE DILIGENCE REPORT", st["hero"]))
    elements.append(Spacer(1, 4 * mm))
    elements.append(Paragraph(
        f"Generated by Jarvis MAS v3.1 · "
        f"{datetime.now(timezone.utc).strftime('%d %B %Y, %H:%M UTC')}",
        st["metadata"]
    ))
    elements.append(Spacer(1, 30 * mm))

    elements.append(_section_label("SUBJECT", st))
    elements.append(Paragraph(profile["full_name"], st["subject_name"]))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph(
        f"Founder ID: {profile['founder_id']} · "
        f"Nationality: {profile.get('nationality') or 'UNKNOWN'}",
        st["metadata"]
    ))
    elements.append(Spacer(1, 16 * mm))

    elements.append(_section_label("VERDICT", st))
    elements.append(SeverityBadge(f"{verdict} · {sub}", color, width=120 * mm))

    elements.append(Spacer(1, 30 * mm))
    elements.append(Paragraph(
        "CONFIDENTIAL · This report contains information processed via "
        "ephemeral analysis. No source documents are retained.",
        st["disclaimer"]
    ))

    elements.append(PageBreak())
    return elements


def _executive_summary(result: dict, st: dict) -> list:
    """Page 2: GI gauge + key metrics + risk flags."""
    profile = result["profile"]
    gi      = profile["governance_intensity"]
    mp      = profile["market_percentile"]
    color, verdict, sub = _resolve_severity(gi)

    elements = []
    elements.append(_section_label("01 · Executive Summary", st))
    elements.append(Paragraph("Risk Assessment Overview", st["section_heading"]))
    elements.append(Spacer(1, 6 * mm))

    # GI gauge + key facts side-by-side
    gauge = GaugeFlowable(gi, size=90 * mm)

    facts_data = [
        ["MARKET PERCENTILE", f"{mp:.0f}th"],
        ["PEP STATUS",        profile["pep_status"].replace("_", " ").upper()],
        ["SANCTIONS HIT",     "YES" if profile["sanctions_hit"] else "NO"],
        ["COMPANIES",         str(len(profile["associated_companies"]))],
        ["POL. CONNECTIONS",  str(len(profile["political_connections"]))],
        ["RISK FLAGS",        str(len(profile["risk_flags"]))],
    ]
    facts_table = Table(facts_data, colWidths=[40 * mm, 35 * mm])
    facts_table.setStyle(TableStyle([
        ("FONT",       (0, 0), (0, -1), FONT_MONO,      8),
        ("FONT",       (1, 0), (1, -1), FONT_MONO_BOLD, 11),
        ("TEXTCOLOR",  (0, 0), (0, -1), COL_MUTED),
        ("TEXTCOLOR",  (1, 0), (1, -1), COL_TEXT),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("LINEBELOW",  (0, 0), (-1, -2), 0.3, COL_BORDER),
    ]))

    overview_table = Table(
        [[gauge, facts_table]],
        colWidths=[95 * mm, 80 * mm],
    )
    overview_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    elements.append(overview_table)
    elements.append(Spacer(1, 10 * mm))

    # Analyst notes if present
    notes = profile.get("analyst_notes")
    if notes:
        elements.append(_section_label("Jarvis Analyst Verdict", st))
        elements.append(Spacer(1, 2 * mm))
        elements.append(Paragraph(notes, st["body_strong"]))
        elements.append(Spacer(1, 8 * mm))

    return elements


def _risk_flags_section(result: dict, st: dict) -> list:
    flags = result["profile"]["risk_flags"]
    if not flags:
        return []

    color, _, _ = _resolve_severity(result["profile"]["governance_intensity"])

    elements = []
    elements.append(_section_label("02 · Risk Flags", st))
    elements.append(Paragraph(f"{len(flags)} Material Findings", st["section_heading"]))
    elements.append(Spacer(1, 4 * mm))

    for i, flag in enumerate(flags, 1):
        # Each flag as a card-style block
        flag_table = Table(
            [[Paragraph(f"<font color='{color.hexval()}' face='{FONT_MONO_BOLD}'>#{i:02d}</font>  {flag}", st["risk_flag"])]],
            colWidths=[170 * mm],
        )
        flag_table.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), COL_CARD),
            ("LINEBEFORE",    (0, 0), (0, -1),  3, color),
            ("LEFTPADDING",   (0, 0), (-1, -1), 10),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
            ("TOPPADDING",    (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(KeepTogether(flag_table))
        elements.append(Spacer(1, 3 * mm))

    elements.append(Spacer(1, 6 * mm))
    return elements


def _companies_section(result: dict, st: dict) -> list:
    companies = result["profile"]["associated_companies"]
    if not companies:
        return []

    elements = []
    elements.append(PageBreak())
    elements.append(_section_label("03 · Associated Companies", st))
    elements.append(Paragraph(f"{len(companies)} Entities Identified", st["section_heading"]))
    elements.append(Spacer(1, 4 * mm))

    # Header row
    rows = [["COMPANY", "JURIS", "SHARE", "FATF", "PROCUREMENT (EUR)", "FLAGS"]]

    for c in companies:
        flags = []
        if c.get("is_offshore_flag"):           flags.append("OFFSHORE")
        if c.get("public_procurement_exposure"): flags.append("PROC")
        if c.get("defense_gov_tech_sector"):    flags.append("DEFENCE")
        if not c.get("active_status", True):    flags.append("DISSOLVED")
        flags_str = " · ".join(flags) if flags else "—"

        proc_val = c.get("procurement_value_eur")
        proc_str = f"{proc_val:,.0f}" if proc_val else "—"

        rows.append([
            c["company_name"][:38] + ("…" if len(c["company_name"]) > 38 else ""),
            c["registration_country"],
            f"{c['share_percentage']:.0f}%",
            c.get("fatf_risk_level", "UNK").upper(),
            proc_str,
            flags_str,
        ])

    table = Table(rows, colWidths=[55*mm, 12*mm, 14*mm, 16*mm, 30*mm, 38*mm], repeatRows=1)
    table.setStyle(TableStyle([
        # Header
        ("FONT",       (0, 0), (-1, 0), FONT_MONO_BOLD, 7),
        ("TEXTCOLOR",  (0, 0), (-1, 0), COL_MUTED),
        ("BACKGROUND", (0, 0), (-1, 0), COL_BORDER),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("TOPPADDING",    (0, 0), (-1, 0), 6),
        # Body
        ("FONT",       (0, 1), (-1, -1), FONT_MONO, 8),
        ("TEXTCOLOR",  (0, 1), (-1, -1), COL_TEXT),
        ("BACKGROUND", (0, 1), (-1, -1), COL_CARD),
        ("LINEBELOW",  (0, 0), (-1, -2), 0.3, COL_BORDER),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
        ("TOPPADDING",    (0, 1), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 6 * mm))
    return elements


def _connections_section(result: dict, st: dict) -> list:
    connections = result["profile"]["political_connections"]
    if not connections:
        return []

    elements = []
    elements.append(_section_label("04 · Political Network", st))
    elements.append(Paragraph(f"{len(connections)} Connections Mapped", st["section_heading"]))
    elements.append(Spacer(1, 4 * mm))

    for conn in connections:
        distance = conn["pathway_distance"]
        if distance == 1:
            color, dist_label = COL_CRITICAL, "D-1 DIRECT"
        elif distance == 2:
            color, dist_label = COL_HIGH, "D-2 INDIRECT"
        else:
            color, dist_label = COL_MEDIUM, "D-3 EXTENDED"

        pep_tag = "PEP" if conn.get("is_pep_direct") else "OFFICIAL"
        rel_label = conn["relationship_type"].replace("_", " ").upper()

        rows = [[
            Paragraph(
                f"<font face='{FONT_DISPLAY_BOLD}' color='{COL_BRIGHT.hexval()}'>{conn['person_name']}</font><br/>"
                f"<font face='{FONT_DISPLAY}' size='8' color='{COL_SUB.hexval()}'>{conn['role_title']}</font>",
                st["body"]
            ),
            Paragraph(
                f"<font face='{FONT_MONO_BOLD}' color='{color.hexval()}' size='8'>{dist_label}</font><br/>"
                f"<font face='{FONT_MONO}' color='{COL_MUTED.hexval()}' size='7'>{rel_label}</font><br/>"
                f"<font face='{FONT_MONO}' color='{COL_MUTED.hexval()}' size='7'>{conn['jurisdiction']} · {pep_tag}</font>",
                st["body"]
            ),
        ]]

        table = Table(rows, colWidths=[110*mm, 60*mm])
        table.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), COL_CARD),
            ("LINEBEFORE",    (0, 0), (0, -1),  3, color),
            ("LEFTPADDING",   (0, 0), (-1, -1), 10),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
            ("TOPPADDING",    (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ]))
        elements.append(KeepTogether(table))
        elements.append(Spacer(1, 3 * mm))

    elements.append(Spacer(1, 6 * mm))
    return elements


def _reference_check_section(result: dict, st: dict) -> list:
    ref = result.get("reference_check")
    if not ref:
        return []

    elements = []
    elements.append(PageBreak())
    elements.append(_section_label("05 · Reference Layer Verification", st))
    elements.append(Paragraph("External Source Cross-Check", st["section_heading"]))
    elements.append(Spacer(1, 4 * mm))

    sources = ref.get("sources_checked", [])
    hits    = ref.get("sanctions_hits", [])
    verifs  = ref.get("company_verifications", [])
    n_ok    = sum(1 for v in verifs if v.get("verified"))

    summary_data = [
        ["SOURCES CHECKED",      " · ".join(sources) if sources else "—"],
        ["SANCTIONS HITS",       str(len(hits))],
        ["COMPANIES VERIFIED",   f"{n_ok}/{len(verifs)}"],
        ["RISK DELTA",           f"+{ref.get('risk_delta', 0):.1f}" if ref.get('risk_delta') else "0.0"],
        ["CHECK TIMESTAMP",      ref.get("checked_at", "—")[:19] if ref.get("checked_at") else "—"],
    ]

    if ref.get("errors"):
        summary_data.append(["NON-FATAL ERRORS", str(len(ref["errors"]))])

    table = Table(summary_data, colWidths=[55*mm, 115*mm])
    table.setStyle(TableStyle([
        ("FONT",       (0, 0), (0, -1), FONT_MONO,      8),
        ("FONT",       (1, 0), (1, -1), FONT_MONO_BOLD, 9),
        ("TEXTCOLOR",  (0, 0), (0, -1), COL_MUTED),
        ("TEXTCOLOR",  (1, 0), (1, -1), COL_TEXT),
        ("BACKGROUND", (0, 0), (-1, -1), COL_CARD),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("LINEBELOW",  (0, 0), (-1, -2), 0.3, COL_BORDER),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 8 * mm))

    return elements


def _analyst_signoff_section(result: dict, st: dict) -> list:
    """
    GDPR Article 22 compliance section.

    Per CJEU Schufa ruling (C-634/21), an automated score that influences
    third-party decisions violates Article 22 even with disclaimers. We
    transform this from "automated decision-making" into "automated input
    to human decision" by requiring physical analyst sign-off below.

    Without a signed analyst certification, this report is NOT considered
    "issued" and cannot be used as a basis for investment decisions.
    """
    elements = []
    elements.append(PageBreak())
    elements.append(_section_label("06 · Analyst Verification (Required)", st))
    elements.append(Paragraph("Human Review & Sign-Off", st["section_heading"]))
    elements.append(Spacer(1, 4 * mm))

    # Compliance preamble
    elements.append(Paragraph(
        "<b>This report contains an automated risk assessment generated by the Jarvis "
        "Multi-Agent System.</b> Under GDPR Article 22 and CJEU jurisprudence "
        "(Schufa Holding C-634/21), automated assessments that influence material "
        "decisions about natural persons require <b>meaningful human review</b> before "
        "they can be relied upon as a basis for action.",
        st["body"]
    ))
    elements.append(Spacer(1, 3 * mm))
    elements.append(Paragraph(
        "Below, the responsible analyst must (1) review the findings in this report, "
        "(2) confirm or override the automated verdict, and (3) physically sign and date "
        "this certification. Until signed, this report is <b>advisory only</b> and "
        "must not be used as the sole basis for any investment decision, regulatory "
        "filing, or third-party communication.",
        st["body"]
    ))
    elements.append(Spacer(1, 10 * mm))

    # Sign-off block
    color, verdict, sub = _resolve_severity(result["profile"]["governance_intensity"])

    signoff_rows = [
        [
            Paragraph("<b>JARVIS AUTOMATED VERDICT</b>", st["section_label"]),
            Paragraph(f"<b>{verdict} · {sub}</b>", st["body_strong"]),
        ],
        [
            Paragraph("<b>ANALYST DECISION</b>", st["section_label"]),
            Paragraph(
                "☐ Confirm automated verdict<br/>"
                "☐ Override — record reason: ________________________________________",
                st["body"]
            ),
        ],
        [
            Paragraph("<b>ANALYST NAME</b>", st["section_label"]),
            Paragraph("________________________________________________", st["body"]),
        ],
        [
            Paragraph("<b>REGULATORY ROLE / TITLE</b>", st["section_label"]),
            Paragraph("________________________________________________", st["body"]),
        ],
        [
            Paragraph("<b>SIGNATURE</b>", st["section_label"]),
            Paragraph("________________________________________________", st["body"]),
        ],
        [
            Paragraph("<b>DATE & TIME (UTC)</b>", st["section_label"]),
            Paragraph("________________________________________________", st["body"]),
        ],
    ]

    table = Table(signoff_rows, colWidths=[50*mm, 120*mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COL_CARD),
        ("BOX",        (0, 0), (-1, -1), 1.2, color),
        ("LINEBELOW",  (0, 0), (-1, -2), 0.3, COL_BORDER),
        ("LEFTPADDING",   (0, 0), (-1, -1), 12),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
        ("TOPPADDING",    (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 6 * mm))

    elements.append(Paragraph(
        "<i>Without an analyst signature in the field above, this report constitutes "
        "an automated information service only and is not a regulatory determination, "
        "investment recommendation, or legal opinion.</i>",
        st["disclaimer"]
    ))

    return elements


def _audit_trail_section(result: dict, st: dict) -> list:
    elements = []
    elements.append(Spacer(1, 12 * mm))
    elements.append(_section_label("07 · Audit Trail", st))
    elements.append(Spacer(1, 3 * mm))

    audit_data = [
        ["DOCUMENT HASH (SHA-256)", result.get("document_hash", "—")],
        ["PROCESSING TIMESTAMP",    result.get("processing_timestamp", "—")],
        ["ENGINE VERSION",          result.get("extractor_version", "—")],
        ["EXTRACTION CONFIDENCE",   f"{result.get('extraction_confidence', 0):.2f}"],
        ["OCR FALLBACK USED",       "YES" if result.get("used_ocr_fallback") else "NO"],
        ["NEO4J PERSISTED",         "YES" if result.get("neo4j_persisted") else "NO"],
        ["BENCHMARK SOURCE",        result.get("benchmark_source", "—")],
        ["BENCHMARK COHORT SIZE",   str(result.get("benchmark_cohort_size", 0))],
        ["EPHEMERAL PROCESSING",    "DOCUMENT DESTROYED · 0 BYTES RETAINED"],
    ]

    table = Table(audit_data, colWidths=[55*mm, 115*mm])
    table.setStyle(TableStyle([
        ("FONT",       (0, 0), (0, -1), FONT_MONO,      7),
        ("FONT",       (1, 0), (1, -1), FONT_MONO,      7),
        ("TEXTCOLOR",  (0, 0), (0, -1), COL_MUTED),
        ("TEXTCOLOR",  (1, 0), (1, -1), COL_SUB),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("LINEBELOW",  (0, 0), (-1, -2), 0.2, COL_BORDER),
    ]))
    elements.append(table)
    return elements


# ═══════════════════════════════════════════════════════════════════════
# MAIN ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════

def build_risk_report_pdf(result: dict) -> bytes:
    """
    Build a branded PDF risk report from a RiskExtractionResult dict.

    Args:
        result: dict — the JSON serialization of a RiskExtractionResult,
                       i.e. `result.model_dump(mode="json")`

    Returns:
        bytes — the complete PDF as a byte string, ready to stream or save.
    """
    buf = io.BytesIO()
    st  = _styles()

    doc = BaseDocTemplate(
        buf, pagesize=A4,
        leftMargin=PAGE_PADDING, rightMargin=PAGE_PADDING,
        topMargin=PAGE_PADDING, bottomMargin=20 * mm,
        title=f"EuroQuant Risk Report — {result['profile']['founder_id']}",
        author="EuroQuant Risk Terminal",
    )

    frame = Frame(
        PAGE_PADDING, 20 * mm,
        A4[0] - 2 * PAGE_PADDING,
        A4[1] - PAGE_PADDING - 20 * mm,
        showBoundary=0,
    )
    template = PageTemplate(id="main", frames=[frame], onPage=_draw_page_background)
    doc.addPageTemplates([template])

    story = []
    story += _cover_section(result, st)
    story += _executive_summary(result, st)
    story += _risk_flags_section(result, st)
    story += _companies_section(result, st)
    story += _connections_section(result, st)
    story += _reference_check_section(result, st)
    story += _analyst_signoff_section(result, st)
    story += _audit_trail_section(result, st)

    doc.build(story)
    return buf.getvalue()


# ═══════════════════════════════════════════════════════════════════════
# CLI USAGE — for testing without the API
# ═══════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import json
    import sys

    if len(sys.argv) < 2:
        print("Usage: python pdf_generator.py <result.json> [output.pdf]")
        sys.exit(1)

    with open(sys.argv[1]) as f:
        result_dict = json.load(f)

    output = sys.argv[2] if len(sys.argv) > 2 else "report.pdf"
    pdf_bytes = build_risk_report_pdf(result_dict)

    with open(output, "wb") as f:
        f.write(pdf_bytes)

    print(f"✅ Report generated: {output} ({len(pdf_bytes) / 1024:.1f} KB)")
