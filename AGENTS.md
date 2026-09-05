# AGENTS.md

## Context

PS92 (SIH26092) — "AI-Driven Scheme Matching for Marginalized Entrepreneurs", Ministry of Social Justice & Empowerment. **Deadline: 20 Sept 2026.**

The platform helps SC entrepreneurs (family income ≤ ₹5L) do three things:
1. **Find the right scheme** — Smart Scheme Recommender: rule/AI engine takes project type, cost, income, education → recommends scheme (Micro Finance ≤ ₹1.4L, Term Loan ≤ ₹50L, Educational Loan).
2. **See exactly what they'll pay** — Financial Calculator: EMI projection with scheme max limits, rates (6.5%–15%), moratorium (3–12 months).
3. **Get to a partner who can actually disburse** — Geo-Spatial Partner Locator & Router: nearest eligible channel partner (SCA/PSB/RRB/NBFC-MFI, 90 partners), filtered by current fund utilization + NPA health.

### Multilingual (PS requires "multi-lingual" — NOT just two languages)

- **Dynamic (MyMemory API, free, no key):** translate UI + scheme content on demand into Hindi + 7 regional languages. Bhashini API (MeitY, free govt infra) as fallback for 22 official Indian languages.
- **Static (hardcoded EN/HI):** core UI strings in source code.
- **Voice (Web Speech API, browser-native, free):** speech input for low-literacy users.

## Tech Stack

- **Backend:** Node.js + Express + TypeScript (tsx watch for dev)
- **Frontend:** React 18 + Vite + TypeScript (Leaflet for maps, Web Speech API for voice)
- **Data:** Local JSON files (no DB — in-memory at runtime)
- **i18n:** MyMemory API (free, no key) + Bhashini fallback
- **Map:** Leaflet + OpenStreetMap (free tiles, no key)

## Project Structure

```
app/
  backend/              ← Express API server
    src/
      server.ts         ← Main entry, all routes
      tools.ts          ← 12 AI tools (recommend, emi, partners, translate, etc.)
      data.ts           ← Loads datasets at startup
      cli.ts            ← CLI demo script
      data/             ← Symlinks to scraper output
        ps92_dataset.json
        partner_locator_final.json
    package.json
  frontend/             ← React + Vite app
    src/
      App.tsx           ← Shell: header, nav, voice, language switch
      i18n.tsx          ← Static EN/HI strings + on-demand regional translation
      api.ts            ← Typed client for the backend API
      types.ts          ← Shared API types
      pages/
        Home.tsx        ← Landing
        Chat.tsx        ← AI Assistant (conversational agent + voice + chips)
        Recommender.tsx ← Scheme Finder (rule-based, voice-query aware)
        Calculator.tsx  ← EMI + amortization
        Locator.tsx     ← Leaflet partner map + NPA health
        Schemes.tsx     ← All national + state schemes
      components/
        VoiceButton.tsx ← Web Speech API input
    package.json
```

## Backend API (port 3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/tools` | List all 12 AI tools |
| POST | `/api/ai/execute` | Call single tool |
| POST | `/api/ai/agent` | Multi-tool agent (parses goal, calls multiple tools) |
| POST | `/api/recommend` | Scheme recommender (rule-based; ELS-aware, income/cost bands, state schemes) |
| POST | `/api/emi` | EMI calculator with moratorium (simple-interest accrual + quarterly amortization) |
| GET | `/api/partners?health=true` | Filter partners by state/city/type (+ deterministic NPA-health enrichment) |
| GET | `/api/partners/nearest?eligibleOnly=true` | Nearest partners by lat/lng (health-sorted; CRITICAL NPA hidden when eligibleOnly) |
| GET | `/api/schemes` | All national + state schemes |
| GET | `/api/schemes/:code` | Scheme details |
| GET | `/api/states` | States with schemes |
| GET | `/api/caste/:caste` | Verify SC caste |
| GET | `/api/fund/:state` | Fund utilization by state |
| POST | `/api/translate` | Translate text (MyMemory/Bhashini) |
| GET | `/api/graph/schemes` | Scheme graph (nodes + edges) |

## Data Files

- `scraper/data/ps92_dataset.json` — 7 schemes, 14 state schemes (11 states), 90 partners, fund availability (33 states), SC caste index (11 states, 1007 entries). **Rebuild:** `node build_dataset.js && node build_fund_availability.js && node add_sc_caste_list.js`
- `scraper/output/partner_locator_final.json` (30MB) — 80,498 branches (SCA + PSB + RRB + SFB + NBFC-MFI + Other), each with lat/lng. **Rebuild:** `node build_locator_dataset.js`
- `scraper/output/partner_locator_enriched.json` (163MB) — full metadata. **Never commit.** Shared via GitHub Release on ashhyyyy-vis/SIH_HackTide (tag `locator-v1.0`).

## Commands

```bash
# Backend
cd app/backend
npm install
npm run dev        # http://localhost:3001
npm run cli        # node src/cli.ts (run demos)

# Frontend (production build)
cd app/frontend
npm install
npm run dev        # http://localhost:5173 (proxies /api → :3001)
npm run build      # typecheck + production bundle to dist/
```

> Both dev servers must run for the app to work: backend on :3001, frontend on :5173.

## Dataset Rebuild

After editing scraper scripts:
```bash
cd scraper
node build_dataset.js           # schemes + partners
node build_fund_availability.js # adds fund_availability + state_scheme_availability
node add_sc_caste_list.js      # adds sc_caste_index
node build_locator_dataset.js   # builds locator JSON
```

## Hard Rules

- Never commit `partner_locator_enriched.json` or any file > 30MB.
- Never hand-edit JSON datasets — change the builder script and rebuild.
- Scheme names and rates use `rate_beneficiary` and `max_loan_amount` fields.
- `null` income_limit = no income cap (treat as Infinity in rule engine).
- Keep this file updated when conventions change.
