/**
 * Gemini chat, grounded in the PS92 dataset.
 *
 * The API key is read from app/backend/.env and never leaves this process.
 * It must NOT be copied into any VITE_* variable — Vite ships those to the
 * browser, which would publish the key.
 *
 * The model is given a compact, factual context built from the same tools the
 * rest of the API uses, and is instructed to answer only from it. That keeps
 * scheme names, rates and ceilings accurate instead of invented.
 */
import { dataset } from '../data.js';
import {
  toolRecommend, toolFundAvailability, toolFindPartners,
  toolGetAllSchemes, normState,
} from '../tools.js';

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface ChatTurn { role: 'user' | 'model'; text: string; }

export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/* ── locate a state mentioned anywhere in the message ─────────────────────── */
function detectState(text: string): string | null {
  const hay = normState(text);
  const states = [...new Set(dataset.state_schemes.map((s: any) => String(s.state)))] as string[];
  // longest match first so "Andhra Pradesh" beats a stray "Andhra"
  const all = [...states, 'Maharashtra', 'Tamil Nadu', 'Uttar Pradesh', 'Bihar', 'Delhi', 'Gujarat', 'West Bengal']
    .sort((a, b) => b.length - a.length);
  for (const s of all) if (hay.includes(normState(s))) return s;
  return null;
}

/* ── money like "2 lakh", "₹50,000", "2L", with its position in the text ──── */
interface Amount { value: number; index: number; }

function detectAmounts(text: string): Amount[] {
  const out: Amount[] = [];
  const re = /(?:₹|rs\.?)?\s*(\d[\d,]*(?:\.\d+)?)\s*(l|lakh|lakhs|k|thousand|cr|crore)?/gi;
  let m: RegExpExecArray | null;
  const lower = text.toLowerCase();
  while ((m = re.exec(lower))) {
    if (!m[1]) continue;
    const n = Number(m[1].replace(/,/g, ''));
    if (!Number.isFinite(n) || n === 0) continue;
    const unit = m[2];
    const mult = unit === 'l' || unit === 'lakh' || unit === 'lakhs' ? 100000
      : unit === 'k' || unit === 'thousand' ? 1000
      : unit === 'cr' || unit === 'crore' ? 10000000 : 1;
    out.push({ value: Math.round(n * mult), index: m.index });
  }
  return out;
}

/**
 * Decide which figure is income and which is project cost.
 * "annual income 2 lakhs" was previously read as a project cost, which sent
 * the recommender completely the wrong question. Amounts are now attributed
 * to whichever keyword they sit closest to.
 */
function attributeAmounts(text: string, amounts: Amount[]): { cost?: number; income?: number } {
  const lower = text.toLowerCase();
  const incomeAt = lower.search(/\b(income|earn|earning|earns|salary|revenue)\b/);
  const costAt = lower.search(/\b(cost|costing|project|budget|need|want|loan|investment|setup)\b/);

  if (amounts.length === 0) return {};

  // one number: attribute it to whichever keyword appears at all
  if (amounts.length === 1) {
    const a = amounts[0].value;
    if (incomeAt >= 0 && costAt < 0) return { income: a };
    if (costAt >= 0 && incomeAt < 0) return { cost: a };
    // both or neither mentioned — nearest keyword wins
    if (incomeAt >= 0 && costAt >= 0) {
      const dI = Math.abs(amounts[0].index - incomeAt);
      const dC = Math.abs(amounts[0].index - costAt);
      return dI <= dC ? { income: a } : { cost: a };
    }
    return { cost: a };
  }

  // several numbers: give each to its nearest keyword
  const nearest = (kw: number) =>
    kw < 0 ? undefined : amounts.reduce((best, a) =>
      Math.abs(a.index - kw) < Math.abs(best.index - kw) ? a : best).value;

  const income = nearest(incomeAt);
  const cost = amounts.find((a) => a.value !== income)?.value ?? nearest(costAt);
  return { cost, income };
}

/**
 * Assemble only the facts relevant to this question. Kept deliberately small:
 * the whole catalogue plus a few state figures, not the 80k-branch locator.
 */
/** ₹ in Indian digit grouping: 500000 -> "₹5,00,000". */
export function inr(n: unknown): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return String(n ?? '');
  return '₹' + Math.round(v).toLocaleString('en-IN');
}

/**
 * Walk the grounding object and add a pre-formatted twin for every rupee
 * field. Models are unreliable at Indian lakh/crore grouping — one run
 * rendered the ₹5,00,000 income cap as "₹5,000,000", inflating it tenfold.
 * Formatting server-side and telling the model to copy the string verbatim
 * removes the opportunity to get it wrong.
 */
const MONEY_KEYS = /^(max_?[Ll]oan|maxAmount|maxLoan|amount|income|.*[Ii]ncome.*|.*[Cc]ost.*|.*[Ll]imit.*|monthlyEMI|quarterly|allocation_lakh|actuals_lakh|principal|value)$/;

function withFormattedMoney(node: any): any {
  if (Array.isArray(node)) return node.map(withFormattedMoney);
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = withFormattedMoney(v);
      if (typeof v === 'number' && v >= 1000 && MONEY_KEYS.test(k) && !/lakh$/.test(k)) {
        out[`${k}_formatted`] = inr(v);
      }
    }
    return out;
  }
  return node;
}

export function buildGrounding(message: string) {
  const catalogue = toolGetAllSchemes();
  const state = detectState(message);
  const amounts = detectAmounts(message);
  const { cost: statedCost, income: statedIncome } = attributeAmounts(message, amounts);
  const isEducation = /education|degree|college|course|study|b\.?tech|mbbs|diploma/i.test(message);

  const facts: Record<string, unknown> = {
    eligibility: dataset.eligibility,
    nationalSchemes: catalogue.national,
    detectedState: state,
  };

  if (state) {
    facts.stateSchemes = catalogue.state.filter((s: any) => normState(s.state) === normState(state));
    facts.fundStatus = toolFundAvailability(state);
    const partners = toolFindPartners({ state, limit: 3 });
    facts.partnerCount = partners.total;
    facts.samplePartners = partners.branches.map((b: any) => ({
      name: b.partnerName, branch: b.branchName, city: b.city, type: b.partnerType,
    }));
  }

  /* Run the recommender when we have something to work with. If only an
     income was given ("schemes for people earning 2 lakh") we sweep a few
     representative project sizes instead of inventing one, so the answer can
     describe the range of options rather than a single arbitrary figure. */
  if (statedCost != null) {
    const income = statedIncome ?? 200000;
    facts.recommendationForTheseNumbers = toolRecommend({
      state: state ?? undefined,
      projectCost: statedCost,
      annualIncome: income,
      projectType: isEducation ? 'education' : 'shop',
    });
    facts.interpretedAs = {
      projectCost: statedCost,
      annualIncome: income,
      incomeWasStated: statedIncome != null,
      education: isEducation,
    };
  } else if (statedIncome != null) {
    facts.interpretedAs = { annualIncome: statedIncome, projectCostNotStated: true, education: isEducation };
    facts.eligibleAtThisIncome = statedIncome <= 500000;
    facts.optionsByProjectSize = [100000, 500000, 1000000].map((size) => ({
      projectCost: size,
      schemes: (toolRecommend({
        state: state ?? undefined,
        projectCost: size,
        annualIncome: statedIncome,
        projectType: isEducation ? 'education' : 'shop',
      }).recommendations ?? []).slice(0, 2),
    }));
  }

  // hand the model ready-made rupee strings so it never has to group digits
  return withFormattedMoney(facts);
}

const SYSTEM = `You are the assistant for YojanaMitra, a portal that helps
Scheduled Caste applicants in India find concessional loan schemes (NSFDC and
state channelising agencies), understand repayment, and reach a channel partner.

Rules:
- Answer ONLY from the FACTS block supplied with each question. It is generated
  live from the portal's dataset.
- Never invent a scheme name, interest rate, loan ceiling, tenure or partner. If
  the FACTS do not cover it, say you do not have that detail and suggest the user
  contact their district SCA office.
- MONEY: every rupee figure in FACTS has a matching *_formatted string, e.g.
  max_loan_amount: 900000 with max_loan_amount_formatted: "₹9,00,000". ALWAYS
  copy the *_formatted string exactly. NEVER re-group the digits yourself and
  never convert to millions — Indian grouping is 2,2,3 (₹5,00,000 is five
  lakh, not five million). If a figure has no *_formatted twin, state it in
  lakh/crore words instead of digits.
- Repayment under these schemes is QUARTERLY, not monthly. Never say EMI/monthly
  unless quoting the monthlyEMI field explicitly.
- Per-branch NPA and health scores are simulated, not official. If asked, say so.
- Be brief: 2-4 short sentences, or a short list. This is a chat bubble on a
  phone, not an essay. No markdown headings or tables.
- Reply in the same language the user wrote in.
- You cannot submit applications or check application status.`;

export async function geminiChat(
  message: string,
  history: ChatTurn[] = [],
): Promise<{ reply: string; grounding: Record<string, unknown> }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not configured on the server');
  const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

  const grounding = buildGrounding(message);

  // keep the last few turns so follow-ups ("what about Kerala?") make sense
  const contents = [
    ...history.slice(-6).map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: 'user', parts: [{ text: `FACTS (live, authoritative):\n${JSON.stringify(grounding)}\n\nQUESTION: ${message}` }] },
  ];

  const res = await fetch(`${API_ROOT}/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: SYSTEM }] },
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 3000,
        // Gemini 3 "thinks" before answering by default, which roughly doubled
        // response time for what are lookup-and-summarise questions.
        thinkingConfig: { thinkingLevel: 'low' },
      },
    }),
  });

  const json: any = await res.json();
  if (!res.ok || json.error) {
    const err: any = new Error(json?.error?.message ?? `Gemini returned HTTP ${res.status}`);
    err.status = res.status;
    // 429 is the free tier's rate limit (20 requests/minute). Surface it
    // distinctly so the caller can fall back instead of showing a hard error.
    err.rateLimited = res.status === 429;
    const m = /retry in ([\d.]+)s/i.exec(err.message);
    if (m) err.retryAfterSeconds = Math.ceil(Number(m[1]));
    throw err;
  }

  const reply = (json.candidates?.[0]?.content?.parts ?? [])
    .map((p: any) => p.text).filter(Boolean).join('').trim();

  if (!reply) {
    const why = json.candidates?.[0]?.finishReason;
    throw new Error(why ? `Gemini returned no text (${why})` : 'Gemini returned no text');
  }
  return { reply, grounding };
}
