/**
 * PS92 AI Tools — all callable functions the AI agent can use
 * Each tool maps to a specific capability
 */

import { dataset, locator } from './data.js';
// Re-export for server
export { dataset, locator } from './data.js';

// ─── Tool 1: Recommend Schemes ────────────────────────────────────────────────
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

  for (const s of dataset.schemes) {
    const marginPct = 100 - (s.max_loan_pct ?? 90);
    const maxLoan = Math.min(cost * (1 - marginPct / 100), s.max_loan_amount ?? 50_00_000);
    const rate = s.rate_beneficiary ?? 8;
    const n = (s.tenure_years ?? 7) * 12;
    const emi = (maxLoan * rate / 12 / 100 * Math.pow(1 + rate / 12 / 100, n)) /
      (Math.pow(1 + rate / 12 / 100, n) - 1);

    let score = 0;
    if (cost <= 1_40_000 && s.code.includes('MICRO')) score += 40;
    else if (cost <= 50_00_000 && s.code.includes('TERM')) score += 40;
    if (educationStatus && ['college', 'graduate'].includes(educationStatus) && s.code.includes('EDU')) score += 30;
    if (income <= (s.income_limit ?? 5_00_000)) score += 20;
    if (income <= 50000) score += 10;

    if (score > 0) results.push({ type: 'national', name: s.name, code: s.code, rate, maxLoan: Math.round(maxLoan), monthlyEMI: Math.round(emi), quarterly: Math.round(emi * 3), coverage: Math.round((maxLoan / cost) * 100), score, tenureYears: s.tenure_years, moratoriumMonths: s.moratorium_months });
  }

  if (state) {
    for (const s of dataset.state_schemes) {
      if (s.state?.toLowerCase() !== state.toLowerCase()) continue;
      const incomeLimit = s.income_limit;
      if (incomeLimit !== null && income > incomeLimit) continue;
      const marginPct = 100 - (s.max_loan_pct ?? 90);
      const maxLoan = Math.min(cost * (1 - marginPct / 100), s.max_loan_amount ?? 10_00_000);
      const rate = s.rate_beneficiary ?? 8;
      const n = (s.tenure_years ?? 5) * 12;
      const emi = (maxLoan * rate / 12 / 100 * Math.pow(1 + rate / 12 / 100, n)) /
        (Math.pow(1 + rate / 12 / 100, n) - 1);
      let score = 30;
      if (cost <= 1_40_000) score += 30; else if (cost <= 50_00_000) score += 30;
      results.push({ type: 'state', name: s.name, code: s.code, state: s.state, rate, maxLoan: Math.round(maxLoan), monthlyEMI: Math.round(emi), quarterly: Math.round(emi * 3), coverage: Math.round((maxLoan / cost) * 100), score, incomeLimit: incomeLimit ?? 'no limit', tenureYears: s.tenure_years, moratoriumMonths: s.moratorium_months });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return { input, total: results.length, recommendations: results.slice(0, 5) };
}

// ─── Tool 2: Calculate EMI ────────────────────────────────────────────────────
export function toolEMI(input: { amount: number; rate: number; tenureYears: number; moratoriumMonths?: number }) {
  const { amount, rate, tenureYears, moratoriumMonths = 0 } = input;
  const P = Number(amount), r = Number(rate) / 12 / 100, n = Number(tenureYears) * 12, mor = Number(moratoriumMonths);
  let principal = P + (mor > 0 ? P * r * mor : 0);
  const emi = mor > 0 ? 0 : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const quarterly = mor > 0 ? 0 : (principal * r * 3 * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const schedule = [];
  let bal = principal;
  for (let q = 1; q <= Math.ceil(n / 3) && bal > 0; q++) {
    const interest = bal * r * 3, principalPaid = quarterly - interest;
    bal = Math.max(0, bal - principalPaid);
    schedule.push({ quarter: q, payment: Math.round(quarterly), principal: Math.round(principalPaid), interest: Math.round(interest), balance: Math.round(bal) });
  }
  return { principal: Math.round(principal), monthlyEMI: Math.round(emi), quarterlyInstallment: Math.round(quarterly), moratoriumMonths: mor, totalInterest: Math.round(emi * n - principal), schedule: schedule.slice(0, 28) };
}

// ─── Tool 3: Find Partners ───────────────────────────────────────────────────
export function toolFindPartners(input: { state?: string; city?: string; partnerType?: string; limit?: number; offset?: number }) {
  let results = [...locator];
  if (input.state) results = results.filter(b => b.state?.toLowerCase() === input.state!.toLowerCase());
  if (input.city) results = results.filter(b => b.city?.toLowerCase().includes(input.city!.toLowerCase()));
  if (input.partnerType) results = results.filter(b => b.partnerType === input.partnerType);
  const total = results.length, limit = input.limit ?? 20, offset = input.offset ?? 0;
  return { total, count: results.slice(offset, offset + limit).length, offset, limit, branches: results.slice(offset, offset + limit) };
}

// ─── Tool 4: Find Nearest Partners ──────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function toolNearestPartners(input: { lat: number; lng: number; radiusKm?: number; limit?: number; state?: string }) {
  let candidates = [...locator];
  if (input.state) candidates = candidates.filter(b => b.state?.toLowerCase() === input.state!.toLowerCase());
  const withDist = candidates
    .map(b => ({ ...b, distance_km: Math.round(haversine(Number(input.lat), Number(input.lng), b.lat, b.lng) * 10) / 10 }))
    .filter(b => b.distance_km <= (input.radiusKm ?? 50))
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, input.limit ?? 10);
  return { user: { lat: input.lat, lng: input.lng }, radius_km: input.radiusKm ?? 50, total: withDist.length, branches: withDist };
}

// ─── Tool 5: Get Scheme Details ──────────────────────────────────────────────
export function toolSchemeDetails(code: string) {
  const nat = dataset.schemes.find(s => s.code === code);
  if (nat) return { type: 'national', scheme: nat };
  const st = dataset.state_schemes.find(s => s.code === code);
  if (st) return { type: 'state', scheme: st };
  return { error: 'Scheme not found', code };
}

// ─── Tool 6: Get All Schemes ────────────────────────────────────────────────
export function toolGetAllSchemes() {
  return {
    national: dataset.schemes.map(s => ({ code: s.code, name: s.name, rate: s.rate_beneficiary, maxAmount: s.max_loan_amount, tenureYears: s.tenure_years, type: 'national' })),
    state: dataset.state_schemes.map(s => ({ code: s.code, name: s.name, state: s.state, rate: s.rate_beneficiary, maxAmount: s.max_loan_amount, incomeLimit: s.income_limit, type: 'state' })),
  };
}

// ─── Tool 7: Get States ─────────────────────────────────────────────────────
export function toolGetStates() {
  const states = new Set(dataset.state_schemes.map(s => s.state));
  return { states: [...states].sort(), count: states.size };
}

// ─── Tool 8: Check Caste Eligibility ────────────────────────────────────────
export function toolCheckCaste(caste: string) {
  const idx = dataset.sc_caste_index;
  if (!idx) return { found: false, note: 'Caste index not loaded' };
  for (const [state, castes] of Object.entries(idx.by_state as Record<string, string[]>)) {
    if (castes.map(c => c.toLowerCase()).includes(caste.toLowerCase())) {
      return { found: true, caste, state, note: `${caste} is a recognized SC caste in ${state}` };
    }
  }
  if (idx.generic_list.map(c => c.toLowerCase()).includes(caste.toLowerCase())) {
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
      relatesTo: dataset.schemes.filter(x => x.code !== s.code).map(x => x.code),
    };
  }
  for (const s of dataset.state_schemes) {
    graph[s.code] = {
      name: s.name, type: 'state', rate: s.rate_beneficiary ?? 8, maxAmount: s.max_loan_amount ?? 0,
      relatesTo: dataset.schemes.map(x => x.code),
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
