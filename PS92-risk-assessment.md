# Risk Assessment — SIH26092: AI-Driven Scheme Matching for Marginalized Entrepreneurs

## 1. What We Need Ready

| Pillar | What It Needs to Answer |
|---|---|
| **Problem** | Why this matters: ~20.14 crore SCs (16.63% of India), 1284 castes across 28 states, income ≤₹5L/yr. Core pain: 100+ channel partners, no smart matching, no EMI calculator, opaque partner discovery. |
| **Existing Solutions** | NSFDC website (static catalog, PDF partner lists), PM-SURAJ (application portal only), JanSamarth (thin landing), VIDYA Lakshmi (education-only), State SCDC websites (28+ varying quality), myScheme (generic), UMANG (shallow discovery). Gap: none do end-to-end scheme recommend + EMI + geo-routing of eligible partners. |
| **Our Innovation** | Intelligent recommender reasoning on income + project cost + course type; pre-computes EMI with moratorium handling; geo-routes to actual disbursing partner. White-space: existing portals don't do this. |
| **Proof of Concept** | Working demo with: (a) recommender logic → scheme match, (b) EMI calculator with scheme-specific rates & moratorium, (c) partner locator mock with geo-pins. Wired to basic frontend. |

---

## 2. Risks to Counter

| Risk | Severity | Mitigation |
|---|---|---|
| **Partner data is in PDFs** — NSFDC publishes channel partner lists as downloadable PDFs only; no API exposes scheme-per-partner mapping or real-time fund utilization/NPA status. | **High** | Build editable CMS/stub with sample data for demo; flag manual data-entry as future work; partner with SCA to validate partner scheme coverage. |
| **EMI moratorium logic is non-standard** — ELS: course period + 1 year; Term Loan: 6-month standard, 12-month for plantation/construction; MFS: 3 months quarterly. Interest typically capitalized after moratorium. | **High** | Branch on scheme type in calculator; configurable moratorium params stored in DB, not hardcoded; work out 2–3 hand-calculated examples to validate logic. |
| **State-specific SC validation** — same caste may be scheduled in one state but not another (e.g., "Chamar" in Punjab vs. Balmiki). | **Medium** | Validate caste+state combo against official SC list per state; fallback to "verify with SCA"; maintain state-specific SC list table in config. |
| **Income ceiling ambiguity** — older case studies quote ₹3L; revised to ₹5L w.e.f. 7 Jan 2026. | **Low-Medium** | Use ₹5L as threshold; add scheme-rule versioning; clearly note revision date in UI. |
| **Low digital literacy of target users** — feature-phone legacy, low bandwidth, first-time users, rural SC households. | **High** | Voice/IVR input option; minimal UI; Hindi-first; offline-capable PWA; large touch targets; icon-driven flows; reduce text-per-screen. |
| **No public API for PM-SURAJ** — may need to scrape or rely on mock data. | **Medium** | Build abstraction layer over data source; treat as demo with mock fallback; abstract partner lookup so real API swap is trivial later. |
| **Multilingual NLP accuracy** — IndicBERT/Bhasini performance in rural Hindi/dialects; tribal language coverage. | **Medium** | Start with Hindi + English for PoC; scope other languages as Phase 2; use static translated strings for demo, not real-time translation. |
| **28+ state SCA websites** — inconsistent quality, no standard data format, no geo-coverage API. | **Low** | Aggregate via PM-SURAJ as single source of truth for demo; partner list stubbed with sample data; map to district-level manually. |
| **Fund utilization / NPA status data not publicly available** — critical for "eligible partner" ranking, but NSFDC doesn't expose per-partner overdue/NPA data. | **Medium** | Mock eligibility flag per partner for demo (e.g., random or SCA-verified); in pitch, mention "real deployment would integrate SCA quarterly reporting." |
| **Edge cases: user qualifies for multiple schemes / gives unverifiable self-reported data** — self-reported income/caste may not match official records. | **Medium** | Rule-based prioritization (e.g., Edu Loan > Term Loan > MFS); add disclaimer that final eligibility verified by SCA/NSFDC; show "may qualify for" with multiple options. |

---

## 3. Top 3 Priorities

1. **EMI calculator** with correct moratorium logic per scheme — most critical for user trust and differentiator vs. existing portals.
2. **Partner geo-locator** — even with stub data, proves the use case and demonstrates the "nearest eligible partner" concept.
3. **Multilingual interface** — Hindi + English minimum; voice/IVR as differentiator for low-literacy users.

---

## 4. Citable Stats & Sources (for Pitch Deck)

| Stat | Source |
|---|---|
| ~20.14 crore SCs (2011 Census), 16.63% of India's population | Census 2011, Wikipedia ref |
| 1284 notified castes across 28 states (state-specific) | MoSJE / Presidential Order |
| Income ceiling: ≤ ₹5 L p.a. family income (revised w.e.f. 7 Jan 2026) | NSFDC eligibility page; Jan 2026 revision |
| NSFDC routes funds through ~100+ Channel Partners | NSFDC website / research notes |
| PM-SURAJ built by BISAG-N (Gujarat tech arm) | Research notes |
| 5 core schemes with specific rates: MFS 6.5%, Term Loan 8%, Aajeevika 15%, UNY 13–15%, ELS 6.5% | NSFDC scheme catalog |
| Demand vs. disbursement gap: not publicly aggregated; will need RTI/Parliament Q&A | To be sourced from MoSJE/NSFDC annual reports |

---

## 5. "Why Haven't This Been Solved Already?" (Key Talking Point)

The frictions persist because **data is fragmented** (scheme rules in PDFs, partner lists as PDFs, no geo-coded eligibility), **awareness is low** (bilingual sites only, no voice/IVR), and **partner capacity** (NPAs/fund utilization) is opaque. No existing portal connects all three: intelligent recommender + EMI calc + geo-routing of *eligible* partners. The white-space is genuine — and this project's value is connecting the dots that each existing system leaves separate.