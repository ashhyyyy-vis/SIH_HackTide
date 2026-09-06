/* ============================================================
   API client for the PS92 backend (app/backend, Express, :3001).

   Every function here mirrors a route that actually exists on the
   server — verified against a running instance, not against types.
   The `adapt*` helpers translate the backend's payload shapes into
   the shapes this frontend's components already consume, so the UI
   did not have to be rewritten around the API.
   ============================================================ */

const API = import.meta.env.VITE_API_URL ?? "/api";

class ApiError extends Error {
  constructor(status, statusText, path) {
    super(`${status} ${statusText} — ${path}`);
    this.name = "ApiError";
    this.status = status;
  }
}

async function get(path) {
  const token = localStorage.getItem('auth_token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const r = await fetch(`${API}${path}`, { headers });
  if (!r.ok) throw new ApiError(r.status, r.statusText, path);
  return r.json();
}

async function post(path, body) {
  const token = localStorage.getItem('auth_token');
  const headers = { "Content-Type": "application/json" };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new ApiError(r.status, r.statusText, path);
  return r.json();
}

const qs = (params) =>
  new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ).toString();

/* ---------------- raw routes ---------------- */
export const api = {
  health: () => get("/health"),
  states: () => get("/states"),
  schemes: (params) => get(`/schemes?${qs(params)}`),
  schemeDetails: (id) => get(`/schemes/${encodeURIComponent(id)}`),
  recommend: (input) => post("/recommend", input),
  emi: (input) => post("/emi", input),
  partners: (params) => get(`/partners?${qs(params)}`),
  nearest: (params) => get(`/partners/nearby?${qs(params)}`),
  fund: (state) => get(`/fund/${encodeURIComponent(state)}`),
  caste: (caste) => get(`/caste/${encodeURIComponent(caste)}`),
  agent: (goal) => post("/ai/agent", { goal }),
  sendOtp: (phone) => post("/auth/send-otp", { phone_number: phone }),
  verifyOtp: (phone, otp) => post("/auth/verify-otp", { phone_number: phone, otp }),
  me: () => get("/auth/me"),
  translate: (text, targetLanguage, sourceLanguage) => post("/translate", { text, targetLanguage, sourceLanguage }),
  logout: () => {
    localStorage.removeItem('auth_token');
    return Promise.resolve({ success: true });
  },
};

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
  let anchor = lat != null && lng != null ? { lat, lng } : null;

  if (!anchor) {
    const seed = await api.partners({ state, limit: 1 });
    const first = seed.branches?.[0];
    if (!first) return { eligible: [], filtered: [], total: 0, anchor: null };
    anchor = { lat: first.lat, lng: first.lng };
  }

  // widen the radius until we have something to show — rural states are sparse
  let res = { branches: [] };
  for (const r of [radiusKm, radiusKm * 3, radiusKm * 10]) {
    res = await api.nearest({ lat: anchor.lat, lng: anchor.lng, radiusKm: r, limit, state });
    if (res.branches?.length) break;
  }

  const all = (res.branches ?? []).map(adaptPartner);
  return {
    anchor,
    total: all.length,
    eligible: all.filter((p) => p.eligible),
    filtered: all.filter((p) => !p.eligible),
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
