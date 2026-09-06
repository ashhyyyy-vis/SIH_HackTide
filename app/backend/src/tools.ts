/**
 * PS92 AI Tools — all callable functions the AI agent can use
 * Each tool maps to a specific capability
 */

import { dataset, locator } from './data.js';
// Re-export for server
export { dataset, locator } from './data.js';

/* ─── State-name normalisation ──────────────────────────────────────────────
   The two datasets spell states differently. ps92_dataset.json writes
   "Jammu & Kashmir" and "Dadra & Nagar Haveli / Daman & Diu"; the locator
   writes "JAMMU AND KASHMIR" and "DADRA AND NAGAR HAVELI". The locator also
   carries 57 distinct spellings for ~36 real states (casing variants).
   Comparing on a normalised key makes those match instead of returning zero
   rows. Display strings are never modified — only the comparison key. */
/* Variants that must collapse onto one canonical key. Dadra & Nagar Haveli
   and Daman & Diu were merged into a single UT in 2020, but the datasets
   still carry all four historical spellings, which would otherwise show up
   as four separate "states" and inflate the count. */
const STATE_ALIASES: Array<[RegExp, string]> = [
  [/^DADRA|^DAMAN/, 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU'],
  [/^ORISSA$/, 'ODISHA'],
  [/^PONDICHERRY$/, 'PUDUCHERRY'],
  [/^UTTARANCHAL$/, 'UTTARAKHAND'],
  [/^NCT OF DELHI$|^NEW DELHI$/, 'DELHI'],
];

export function normState(s?: string | null): string {
  if (!s) return '';
  const base = String(s)
    .toUpperCase()
    .replace(/&/g, ' AND ')
    .replace(/[./,]/g, ' ')
    .replace(/\bISLANDS?\b/g, 'ISLAND')
    .replace(/[^A-Z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  for (const [pattern, canonical] of STATE_ALIASES) {
    if (pattern.test(base)) return canonical;
  }
  return base;
}

/** True when two state names refer to the same state, allowing for the
 *  combined "Dadra & Nagar Haveli / Daman & Diu" style UT names. */
export function sameState(a?: string | null, b?: string | null): boolean {
  const x = normState(a), y = normState(b);
  if (!x || !y) return false;
  if (x === y) return true;
  // one side may be a combined UT that contains the other
  return x.includes(y) || y.includes(x);
}

// ─── Tool 1: Recommend Schemes ────────────────────────────────────────────────
function describeNational(s: any, cost: number, maxLoan: number, rate: number, tenureYears: number) {
  const n = tenureYears * 12;
  const emi = n > 0
    ? (maxLoan * rate / 12 / 100 * Math.pow(1 + rate / 12 / 100, n)) / (Math.pow(1 + rate / 12 / 100, n) - 1)
    : 0;
  return {
    type: 'national', name: s.name, code: s.code, rate, maxLoan: Math.round(maxLoan),
    monthlyEMI: Math.round(emi), quarterly: Math.round(emi * 3),
    coverage: cost > 0 ? Math.round((maxLoan / cost) * 100) : 90,
    tenureYears, moratoriumMonths: s.moratorium_months ?? 3,
  };
}

export function toolRecommend(input: {
  state?: string;
  projectCost: number;
  annualIncome: number;
  projectType?: string;
  educationStatus?: string;
  caste?: string;
}) {
  const { state, projectCost, annualIncome, projectType, educationStatus } = input;
  const cost = Number(projectCost);
  const income = Number(annualIncome);
  const results: any[] = [];
  const isEducation = (projectType ?? '').toLowerCase() === 'education';

  for (const s of dataset.schemes as any[]) {
    const marginPct = 100 - (s.max_loan_pct ?? 90);
    let maxLoan: number;
    let rate: number;
    let tenureYears: number;

    if (s.code === 'ELS') {
      if (!isEducation) continue;                       // ELS is an education-only product
      maxLoan = Math.min(cost * (1 - marginPct / 100), (s.max_loan_amount_india ?? s.max_loan_amount ?? 50_00_000));
      rate = s.rate_beneficiary_india_men ?? s.rate_beneficiary ?? 6.5;
      tenureYears = s.tenure_years_not_started ?? s.tenure_years ?? 12;
    } else {
      if (isEducation) continue;                        // education projects only need ELS
      maxLoan = Math.min(cost * (1 - marginPct / 100), s.max_loan_amount ?? 50_00_000);
      rate = s.rate_beneficiary ?? 8;
      tenureYears = s.tenure_years ?? 7;
    }

    const n = tenureYears * 12;
    const emi = n > 0
      ? (maxLoan * rate / 12 / 100 * Math.pow(1 + rate / 12 / 100, n)) / (Math.pow(1 + rate / 12 / 100, n) - 1)
      : 0;

    const MICRO = ['MSY', 'MCF', 'AMY'];
    const TERM = ['SUVIDHA', 'UTKARSH'];

    let score = 0;
    if (isEducation && s.code === 'ELS') score += 40;
    if (!isEducation) {
      if (cost <= 1_40_000 && MICRO.includes(s.code)) score += 40;              // primary micro credit
      else if (cost <= 1_40_000 && s.code === 'UNY') score += 35;               // UNY is an alt in this band
      else if (cost > 1_40_000 && cost <= 5_00_000 && TERM.includes(s.code)) score += 40;
      else if (cost > 1_40_000 && cost <= 5_00_000 && s.code === 'UNY') score += 35;
      else if (cost > 5_00_000 && TERM.includes(s.code)) score += 40;           // large projects → term loan
      // Aajeevika (15%) is a fallback — never outrank the cheaper MFS
      if (s.code === 'AMY' && cost <= 1_40_000) score -= 5;
    }
    if (income <= (s.income_limit ?? 5_00_000)) score += 20;
    if (income <= 50000) score += 10;
    if (cost > (s.project_cost_max ?? 50_00_000)) score = 0;   // hard cap: above max
    if (cost < (s.project_cost_min ?? 0)) score = 0;           // hard cap: below min band

    if (score > 0) results.push({ ...describeNational(s, cost, maxLoan, rate, tenureYears), score, moratoriumMonths: isEducation ? 12 : (s.moratorium_months ?? 6) });
  }

  if (state) {
    for (const s of dataset.state_schemes) {
      if (!sameState(s.state, state)) continue;
      const incomeLimit = s.income_limit;
      if (incomeLimit !== null && income > incomeLimit) continue;
      const marginPct = 100 - (s.max_loan_pct ?? 90);
      const maxLoan = Math.min(cost * (1 - marginPct / 100), s.unit_cost_max ?? s.max_loan_amount ?? 10_00_000);
      const rate = s.rate_beneficiary ?? s.funding?.interest_pa_beneficiary ?? 8;
      const n = (s.tenure_years ?? 5) * 12;
      const emi = n > 0
        ? (maxLoan * rate / 12 / 100 * Math.pow(1 + rate / 12 / 100, n)) / (Math.pow(1 + rate / 12 / 100, n) - 1)
        : 0;
      let score = 30;
      if (cost <= 1_40_000) score += 30; else if (cost <= 50_00_000) score += 30;
      results.push({ type: 'state', name: s.name, code: s.code, state: s.state, rate, maxLoan: Math.round(maxLoan), monthlyEMI: Math.round(emi), quarterly: Math.round(emi * 3), coverage: cost > 0 ? Math.round((maxLoan / cost) * 100) : 90, score, incomeLimit: incomeLimit ?? 'no limit', tenureYears: s.tenure_years ?? 5, moratoriumMonths: s.moratorium_months ?? 0 });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return { input, total: results.length, recommendations: results.slice(0, 5) };
}

// ─── Tool 2: Calculate EMI ────────────────────────────────────────────────────
export function toolEMI(input: { amount: number; rate: number; tenureYears: number; moratoriumMonths?: number }) {
  const { amount, rate, tenureYears, moratoriumMonths = 0 } = input;
  const P = Number(amount), annual = Number(rate) / 100, mor = Number(moratoriumMonths);
  const months = Number(tenureYears) * 12, quarters = Number(tenureYears) * 4;
  const rM = annual / 12, rQ = annual / 4;

  // Phase 1 — simple interest accrues during the moratorium, no payments
  const moratoriumInterest = P * rM * mor;                 // P × R/12 × months (simple interest)
  const inflatedPrincipal = P + moratoriumInterest;

  // Phase 2 — installments computed on the inflated principal
  const emi = months > 0
    ? (inflatedPrincipal * rM * Math.pow(1 + rM, months)) / (Math.pow(1 + rM, months) - 1)
    : 0;
  const quarterly = quarters > 0
    ? (inflatedPrincipal * rQ * Math.pow(1 + rQ, quarters)) / (Math.pow(1 + rQ, quarters) - 1)
    : 0;

  // Phase 3 — quarterly amortization of the inflated principal
  const schedule: any[] = [];
  let bal = inflatedPrincipal;
  for (let q = 1; q <= quarters && bal > 1; q++) {
    const interest = bal * rQ;
    const principalPaid = quarterly - interest;
    const closing = Math.max(0, bal - principalPaid);
    schedule.push({ quarter: q, payment: Math.round(quarterly), principal: Math.round(principalPaid), interest: Math.round(interest), balance: Math.round(closing) });
    bal = closing;
  }

  return {
    principal: Math.round(inflatedPrincipal),
    monthlyEMI: Math.round(emi),
    quarterlyInstallment: Math.round(quarterly),
    moratoriumMonths: mor,
    moratoriumInterest: Math.round(moratoriumInterest),
    totalInterest: Math.round(quarterly * quarters - P),
    schedule: schedule.slice(0, 40),
  };
}

// ─── Partner Health (NPA-aware) — demo mock, deterministic per branch ─────────
// Per-branch NPA is not public; we generate a stable pseudo-random GNPA
// per branch drawn from the RBI/NABARD threshold bands in `npa_thresholds`.
function hashStr(s: string) { let h = 7; for (const c of s) h = ((h * 31 + c.charCodeAt(0)) >>> 0); return h; }

const NPA_THRESHOLDS = (dataset.npa_thresholds ?? {}) as Record<string, { low: number; medium: number; high: number; critical: number }>;

export function enrichPartnerHealth(b: any) {
  const key = `${b.partnerName ?? ''}|${b.branchName ?? ''}|${b.city ?? ''}|${b.partnerType}`;
  const h = hashStr(key);
  const type = (b.partnerType ?? 'PSB') as string;
  const def = NPA_THRESHOLDS[type] ?? { low: 5, medium: 10, high: 15, critical: 15 };
  const gnpa = Math.round(((h % 2000) / 2000) * def.critical * 1.5 * 100) / 100;
  let npaStatus: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  if (gnpa >= def.critical) npaStatus = 'CRITICAL';
  else if (gnpa >= def.high) npaStatus = 'HIGH';
  else if (gnpa >= def.medium) npaStatus = 'MEDIUM';
  else npaStatus = 'LOW';
  const health = Math.max(1, Math.min(100, Math.round(100 - gnpa * 5.5)));
  return {
    ...b,
    gnpa_ratio: gnpa,
    npa_status: npaStatus,
    health_score: health,
    is_eligible: npaStatus !== 'CRITICAL',
    /* Per-branch NPA is NOT published by any source. These figures are
       generated deterministically from the branch name within the RBI/NABARD
       threshold bands in dataset.npa_thresholds. The flag is part of the
       contract so clients can label it honestly rather than implying it is
       reported data. */
    npa_simulated: true,
  };
}

// ─── Tool 3: Find Partners ───────────────────────────────────────────────────
export function toolFindPartners(input: { state?: string; city?: string; partnerType?: string; limit?: number; offset?: number; health?: boolean }) {
  let results = [...locator];
  if (input.state) results = results.filter(b => sameState(b.state, input.state));
  if (input.city) results = results.filter(b => b.city?.toLowerCase().includes(input.city!.toLowerCase()));
  if (input.partnerType) results = results.filter(b => b.partnerType === input.partnerType);
  const withHealth = input.health === false ? results : results.map(enrichPartnerHealth);
  const total = withHealth.length, limit = input.limit ?? 20, offset = input.offset ?? 0;
  return { total, count: withHealth.slice(offset, offset + limit).length, offset, limit, branches: withHealth.slice(offset, offset + limit) };
}

// ─── Tool 4: Find Nearest Partners ──────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function toolNearestPartners(input: { lat: number; lng: number; radiusKm?: number; limit?: number; state?: string; eligibleOnly?: boolean }) {
  let candidates = [...locator];
  if (input.state) candidates = candidates.filter(b => sameState(b.state, input.state));
  const withDist = candidates
    .map(b => ({ ...b, distance_km: Math.round(haversine(Number(input.lat), Number(input.lng), b.lat, b.lng) * 10) / 10 }))
    .filter(b => b.distance_km <= (input.radiusKm ?? 50))
    .map(enrichPartnerHealth)
    .filter(b => !input.eligibleOnly || b.is_eligible)
    .sort((a, b) => Number(b.is_eligible) - Number(a.is_eligible) || (b.health_score ?? 0) - (a.health_score ?? 0) || a.distance_km - b.distance_km)
    .slice(0, input.limit ?? 10);
  return { user: { lat: input.lat, lng: input.lng }, radius_km: input.radiusKm ?? 50, total: withDist.length, branches: withDist };
}

// ─── Tool 5: Get Scheme Details ──────────────────────────────────────────────
export function toolSchemeDetails(code: string) {
  const nat = dataset.schemes.find((s: any) => s.code === code);
  if (nat) return { type: 'national', scheme: nat };
  const st = dataset.state_schemes.find((s: any) => s.code === code);
  if (st) return { type: 'state', scheme: st };
  return { error: 'Scheme not found', code };
}

// ─── Tool 6: Get All Schemes ────────────────────────────────────────────────
export function toolGetAllSchemes() {
  const stateRate = (s: any) =>
    s.funding?.interest_pa_beneficiary ?? s.funding?.interest_pa_women ?? s.funding?.interest_pa_men ?? null;
  /* ELS stores its ceiling and tenure under different keys than the other
     national schemes (max_loan_amount_india / tenure_years_not_started).
     toolRecommend already handles that; this catalogue did not, so ELS was
     reported with maxAmount: undefined and disappeared from any UI that
     filtered on it. Fall back through the alternatives. */
  const natMax = (s: any) => s.max_loan_amount ?? s.max_loan_amount_india ?? null;
  const natTenure = (s: any) => s.tenure_years ?? s.tenure_years_not_started ?? null;
  const natRate = (s: any) => s.rate_beneficiary ?? s.rate_beneficiary_india_men ?? null;

  return {
    national: dataset.schemes.map((s: any) => ({ code: s.code, name: s.name, rate: natRate(s), maxAmount: natMax(s), tenureYears: natTenure(s), type: 'national' })),
    state: dataset.state_schemes.map((s: any) => ({
      code: s.code, name: s.name, state: s.state,
      rate: stateRate(s),
      maxAmount: s.unit_cost_max ?? s.max_loan_amount ?? null,
      incomeLimit: s.income_limit, type: 'state',
    })),
  };
}

// ─── Tool 7: Get States ─────────────────────────────────────────────────────
export function toolGetStates() {
  // states that have their own state-level scheme
  const states = new Set<string>(dataset.state_schemes.map((s: any) => s.state));

  /* Every state the partner locator covers, de-duplicated on the normalised
     key so "KARNATAKA" and "Karnataka" collapse into one entry. National
     schemes apply in all of these, so the UI should offer the full list. */
    const byKey = new Map<string, string>();
  const prettier = (a: string, b: string) => {
    // prefer Title Case over SHOUTING when both spellings exist
    const score = (v: string) => (v === v.toUpperCase() ? 0 : 1);
    return score(b) > score(a) ? b : a;
  };
  for (const st of [...states, ...locator.map((b: any) => b.state)]) {
    if (!st) continue;
    const k = normState(st);
    if (!k) continue;
    byKey.set(k, byKey.has(k) ? prettier(byKey.get(k)!, st) : st);
  }
  /* Some states only ever appear SHOUTING in the locator. Title-case those
     for display; leave mixed-case names (and short forms like UT acronyms)
     exactly as the source wrote them. */
  const titleCase = (v: string) =>
    v === v.toUpperCase()
      ? v.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()).replace(/\bAnd\b/g, 'and')
      : v;

  const CANONICAL_NAMES: Record<string, string> = {
    'DADRA AND NAGAR HAVELI AND DAMAN AND DIU': 'Dadra and Nagar Haveli and Daman and Diu',
    'JAMMU AND KASHMIR': 'Jammu and Kashmir',
  };
  const allStates = [...byKey.entries()]
    .map(([key, name]) => CANONICAL_NAMES[key] ?? titleCase(name))
    .sort((a, b) => a.localeCompare(b));

  return {
    states: [...states].sort(),   // unchanged: states with state-specific schemes
    count: states.size,
    allStates,                    // added: every state with partner coverage
    allCount: allStates.length,
  };
}

// ─── Tool 8: Check Caste Eligibility ────────────────────────────────────────
export function toolCheckCaste(caste: string) {
  const idx = dataset.sc_caste_index;
  if (!idx) return { found: false, note: 'Caste index not loaded' };
  for (const [state, castes] of Object.entries(idx.by_state as Record<string, string[]>)) {
    if (castes.map((c: string) => c.toLowerCase()).includes(caste.toLowerCase())) {
      return { found: true, caste, state, note: `${caste} is a recognized SC caste in ${state}` };
    }
  }
  if (idx.generic_list.map((c: string) => c.toLowerCase()).includes(caste.toLowerCase())) {
    return { found: true, caste, state: 'generic', note: `${caste} is in the generic SC list` };
  }
  return { found: false, caste, note: `${caste} not found in SC caste index. May not be a recognized SC caste.` };
}

// ─── Tool 9: Get Fund Availability ─────────────────────────────────────────
export function toolFundAvailability(state: string) {
  const fa = dataset.fund_availability?.by_state?.[state];
  if (!fa) return { state, status: 'unknown', note: 'No fund data for this state' };
  return { state, ...fa };
}

// ─── Tool 10: Get State Scheme Availability ──────────────────────────────────
export function toolStateSchemeAvailability(state: string) {
  const ssa = dataset.state_scheme_availability?.[state];
  if (!ssa) return { state, schemes: [], note: 'No state-specific schemes for this state' };
  return { state, schemes: ssa };
}

// ─── Tool 11: Translate Text ─────────────────────────────────────────────────
export async function toolTranslate(input: { text: string; sourceLang?: string; targetLang: string }) {
  const LANG: Record<string, string> = { hi: 'hin', ta: 'tam', te: 'tel', kn: 'kan', ml: 'mal', mr: 'mar', bn: 'ben', gu: 'guj', pa: 'pan', en: 'en' };
  const from = LANG[input.sourceLang ?? 'en'] ?? 'en';
  const to = LANG[input.targetLang] ?? input.targetLang;
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(input.text)}&langpair=${from}|${to}`;
    const r = await fetch(url);
    const d = await r.json() as any;
    if (d.responseStatus === 200) return { translatedText: d.responseData.translatedText, provider: 'MyMemory', match: d.responseData.match, sourceLang: input.sourceLang ?? 'en', targetLang: input.targetLang };
  } catch (_) {}
  return { error: 'Translation failed', text: input.text, targetLang: input.targetLang };
}

// ─── Tool 12: Scheme Graph ───────────────────────────────────────────────────
export function toolSchemeGraph() {
  // Returns scheme relationships as a graph (adjacency list)
  const graph: Record<string, { relatesTo: string[]; type: string; name: string; rate: number; maxAmount: number }> = {};

  for (const s of dataset.schemes) {
    graph[s.code] = {
      name: s.name, type: 'national', rate: s.rate_beneficiary ?? 8, maxAmount: s.max_loan_amount ?? 0,
      relatesTo: dataset.schemes.filter((x: any) => x.code !== s.code).map((x: any) => x.code),
    };
  }
  for (const s of dataset.state_schemes) {
    graph[s.code] = {
      name: s.name, type: 'state', rate: s.rate_beneficiary ?? 8, maxAmount: s.max_loan_amount ?? 0,
      relatesTo: dataset.schemes.map((x: any) => x.code),
    };
  }

  // Also return a flat list of edges for graph visualization
  const edges: Array<{ from: string; to: string; label: string }> = [];
  for (const [code, node] of Object.entries(graph)) {
    for (const rel of node.relatesTo.slice(0, 3)) { // limit edges for readability
      edges.push({ from: code, to: rel, label: 'similar' });
    }
  }

  return { nodes: Object.entries(graph).map(([code, n]) => ({ id: code, ...n })), edges, totalNodes: Object.keys(graph).length };
}

// ─── All tools registry ──────────────────────────────────────────────────────
export const TOOLS = {
  recommend: { fn: toolRecommend, description: 'Recommend loan schemes based on user profile (state, project cost, income, education). Returns top 5 matching schemes with EMI.' },
  emi: { fn: toolEMI, description: 'Calculate EMI and generate quarterly repayment schedule for a loan.' },
  findPartners: { fn: toolFindPartners, description: 'Find partner branches by state, city, or type (SCA, PSB, RRB, SFB, NBFC_MFI).' },
  nearestPartners: { fn: toolNearestPartners, description: 'Find nearest partner branches within a radius (km) from user lat/lng.' },
  schemeDetails: { fn: toolSchemeDetails, description: 'Get full details of a specific scheme by its code.' },
  getAllSchemes: { fn: toolGetAllSchemes, description: 'Get list of all national and state schemes.' },
  getStates: { fn: toolGetStates, description: 'Get list of all states that have state-specific schemes.' },
  checkCaste: { fn: toolCheckCaste, description: 'Verify if a caste is in the official SC list and get eligibility info.' },
  fundAvailability: { fn: toolFundAvailability, description: 'Get fund utilization status for a state (healthy/moderate/low/exhausted).' },
  stateSchemeAvailability: { fn: toolStateSchemeAvailability, description: 'Get all state-specific schemes available in a given state.' },
  translate: { fn: toolTranslate, description: 'Translate text between languages (EN, HI, TA, TE, KN, ML, MR, BN, GU, PA).' },
  schemeGraph: { fn: toolSchemeGraph, description: 'Get all schemes as a graph (nodes + edges) for visualization or path-finding.' },
};
