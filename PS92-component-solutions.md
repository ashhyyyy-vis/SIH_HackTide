# PS92 COMPONENTS: WHAT WE NEED, WHAT OTHERS DID, MORE APPROACHES

## Last updated: 2026-08-31 (deep research round)

---

## WHAT WE NEED FOR PS92 (3 core modules)

1. **Scheme Recommender** — matches user profile to scheme
2. **Financial Calculator** — EMI with quarterly payments + moratorium
3. **Partner Locator & Router** — find nearest eligible channel partner + directions

**Cross-cutting needs:**
- NPA-aware partner filter (novel — no SIH precedent)
- Multi-lingual UI (Hindi + regional)
- Low-end device / low-bandwidth support
- Beneficiary application form
- State-based parameter lookup (rates/caps/moratoriums vary by scheme)

---

## SCHEME CATALOG (verified from nsfdc.nic.in/scheme, Aug 2026)

| Scheme | Project Cost | Max Loan (90%) | Rate | Tenure | Moratorium | Channel |
|---|---|---|---|---|---|---|
| **Micro Finance (MFS)** | ≤ ₹1.40L | up to ₹1.25L | **6.5%** | 3 yrs quarterly | 3 months | SCAs/CAs |
| **Term Loan** | > ₹1.40L ≤ ₹50L | > ₹1.25L ≤ ₹45L | **8%** | 7 yrs quarterly | 6 months (12 for plantation/construction) | SCAs/CAs |
| **Aajeevika MFY** | ≤ ₹1.40L | up to ₹1.25L | **15%** | 3 yrs quarterly | 3 months | NBFC-MFIs only |
| **Udyam Nidhi (UNY)** | ≤ ₹5L | up to ₹4.5L | **13%** (Coop) / **15%** (SFB) | up to 5 yrs | 3 months | Coop Banks/SFBs only |
| **Educational Loan (ELS)** | up to ₹40L or 90% fee | 90% of course fee | **6.5%** | up to 12 yrs | Course + 1 yr | SCAs/CAs |

**Hard rules:**
- Beneficiary must be **Scheduled Caste (SC)**
- Annual family income **≤ ₹5 lakh** (revised 7 Jan 2026)
- **10% marginal money** — applicant pays 10% from own sources
- ₹1.40L exactly = MFS (≤), Term Loan is (>)

---

## DECISION TREE (exact, from NSFDC rules)

```
INPUT: caste, income, project_type, project_cost, state, district, (if education: course_type, duration, fee)

STEP 1: caste != SC → REJECT
STEP 2: income > 500000 → REJECT
STEP 3: project_cost <= 0 → REJECT

STEP 4: ROUTE
  IF project_type == EDUCATION:
    IF course_type IN [24 recognized categories + PhD]:
      → RECOMMEND: ELS
        loan = min(4000000, course_fee * 0.90)
        rate = 6.5%, moratorium = course_months + 12
        tenure = up to 144 months (12 yrs)
    ELSE: WARN "Course may not be covered — check with SCA"

  IF project_type == BUSINESS:
    IF project_cost <= 140000:
      → PRIMARY: MFS (6.5%, SCA channel)
      → ALTERNATIVE: Aajeevika (15%, NBFC-MFI — faster disbursal)
      → ALSO: UNY if project_cost ≤ 5L (13-15%, Coop/SFB channel)

    IF project_cost > 140000 AND project_cost <= 500000:
      → PRIMARY: Term Loan (8%, SCA channel)
      → ALTERNATIVE: UNY (13-15%, Coop/SFB channel — different partner)

    IF project_cost > 500000 AND project_cost <= 5000000:
      → RECOMMEND: Term Loan (8%, SCA channel)
      moratorium = 12 if plantation/construction, else 6

    IF project_cost > 5000000:
      → REJECT: "Exceeds ₹50L NSFDC maximum"
      → SUGGEST: PMEGP, MUDRA, or other schemes

STEP 5: PARTNER MATCH
  Filter by: state, scheme in supported_schemes, npa_status != HIGH
  Sort by: distance from user location
  Return: top 5 nearest
```

**Multi-scheme overlap (critical for recommender):**

| Project Cost | Eligible Schemes |
|---|---|
| ≤ ₹1.40L | MFS + Aajeevika + UNY |
| ₹1.40L – ₹5L | Term Loan + UNY |
| ₹5L – ₹50L | Term Loan only |
| > ₹50L | None |

---

## EDGE CASES

| Case | Verdict |
|---|---|
| Project cost = ₹1.40L exactly | **MFS** (≤ is inclusive) |
| MFS vs Aajeevika for same project | **Always recommend MFS first** (6.5% vs 15%). Aajeevika only as fallback if SCA unavailable |
| Partnership firm with mixed SC/non-SC | **REJECTED** — all members must be SC |
| Income = ₹5,00,000 exactly | **ELIGIBLE** (≤ is inclusive) |
| Income = ₹5,00,001 | REJECTED |
| Existing borrower, same scheme | REJECT — repay first |
| Existing borrower, different scheme | ALLOW (subject to SCA) |
| Educational loan + business loan | ALLOW (independent) |
| State with no SCA | Route through PSB/RRB; fallback: call 1800-110-396 |

---

## CHANNEL PARTNER TYPES & SCHEME MAPPING

| Partner Type | Schemes Handled | Notes |
|---|---|---|
| **SCAs** | MFS + Term Loan + ELS | Primary last-mile touchpoint. One per state/UT |
| **PSBs** | MFS + Term Loan + ELS | SBI, PNB, BoB, Canara, etc. |
| **RRBs** | MFS + Term Loan + ELS | District-level rural reach |
| **NBFC-MFIs** | **Aajeevika ONLY** | SKS, Spandana, CreditAccess, etc. |
| **Cooperative Banks** | **UNY ONLY** | PACS level |
| **Cooperative Societies** | **UNY ONLY** | Local level |
| **Small Finance Banks** | **UNY ONLY** | AU, Equitas, Ujjivan, etc. |

---

## NSFDC DATA SOURCES

| Data | Source | Format | Actionable? |
|---|---|---|---|
| Partner lists (8 types) | nsfdc.nic.in/our-channel-partners | **PDF files** (text-based) | Parse with pdf-parse, or stub for demo |
| Performance data | nsfdc.nic.in/performance-data | **Excel files** (9 datasets) | Download + parse for real disbursement numbers |
| Scheme details | nsfdc.nic.in/scheme | HTML | Already extracted |
| Eligibility | nsfdc.nic.in/eligibility-requirements | HTML | Already extracted |
| PM-SURAJ dashboard | pmsuraj.dosje.gov.in | Server-rendered PHP (BISAG-N) | **No public API** — scrape or mock |

**Partner PDF URLs (8 files):**
1. SCAs: `nsfdc.nic.in/storage/channel-partners/attachments/20260401_164458_Ip6UJm.pdf`
2. PSBs: `nsfdc.nic.in/storage/channel-partners/attachments/20260408_100623_Bea3za.pdf`
3. RRBs: `nsfdc.nic.in/storage/channel-partners/attachments/20260401_163145_9tiTZM.pdf`
4. NBFC-MFIs: `nsfdc.nic.in/storage/channel-partners/attachments/20251223_101231_7smjJC.pdf`
5. Coop Banks: `nsfdc.nic.in/storage/channel-partners/attachments/20251223_101341_Zcm8s6.pdf`
6. Other Agencies: `nsfdc.nic.in/storage/channel-partners/attachments/20260408_101214_Yw5CGQ.pdf`
7. SFBs: `nsfdc.nic.in/storage/uploads/images/banners/20260408_100851_UrGTfH.pdf`
8. Coop Societies: `nsfdc.nic.in/storage/uploads/images/banners/20260408_101711_6Iyved.pdf`

**NSFDC fund allocation targets (from /allocation-of-funds):**
- Scheme split: TL + ELS = 40%, MFS = 60%
- Sector split: Agriculture = 50%, Service = 40%, Industry = 10%
- Social split: Educated unemployed = 40%, Women = 40%, Others = 20%
- 102 channel partners total

---

## COMPONENT 1: SCHEME RECOMMENDER

### What we need
User inputs (state, project type, cost, income, education) → which scheme(s)

### What SIH projects did

| Repo | Approach | Verdict |
|---|---|---|
| **LawAI** (SIH finalist) | FastAPI backend, LLM for matching | Overkill for deterministic rules |
| **Nyayasahay** (SIH1700) | 3 AI services + Selenium scraping | Too heavy |
| **Pathfinder AI** (SIH1781) | Gemini + Zod, LLM returns free-form JSON | Good for explanations, bad for correctness |
| **Bail Reckoner** (SIH1702) | MongoDB status flags | Simple but not applicable |
| **PMSSS** (SIH1728) | Form-based, no recommender | N/A |
| **SchemeFinder** | YAML rules + `pass/fail/unknown` trinary logic | **Best pattern — adopt this** |
| **Yojana Khojna** | 40+ node branching questionnaire → 20-50 results | **Best UX — adopt this** |
| **Sahayak** | Deterministic rules + TF-IDF retrieval, no LLM at query time | **Best principle** |
| **YojanaSaathi** | 5-agent pipeline, LLM only for summaries | Good architecture |
| **DhanSetu2** (SIH 2025 finalist) | SHAP explainability + Bhashini translation | **Best demo features** |
| **HaqSetu** | Document dependency graph ("unlock path") | **Novel UX** |

### Consensus from successful projects
> "An LLM is never asked 'is this person eligible?' — that judgment touches real legal
> entitlements and must be reproducible and auditable." — YojanaSaathi README

- **Deterministic rule engine** for eligibility (never LLM)
- **LLM only** for: natural language summaries, benefit explanations, application drafting
- **Branching questionnaire** over flat filters (40 nodes → 20 results vs 6 flat → 3000)
- **`pass / fail / unknown`** trinary logic — missing data = "unknown", never false negative
- **Near-miss guidance** — "what you need" for ineligible schemes

### Recommended approach

**1. Pure rule engine (RECOMMENDED)**
- JSON-based scheme definitions with eligibility rules
- Hard cutoffs: income ≤ 5L, caste = SC, project cost boundaries
- Soft scoring: sector alignment, women priority, educated unemployed
- Branching questionnaire (10-15 questions, not 6 flat)
- `pass / fail / unknown` trinary evaluation
- Output: ranked list with 0-100 relevance score + explanation text

```json
{
  "scheme": "Micro Finance Scheme",
  "eligibility": {
    "caste": { "type": "exact", "value": "SC", "logic": "pass/fail" },
    "income_max": { "type": "lte", "value": 500000, "logic": "pass/fail" },
    "project_cost_max": { "type": "lte", "value": 140000, "logic": "pass/fail" },
    "entity_type": { "type": "in", "value": ["individual", "partnership", "coop"], "logic": "pass/fail" }
  },
  "params": {
    "loan_max": 125000,
    "rate": 6.5,
    "tenure_years": 3,
    "moratorium_months": 3,
    "frequency": "quarterly"
  }
}
```

**2. LLM for explanation only**
- After rule engine determines eligibility
- LLM explains in Hindi/regional: "You qualify for MFS because..."
- LLM generates: benefit summary, required documents list, next steps
- Auditable: rule engine decision is always the source of truth

---

## COMPONENT 2: FINANCIAL CALCULATOR

### What we need
Scheme params → quarterly installment + full amortization schedule

### Formula: NSFDC Simple Interest Moratorium + Quarterly EMI

**Phase 1: Moratorium (simple interest, Indian standard)**
```
SI_morat = P × R_annual × T_years
P' = P + SI_morat
```

**Phase 2: Quarterly EMI on inflated principal**
```
r_q = R_annual / 4
n_q = tenure_years × 4
QI = P' × r_q × (1 + r_q)^n_q / ((1 + r_q)^n_q - 1)
```

**Phase 3: Amortization schedule**
```
For each quarter k (1 to n_q):
  Interest_k   = Balance_{k-1} × r_q
  Principal_k  = QI - Interest_k
  Balance_k    = Balance_{k-1} - Principal_k
```

### Worked examples

**MFS: ₹1.25L loan, 6.5%, 3 years, 3-month moratorium**
```
SI_morat = 125000 × 0.065 × 0.25 = ₹2,031.25
P' = 127,031.25
r_q = 0.065/4 = 0.01625
n_q = 3 × 4 = 12
QI = 127031.25 × 0.01625 × (1.01625)^12 / ((1.01625)^12 - 1) = ₹11,886.47
Total payment = ₹142,637.64
Total interest = ₹17,637.64
```

**ELS: ₹10L loan, 6.5%, 4yr course + 1yr moratorium, 10yr repayment**
```
SI_morat = 1000000 × 0.065 × 5 = ₹325,000
P' = 1,325,000
r_q = 0.065/4 = 0.01625
n_q = 10 × 4 = 40
QI = 1325000 × 0.01625 × (1.01625)^40 / ((1.01625)^40 - 1) = ₹47,062.83
Total payment = ₹1,882,513.20
Total interest = ₹882,513.20
```

### What SIH projects did
**None** had a real EMI calculator. No SIH precedent. This is original.

### Related repos (not SIH, but useful references)
| Repo | Feature |
|---|---|
| `anmolverma1309/mifos-loan-simulator` | Moratorium support, `decimal.Decimal` precision, declining balance |
| `dharmik136/home-loan-planner` | Principal moratorium with interest-only or full EMI holiday modes |
| `HiIAmShashank/home-loan-calculator` | PMAY subsidy calc, Sec 24b/80C tax benefits |

### No existing library handles moratorium + quarterly together
Must build custom. ~30 lines of TypeScript.

```typescript
interface LoanParams {
  principal: number;        // P — loan amount
  annualRate: number;       // R — e.g. 6.5 for 6.5%
  moratoriumYears: number;  // T — 0.25 for 3 months, 5 for ELS course+1yr
  repaymentYears: number;   // N — post-moratorium tenure
}

interface AmortizationRow {
  quarter: number;
  openingBalance: number;
  interest: number;
  principal: number;
  closingBalance: number;
}

function calculateNSFDCloan(params: LoanParams) {
  const R = params.annualRate / 100;
  const P = params.principal;

  // Phase 1: Simple interest during moratorium
  const moratInterest = P * R * params.moratoriumYears;
  const inflatedPrincipal = P + moratInterest;

  // Phase 2: Quarterly EMI
  const rQ = R / 4;
  const nQ = params.repaymentYears * 4;
  const qI = inflatedPrincipal * rQ * Math.pow(1 + rQ, nQ) /
             (Math.pow(1 + rQ, nQ) - 1);

  // Phase 3: Amortization schedule
  const schedule: AmortizationRow[] = [];
  let balance = inflatedPrincipal;

  for (let q = 1; q <= nQ; q++) {
    const interest = balance * rQ;
    const principalPaid = qI - interest;
    balance -= principalPaid;
    schedule.push({
      quarter: q,
      openingBalance: balance + principalPaid,
      interest: Math.round(interest * 100) / 100,
      principal: Math.round(principalPaid * 100) / 100,
      closingBalance: Math.round(Math.max(0, balance) * 100) / 100,
    });
  }

  return {
    moratoriumInterest: moratInterest,
    inflatedPrincipal,
    quarterlyInstallment: Math.round(qI * 100) / 100,
    totalPayment: Math.round(qI * nQ * 100) / 100,
    totalInterest: Math.round((qI * nQ - P) * 100) / 100,
    schedule,
  };
}
```

**Key implementation notes:**
- Use `Decimal` or round to 2 decimals at each step (avoid float drift)
- Handle fractional quarters (partial last period)
- Show moratorium period separately in UI (0 payments, interest accrues)
- Total tenure = moratorium + repayment (e.g., MFS = 0.25 + 3 = 3.25 years total)

---

## COMPONENT 3: PARTNER LOCATOR & ROUTER

### What we need
User location + state → nearest eligible channel partner → directions

### Architecture

```
┌──────────────────────────────────────────────┐
│  User: "Find nearest partner for MFS in Maharashtra"  │
├──────────────────────────────────────────────┤
│  1. Scheme filter: partners where 'MFS' in schemes    │
│  2. NPA filter: npa_status != 'CRITICAL'              │
│  3. State filter: state = 'Maharashtra'                │
│  4. Geo filter: Haversine distance from user           │
│  5. Sort: partner_health_score DESC, distance ASC      │
│  6. Return: top 5 nearest eligible partners            │
├──────────────────────────────────────────────┤
│  Map: Leaflet + OSM tiles + PruneCluster              │
│  Directions: OSRM public API (free)                   │
│  Offline: Service worker tile cache + IndexedDB       │
└──────────────────────────────────────────────┘
```

### What SIH projects did

| Repo | Map Tech | Key Feature |
|---|---|---|
| **Presence** (SIH finalist) | react-leaflet + OSM | Haversine distance, geofencing, top-5 sorting |
| **JalSetu** (SIH runnerup) | react-native-maps (Google) | Hierarchical routing (ZP→PS→GP→User), inventory auto-status |
| **Kalparatna** (SIH1753) | Django models | 3PL partner management, geofencing as service area |

### Geo-search implementation

**Client-side Haversine (< 5K partners — sufficient for demo):**

```typescript
import haversine from 'haversine-distance';

function findNearestPartners(
  userLat: number, userLng: number,
  partners: Partner[],
  schemeCode: string,
  limit = 5
) {
  return partners
    .filter(p =>
      p.state === userState &&
      p.schemes.includes(schemeCode) &&
      p.npa_status !== 'CRITICAL' &&
      p.is_active
    )
    .map(p => ({
      ...p,
      distance_km: haversine(
        { latitude: userLat, longitude: userLng },
        { latitude: p.lat, longitude: p.lng }
      ) / 1000
    }))
    .sort((a, b) => (a.partner_health_score - b.partner_health_score) || (a.distance_km - b.distance_km))
    .slice(0, limit);
}
```

**For > 10K partners (production):**
- PostGIS with GiST index: `<->` operator, 1,800x faster than naive scan
- KD-Tree (`kd-tree-javascript` npm) for client-side spatial indexing
- PruneCluster for map rendering (150K markers at 220ms)

### Map stack

| Layer | Choice | Why |
|---|---|---|
| Map display | **Leaflet 1.9 + OSM tiles** | 42KB, mobile-first, free |
| Clustering | **Leaflet.markercluster** (<10K) or **PruneCluster** (>10K) | Battle-tested |
| Geocoding | **Nominatim** (reverse) + **bharataddress** (forward) | Offline, handles Indian transliterations |
| Directions | **OSRM public API** | Free, 1-5ms response |
| Routing (production) | **OSRM self-hosted** | Docker, 16-32GB RAM for India |
| India-specific (prod) | **Mappls (MapMyIndia)** | Only SoI-compliant provider, used by govt apps |

### Offline / low-bandwidth support
- Service worker caches map tiles (zoom 10-14, ~5-20MB)
- Partner data for user's district cached in IndexedDB (~50KB JSON)
- Client-side Haversine for offline nearest-partner search
- `Cache-Control: max-age=86400` for static base tiles

---

## COMPONENT 4: NPA-AWARE PARTNER FILTER (NOVEL — NO SIH PRECEDENT)

### What we need
Hide/restrict channel partners with unhealthy NPA ratios

### Regulatory thresholds (RBI PCA + SBI empanelment)

| Institution | Low Risk (Green) | Medium (Yellow) | High (Red) | Critical (Black) |
|---|---|---|---|---|
| **PSBs / RRBs** | GNPA < 3% | 3-6% | 6-10% | > 10% |
| **NBFC-MFIs** | GNPA < 4% | 4-10% | 10-15% | > 15% |
| **Coop Banks** | GNPA < 5% | 5-10% | 10-15% | > 15% |
| **RRBs** (NABARD PCA) | NNPA < 10% | 10-15% | > 15% | — |

**Current sector benchmarks (2025-26):**
- PSBs aggregate GNPA: **2.58%** (historic low)
- MFI sector GNPA: **14.8%** (crisis level — filtering justified)
- SBI empanelment: Net NPA must be **< 4%**

### Partner health score formula (0-100)

```
Score = 0.30 × AssetQuality + 0.20 × CapitalAdequacy + 0.15 × NPAComposition
      + 0.15 × ExternalRating + 0.10 × OperationalTrack + 0.10 × RegionalBenchmark
```

| Component | Weight | Scoring |
|---|---|---|
| **Asset Quality (NPA)** | 30% | < 3% = 100; 3-6% = 75; 6-10% = 50; 10-15% = 25; > 15% = 0 |
| **Capital Adequacy (CRAR)** | 20% | > 15% = 100; 12-15% = 75; 9-12% = 50; < 9% = 0 |
| **NPA Composition** | 15% | Weighted penalty: substandard 0.7x, doubtful 1.5x, loss 2x |
| **External Rating** | 15% | CRISIL M1/AAA = 100; M2/AA = 85; M3/A = 70; M4/BBB = 55; M5/BB = 40 |
| **Operational Track Record** | 10% | > 10 yrs = 100; 5-10 = 75; 2-5 = 50; < 2 = 25 |
| **Regional NPA Benchmark** | 10% | Below district avg = 100; within avg = 75; 1.5x = 50; 2x = 25 |

### Risk classification from score

| Score | Risk Level | Locator Behavior |
|---|---|---|
| 75-100 | **LOW (Green)** | Fully visible, sorted first |
| 50-74 | **MEDIUM (Yellow)** | Visible, flagged in admin |
| 25-49 | **HIGH (Orange)** | Restricted — only for specific schemes |
| 0-24 | **CRITICAL (Red)** | **Hidden from locator entirely** |

### Implementation (JalSetu pattern)

```typescript
// Mongoose pre-save middleware
partnerSchema.pre('save', function(next) {
  const r = this;

  // NPA-based risk classification
  const npaThresholds = {
    'PSB':    { low: 3, med: 6, high: 10 },
    'RRB':    { low: 10, med: 15, high: 20 },
    'MFIs':   { low: 4, med: 10, high: 15 },
    'COOP':   { low: 5, med: 10, high: 15 },
  };

  const t = npaThresholds[r.partner_type] || npaThresholds['PSB'];

  if (r.gnpa_ratio > t.high || r.crar < 9) {
    r.risk_level = 'CRITICAL';
  } else if (r.gnpa_ratio > t.med || r.crar < 12) {
    r.risk_level = 'HIGH';
  } else if (r.gnpa_ratio > t.low || r.crar < 15) {
    r.risk_level = 'MEDIUM';
  } else {
    r.risk_level = 'LOW';
  }

  r.is_eligible = r.risk_level !== 'CRITICAL';
  r.partner_health_score = calculateHealthScore(r);
  next();
});
```

### Mock data schema

```typescript
interface ChannelPartner {
  id: string;
  name: string;
  partner_type: 'SCA' | 'PSB' | 'RRB' | 'NBFC-MFI' | 'COOP_BANK' | 'SFB';
  state: string;
  district: string;
  lat: number;
  lng: number;
  // NPA data
  gnpa_ratio: number;          // Gross NPA %
  nnpa_ratio: number;          // Net NPA %
  npa_breakdown: {
    substandard_pct: number;
    doubtful_pct: number;
    loss_pct: number;
  };
  crar: number;                // Capital to Risk-Weighted Assets Ratio
  // External rating
  rating_agency: 'CRISIL' | 'CARE' | 'ICRA' | 'NONE';
  rating_grade: string;        // e.g., 'M3+', 'mfR4', 'BBB'
  // Operational
  years_in_operation: number;
  fund_utilization_pct: number;
  // Capabilities
  schemes: string[];           // ['MFS', 'TERM_LOAN', 'ELS']
  max_daily_disbursals: number;
  // Computed
  partner_health_score: number; // 0-100
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  is_eligible: boolean;
}
```

### Data availability reality

| Data | Public? | Source |
|---|---|---|
| Bank-group aggregate GNPA | **Yes** (quarterly) | RBI DBIE (`data.rbi.org.in/DBIE/`) |
| State-wise MFI NPA | **Yes** (annual) | NABARD Status of Microfinance |
| Per-partner/branch NPA | **No** | Internal to institutions |
| MFI-level NPA/PAR | **Limited** | CRISIL/CARE/ICRA (subscription) |

**For demo:** Mock data with realistic distributions based on above thresholds.
**For production:** Integrate with SCA quarterly reporting or NSFDC internal APIs.

### Relevant GitHub repos

| Repo | Relevance |
|---|---|
| `Prxbhutva/Explainability-Driven-Credit-Scoring` | Rural MFI credit scoring with SHAP, ROC-AUC 97.5% |
| `SKiran99/Microfinance-Repayment-Analysis-India` | 80K MFI loans, PAR analysis, default patterns |
| `AnjaliSharma76564/MUDRA-LOAN-RISK-PREDICTION` | 105K loan records, 26 features |

---

## COMPONENT 5: MULTI-LINGUAL UI

### What SIH projects did

| Repo | Approach | Quality |
|---|---|---|
| **DhanSetu2** (SIH 2025 finalist) | Bhashini translation widget | Best — govt-approved |
| **Bail Reckoner** | MyMemory API on-the-fly | Simple, free |
| **vedantchalke36** | next-intl with JSON files | Proper i18n |
| **YojanaSaathi** | Google Gemini for translation | Overkill |
| **LawAI** | Claimed multi-lingual but didn't implement | N/A |
| **SchemeFinder** | English only, acknowledged gap | N/A |

### Translation options (ranked)

| Option | Cost | Quality | Best For |
|---|---|---|---|
| **Bhashini API** | **FREE** | High | Government projects (official platform) |
| **IndicTrans2** (AI4Bharat) | Free (self-hosted) | High | Full control, offline capable |
| **Azure Translator F0** | **FREE** (2M chars/mo) | High | Quick hackathon prototype |
| **Google Cloud Translation** | Free (500K chars/mo) | High | GCP-native projects |
| **MyMemory** | Free (5K chars/day anon, 50K with email) | Inconsistent | Quick demo only |

### Bhashini API integration (recommended for govt project)

**Registration:** `https://bhashini.gov.in/ulca/user/register` — get `userID` + up to 5 `ulcaApiKey`s, **completely free**.

**3-step API flow:**

```
Step 1: Pipeline Discovery
POST https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline
Body: { "pipelineTasks": [{"taskType": "translation", "config": {"language": {"sourceLanguage": "en", "targetLanguage": "hi"}}}], "pipelineRequestConfig": {"pipelineId": "64392f96daac500b55c543cd"} }

Step 2: Extract endpoint + auth from response

Step 3: Translate
POST https://dhruva-api.bhashini.gov.in/services/inference/pipeline
Body: { "pipelineTasks": [...], "inputData": {"input": [{"source": "Hello"}]} }
→ { "output": [{"target": "नमस्ते"}] }
```

**Key serviceId:** `ai4bharat/indictrans-v2-all-gpu--t4`

**Python client:** `pip install bhashiniclient`

### i18n framework: next-intl (RECOMMENDED)

```typescript
// src/i18n/routing.ts
import { defineRouting } from 'next-intl/routing';
export const routing = defineRouting({
  locales: ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml', 'pa', 'or'],
  defaultLocale: 'en'
});
```

**Translation strategy:**

| Content Type | Approach |
|---|---|
| Static UI strings (buttons, labels) | Pre-translated JSON via `next-intl` |
| Scheme descriptions from DB | Store with `locale` column, or Bhashini at serve-time |
| User-generated content | Translate on-demand via Bhashini API |
| Legal/policy documents | Human-translated, stored per locale |

### Voice for low-literacy users

| Option | Cost | Languages | Best For |
|---|---|---|---|
| **Web Speech API** | Free (browser-native) | 10+ Indic | Browser-based STT/TTS |
| **Svara TTS** | Free (WebGPU) | 19 Indic | Offline TTS in browser |
| **Vani + Bhashini** | Free | 22 | Production IVR, telephony |
| **Sargam-VoiceBot** | Free (Groq Llama) | 11 | Full-stack voice demo |

---

## COMPONENT 6: AUTH

### What SIH projects did
- **DhanSetu2**: Mobile + OTP (removed after repeated breakage, switched to simple login)
- **Presence**: next-auth + bcryptjs + simplewebauthn
- **JalSetu**: bcrypt + JWT, custom middleware

### Recommended for PS92

| Option | Setup | Best For |
|---|---|---|
| **Firebase Auth** (RECOMMENDED) | Zero backend code, email/phone/Google | Hackathon |
| **No auth for demo** | localStorage | Fastest demo |
| **next-auth** | npm install, flexible providers | Production |

**Key lesson from DhanSetu2:** OTP integration broke repeatedly during demos. Skip OTP for hackathon, use simple mobile number login.

---

## COMPONENT 7: FORM / APPLICATION DATA

### What SIH projects did
- **PMSSS**: Full MongoDB schema (20+ fields: personal, address, education, bank, documents)
- **HaqSetu**: Document dependency graph ("unlock path" — which paper to get first)
- **DhanSetu2**: Account Aggregator consent checkbox gating submission

### NSFDC required documents
- Caste certificate
- Income proof
- KYC (Aadhaar)
- Project report
- Bank passbook
- Photo + signature

### Recommended approach

**react-hook-form + zod, multi-step:**

| Step | Fields | Validation |
|---|---|---|
| 1. Personal | Name, DOB, gender, caste cert, income | zod: string, date, file |
| 2. Address | State, district, block, pincode | zod: enum, string |
| 3. Project | Type (business/education), cost, activity | zod: enum, number, enum |
| 4. Education (if applicable) | Course, duration, fee, institution | zod: conditional |
| 5. Bank | Account, IFSC, bank name | zod: string patterns |
| 6. Documents | Upload caste cert, income proof, photo | zod: file |
| 7. Review | Summary + submit | — |

---

## RECOMMENDED STACK

```
Frontend:   Next.js 15 + TypeScript + Tailwind + shadcn/ui
Backend:    Node.js + Express + MongoDB (Mongoose)
Map:        Leaflet 1.9 + OpenStreetMap (free, no key)
Clustering: Leaflet.markercluster or PruneCluster
Geocoding:  Nominatim (reverse) + bharataddress (forward)
Directions: OSRM public API (free)
Recommender: Pure JSON rule engine + branching questionnaire
Calculator: Custom TS function (~30 lines, simple interest morat + quarterly)
NPA filter: Mongoose pre-save middleware + partner health score
Translation: Bhashini API (free govt infra) + next-intl
Voice:      Web Speech API (browser-native, free)
Auth:       Firebase Auth (zero setup) or skip for demo
Form:       react-hook-form + zod, multi-step
Data:       3 sample states (Rajasthan, Maharashtra, Tamil Nadu)
Partner data: Stub from PDFs or manually curated JSON
Performance data: Parse nsfdc.nic.in Excel files for real numbers
```

## WHAT TO SKIP
- LLM for recommender decisions (use for explanations only)
- Real NSFDC API (doesn't exist)
- Payment integration (out of scope)
- Biometric auth (out of scope)
- Native mobile app (PWA web is sufficient)
- OTP integration (breaks in demos — DhanSetu2 lesson)
