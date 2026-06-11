# BLUEPRINT UPDATE — v4.2 DELTA (Commerce Layer + Repo)
**Issued:** 11 June 2026 · **Appends to:** `MASTER_EUROQUANT_BLUEPRINT.md` v4.1
**Instruction:** paste this block into the master Blueprint (new sections 21–23), bump the footer to v4.2, and update the two corrections in §0 below. Nothing in v4.1 architecture, schemas (v3.1), GI logic, or sprint history changes — this delta only *adds* the commerce/distribution layer and corrects two facts.

---

## 0 · CORRECTIONS TO EXISTING SECTIONS (apply these edits)

1. **§01 Identity — name:** the founder's locked external name is **George Kakoullis** (never "Giorgos" on any external-facing material). Internal Greek discussion may stay informal, but every public artifact — CV, LinkedIn, domain email, Stripe, site — uses **George**.

2. **§03 Stage & §03 Business Model — update:** stage is no longer "pre-revenue, pre-everything." As of 11 June 2026 EuroQuant has a **live commercial surface** (see §21). The free-pilot-first model in §03 Pillar 1 is **superseded for the entry motion** by the productized paid Sample Report. Free deep-dive pilots remain available as a sales tool for design-partner conversations, but are no longer the default first touch.

3. **§16 / pricing language:** "~€490/report" is now the live, public introductory price of the Sample Report — no longer hypothetical. Pricing remains **flexible until customer friction** (locked decision, 10 Jun). No percentile/benchmark claim is made on any commercial surface until N≥5 (unchanged).

---

## 21 · COMMERCE LAYER (NEW — live 11 June 2026)

**End goal achieved:** "First-Customer System" — a live commercial surface on an owned domain that accepts real payment, with the demo attached as proof.

**Topology:**
| Surface | URL | Host | Status |
|---|---|---|---|
| Store (Sample Report) | `https://euroquant.io` | Netlify (static `index.html`) | LIVE |
| Demo dashboard | `https://demo.euroquant.io` | Render (existing static site) | LIVE |
| API / Jarvis engine | `…onrender.com` | Render | LIVE (frozen until validation) |
| Payment | Stripe Payment Link (LIVE mode) | Stripe | LIVE — accepts real €490 |
| Founder email | `george@euroquant.io` | Porkbun forwarding → Gmail | LIVE (send-from via Zoho: TODO) |

**Domain:** `euroquant.io` registered at Porkbun, 1-year, **auto-renew ON**. DNS: A record → Netlify `75.2.60.5`; `www` CNAME → Netlify site; `demo` CNAME → Render target. `.com`/`.eu` unavailable (taken by an unrelated French Primonial fund "Euroquant" + a UK construction firm — **trademark/SEO awareness item, not an active conflict**).

**The Offer — Sample Governance Report:**
- Fixed scope: one company · one report · 48h delivery · €490 introductory.
- Two input modes: **Public** (named registered company, public-registry data) or **Private** (redacted/synthetic cap table, in-memory processing, DPA-lite terms shown on page).
- Output: PDF — ownership structure, sanctions/PEP screening, governance-risk score, flagged pathways. Watermarked "ADVISORY — Sample Engagement". Analyst sign-off before delivery (preserves the Article 22 / Schufa posture from §16).
- Fulfillment: **manual** through the live API (~30 min/order). Full reference: `ASYNC_REVENUE_TRACK.md`.
- **Automation gate:** Stripe webhook → API → auto-delivery is built **only at the 3rd paid order**. Until then, manual fulfillment. (Consistent with the "no engineering before validation" rule.)

**Site source:** single-file `euroquant_sample_report.html` (deployed as `index.html`). Two setup constants at top: `STRIPE_PAYMENT_LINK` (LIVE) + `DEMO_URL`. Includes OG/Twitter meta, favicon, trust section (founder + SINN + G4), embedded DPA-lite summary. Brand-locked: navy `#001B52`, Space Grotesk / IBM Plex, report aesthetic. **No stack names, no benchmark claims, no absolute guarantees on the page** (Brand Pack rules enforced).

**Distribution asset:** `euroquant_linkedin_thumbnail.png` (1200×627) for LinkedIn Featured + future milestone post.

---

## 22 · DISTRIBUTION RULES (NEW)

- **Channels:** personal LinkedIn Featured (link + thumbnail), company page About + website field, email signature.
- **HARD GUARDRAIL — discovery/commerce separation:** the three contacted discovery targets (Matej Luhovy/Presto, Sandra Golbreich/BSV, Marcin Hejka/OTB) and any future "not selling anything" discovery contact **never receive the store link in outreach**. They were promised a research conversation; sending a price 5 days later burns both the call and credibility. If they find the offer themselves via the profile, that is legitimate (inbound ≠ outbound).
- **16 Jun follow-up** to silent discovery targets = clean discovery message only, no product/price.
- **Analytics:** privacy-first only (Cloudflare Web Analytics / GoatCounter) — **never** a cookie-consent tool like GA4 on a privacy-positioned product.
- **Inbound scam awareness:** post-launch scrapers (fake "directory listings", domain-renewal invoices, SEO offers) will arrive. Only Porkbun and Stripe emails about the domain/payments are legitimate. Don't click claim/unsubscribe on opportunistic mail.

---

## 23 · OPS & SOURCE OF TRUTH (NEW)

- **GitHub private repo `euroquant`** = canonical store going forward. Structure: `/api` (FastAPI + Jarvis), `/web` (dashboard + store HTML), `/docs` (all .md: Blueprint, packs, instructions), `/ops` (configs, SOPs).
- **Claude Code** manages the repo and files directly. **Claude.ai Project Knowledge** stays lean (4–5 canonical files); sync rule: **the repo is edited first**, Project Knowledge mirrors only canonical docs.
- **Obsidian (optional):** open the repo folder as a vault for reading/notes — same files, no duplication.
- **Sync rule:** anything that changes architecture/schema/strategy → update this Blueprint in the repo, bump version, then mirror to Project Knowledge.

**Repo init prompt for Claude Code:**
```
Initialize this project as a git repo and push to
github.com/<USERNAME>/euroquant (private). Structure:
/api (FastAPI + Jarvis), /web (dashboard + euroquant store html),
/docs (all .md), /ops (configs, SOPs).
Create README.md describing the structure and a .gitignore
excluding .env, *.key, __pycache__, node_modules, and any
secret-bearing file. CRITICAL: scan every file and verify NO
API keys or secrets exist before the first commit. Then commit
and push. Report anything that looks like a secret instead of
committing it.
```

---

## OPEN TRACKS (status as of 11 Jun 2026)

| Track | Status |
|---|---|
| Customer discovery (5 calls) | 3 LinkedIn notes sent (Matej, Sandra, M. Hejka); awaiting replies; 16 Jun follow-up queued |
| Commerce / store | ✅ LIVE on euroquant.io, accepting real payment |
| Stripe send-from email (Zoho) | TODO |
| GitHub repo | TODO (prompt ready, §23) |
| Analytics install | TODO (Cloudflare/GoatCounter) |
| `og:image` wired to thumbnail | TODO (upload PNG to site, add meta) |
| CV | Instructions ready (`CV_GENERATOR_INSTRUCTIONS.md`); generate after internships or on demand |
| LinkedIn headline (Student → Founder) | Founder's call — deferred; flagged as now costing conversions |
| Fulfillment automation | Gated to 3rd paid order |
| Engineering freeze | Holds until discovery exit criteria met (`DISCOVERY_EXECUTION_PACK.md` §5) |

---
*Blueprint v4.2 delta · Internal / Co-founder Only · 11 June 2026*
