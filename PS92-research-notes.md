# Research Notes — SIH26092: AI-Driven Scheme Matching for Marginalized Entrepreneurs

> Source: sih.json (sno 92). Domain research compiled from official portals:
> nsfdc.nic.in, socialjustice.gov.in, pmsuraj.dosje.gov.in, jansamarth.in, Wikipedia.

---

## 1. Problem Statement (TL;DR)

Build an intelligent, multi-lingual digital platform that helps **Scheduled Caste (SC)**
families with annual income up to ₹5 lakh** find the right concessional credit / educational
loan scheme under the MoSJE's channel-finance system, compute their EMIs correctly, and
locate the nearest authorized channel partner (SCA / Bank / MFI) that actually disburses that
scheme.

**Category:** Software · **Theme:** Miscellaneous · **Deadline:** 20 Sep 2026

---

## 2. The Issuing Ecosystem

### 2.1 Apex Body — NSFDC
- **Full name:** National Scheduled Castes Finance & Development Corporation.
- **Status:** Public Sector Undertaking under the Ministry of Social Justice and
  Empowerment (MoSJE), ISO 9001:2015, est. as the central channelizing body for SC
  concessional credit.
- **Role:** Receives funds from MoSJE → routes through ~100+ "Channel Partners" → to the
  beneficiary. NSFDC does **not** accept direct applications.
- **Toll-free:** 1800-110-396 · **URL:** https://nsfdc.nic.in

### 2.2 Sister Apex Bodies (not the focus, but they exist on the same portal)
- **NBCFDC** — National Backward Classes Finance & Development Corporation (OBCs).
- **NSKFDC** — National Safai Karamcharis Finance & Development Corporation.
- All three are unified under the **PM-SURAJ** digital portal.

### 2.3 Channel Partner Types (per NSFDC website)
1. **State Channelizing Agencies (SCAs)** — usually the State SC Development Corporation
   (SCDC), one per state/UT. They are the **primary** last-mile touchpoint for applicants.
2. **Public Sector Banks (PSBs)** — SBI, PNB, BoB, Canara, etc.
3. **Regional Rural Banks (RRBs)** — district-level reach into rural India.
4. **NBFC-MFIs** — non-bank microfinance institutions (SKS, Spandana, CreditAccess Grameen, etc.).
5. **Cooperative Banks / Cooperative Societies** — local/PACS level.
6. **Small Finance Banks (SFBs)** — AU, Equitas, Ujjivan, etc.
7. **SIDBI & Other Agencies** — for specific schemes.

PDFs of each partner list are downloadable from
https://nsfdc.nic.in/our-channel-partners.

---

## 3. The Schemes (the actual product catalog the recommender must know)

All figures from nsfdc.nic.in/scheme. Beneficiaries pay the rate in the last column
(NBFC-MFI tiers add a spread because MFIs are for-profit).

| Scheme | Project Cost | Loan (≤90% of project) | Beneficiary Rate | Tenure | Moratorium |
|---|---|---|---|---|---|
| **Micro Finance Scheme (MFS)** | ≤ ₹1.40 L | up to ₹1.25 L | **6.5% p.a.** | 3 yrs (quarterly) | 3 months |
| **Term Loan** | > ₹1.40 L ≤ ₹50 L | > ₹1.25 L ≤ ₹45 L | **8% p.a.** | 7 yrs (quarterly) | 6 months (12 for plantation/construction) |
| **Aajeevika Micro-Finance Yojana** | ≤ ₹1.40 L | up to ₹1.25 L (via NBFC-MFI) | **15% p.a.** | 3 yrs (quarterly) | 3 months |
| **Udyam Nidhi Yojana (UNY)** | ≤ ₹5 L | up to ₹4.50 L | **13%** (Coop) / **15%** (SFB) | up to 5 yrs | 3 months |
| **Educational Loan Scheme (ELS)** | up to ₹40 L (or 90% of course fee) | 90% of project cost | **6.5% p.a.** | up to 12 yrs (before repayment) / 10 yrs (post) | course + 1 yr (before) / 6 months (post) |

**Marginal-money rule:** Beneficiary must contribute ~10% of project cost from own
sources; NSFDC finances the remaining 90% through a Channel Partner at concessional rates.

**Income ceiling:** Annual family income ≤ ₹5 L (revised w.e.f. 7 Jan 2026) — applies
rural and urban, to individuals, partnership firms and cooperative societies whose members
all belong to SC.

### 3.1 Educational Loan — Course Coverage
The ELS covers 24 categories including Engineering, Medical, MBA, CA, Law, Nursing,
Pharmacy, etc., plus M.Phil/PhD. Domestic and abroad study both covered. Application
route: **PM-SURAJ** portal.

---

## 4. The Applicant Journey (as it works today)

### 4.1 Online (PM-SURAJ)
- URL: https://pmsuraj.dosje.gov.in
- Built by BISAG-N (Gujarat state's tech arm).
- Mobile + OTP registration → standardized form → upload caste certificate, income proof,
  KYC, project report → routed to the **SCA of the applicant's state** → on to NSFDC for
  sanction → disbursement via the channel partner that took the case.
- One portal covers NSFDC, NBCFDC, NSKFDC.

### 4.2 Offline
Applicant walks into the district/head office of their state SCA with physical documents.
SCAs do the primary eligibility verification; NSFDC reserves audit rights.

### 4.3 Critical Pain Points (the "why" of this PS)
- **No smart matching:** PM-SURAJ exposes a flat catalog. The applicant has to self-evaluate
  which scheme they qualify for.
- **No EMI calculator** anywhere on NSFDC or PM-SURAJ — prospective borrowers cannot
  pre-compute their monthly outgo, especially with non-standard 3-/6-/12-month moratoria.
- **Channel-partner discovery is opaque:** the same scheme can be disbursed by ~10 different
  partners in one district. PM-SURAJ does not surface a "nearest partner that handles
  MFS" search.
- **Trilingual+ barrier:** SC beneficiaries in rural India are best served in Hindi /
  regional / English. NSFDC site is bilingual; PM-SURAJ site is also bilingual. There is
  no scheme-explainer in tribal languages.
- **No data-driven feasibility check:** PS92's sibling problem (SIH26091) literally
  describes the market-research gap. Many first-gen entrepreneurs pick businesses based on
  hearsay.
- **Stigma & literacy:** SC households often don't know the schemes exist; the State
  SC Development Corporation's district office is the de-facto touchpoint and isn't
  digitally discoverable.

---

## 5. Target User Demographics

- **Population:** ~20.14 crore SCs (2011 Census), 16.63% of India's population, 1,284
  notified castes across 28 states. SC status is **state-specific** (a "Chamar" in Punjab
  is a Balmiki; same caste may not be scheduled in another state).
- **Religion:** Hindu / Sikh / Buddhist only (per Presidential Order).
- **Geography:** Highest share in Punjab (~32%), Tamil Nadu (~20%), Himachal (~25%),
  West Bengal (~23.5%), UP (~20.7%), Haryana (~20%). Zero SC population in Nagaland,
  Arunachal, A&N, Lakshadweep.
- **Income band:** ≤ ₹5 L p.a. family income (NSFDC norm).
- **Literacy:** Significantly below national average; lower in rural areas — drives the
  "multi-lingual + voice/IVR" requirement.
- **Digital access:** Rising but uneven; many first-time users, feature-phone legacy,
  low bandwidth.

---

## 6. Existing Solutions & Competitors

| System | What it does | Gap for PS92 |
|---|---|---|
| **NSFDC website** (nsfdc.nic.in) | Static scheme catalog, partner PDFs, eligibility page, news. | No EMI calc, no geo-search, no smart recommender, no local-language chat, partner list is a PDF. |
| **PM-SURAJ** (pmsuraj.dosje.gov.in) | Application submission for NSFDC/NBCFDC/NSKFDC, dashboard with States/Agencies/Districts/Beneficiaries covered. | Pure form portal — does not help the user *choose* a scheme or *find* a partner. |
| **JanSamarth** (jansamarth.in) | National aggregator portal for many Central schemes (education, housing, credit, etc.). | Currently very thin landing page; no public scheme-eligibility engine surfaced; mainly credit-linked govt schemes. |
| **VIDYA Lakshmi** (vidyalakshmi.co.in) | Educational loan aggregator for multiple banks. | Education-only, no SC-specific concessional schemes (ELS not surfaced distinctly). |
| **State SCDC websites** (per state) | Last-mile info, branch addresses, offline application. | 28+ different websites, varying quality, no geo-search, no national map. |
| **myScheme (MeitY)** | National scheme discovery. | Generic — no SC-specific income/EMI reasoning, no partner routing. |
| **UMANG** | Aggregates many gov services. | Scheme discovery is shallow; not built for concessional-credit reasoning. |

**White-space for PS92:** An *intelligent* recommender that (a) reasons about income +
project cost + course type, (b) pre-computes EMI with moratorium handling, and
(c) geo-routes the applicant to the actual disbursing partner — none of the existing
portals do this end-to-end.

---

## 7. Key Data the Solution Will Need

1. **Scheme catalog** — at minimum the 5 schemes above (Micro Finance, Term Loan,
   Aajeevika, Udyam Nidhi, ELS). Should be designed to easily add more (PM SVANidhi,
   DAY-NULM, MUDRA, NCSBC, etc.) as the engine matures.
2. **Channel-partner directory** — name, address, district, state, schemes handled, GPS.
   NSFDC publishes this as PDFs; a hackathon project would need to digitize/normalize
   these (or stub them with sample data for the demo).
3. **Beneficiary profile schema** — name, age, caste certificate, annual family income,
   state, district, project type, project cost, education status (for ELS).
4. **EMI / amortization logic** — standard reducing-balance with configurable moratorium
   (interest during moratorium typically gets capitalized).
5. **Language models** — at least Hindi + English for the demo; the "multi-lingual"
   requirement suggests IndicBERT / Bhasini / Azure Indic; choice depends on stack.
6. **Maps / geocoding** — Google Maps, Mappls (MapMyIndia), or OpenStreetMap for the
   partner-locator.

---

## 8. Open Questions / Assumptions to Validate

- Does NSFDC's partner-PDF reflect schemes-handled-per-partner? (Likely needs
  manual labelling or call to channel partners — beyond hackathon scope, but worth
  designing a simple editable CMS for it.)
- Is there an official "scheme-handled" flag per channel partner? (Likely no — every
  partner handles a different subset; the recommender should ask the partner, or
  the SCA can confirm in PM-SURAJ backend.)
- For ELS, the moratorium is "course period + 1 year" — the EMI calculator must let the
  user enter the course duration.
- For Term Loan, the 12-month moratorium applies to plantation & construction — extra
  branching in the calculator.
- The 5-L income ceiling was revised on 7 Jan 2026; older case studies may quote
  ₹3 L — confirm when computing eligibility.

---

## 9. References (visited 2026-08-28)

- nsfdc.nic.in /scheme, /eligibility-requirements, /how-to-apply-2, /our-channel-partners
- socialjustice.gov.in/schemes (DoSJE scheme master list)
- pmsuraj.dosje.gov.in (unified application portal)
- jansamarth.in (national aggregator — minimal content)
- en.wikipedia.org/wiki/Scheduled_Castes_and_Scheduled_Tribes (demographics)
- sih.json (this repo, sno 92)
