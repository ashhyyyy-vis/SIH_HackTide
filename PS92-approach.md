# PS92 APPROACH — How We're Building This

## Last updated: 2026-09-01

---

## THE ONE-LINER

An intelligent, multilingual platform that helps SC entrepreneurs **find the right loan scheme**, **see exactly what they'll pay**, and **get directions to a partner who can actually disburse it**.

---

## WHAT WE BUILD (3 core modules + 4 supporting features)

### Core Modules

| # | Module | What It Does | The "AI" Part |
|---|---|---|---|
| 1 | **Scheme Recommender** | User answers 10-15 branching questions → gets ranked scheme recommendations with pass/fail/unknown logic | Rule engine (deterministic, auditable). LLM only for Hindi explanation text. |
| 2 | **Financial Calculator** | Picks a scheme → shows quarterly EMI with moratorium visualization + full amortization table | Custom math function (~30 lines TS). No library handles moratorium + quarterly together. |
| 3 | **Partner Locator & Router** | Map showing nearest eligible partners → filtered by NPA health → turn-by-turn directions | Haversine distance + Leaflet map + OSRM routing |

### Supporting Features

| # | Feature | Approach |
|---|---|---|
| 4 | **NPA-Aware Partner Filter** (our unique differentiator) | Score each partner 0-100 on financial health. Hide sick ones (GNPA > 10%). Mock data for demo, SCA quarterly feeds for production. |
| 5 | **Multilingual UI** | Hindi + English via `next-intl` (static strings) + Bhashini API (dynamic translation). Voice input via Web Speech API. |
| 6 | **Multi-Step Application Form** | 7-step wizard (Personal → Address → Project → Education → Bank → Documents → Review) using react-hook-form + zod. |
| 7 | **Offline / Low-Bandwidth** | Service worker tile caching + IndexedDB for partner data. Works on 2G. |

---

## TECH STACK

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND                                               │
│  Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui     │
│  i18n: next-intl (Hindi + English)                      │
│  Forms: react-hook-form + zod                           │
│  Charts: Recharts (amortization visualization)          │
│  Map: Leaflet 1.9 + OpenStreetMap tiles (free, no key)  │
│  Voice: Web Speech API (browser-native, free)           │
├─────────────────────────────────────────────────────────┤
│  BACKEND (Next.js API Routes)                           │
│  Rule engine: JSON scheme definitions + decision tree   │
│  Translation: Bhashini API (free govt infra)            │
│  Auth: Firebase Auth (or skip for demo)                 │
├─────────────────────────────────────────────────────────┤
│  DATA                                                   │
│  MongoDB Atlas free tier (512MB)                        │
│  Partner data: mock JSON for 3 sample states            │
│  Scheme data: hardcoded from NSFDC site (5 schemes)     │
│  Map tiles: OSM (free) | Directions: OSRM (free)       │
│  Geocoding: Nominatim (free, no key)                    │
└─────────────────────────────────────────────────────────┘
```

### Why These Choices

| Decision | Chosen | Rejected | Why |
|---|---|---|---|
| Framework | Next.js 15 | Plain React, Vue | SSR, API routes built-in, next-intl for i18n, every SIH finalist used it |
| Map | Leaflet + OSM | Google Maps | Free, no billing account, no API key, 42KB bundle |
| Recommender | JSON rule engine | LLM-based | Govt finance = auditable decisions. "An LLM is never asked 'is this person eligible?'" |
| Translation | Bhashini API | Google Translate | Free, govt-backed, perfect alignment for govt project |
| EMI calc | Custom TS function | npm library | No library handles moratorium + quarterly. Must build. |
| Auth | Firebase / skip | OTP | DhanSetu2 (SIH finalist) lesson: OTP broke repeatedly in demos |
| Database | MongoDB Atlas | PostgreSQL | Document-based schema fits partner/scheme data naturally. Free tier. |

---

## ARCHITECTURE

```
User → [State Selection] → [Branching Questionnaire (10-15 Qs)]
                                    ↓
                          [Rule Engine] → Eligible schemes (ranked)
                                    ↓
                     ┌──────────────┼──────────────┐
                     ↓              ↓              ↓
              [EMI Calculator]  [Partner Map]  [Application Form]
              Quarterly EMI +   Nearest healthy   7-step wizard
              amortization      partners + route   with doc upload
              schedule          (NPA-filtered)
```

### State-First Architecture

**Critical design decision from GitHub research:**

State is the FIRST input for all 3 modules. Everything derives from it:
- Recommender: state SCA determines actual rates, caps, moratorium
- Calculator: same loan = different EMI in different states
- Locator: only shows partners active in that state

```
User selects state
    ↓
Load state's SCA rate card (rates, caps, moratorium periods)
    ↓
All 3 modules use state-specific params
```

### What's an SCA Rate Card?

Each state has its own **State Channelizing Agency** (SCA) — the SC Development Corporation for that state. Examples:
- Rajasthan: RSFDC
- Maharashtra: MSCDC  
- Tamil Nadu: TAHDCO

NSFDC publishes *reference ranges* (6.5%–15% interest, 3-12 month moratorium), but the **actual terms vary by state SCA**. A "rate card" is that state's specific version:

| Parameter | NSFDC Reference | Rajasthan SCA (example) | Tamil Nadu SCA (example) |
|---|---|---|---|
| MFS interest rate | 6.5% | 6.5% | 6.5% |
| Term Loan rate | 8% | 8% | 8% |
| MFS moratorium | 3 months | 3 months | 3 months |
| TL moratorium | 6-12 months | 6 months | 12 months (construction) |
| Max loan cap | Per scheme | State may set lower | State may set lower |

**For demo:** We hardcode rate cards for 2-3 sample states.
**For production:** Rate cards would come from a CMS or SCA API.

---

## SCHEME DECISION TREE

```
INPUT: state, caste, income, project_type, project_cost

STEP 1: caste != SC → REJECT ("Only for SC beneficiaries")
STEP 2: income > ₹5,00,000 → REJECT ("Family income must be ≤ ₹5 lakh")
STEP 3: project_cost <= 0 → REJECT

STEP 4: ROUTE BY PROJECT TYPE

  IF project_type == EDUCATION:
    → ELS (6.5%, course+1yr moratorium, up to ₹40L)

  IF project_type == BUSINESS:
    IF project_cost ≤ ₹1.40L:
      → PRIMARY: MFS (6.5%, SCA channel)        ← always recommend first
      → ALT: Aajeevika (15%, NBFC-MFI)          ← only if SCA unavailable
      → ALSO: UNY (13-15%, Coop/SFB)

    IF ₹1.40L < project_cost ≤ ₹5L:
      → PRIMARY: Term Loan (8%, SCA channel)
      → ALT: UNY (13-15%, Coop/SFB)

    IF ₹5L < project_cost ≤ ₹50L:
      → Term Loan (8%, SCA channel)

    IF project_cost > ₹50L:
      → REJECT ("Exceeds NSFDC maximum")
      → SUGGEST: PMEGP, MUDRA, or other schemes

STEP 5: PARTNER MATCH
  Filter by: state → scheme supported → NPA not CRITICAL
  Sort by: health score DESC, distance ASC
  Return: top 5 nearest eligible
```

---

## NPA-AWARE PARTNER SCORING (THE DIFFERENTIATOR)

**Why this matters:** PS92 explicitly says "ensuring applications aren't sent to partners with high NPAs or overdues." No previous SIH team has built this.

### How it works

Each partner gets a health score (0-100):

```
Score = 0.30 × Asset Quality (NPA ratio)
      + 0.20 × Capital Adequacy (CRAR)
      + 0.15 × NPA Composition (sub/doubtful/loss split)
      + 0.15 × External Rating (CRISIL/CARE grade)
      + 0.10 × Track Record (years operating)
      + 0.10 × Regional Benchmark (vs district average)
```

### Result

| Score | Risk | What happens in the locator |
|---|---|---|
| 75-100 | 🟢 LOW | Shown first, fully visible |
| 50-74 | 🟡 MEDIUM | Shown, flagged in admin |
| 25-49 | 🟠 HIGH | Restricted |
| 0-24 | 🔴 CRITICAL | **Hidden entirely** |

### Data reality

- **For demo:** Mock data with realistic distributions (PSB avg GNPA ~2.58%, MFI sector ~14.8%)
- **For production:** "Would integrate with SCA quarterly reporting and RBI DBIE data"
- **Pitch line:** "We don't just find the nearest partner — we find the nearest partner that can actually help you."

---

## EMI CALCULATOR LOGIC

### Phase 1: Moratorium (simple interest accrues, no payments)
```
SI = Principal × Annual Rate × Moratorium Years
Inflated Principal = Principal + SI
```

### Phase 2: Quarterly EMI on inflated principal
```
quarterly_rate = annual_rate / 4
num_quarters = tenure_years × 4
QI = Inflated_Principal × r × (1+r)^n / ((1+r)^n - 1)
```

### Phase 3: Full amortization schedule
Each quarter: opening balance, interest portion, principal portion, closing balance.

### Worked Example (MFS: ₹1.25L, 6.5%, 3yr, 3mo moratorium)
```
SI = 1,25,000 × 0.065 × 0.25 = ₹2,031
Inflated P = ₹1,27,031
Quarterly rate = 0.01625
Quarters = 12
QI = ₹11,886/quarter
Total paid = ₹1,42,638
Total interest = ₹17,638
```

---

## DEMO STRATEGY

### Flow (5 minutes)

| Time | What | Impact |
|---|---|---|
| 0:00-0:30 | **Problem** — "20 crore SC citizens, 100+ partners, 5 schemes, but no system connects the dots" | Sets urgency |
| 0:30-2:00 | **Recommender** — Enter sample profile → branching questions → scheme match with explanation | Shows core intelligence |
| 2:00-3:00 | **Calculator** — Pick scheme → see quarterly EMI + moratorium visualization → compare schemes | Shows financial depth |
| 3:00-4:00 | **Locator** — Map view → NPA filter in action (green/red markers) → directions to healthy partner | Shows the differentiator |
| 4:00-4:30 | **Hindi switch** — One click → entire UI in Hindi. Say something → voice input works | Shows accessibility |
| 4:30-5:00 | **Architecture** — "Rule engine not LLM, NPA-aware (first ever in SIH), Bhashini for translation" | Shows technical depth |

### Key talking points

1. "Rules engine, not LLM, for eligibility — because government finance decisions must be auditable and reproducible"
2. "NPA-aware partner routing — no previous SIH project has attempted this"
3. "Bhashini — we use government translation infrastructure for a government problem"
4. "State-first architecture — because ₹1.25L loan = different EMI in Rajasthan vs Tamil Nadu"

---

## WHAT WE SKIP

| Skip | Why |
|---|---|
| LLM for eligibility decisions | Govt finance must be auditable. Use for explanations only. |
| Real NSFDC API | Doesn't exist. Mock is the standard. |
| OTP authentication | DhanSetu2 lesson: breaks in demos. Use simple login. |
| Native mobile app | PWA web is sufficient. Every SIH winner used web. |
| Payment integration | Out of scope — we're a recommender, not a payment gateway. |
| Biometric auth | Out of scope. |
| Complex ML models | The recommender is 5 hard rules. A neural net adds nothing. |

---

## BUILD PHASES

### Phase 1 — Foundation (Days 1-3)
- [ ] Next.js 15 + TypeScript + Tailwind + shadcn/ui setup
- [ ] MongoDB Atlas free tier
- [ ] Design system: colors, typography, components
- [ ] i18n with next-intl (English + Hindi)
- [ ] State-first architecture: state selector → loads SCA rate card

### Phase 2 — Core Modules (Days 4-8)
- [ ] Scheme Recommender: branching questionnaire + rule engine + trinary logic
- [ ] Financial Calculator: moratorium + quarterly EMI + amortization chart
- [ ] Partner Locator: Leaflet map + mock data + Haversine + NPA filter
- [ ] Partner data: stub JSON for Rajasthan, Maharashtra, Tamil Nadu

### Phase 3 — Differentiation (Days 9-11)
- [ ] NPA scoring formula + risk classification (green/yellow/orange/red)
- [ ] Bhashini API integration for Hindi translations
- [ ] Voice input (Web Speech API)
- [ ] Multi-step application form (7 steps, react-hook-form + zod)

### Phase 4 — Polish & Demo (Days 12-14)
- [ ] Offline support (service worker + IndexedDB)
- [ ] Admin dashboard (partner health, scheme utilization)
- [ ] Mobile responsiveness (large touch targets, icon-driven)
- [ ] Edge cases (multi-scheme eligibility, near-miss guidance)
- [ ] Demo rehearsal with timer

---

## DATA WE NEED

| Data | Source | Status |
|---|---|---|
| 5 NSFDC schemes (rates, caps, moratorium) | nsfdc.nic.in/scheme | ✅ Already extracted |
| Channel partner lists (8 types) | nsfdc.nic.in PDFs | ⬜ Parse or stub |
| SCA rate cards (state-specific terms) | State SCA websites | ⬜ Hardcode for 3 states |
| NPA/GNPA data (sector benchmarks) | RBI DBIE, NABARD reports | ✅ Benchmarks known (PSB 2.58%, MFI 14.8%) |
| Per-partner NPA | Not public | ⬜ Mock with realistic distributions |
| SC caste list by state | MoSJE Presidential Order | ⬜ Stub for 3 states |
| Partner GPS coordinates | Not available | ⬜ Manually geocode for 3 states |

---

## REFERENCES

- [PS92-research-notes.md](PS92-research-notes.md) — Domain research, ecosystem, pain points
- [PS92-component-solutions.md](PS92-component-solutions.md) — Detailed tech approach per component
- [PS92-github-research.md](PS92-github-research.md) — Full GitHub precedent analysis
- [PS92-github-research-short.md](PS92-github-research-short.md) — Quick reference
- [PS92-requirements-vs-prior-PS.md](PS92-requirements-vs-prior-PS.md) — PS92 vs past SIH problems
- [PS92-risk-assessment.md](PS92-risk-assessment.md) — Risks and mitigations
