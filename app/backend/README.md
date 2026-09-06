# PS92 backend (`app/backend`)

Express + TypeScript. Serves the scheme catalogue, the partner locator,
EMI maths and the rule-based agent that powers the frontend's AI chat.
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
| `partner_locator_final.json` | `scraper/output/partner_locator.json` (80,498 branches) |

If you regenerate the locator with the scraper it writes
`partner_locator_final.json`; repoint the symlink at that file if so.
The server prints the record counts on boot, so a broken link is obvious
immediately.

## Run

```bash
cd app/backend
npm install
npx tsx src/server.ts     # http://localhost:3001
```

`npm run dev` also works on Linux, but its script calls `fuser`, which macOS
does not ship — use the `npx tsx` line above there.

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
POST /api/ai/agent          { goal } — used by the frontend chat widget
POST /api/ai/execute        { tool, input }
GET  /api/tools
```

## Known limitations

- Per-branch NPA is **generated**, not sourced. Responses carry
  `npa_simulated: true` and the UI labels it. Do not present it as reported data.
- Several states are geocoded to a district centroid rather than each branch's
  true position, so per-branch distances are approximate there.
