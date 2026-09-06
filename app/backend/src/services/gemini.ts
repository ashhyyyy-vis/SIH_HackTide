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

/* ── money like "2 lakh", "₹50,000", "2L" ─────────────────────────────────── */
function detectAmounts(text: string): number[] {
  const out: number[] = [];
  const re = /(?:₹|rs\.?)?\s*(\d[\d,]*(?:\.\d+)?)\s*(l|lakh|lakhs|k|thousand|cr|crore)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text.toLowerCase()))) {
    if (!m[1]) continue;
    const n = Number(m[1].replace(/,/g, ''));
    if (!Number.isFinite(n)) continue;
    const unit = m[2];
    const mult = unit === 'l' || unit === 'lakh' || unit === 'lakhs' ? 100000
      : unit === 'k' || unit === 'thousand' ? 1000
      : unit === 'cr' || unit === 'crore' ? 10000000 : 1;
    out.push(Math.round(n * mult));
  }
  return out;
}

/**
 * Assemble only the facts relevant to this question. Kept deliberately small:
 * the whole catalogue plus a few state figures, not the 80k-branch locator.
 */
export function buildGrounding(message: string) {
  const catalogue = toolGetAllSchemes();
  const state = detectState(message);
  const amounts = detectAmounts(message);
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

  // only run the recommender when the user actually gave numbers to work with
  if (amounts.length > 0) {
    const cost = amounts[0];
    const income = amounts[1] ?? 200000;
    facts.recommendationForTheseNumbers = toolRecommend({
      state: state ?? undefined,
      projectCost: cost,
      annualIncome: income,
      projectType: isEducation ? 'education' : 'shop',
    });
    facts.interpretedAs = { projectCost: cost, annualIncome: income, education: isEducation };
  }

  return facts;
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
- Amounts are Indian rupees; format them Indian-style (₹1,50,000) and use
  lakh/crore naturally.
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
  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

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
      generationConfig: { temperature: 0.3, maxOutputTokens: 3000 },
    }),
  });

  const json: any = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json?.error?.message ?? `Gemini returned HTTP ${res.status}`);
  }

  const reply = (json.candidates?.[0]?.content?.parts ?? [])
    .map((p: any) => p.text).filter(Boolean).join('').trim();

  if (!reply) {
    const why = json.candidates?.[0]?.finishReason;
    throw new Error(why ? `Gemini returned no text (${why})` : 'Gemini returned no text');
  }
  return { reply, grounding };
}
