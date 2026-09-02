# PS92 GitHub Research — Short Notes

---

## What PS92 Asks For (3 modules)

| Module | Inputs | Output |
|---|---|---|
| **Scheme Recommender** | state, project type, cost, income, education | Which scheme + why |
| **Financial Calculator** | state, scheme, loan amount, rate, tenure, moratorium | Repayment schedule (quarterly) |
| **Partner Locator & Router** | state, user location | Nearest eligible partner + directions |

**Key constraints:**
- Interest rates: 6.5–15% (varies by state SCA + partner)
- Loan caps & moratorium: vary by state (3–12 months)
- Repayment is **quarterly**, not monthly (per PS26091)
- SCAs are state-bound; PSBs/RRBs have national presence
- Education status routes to 3 branches: Micro Finance, Term Loan, Educational Loan

---

## Reusable Precedents

| Repo | Stars | What's Reusable |
|---|---|---|
| `yogendra-08/Pathfinder-AI-sih1781` | 5 | Genkit + Zod recommender pattern (profile → recommendation → explanation) |
| `devaganesh-vatturi/Bail-Reckoner-SIH-2024` | 0 | MyMemory free translation API (Hindi + 7 regional, no key); `@chatscope/chat-ui-kit-react` chatbot |
| `sudo-parnab/PMSSS_SIH2024` | 1 | Form field types: income, caste cert, bank/IFSC, docs — reference for loan app form |
| `Kalparatna/SIH-2024_PS1753` | 0 | Django 3PL partner models + geofencing → district-level service area check |
| `vedantchalke36/sih-2026-problem-statements` | 40 | Fuse.js fuzzy search + shadcn/ui + next-intl (i18n) stack |

---

## Scheme Logic (from sibling PS26091)

```
Margin / 10% = Project Cost
Project Cost × 90% = Max Loan

Project Cost ≤ ₹1.40L → Micro Finance (6.5%, 3yr, 3mo moratorium)
Project Cost > ₹1.40L && ≤ ₹50L → Term Loan (8%, 7yr, 6mo moratorium)
```
**Treat as working assumptions — state SCAs may differ.** Quarterly installments: Micro = 12 quarters, Term = 28 quarters.

---

## Novelty: NPA-Aware Partner Filter

No SIH project has this. Filter partners by:
- `fund_status`: available / low / exhausted
- `npa_status`: low / medium / high (filter out "high")

For demo: mock data. For production: needs NSFDC/SCA quarterly NPA API (doesn't exist publicly).

---

## Feasibility Summary

| Component | Day-1 Work Needed | Verdict |
|---|---|---|
| Recommender (rule) | State params lookup + 3 scheme branches | Doable |
| EMI Calculator | Quarterly math + state params | Doable |
| Locator + Router | State filter + Haversine + OpenRouteService | Doable |
| NPA Filter | Mock data only | Fine for demo |
| Multi-lingual | MyMemory API (free, zero config) | Drop-in |
| Educational Loan params | PS92 lists it, PS26091 doesn't specify | Find on NSFDC site |

**Biggest gap:** No public dataset of which SCA uses which rates/caps/moratoriums. Fix: hardcode 2–3 sample states with real SCA rate cards from their websites./train ur self
