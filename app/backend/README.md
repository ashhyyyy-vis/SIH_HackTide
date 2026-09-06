# PS92 backend (`app/backend`)

Express + TypeScript. Serves the scheme catalogue, the partner locator, EMI
maths, and the Gemini-backed chat that powers the frontend's AI assistant.
No database — it reads two JSON files at startup.

> Note: the different `backend/` on the `final_sub` branch is a separate
> Express + PostgreSQL service (auth, Bhashini translation). The two are not
> interchangeable; this one is what `frontend/` currently talks to.

## Data files

`src/data/` holds two **symlinks** into `scraper/`, so the dataset is stored
once in the repo:

| link | target on this branch |
|---|---|
| `ps92_dataset.json` | `scraper/data/ps92_dataset.json` |
| `partner_locator_final.json` | `scraper/output/partner_locator.json` |

If you regenerate the locator with the scraper it writes
`partner_locator_final.json`; repoint the symlink there if so. The server
prints record counts on boot, so a broken link is obvious immediately.

## Configuration

Copy `.env.example` to `.env` and add a Google AI Studio key to enable chat:

```
GEMINI_API_KEY=<your key>          # https://aistudio.google.com/apikey
GEMINI_MODEL=gemini-3.6-flash
```

`.env` is git-ignored. The key is read only by `src/services/gemini.ts` and
never leaves the server — the frontend calls `/api/chat` and never sees it.
**Never copy it into a `VITE_*` variable**: Vite ships those to the browser.

Without a key the server still runs; `/api/chat` returns 503 and the frontend
falls back to the rule-based agent automatically.

## Run

```bash
cd app/backend
npm install
npx tsx src/server.ts     # http://localhost:3001
```

`npm run dev` also works on Linux, but its script calls `fuser`, which macOS
does not ship — use the `npx tsx` line there.

## Endpoints

```
GET  /api/health
GET  /api/states            states with own schemes + allStates (36 states & UTs)
GET  /api/schemes           national + state catalogue
GET  /api/schemes/:code     404 when unknown
POST /api/recommend         { state, projectCost, annualIncome, projectType }
POST /api/emi               { amount, rate, tenureYears, moratoriumMonths }
GET  /api/partners          ?state=&city=&partnerType=&limit=&offset=
GET  /api/partners/nearest  ?lat=&lng=&radiusKm=&limit=&state=
GET  /api/fund/:state
GET  /api/caste/:caste
POST /api/chat              { message, history[] } — Gemini, grounded (below)
GET  /api/chat/status       whether a key is configured
POST /api/ai/agent          { goal } — rule-based fallback for the chat
POST /api/ai/execute        { tool, input }
GET  /api/tools
```

## How the chat stays accurate

`/api/chat` does not hand the question straight to the model. For each message
`buildGrounding()` assembles the relevant facts from this dataset — the scheme
catalogue, the eligibility rules, and (when a state or amounts are detected)
the fund status, partner counts and a live `toolRecommend()` result. Those
facts go to Gemini with a system instruction to answer *only* from them.

That is why the model quotes real rates and ceilings, says "I don't have that
detail" for things the dataset does not contain (document checklists, for
example), and discloses that the NPA figures are simulated.

## Known limitations

- Per-branch NPA is **generated**, not sourced. Responses carry
  `npa_simulated: true` and the UI labels it. Do not present it as reported data.
- Several states are geocoded to a district centroid rather than each branch's
  true position, so per-branch distances are approximate there.
