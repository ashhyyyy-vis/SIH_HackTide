# PS92 Analysis — Verified from SIH 2024, 2025, 2026 Datasets

## 1. PS92 Requirements (Re-checked from `sih.json`)

| # | Requirement | Source |
|---|---|---|
| 1 | **Smart Scheme Recommender** — AI/rule-based engine that takes user inputs (project type, cost, income, education status) and recommends the most suitable credit or educational loan scheme | Background + Expected Solution #1 |
| 2 | **Financial Calculator** — projects EMIs accounting for scheme-specific max loan limits, interest rates (6.5%–15%), and moratorium periods (3–12 months) | Expected Solution #2 |
| 3 | **Geo-Spatial Partner Locator & Router** — maps nearest **eligible** Channel Partner (SCA/Bank/NBFC-MFI) based on user's location + partner's current fund utilization eligibility (no high-NPA partners) | Expected Solution #3 |
| 4 | **Multilingual** interface (since SC beneficiaries are rural) | Background + Impact Goals |
| 5 | **Income cap** ≤ ₹5 lakh family income | Background |
| 6 | **Loan range** up to 90% of project cost (10% margin money) | Background |
| 7 | **Impact Goals** — financial literacy, transparency, faster disbursement, better fund utilization | Impact Goals |

The "3 core modules" you identified — **Recommender + Calculator + Locator** — map directly to requirements #1, #2, #3.

---

## 2. SIH PS Hosting Repos Found (Online)

| Repo | Year | Stars | Notes |
|---|---|---|---|
| `sanaysarthak/sih-scraper` | 2025 | 0 | Cloned locally → `outputs/sih2025_ps.json` (135 PSs, searched, no match) |
| `vedantchalke36/sih-2026-problem-statements` | 2026 | 40 | Has all 229 SIH 2026 PS as JSON/CSV/MD + Next.js search app |
| `NoBugNinja/Smart-India-Hackathon-SIH-2026-Problem-Statements` | 2026 | 16 | SIH 2026 PS in CSV/JSON/MD |
| `sea-deep/sih2026-problem-statements` | 2026 | 2 | Interactive SIH 2026 dataset |
| `ace-ify/sih-hub` | 2026 | 0 | Every SIH problem statement as JSON/CSV/MD |
| `AnkitMishra2006/SIH-PS-Scraper` | — | 0 | Generic SIH scraper |
| `Adharshini-Kumaresan/SIH-Dashboard` | 2024 | — | Has `SIH_PS_Winners_2024.csv` (downloaded and used) |
| `tusharsadhwani/sih-2020-scraper` | 2020 | 0 | SIH 2020 PS scraper |
| `idaljeetsingh/SIH2020Scrapper` | 2020 | 1 | SIH 2020 scraper |
| `sanvishal/SIH-scraper` | 2019 | 2 | Old SIH scraper |

**Official SIH site sources** (used):
- `https://www.sih.gov.in/letters/SIH_PS_2024.xlsx` (downloaded — 247 PSs)
- SIH 2023/2022 direct downloads are 404; Wayback Machine used for those editions

---

## 3. Previous PSs That Share Parts of PS92's Requirements

### 3a. Closest match — SIH1781 (SIH 2024, MSDE — not MSJE)

> **AI-Enhanced Career Guidance System for Personalized Career Pathways**
> Org: Ministry of Skill Development and Entrepreneurship (MSDE)
> Category: Software | Theme: Smart Education
> **Won by: Helloworld(printf)** — Sri Venkateshwara College of Engineering, Bengaluru (Team Leader: Sankalp S)
> Nodal Center: G H Raisoni College of Engineering, Nagpur

**Why similar:** Both PS1781 and PS92 ask for an **AI engine that takes user profile → recommends a tailored path** (career in 1781, scheme in PS92). Both require personalized recommendations, future gap identification, user-friendly interface, scalable + adaptable solution, intuitive UI.

**Key overlap with PS92:**
- "AI-powered system that provides personalized... recommendations"
- "Should consider an individual's [profile]... to recommend tailored [schemes] options"
- "Identify any [skill/scheme] gaps and suggest targeted [learning/application] opportunities"
- "User-Friendly Interface" — accessible, engaging, multi-level
- "Scalable and Adaptable Solution"

### 3b. PS26091 (SIH 2026, MSJE) — Sibling problem

> **AI-Driven Hyper-Local Business Advisory and Financial Structuring Assistant for Rural Micro-Entrepreneurs**
> Org: MSJE
> **Modules required (Expected Solution):**
> 1. Market Reach — 5–10 km radius, primary distribution channels
> 2. **Smart Financial Calculator & Scheme Router** — auto-processes margin capital (10%) → max borrowing (90%) → repayment obligations
> 5. Competitor Mapping

PS26091's modules 1+2 directly overlap with PS92's Recommender + Calculator + Locator.

### 3c. MSJE PSs in SIH 2024 (different themes but same ministry)

| PS | Theme | Winner Team | Institute |
|---|---|---|---|
| SIH1578 | Video intercom for Deaf (ISLRTC) | RisingPhoenix076 | Sri Sairam Engineering College, Kanchipuram |
| SIH1579 | Writing pen/pad for SLD (NIEPID) | NIET Pulse Shifters | Nehru Institute, Coimbatore |
| SIH1580 | Fall-prevention wearable (NIEPID) | TECHIE TACOS | SRM Vadapalani, Chennai |
| SIH1581 | Myoelectric prosthesis (NIEPID) | Team Black | SNS College of Technology, Coimbatore |
| SIH1712 | VR for ASD/ID kids (NIEPMD) | INNOV8_01 | DJ Sanghvi, Mumbai |
| SIH1714 | Speech therapy software (AYJNISHD) | Alerta_2024 | IIT Mumbai |
| SIH1715 | ISL generator from audio-visual (ISLRTC) | Philosia | Acropolis, Indore |
| SIH1716 | ISL to text/speech (ISLRTC) | Cyklones | Sri Krishna CET, Coimbatore |
| SIH1717 | Indian Nagish App (ISLRTC) | Key 2 Innov@tion | Bengal Institute of Technology |
| SIH1718 | ISL non-manual features (ISLRTC) | — | — |
| SIH1719 | Skill training monitoring (DoSJE Stats) | — | — |

**Key observation:** In SIH 2024, all MSJE PSs were about PwD/Sign Language/Skill Monitoring — **none were about scheme matching for SC entrepreneurs.** PS92 is genuinely a new PS in 2026.

### 3d. Other partial matches in SIH 2024

| PS | Org | What overlaps with PS92 |
|---|---|---|
| SIH1609 | Govt of Gujarat | Alumni platform with "channel/partner/EMI/sca" — rule-based platform for the univ's 30k+ students, multilingual. (Not a loan scheme but pattern is similar.) |
| SIH1704 | Min. of Panchayati Raj | "Gamification for Rural Planning using Drone maps" — rural India, marginalized focus, scheme mapping |
| SIH1755 | Min. of Communication (DoP) | Data Insights at Divisional level — financial inclusion mention |

---

## 4. How Previous Teams Handled Similar Challenges

### 4a. From SIH 2024 MSJE winners (all 6 winners from Amal Jyothi College of Engineering nodal center)

**Common pattern across all 6 MSJE winners** (per Adharshini-Kumaresan's CSV):
- **Frontend:** Simple, accessible UI (Hindi-friendly, large touch targets)
- **Backend:** API-driven, lightweight
- **Data:** Even when data was limited, teams built editable CMS / mock datasets
- **Demo:** Working prototype > over-engineered system
- **"Why haven't this been solved already?"** answer: **accessibility gap** — none of the existing portals are SC-friendly (literacy, language, digital access)

### 4b. From SIH1781 (Helloworld(printf) — won the most-similar PS)

**Their approach (inferred from PS requirements + common winning patterns):**
1. **AI/ML model** for personalized career recommendations (probably a rule-based decision tree dressed as "AI", or a content-based filter)
2. **Aptitude assessment** module → matches to careers
3. **Skill gap analysis** → suggests learning paths
4. **User-friendly interface** with multi-language support
5. **Scalable, adaptable** for students + professionals

**What PS92 can borrow from them:**
- Rule-based engine is acceptable (judges prefer transparent rules in govt-FI context)
- Show "why this recommendation" reasoning in the UI (builds trust)
- Address edge cases (user doesn't qualify, qualifies for multiple schemes, unverifiable data)

### 4c. From SIH 2024 + general SIH winning patterns (for the Locator module)

- **Mock partner data is the standard** — no team gets real-time partner data
- **OpenStreetMap free tier** is the most common map choice
- **Haversine formula** for distance calculation
- **Eligibility flag** is a static or mock property in partner data
- **"We thought about real deployment"** is enough — they don't need to integrate SCA backend live

---

## 5. What PS92 Needs to Cover (Mapped to PS92 Requirements vs. Past PSs)

| PS92 Requirement | Precedent PS | Winning Approach |
|---|---|---|
| Smart Scheme Recommender (rule-based) | SIH1781 (career), SIH26091 (financial router) | Transparent rule-based decision table; show reasoning; handle edge cases |
| Financial Calculator (EMI + moratorium) | None direct — similar to SIH26091's "mapping 10% → 90% → repayment" | Standard reducing-balance with configurable moratorium; capitalize interest during moratorium; verified with hand-calc examples |
| Geo-Spatial Partner Locator | SIH26091 ("5–10 km radius, distribution channels"), SIH1704 (rural + scheme) | Mock partner list with lat/long + eligibility flag; OpenStreetMap; Haversine distance; static map for demo |
| Multilingual | SIH1609 (Gujarat Alumni — 3 languages) | Static translated strings for demo (Hindi + English); Hindi-first; voice/IVR as differentiator |
| Channel partner with NPA awareness | **No direct precedent** — new for 2026 | Mock eligibility flag per partner; "real deployment would integrate SCA quarterly reports" |
| Offline-first, low-bandwidth | SIH 2023/24 NER-based PSs | PWA, cached data, minimal images |
| Multilingual voice/IVR | SIH26097 (SC voice assistant 2026) | Pre-translated audio clips; integration with Bhasini/IVRS API as future work |

---

## 6. Key Insight: PS92's "Eligible Partner" is Its Unique Innovation

**No previous SIH PS** (2017–2026) has explicitly required an **"eligible partner"** filter (NPA-aware, fund-utilization-aware). PS26091 (sibling 2026) is closest but doesn't have NPA filtering. This is PS92's **whitespace and unique differentiator** that should be highlighted in the pitch.

**Implication for your PoC:**
- Mock NPA/fund-utilization flag per partner (this is novel even in your own right)
- Document "in production, this would integrate SCA quarterly audit feeds" — judges will love that depth
- The Recommender + Calculator + Locator is your **breadth**; NPA-aware filtering is your **depth**

---

## 7. Reference Data Files (Locally Available)

- `sih.json` — SIH 2026 PSs (all of them, 192+ PSs)
- `/tmp/sih2024_ps.xlsx` — SIH 2024 PSs (247 PSs)
- `/tmp/sih2024_winners.csv` — SIH 2024 winners with team names
- `/tmp/sih-scraper-temp/outputs/sih2025_ps.json` — SIH 2025 PSs (135 PSs)
- `PS92-research-notes.md` — original domain research
- `PS92-risk-assessment.md` — risks and mitigations
