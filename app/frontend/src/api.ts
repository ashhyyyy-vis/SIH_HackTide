import type {
  EmiResponse, FundResponse, NearestResponse, PartnersResponse,
  RecommendResponse, SchemesResponse, TranslateResult,
} from './types';

const API = import.meta.env.VITE_API_URL ?? '/api';

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

export const api = {
  health: () => get<{ ok: boolean; schemes: number; branches: number }>('/health'),
  recommend: (input: Record<string, unknown>) => post<RecommendResponse>('/recommend', input),
  emi: (input: { amount: number; rate: number; tenureYears: number; moratoriumMonths?: number }) => post<EmiResponse>('/emi', input),
  partners: (params: Record<string, string | number | boolean>) => {
    const q = new URLSearchParams(params as Record<string, string>);
    return get<PartnersResponse>(`/partners?${q}`);
  },
  nearest: (params: Record<string, string | number | boolean>) => {
    const q = new URLSearchParams(params as Record<string, string>);
    return get<NearestResponse>(`/partners/nearest?${q}`);
  },
  schemes: () => get<SchemesResponse>('/schemes'),
  fund: (state: string) => get<FundResponse>(`/fund/${encodeURIComponent(state)}`),
  translate: (input: { text: string; sourceLang?: string; targetLang: string }) =>
    post<TranslateResult>('/translate', input),
};

export interface AgentResult {
  tool: string;
  result: any;
}

export interface AgentResponse {
  goal: string;
  state: string | null;
  parsedIncome: number;
  parsedCost: number;
  agentSteps?: number;
  results: AgentResult[];
}

export function agentQuery(goal: string): Promise<AgentResponse> {
  return post<AgentResponse>('/ai/agent', { goal });
}