PS92 GITHUB RESEARCH - FULL REPORT
========================================

WHAT PS92 ASKS FOR (3 MODULES)

1. SMART SCHEME RECOMMENDER

   Inputs: state, project type, cost, income, education status
   Output: which scheme + why

   Note: "education status" is a routing input, not context. PS92 lists three scheme
   types including Educational Loan Scheme. Education status determines which branch
   of the recommender runs.

   Parameters change by state:
   - Each state has its own SCA (DSCSC Delhi, MPSCSC Maharashtra, KSCSC Karnataka, etc.)
   - Interest rates: typically 6.5-8% but up to 15% depending on partner and scheme
   - Loan caps and moratorium periods (3-12 months) vary by state and partner
   - Rs 1.40L and Rs 50L figures are reference ranges - actual caps differ per SCA
   - Channel Partners (Banks, NBFC-MFIs) may add their own margin on top
   - PSBs and RRBs have national/regional presence; SCAs are state-bound

   The recommender must look up the user's state first, then apply that state's
   SCA rules and partner-specific rates.


2. FINANCIAL CALCULATOR

   Inputs: state, scheme, loan amount, rate, tenure, moratorium
   Output: repayment schedule (quarterly)

   State dependency: same loan amount produces different EMIs depending on which
   state's SCA processes it, which channel partner is involved, the actual rate
   (6.5% to 15%), and the actual moratorium period (3 to 12 months).

   REPAYMENT IS QUARTERLY, NOT MONTHLY. PS26091 explicitly says "quarterly
   repayment schedule."
   - Micro Finance (3 years): 12 quarters
   - Term Loan (7 years): 28 quarters

   Moratorium: during grace period, either no payment or interest-only payment.
   After moratorium ends, quarterly installments start.


3. GEO-SPATIAL PARTNER LOCATOR AND ROUTER

   Inputs: state, user location
   Output: nearest eligible partner + turn-by-turn directions

   "Locator and Router" means: find the nearest eligible partner AND provide
   turn-by-turn directions to them.

   Process:
   - First identify the user's state (from input or geolocation)
   - Then only show partners active in that state
   - Then filter by whether the partner has funds available (not exhausted,
     no high NPAs)
   - Then rank by distance
   - Then provide routing (directions) to the selected partner

   The 100+ channel partners are not uniformly distributed - some states have
   many, some have few. This is why the locator matters.

Target users: SC entrepreneurs with family income <= Rs 5L. The certificate/caste
aspect is background context - the actual product challenge is making this
accessible and fast on low-end devices with multi-lingual support.


WHAT WE NEED TO BUILD

State is a required first input for all three modules - not optional.

   MODULE               INPUTS                        OUTPUT
   -------------------  ----------------------------  ---------------------------
   Scheme Recommender   state, project type, cost,    Which scheme + why
                        income, education status

   Financial Calculator state, scheme, loan amount,   Repayment schedule
                        rate, tenure, moratorium      (quarterly)

   Partner Locator      state, user location          Nearest eligible partner
   and Router                                               + directions


PRECEDENTS WE CAN LEARN FROM

----------------------------------------
SIH1781 - Career Guidance (MSDE, SIH 2024)
----------------------------------------

Winner: Helloworld(printf) from Sri Venkateshwara College, Bengaluru.

What it was: AI system that took student profile, recommended career paths,
showed skill gaps and courses to bridge them.

Their approach:
  - Used Genkit (Google's LLM framework) with two flows:
    1. analyze-student-profile.ts - takes resume + academics + interests,
       returns career recommendations
    2. generate-skill-gap-report.ts - takes recommendations + profile,
       returns skill gaps + course links with URLs
  - Both flows use Zod to validate inputs before they hit the LLM
  - LLM prompt tells it exactly what format to output
  - Output schema intentionally left flexible (removed output schema) so LLM
    returns free-form JSON

Why it matters for us:
  Profile -> recommendation -> explanation pattern maps directly to PS92:
  user profile -> scheme recommendation -> "why you got this scheme / what
  you need to fix." No ML models - just structured prompts + LLM. Judges in
  govt fintech prefer this because it's auditable.

Code: src/ai/flows/analyze-student-profile.ts
Repo: https://github.com/yogendra-08/Pathfinder-AI-sih1781

Feasibility: High. Replace career-paths data with scheme data, swap prompts.
Genkit + Zod + input validation pattern is proven.


----------------------------------------
SIH1702 - Bail Reckoner (Min. of Law, SIH 2024)
----------------------------------------

Winner: Syntax Sentries from RMK College of Engineering.

What we can use from it:

  1. Translation for multi-lingual support
     - Translate.jsx uses MyMemory translation API - free, no API key needed
     - Works for Hindi, Bengali, Telugu, Tamil, Gujarati, Kannada,
       Marathi, Punjabi
     - One fetch call, zero setup

     Example code:
       const apiUrl = "https://api.mymemory.translated.net/get?q=" + text
         + "&langpair=en|hi";
       fetch(apiUrl).then(res => res.json()).then(data => {
         setTranslatedText(data.responseData.translatedText);
       });

  2. Chatbot for explaining eligibility
     - AiChatBot.jsx uses @chatscope/chat-ui-kit-react
       (ready-made chatbot UI component)
     - Connected to Gemini backend
     - System prompt tells bot to explain things simply

     For PS92: chat interface explaining why user qualifies/does not qualify
     for a scheme, in simple Hindi or regional language. Low literacy users
     can listen rather than read.

Code locations:
  - Translate.jsx: https://github.com/devaganesh-vatturi/Bail-Reckoner-SIH-2024-Frontend
  - AiChatBot.jsx: same repo
  - Backend: https://github.com/devaganesh-vatturi/Bail-Reckoner-SIH-2024-Backend

Feasibility: High. MyMemory is zero-config. Chatbot UI is a drop-in component.


----------------------------------------
SIH1728 - PMSSS Scholarship Disbursement (AICTE, SIH 2024)
----------------------------------------

Winner: Byte Overload from NIT Durgapur.

What we can use from it:

  Their MongoDB schema for scholarship application has the same field TYPES as
  a loan application would need:
    - Total_income_of_family
    - Caste (caste certificate)
    - Name_of_Bank, IFSC_Code, A_C_No
    - Guardian_Occupation
    - PIN_Code (for geo-mapping)
    - Document uploads: income certificate, domicile, aadhaar, marksheets

  These field types (income proof, identity, bank account, address) map to
  what a channel partner needs to process a loan. Not identical to scholarship
  DBT, but structurally the same set of proofs. Good reference for form design,
  not a copy-paste.

  Their frontend structure is also useful - separate routes for /apply, /login,
  /profile, /dashboard. A loan application flow would follow the same pattern.

Code: https://github.com/sudo-parnab/PMSSS_SIH2024
  Backend/models/application.js
  application/src/components/

Feasibility: High. Form flow pattern directly reusable.


----------------------------------------
SIH1753 - Road Transport Telematics (Min. of Comm., SIH 2024)
----------------------------------------

Winner: ABHYUDAY from Vishwakarma Institute, Pune.

What it was: GPS + GIS system for trucking routes with 3PL partner management.

What we can use from it:
  - Only SIH project with actual partner management + location tracking
  - Django models cover:
      - 3PL partner requests and approvals
      - Route assignment to partners
      - Geofencing (checking if driver/truck is within designated zone)
      - Checkpoint management along routes
  - For PS92 partner locator:
      - Geofencing -> district-level service area check
      - Partner approval flow (3PL requests) -> loan application routing
  - Django admin interface -> model for admin side (scheme managers need to
    see which partners are active, NPA status, etc.)

Code: https://github.com/Kalparatna/SIH-2024_PS1753
  transport_telemetry/admin_portal/models.py

Feasibility: Medium. Django solid for backend. Geofencing and partner management
logic directly applicable, just needs district-level instead of GPS-level.


----------------------------------------
PS26091 - Hyper-Local Business Advisory (MSJE, SIH 2026)
----------------------------------------

Sibling problem from same ministry, same day. Expected Solution section describes
the scheme logic we need.

Financial Structuring Logic (working assumptions):
  Available Margin / 10% = Total Project Cost
  Total Project Cost x 90% = Max Loan Eligibility

  Logic A: Project Cost <= Rs 1.40L -> Micro Finance
           (6.5%, 3yr, 3mo moratorium)
  Logic B: Project Cost > Rs 1.40L && <= Rs 50L -> Term Loan
           (8%, 7yr, 6mo moratorium)

REPAYMENT IS QUARTERLY, NOT MONTHLY:
  - PS26091 explicitly says "quarterly repayment schedule"
  - Micro Finance (3 years): n=12 quarters, not 36 months
  - Term Loan (7 years): n=28 quarters
  - EMI formula: EMI = P x r x (1+r)^n / ((1+r)^n - 1)
    where P = principal, r = quarterly rate, n = quarters
  - During moratorium: either no payment or interest-only payment
  - After moratorium ends, quarterly installments start

What it does not have: Partner locator with NPA awareness. That is PS92's
unique addition.

Important caveat: Loan caps, interest rates, and moratorium periods in PS26091
are reference ranges from the same ministry - not fixed national constants.
Actual parameters depend on the state SCA and channel partner. Treat PS26091's
numbers as working assumptions for the demo, not gospel.

Feasibility: Scheme logic fully specified. We do not need to invent it.


WHAT HAS NO PRECEDENT (OUR INNOVATION SPACE)

----------------------------------------
NPA-Aware Partner Filter
----------------------------------------

No SIH project has attempted to filter partners based on their fund utilization
or NPA status. This is genuinely new territory.

NPA stands for Non-Performing Asset - a loan where the borrower has stopped
paying. When a channel partner has too many NPAs, they cannot take on new loans
because their books are already stressed.

PS92 exact words: "ensuring applications aren't sent to partners with high NPAs
or overdues."

The NPA filter works like this: before showing a channel partner to a user,
check if that partner is in good standing - not overloaded with bad loans.
If a partner has high NPAs, they are filtered out and do not appear in results.

For the demo:
  - Mock data: give each partner a fund_status (available/low/exhausted) and
    npa_status (low/medium/high) field
  - Partners with "high" NPAs do not appear in locator results

In production:
  - Would need an API from NSFDC/SCAs to get quarterly NPA reports
  - That data is not public, which is why it is a gap

This is actually a strength - judges like seeing honest acknowledgment of what
the real-world constraint would be.


HONEST FEASIBILITY ASSESSMENT

  COMPONENT                COMPLEXITY   RISK                          VERDICT
  -----------------------  -----------  ----------------------------  ------------------
  Scheme Recommender       Low          State params lookup; 3        Doable, state
  (rule-based)                              scheme types not 2          lookup day-1
  -----------------------  -----------  ----------------------------  ------------------
  Scheme Recommender       Medium       LLM cost/uptime               Optional
  (LLM explainer)                                                        polish
  -----------------------  -----------  ----------------------------  ------------------
  EMI Calculator           Low          Quarterly math;               Doable once
                              parameterized by state+partner        params external
  -----------------------  -----------  ----------------------------  ------------------
  Partner Locator          Medium       Map API; must filter          OpenStreetMap
  (map + distance)                          by state first                 + Haversine
  -----------------------  -----------  ----------------------------  ------------------
  Partner Routing          Medium       OpenRouteService or           Separate from
  (directions)                              similar for turn-by-turn       locator
  -----------------------  -----------  ----------------------------  ------------------
  NPA Filter               Medium       Mock data only                Fine for demo
  -----------------------  -----------  ----------------------------  ------------------
  Multi-lingual            Low          Quality varies                Good for demo
  (MyMemory)
  -----------------------  -----------  ----------------------------  ------------------
  Low-end device           Medium       Not explicit in PS92,         Keep bundle
  optimization                                implied by rural context   small
  -----------------------  -----------  ----------------------------  ------------------

BIGGEST GAP: No public dataset of which SCA uses which rates, caps, and
moratoriums. This is the first thing to solve - without it, the recommender
is guessing.

MISSING FROM PS92 BUT NEEDED: Educational Loan Scheme branch in the recommender.
PS92 lists it alongside Micro Finance and Term Loan, but PS26091 (our main
reference) does not specify its parameters. We need to find NSFDC's education
loan scheme details separately.

RECOMMENDED DEMO APPROACH:
  1. Pick 2-3 sample states (e.g., Rajasthan, Maharashtra, Tamil Nadu)
     with publicly available SCA rate cards
  2. Build the state-first architecture from day 1 - user selects state first,
     everything else follows
  3. Build the partner locator with mock data for those states
  4. Rule engine picks scheme based on state-specific params, not hardcoded
     national defaults
