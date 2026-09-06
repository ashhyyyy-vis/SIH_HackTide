/* ============================================================
   Central API client. This is the ONLY file that knows a backend
   URL — components import functions from here, never fetch directly.

   Two backends run side by side:

     DATA_API  app/backend            :3001  schemes, partners, EMI,
                                             fund status, /ai/agent
     AUTH_API  SIH_HackTide/backend   :5001  JWT auth, Bhashini translate

   Both base URLs come from .env (VITE_API_BASE_URL /
   VITE_AUTH_API_BASE_URL). If a variable is unset the path stays
   relative ("/api"), which the Vite dev proxy forwards to :3001 —
   so the app still runs with no .env at all.
   ============================================================ */

const trim = (u) => (u ?? "").replace(/\/+$/, "");

/* Default to SAME-ORIGIN relative paths, which the Vite proxy forwards to
   :3001 and :5001. This is deliberate: an absolute http://localhost:3001
   baked into the bundle breaks the moment the page is served from anything
   other than your own machine (a dev tunnel, a phone on the LAN), because
   "localhost" then means the viewer's device and an HTTPS page may not call
   HTTP. Set the env vars only for a genuinely different public origin. */
const dataBase = trim(import.meta.env.VITE_API_BASE_URL);
const authBase = trim(import.meta.env.VITE_AUTH_API_BASE_URL);

const DATA_API = dataBase ? `${dataBase}/api` : "/api";
const AUTH_API = authBase ? `${authBase}/api` : "/auth-api";

/* Data calls are local and quick. A chat call goes out to Gemini and back —
   noticeably slower, and slower again over a dev tunnel — so it gets its own,
   longer budget. 20s was cutting off answers that were still on their way. */
const TIMEOUT_MS = 20000;
const CHAT_TIMEOUT_MS = 60000;

class ApiError extends Error {
  constructor(status, statusText, path) {
    super(`${status} ${statusText} — ${path}`);
    this.name = "ApiError";
    this.status = status;
  }
}

/** fetch + timeout + JSON parsing, shared by every call below. */
async function request(base, path, { method = "GET", body, token, signal, timeoutMs } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs ?? TIMEOUT_MS);
  // let a caller-supplied signal (e.g. component unmount) also abort us
  if (signal) signal.addEventListener("abort", () => controller.abort(), { once: true });

  try {
    const r = await fetch(`${base}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        // JWT from the auth backend, when the caller has one
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!r.ok) throw new ApiError(r.status, r.statusText, path);
    return await r.json();
  } catch (e) {
    if (e.name === "AbortError") throw new ApiError(408, "Request timed out", path);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

const get = (path, opts) => request(DATA_API, path, opts);
const post = (path, body, opts) => request(DATA_API, path, { ...opts, method: "POST", body });

const qs = (params) =>
  new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ).toString();

/* ---------------- raw routes ---------------- */
export const api = {
  health: () => get("/health"),
  states: () => get("/states"),
  schemes: () => get("/schemes"),
  schemeDetails: (code) => get(`/schemes/${encodeURIComponent(code)}`),
  recommend: (input) => post("/recommend", input),
  emi: (input) => post("/emi", input),
  partners: (params) => get(`/partners?${qs(params)}`),
  nearest: (params) => get(`/partners/nearest?${qs(params)}`),
  fund: (state) => get(`/fund/${encodeURIComponent(state)}`),
  caste: (caste) => get(`/caste/${encodeURIComponent(caste)}`),
  agent: (goal) => post("/ai/agent", { goal }),
};

/* ---------------- SIH_HackTide backend (:5001) ----------------
   Auth + translation live on the second backend. Kept in this same
   client so components never construct a URL themselves.
   The JWT is passed in by the caller; this module stores nothing. */
export const authApi = {
  sendOtp: (phone_number) => request(AUTH_API, "/auth/send-otp", { method: "POST", body: { phone_number } }),
  verifyOtp: (phone_number, otp) => request(AUTH_API, "/auth/verify-otp", { method: "POST", body: { phone_number, otp } }),
  me: (token) => request(AUTH_API, "/auth/me", { token }),
  translate: (text, targetLanguage, sourceLanguage = "en") =>
    request(AUTH_API, "/translate", { method: "POST", body: { text, targetLanguage, sourceLanguage } }),
};

/* ---------------- AI chat ----------------
   REUSES the existing POST /api/ai/agent on app/backend. That route
   parses a plain-language goal, then runs the recommend / nearestPartners
   / fundAvailability tools and returns their real results. There is no
   LLM and no mock: askAgent() formats genuine backend output into a
   readable reply. (SIH_HackTide has no chat endpoint at all.) */
const inrShort = (n) => "₹" + Number(n).toLocaleString("en-IN");

/** Turn the agent's structured tool output into chat-ready text. */
export function formatAgentReply(res) {
  const byTool = Object.fromEntries((res.results ?? []).map((r) => [r.tool, r.result]));
  const lines = [];

  const recs = byTool.recommend?.recommendations ?? [];
  if (recs.length) {
    const top = recs[0];
    lines.push(
      `Based on ${res.state ?? "your state"}, a project cost of ${inrShort(res.parsedCost)} and a family income of ${inrShort(res.parsedIncome)}, the closest match is **${top.name}** (${top.code}).`
    );
    lines.push(
      `It can finance up to ${inrShort(top.maxLoan)} at ${top.rate}% per year over ${top.tenureYears} years — about ${inrShort(top.quarterly)} per quarter, after a ${top.moratoriumMonths}-month moratorium.`
    );
    if (recs.length > 1) {
      lines.push(`Other options: ${recs.slice(1, 4).map((r) => `${r.name} (${r.code})`).join(", ")}.`);
    }
  } else {
    lines.push(
      "I could not match a scheme to that. Try including the state, roughly what the project will cost, and your yearly family income — for example: \"a tailoring shop in Karnataka, cost 2 lakh, income 1.5 lakh\"."
    );
  }

  const near = byTool.nearestPartners?.branches ?? [];
  if (near.length) {
    const p = near[0];
    lines.push(`Nearest eligible partner: ${p.partnerName}${p.branchName ? ` — ${p.branchName}` : ""}, about ${p.distance_km} km away.`);
  }

  const fund = byTool.fundAvailability;
  if (fund?.label) lines.push(`State fund status: ${fund.label}.`);

  return lines.join("\n\n");
}

/* Conversational chat. POST /api/chat runs Gemini on the server, grounded in
   the same dataset the rest of the API serves — the key stays server-side and
   never reaches this bundle. If the server has no key configured it answers
   503, and we fall back to the rule-based agent so the widget still works. */
let chatAvailable = null; // null = not yet checked

export async function chatStatus() {
  if (chatAvailable !== null) return chatAvailable;
  try {
    const r = await get("/chat/status");
    chatAvailable = r.configured === true;
  } catch {
    chatAvailable = false;
  }
  return chatAvailable;
}

/**
 * Ask a question. Prefers the LLM endpoint; degrades to the rule-based agent
 * when the server has no key or the chat service errors.
 * `history` is [{ role: 'user'|'model', text }] from earlier in the session.
 */
export async function askAI(message, { history = [], signal } = {}) {
  if (await chatStatus()) {
    try {
      const r = await post("/chat", { message, history }, { signal, timeoutMs: CHAT_TIMEOUT_MS });
      const rec = r.recommendation;
      return {
        text: r.reply,
        source: "gemini",
        state: r.state ?? null,
        calc: rec
          ? {
              scheme: rec.name, code: rec.code,
              amount: Math.round(rec.maxLoan), rate: rec.rate,
              tenure: rec.tenureYears,
              mor: Math.round((rec.moratoriumMonths ?? 0) / 3),
            }
          : null,
      };
    } catch (e) {
      if (e?.status === 503) chatAvailable = false;   // no key: stop retrying
      else if (e?.name === "AbortError" || e?.status === 408) throw e;
      /* 429 means the provider's rate limit (the free tier allows only ~20
         requests a minute). Everything else is a transient provider failure.
         In both cases fall through to the rule-based agent so the user still
         gets a real, dataset-backed answer instead of an error bubble. */
    }
  }
  const a = await askAgent(message, { signal });
  return { ...a, source: "agent" };
}

/**
 * Ask the agent a question. Returns { text, raw } so the UI can render
 * the sentence while keeping the structured data for future use.
 */
export async function askAgent(goal, { signal } = {}) {
  const raw = await post("/ai/agent", { goal }, { signal });
  const byTool = Object.fromEntries((raw.results ?? []).map((r) => [r.tool, r.result]));
  const top = byTool.recommend?.recommendations?.[0];

  /* Hand the UI everything it needs to turn the answer into navigation:
     prefill the repayment calculator, or jump to partners in that state.
     All of it comes from the agent's own response — nothing invented. */
  return {
    text: formatAgentReply(raw),
    raw,
    state: raw.state ?? null,
    calc: top
      ? {
          scheme: top.name,
          code: top.code,
          amount: Math.round(top.maxLoan),
          rate: top.rate,
          tenure: top.tenureYears,
          mor: Math.round((top.moratoriumMonths ?? 0) / 3), // API months -> UI quarters
        }
      : null,
  };
}

/* ---------------- contract adapters ----------------

   CONTRACT NOTE 1 — moratorium units.
   This UI has always expressed moratorium in QUARTERS (the wizard,
   the calculator field, the schedule legend). POST /api/emi expects
   `moratoriumMonths`. We convert at the boundary rather than changing
   either side. See emiQuarters() below.

   CONTRACT NOTE 2 — partner "funds" vs "health".
   The old demo model tagged each partner with funds
   available|low|exhausted and npa low|medium|high. The backend has no
   per-branch fund field: it returns per-branch npa_status
   (LOW|MEDIUM|HIGH|CRITICAL), health_score and is_eligible, and
   exposes fund status per STATE via GET /api/fund/:state. We map
   eligibility to is_eligible and surface state fund status separately.

   CONTRACT NOTE 3 — scheme "type" from the wizard.
   toolRecommend only branches on projectType === 'education'; every
   other value is accepted but unused. Mapping below is therefore safe.
   ---------------------------------------------------------------- */

/** wizard support id -> backend projectType */
export const projectTypeFor = (supportId) =>
  supportId === "edu" ? "education" : supportId === "micro" ? "shop" : "manufacturing";

/** Backend branch record -> the partner card shape this UI renders. */
export function adaptPartner(b, i = 0) {
  return {
    id: b.ifsc || `${b.partnerName}-${b.branchName}-${i}`,
    name: b.branchName ? `${b.partnerName} — ${b.branchName}` : b.partnerName,
    partnerType: b.partnerType,
    km: b.distance_km ?? null,
    addr: [b.address, b.city].filter(Boolean).join(", "),
    // locator rows carry "0" / "" for unknown numbers — treat both as absent
    phone: b.contact && b.contact !== "0" ? b.contact : "",
    state: b.state,
    // health model (see CONTRACT NOTE 2)
    npa: (b.npa_status ?? "LOW").toLowerCase(),
    npaStatus: b.npa_status ?? "LOW",
    gnpa: b.gnpa_ratio ?? null,
    // the backend generates per-branch NPA (no public source exists) and
    // flags it; carry the flag through so the UI can say so plainly
    npaSimulated: b.npa_simulated === true,
    // How the coordinates were derived: "district" is the district HQ (usually
    // within ~25 km); "state" is only a state centroid and must not be shown
    // as the branch's real position or as a precise distance.
    geoPrecision: b.geo_precision ?? null,
    approxLocation: b.geo_precision === "state",
    health: b.health_score ?? null,
    eligible: b.is_eligible !== false,
    lat: b.lat,
    lng: b.lng,
  };
}

/** Backend recommendation -> the result-card shape this UI renders. */
export function adaptRecommendation(r) {
  return {
    code: r.code,
    name: r.name,
    type: r.type,
    state: r.state,
    rate: r.rate,
    maxLoan: r.maxLoan,
    financing: r.maxLoan,
    monthlyEMI: r.monthlyEMI,
    quarterly: r.quarterly,
    coverage: r.coverage,
    tenure: r.tenureYears,
    // backend speaks months; this UI speaks quarters
    moratoriumMonths: r.moratoriumMonths ?? 0,
    moratorium: Math.round((r.moratoriumMonths ?? 0) / 3),
    score: r.score,
    incomeLimit: r.incomeLimit,
  };
}

/* ---------------- composite calls ---------------- */

/** EMI, taking moratorium in QUARTERS and converting to months for the API. */
export async function emiQuarters({ amount, rate, tenureYears, moratoriumQuarters = 0 }) {
  const res = await api.emi({
    amount: Number(amount),
    rate: Number(rate),
    tenureYears: Number(tenureYears),
    moratoriumMonths: Number(moratoriumQuarters) * 3,
  });
  return {
    ...res,
    // normalise to the field names the calculator already uses
    eqi: res.quarterlyInstallment,
    quarters: res.schedule?.length ?? Number(tenureYears) * 4,
    totalPaid: res.principal + res.totalInterest,
    rows: (res.schedule ?? []).map((row) => ({
      q: row.quarter,
      payment: row.payment,
      principal: row.principal,
      interest: row.interest,
      balance: row.balance,
      phase: row.principal <= 0 ? "moratorium" : "repayment",
    })),
  };
}

/**
 * Nearest eligible partners for a state.
 * The backend's /partners/nearest needs a lat/lng anchor. When the browser
 * gives us a position we use it; otherwise we anchor on the first branch the
 * backend reports for that state — the same trick the server's own agent uses.
 */
export async function partnersForState(state, { lat, lng, radiusKm = 50, limit = 12 } = {}) {
  /* Try progressively wider radii from one anchor. Rural states are sparse,
     and several states are geocoded to a district centroid rather than each
     branch's true position, so a tight radius can legitimately find nothing. */
  const search = async (anchor) => {
    for (const r of [radiusKm, radiusKm * 3, radiusKm * 10, radiusKm * 40]) {
      const res = await api.nearest({ lat: anchor.lat, lng: anchor.lng, radiusKm: r, limit, state });
      if (res.branches?.length) return res.branches;
    }
    return [];
  };

  /** first branch the backend lists for this state — always inside it */
  const stateAnchor = async () => {
    const seed = await api.partners({ state, limit: 1 });
    const first = seed.branches?.[0];
    return first ? { lat: first.lat, lng: first.lng } : null;
  };

  let anchor = null;
  let branches = [];

  /* 1. Prefer the user's real position — but only at close range. Stretching
        the radius from a user who is in another state surfaces one stray
        branch hundreds of km away while ignoring the thousands actually in
        the state they asked about. */
  if (lat != null && lng != null) {
    anchor = { lat, lng };
    for (const r of [radiusKm, radiusKm * 3]) {
      const res = await api.nearest({ lat, lng, radiusKm: r, limit, state });
      if (res.branches?.length) { branches = res.branches; break; }
    }
  }

  /* 2. Too few nearby (or none) means the user is not really in this state.
        Re-anchor inside it so the page shows the state's actual network. */
  const NEARBY_ENOUGH = 3;
  if (branches.length < NEARBY_ENOUGH) {
    const inState = await stateAnchor();
    if (inState) {
      const fromState = await search(inState);
      // keep whichever anchor actually surfaced more of the state's network
      if (fromState.length > branches.length) {
        anchor = inState;
        branches = fromState;
      }
    }
    if (branches.length === 0) {
      return { eligible: [], filtered: [], total: 0, anchor: null, anchoredInState: false };
    }
  }

  const all = branches.map(adaptPartner);
  return {
    anchor,
    total: all.length,
    eligible: all.filter((p) => p.eligible),
    filtered: all.filter((p) => !p.eligible),
    // true when distances are measured from inside the state, not from you
    anchoredInState: !(lat != null && lng != null) || anchor.lat !== lat || anchor.lng !== lng,
  };
}

/** Browser geolocation, resolving to null instead of throwing. */
export function currentPosition(timeout = 6000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout, maximumAge: 300000 }
    );
  });
}

export { ApiError };
