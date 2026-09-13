# YojanaMitra

Helps Scheduled Caste applicants find NSFDC / state concessional loan schemes,
see their quarterly repayment, and reach an eligible channel partner — in eight
Indian languages, with an AI assistant and mobile + OTP sign-in.

## Layout

| Path | What it is | Port |
|---|---|---|
| `frontend/` | React + Vite web app | 5173 |
| `app/backend/` | Data + AI API: schemes, recommender, EMI, partner locator, Gemini chat. No database — reads two JSON files. | 3001 |
| `backend/` | Auth API: mobile + OTP sign-in (JWT), Bhashini translation. Needs PostgreSQL. | 5001 |
| `database/schema/` | SQL for the auth backend (`users` is required for sign-in) | — |
| `scraper/` | The datasets the data API serves, and the locator build script | — |

The frontend never calls a backend by URL. Vite proxies `/api` → `:3001` and
`/auth-api` → `:5001`, so the browser only ever talks to the origin it loaded
from. That is also what makes it work over a dev tunnel.

## Prerequisites

- Node.js 20+
- PostgreSQL (only for sign-in)

## One-time setup

**1. Secrets.** Copy each example and fill it in. `.env` files are git-ignored.

```bash
cp app/backend/.env.example app/backend/.env   # add GEMINI_API_KEY
cp backend/.env.example backend/.env           # DB_* and a real JWT_SECRET
```

Never put a key in `frontend/.env` — Vite ships every `VITE_*` variable to the browser.

**2. Database** (for sign-in):

```bash
createdb sih_hackathon
psql -d sih_hackathon -f database/schema/users.sql
psql -d sih_hackathon -f database/schema/schemes.sql
```

**3. Install:**

```bash
(cd app/backend && npm install) && (cd backend && npm install) && (cd frontend && npm install)
```

## Run

One command:

```bash
./start.sh          # ./start.sh stop to shut down
```

Or three terminals, backends first:

```bash
cd app/backend && npm run dev     # :3001
cd backend && npm run dev         # :5001
cd frontend && npm run dev        # :5173
```

Open http://localhost:5173.

### Showing it over a tunnel

Use the production build. The dev server serves ~100 separate modules and a
dev tunnel drops enough of them that the page stays blank.

```bash
cd frontend && npm run build && npx vite preview --port 5174
```

Rebuild after any code change — preview serves a snapshot.

## Behaviour to know before a demo

- **OTP is not sent by SMS.** No gateway is wired up. While `NODE_ENV=development`
  the auth API returns the code in its response and the sign-in dialog shows it,
  labelled as development mode. In production it returns nothing, so a real SMS
  provider (and DLT registration) is required before sign-in can work there.
- **Sign-in is optional.** Nothing in the journey is gated behind it.
- **Chat needs `GEMINI_API_KEY`.** Without it, or when Google rate-limits (the
  free tier is small), chat falls back to the rule-based agent automatically.
- **Per-branch NPA figures are simulated**, not sourced, and labelled as such.
- **Map pins are approximate.** Many branches are geocoded to a district or state
  centroid. `scraper/build_partner_locator.js` carries an expanded centroid table;
  regenerating the locator with it raises district-level placement from ~18% to ~59%.

## Troubleshooting

| Symptom | Cause |
|---|---|
| 11 states instead of 36, or chat "took too long" | `app/backend` is not running |
| Sign-in: "Something went wrong" | `backend` is not running, or PostgreSQL is down |
| `vite: command not found` | `npm install` in `frontend/` |
| Blank page over a tunnel | use `build` + `preview`, not `dev` |
| Port in use | `lsof -ti:3001 \| xargs kill -9` (swap the port) |
