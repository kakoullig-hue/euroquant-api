# ASYNC REVENUE TRACK — “Sample Governance Report” Offer

**Classification:** Internal · June 2026 · v1.0
**Purpose:** create a revenue path that does not depend on synchronous discovery calls — without new product code, without burning credibility, and without contradicting the discovery framing already in market.

-----

## 0 · STRATEGIC FRAME (read once, then execute)

EuroQuant cannot copy the “thousands online automatically” motion of consumer/low-trust SaaS. The buyer is a fund partner; the input is confidential deal paper; the addressable market in CEE/Baltic defense is dozens of funds, not millions of users. High-trust + low-volume = sales-assisted by structure.

**But** the dependence on live calls can be reduced. The mechanism: a **productized, fixed-scope, asynchronously purchasable entry product** — small enough to buy without a committee, real enough to prove the engine, safe enough to require no trust leap.

This is the offer.

-----

## 1 · THE OFFER (definition)

**Name:** EuroQuant Sample Governance Report
**What the buyer gets:** one structured governance-risk report on ONE company, delivered within 48 hours, produced by the live Jarvis engine.
**Input options (buyer chooses):**

- (a) a publicly registered company they name (we work from public registry data), or
- (b) their own redacted/synthetic cap-table document — processed in memory, never stored, DPA-lite terms attached.
  **Output:** PDF report — ownership structure, sanctions/PEP screening result, structured governance-risk score, flagged pathways. Watermarked “ADVISORY — Sample Engagement”.
  **Price:** [INTRODUCTORY — placeholder €490, flexible until customer friction; George sets final number per order if needed]
  **Payment:** Stripe payment link (no code — created in Stripe dashboard in 5 minutes).
  **Fulfillment:** manual trigger through the existing live API (`euroquant-api.onrender.com`) — zero new engineering. Human review before delivery (consistent with “analyst sign-off” framing).

**Why this design is safe at cold start:**

- Fixed scope, fixed price → no negotiation, no committee.
- Public-data or redacted input → no confidentiality leap required from a stranger.
- Watermark + “advisory/sample” framing → no liability posture of a production compliance tool.
- Every order = revenue + a validation data point + a warm lead for the design-partner conversation.

-----

## 2 · LANDING COPY (paste-ready, EN)

Use on: a simple page (Notion/Carrd/static page next to the demo) and as the CTA block under the live demo.

> ### See your deal the way a regulator would.
> 
> EuroQuant produces a structured governance-risk report on any company — ownership structure, sanctions and PEP screening, and a single governance-risk score — from documents processed entirely in memory and never stored.
> 
> **Sample Governance Report — [€490], delivered in 48 hours.**
> 
> Choose your input:
> **Public mode** — name a registered company; we work from public registry data.
> **Private mode** — submit a redacted or synthetic cap-table document under our data processing terms. It is analyzed in memory and destroyed; nothing is written to disk.
> 
> Every report is reviewed by an analyst before delivery and is provided as advisory output.
> 
> [ Order a Sample Report → Stripe link ]
> 
> *Built for VC funds investing in DefenseTech, GovTech, and DeepTech across CEE and the Baltics.*

Copy rules honored: no benchmark/percentile claims · no stack names · no absolute guarantees · ephemerality foregrounded.

-----

## 3 · FULFILLMENT SOP (per order, ~30 min of George’s time)

1. Stripe email notification arrives → reply from EuroQuant address within 2h with intake instructions (template §5.1).
1. Public mode: pull registry documents for the named company. Private mode: receive redacted doc, confirm DPA-lite acceptance (checkbox/email confirmation).
1. Run document through the live API (Swagger flow as today). Review output. Apply watermark.
1. Deliver PDF by email within 48h with delivery note (template §5.2) — which includes the single follow-up question that converts to a call:

> “If anything in the report doesn’t match how your team sees this company, I’d value 15 minutes to understand why — that comparison is exactly what we’re building from.”
1. Log: order date · mode · payment · delivered · follow-up response. This log is also pipeline data toward N≥5.

-----

## 4 · DISTRIBUTION (where the link lives — no spam motion)

1. **Demo dashboard page** — primary placement: a visitor who has just seen the synthetic Kaspars Veidemanis report gets one CTA: order one for a company they care about.
1. **LinkedIn company page About** — final line + button where supported.
1. **Personal LinkedIn Featured** — the offer page link (this also satisfies “show progress” without a post).
1. **Outreach follow-ups to NEW targets only** (wave 3+, next month’s credits): the follow-up message may offer the async option as the low-effort alternative to a call.
1. **Signature** of every outbound EuroQuant email.

**HARD GUARDRAIL:** the offer is NEVER sent to the discovery targets already contacted under the “not selling anything” framing (the 3 LinkedIn sends + anyone who books a discovery call). Mixing the two destroys the credibility of both. Discovery targets only see the offer if THEY ask “what do you sell?” — answer per Objection O1/O3 in the Discovery Execution Pack.

-----

## 5 · EMAIL TEMPLATES

### 5.1 Intake (after purchase)

> Subject: Your EuroQuant Sample Report — one question to begin
> 
> Thank you for the order. To start, reply with ONE of the following:
> 
> 1. The legal name + country of registration of the company you want analyzed (public mode), or
> 1. Your redacted or synthetic cap-table document (private mode). By sending it you accept our data processing terms (attached): the document is processed in memory, never stored, and destroyed after analysis.
> 
> Your report will be delivered within 48 hours of this reply.
> George Kakoullis · Founder, EuroQuant

### 5.2 Delivery

> Subject: Your Governance Report — [Company]
> 
> Attached is your Sample Governance Report for [Company]: ownership structure, sanctions/PEP screening, and the structured governance-risk score, reviewed by an analyst before delivery.
> 
> One ask: if anything in the report doesn’t match how your team sees this company, I’d value 15 minutes to understand why — that comparison is exactly what we’re building from.
> 
> George Kakoullis · Founder, EuroQuant

-----

## 6 · WHAT THIS TRACK CAN AND CANNOT DO (honest ceiling)

- It creates a permanent, asynchronous “buy” button and converts passive profile visitors into paid validation. First orders most likely come from: outreach targets who don’t want a call, demo visitors, SINN/G4 network.
- It will not produce “thousands automatically.” Realistic early volume: units per month. Its real value: each order is simultaneously revenue, product validation, a warm design-partner lead, and progress toward N≥5 — four assets per transaction.
- The call track stays alive in parallel: deepest insight still comes from conversation. This track removes the single-point dependence on it.

-----

## 7 · GEORGE’S SETUP CHECKLIST (one-time, ~30 minutes total)

- [ ] Create Stripe payment link (product: “Sample Governance Report”, price flexible/adjustable).
- [ ] Stand up the offer page (Notion or Carrd, paste §2 copy, insert Stripe link).
- [ ] Add CTA block to the demo page (§2 copy, short version).
- [ ] Add link to LinkedIn company About + personal Featured.
- [ ] Confirm DPA-lite text (one paragraph extract from existing DPA — Claude drafts on request).

-----

*EuroQuant · Async Revenue Track v1.0 · Internal · June 2026*