import express from 'express';
import cors from 'cors';
import { TOOLS, toolTranslate } from './tools.js';
import { dataset, locator } from './data.js';
import { geminiChat, geminiConfigured } from './services/gemini.js';

/* Load app/backend/.env without adding a dotenv dependency. Node exposes
   loadEnvFile() from v20.12; if it is missing or the file is absent we simply
   run without a key and /api/chat reports that it is unconfigured. */
try {
  (process as any).loadEnvFile?.(new URL('../.env', import.meta.url).pathname);
} catch {
  // no .env present — fine for the endpoints that need no secret
}

const app = express();
app.use(cors(), express.json());

console.log(`✅ Schemes: ${dataset.schemes.length} | State: ${dataset.state_schemes.length} | Branches: ${locator.length}`);

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true, schemes: dataset.schemes.length, branches: locator.length }));

// ─── Tool Registry — AI calls this to know what tools exist ──────────────────
app.get('/api/tools', (_req, res) => {
  const registry = Object.entries(TOOLS).map(([name, t]) => ({
    name,
    description: t.description,
    parameters: 'any',
  }));
  res.json({ tools: registry, total: registry.length });
});

// ─── AI Tool Executor ────────────────────────────────────────────────────────
// POST /api/ai/execute  { tool: "recommend", input: { ... } }
app.post('/api/ai/execute', async (req, res) => {
  const { tool, input } = req.body ?? {};
  const registry = TOOLS as unknown as Record<string, { fn: (i: any) => unknown; description: string }>;
  if (!tool || !registry[tool]) return res.status(400).json({ error: `Unknown tool: ${tool}. Available: ${Object.keys(registry).join(', ')}` });
  try {
    const fn = registry[tool].fn as (i: any) => unknown;
    const result = await fn(input ?? {});
    res.json({ tool, result });
  } catch (e: any) {
    res.status(500).json({ tool, error: e.message });
  }
});

// ─── AI Agent — runs multiple tools in sequence ───────────────────────────────
// POST /api/ai/agent  { goal: "find a scheme for a shop in UP with 2L income" }
app.post('/api/ai/agent', async (req, res) => {
  const { goal, tools: requestedTools } = req.body ?? {};
  if (!goal) return res.status(400).json({ error: 'goal required' });

  // Simple rule-based agent: parse goal and call appropriate tools
  const lower = goal.toLowerCase();
  const results: any[] = [];

  // Parse location — match "in STATE" at end of sentence
  const STATES = ['andhra pradesh','arunachal pradesh','assam','bihar','chhattisgarh','goa','gujarat','haryana','himachal pradesh','jharkhand','karnataka','kerala','madhya pradesh','maharashtra','manipur','meghalaya','mizoram','nagaland','odisha','punjab','rajasthan','sikkim','tamil nadu','telangana','tripura','uttar pradesh','uttarakhand','west bengal','delhi'];
  let state: string | null = null;
  for (const s of STATES) { if (lower.includes(s)) { state = s.replace(/\b\w/g, c => c.toUpperCase()); break; } }
  if (!state && (lower.includes(' up') || lower.includes('u.p'))) state = 'Uttar Pradesh';
  if (!state && lower.includes(' tn ')) state = 'Tamil Nadu';

  // Parse money mentions — handles "₹1.5 lakh", "₹50,000", "2L", "800000", "50 thousand"
  const moneyPerm: Array<{ n: number; i: number }> = [];
  {
    const re = /(?:₹|rs\.?)?\s*(\d[\d,]*(?:\.\d+)?)\s*(l|lakh|k|thousand|hundred)?/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(lower))) {
      if (!m[1]) continue;
      const raw = Number(m[1].replace(/,/g, ''));
      const mult = m[2] === 'l' || m[2] === 'lakh' ? 100000
        : m[2] === 'k' || m[2] === 'thousand' ? 1000
        : m[2] === 'hundred' ? 100 : 1;
      moneyPerm.push({ n: Math.round(raw * mult), i: m.index });
    }
  }

  // Income = amount that follows (or is attached to) "income"/"earning"
  const incomeAt = lower.search(/(income|earning)\b/);
  let income = 200000;
  if (incomeAt >= 0) {
    const beforeIncome = moneyPerm.filter((p) => p.i < incomeAt);
    const next = moneyPerm.find((p) => p.i >= incomeAt);
    income = next?.n ?? beforeIncome.at(-1)?.n ?? income;
  }

  // Cost = amount tied to the project ("cost" word, else the first non-income amount)
  let cost = 50000;
  const costWordAt = lower.search(/project\s+cost|cost\b/);
  if (moneyPerm[0]) {
    if (costWordAt >= 0) {
      const after = moneyPerm.find((p) => p.i >= costWordAt && !(incomeAt >= 0 && (p.i >= incomeAt || moneyPerm.findIndex((q) => q.i === p.i) === moneyPerm.length - 1)));
      cost = after?.n ?? moneyPerm[0].n;
    } else if (incomeAt >= 0) {
      const beforeIncome = moneyPerm.filter((p) => p.i < incomeAt);
      cost = beforeIncome[0]?.n ?? moneyPerm[0].n;
    } else {
      cost = moneyPerm[0].n;
    }
  }

  // Tool 1: recommend schemes
  if (!requestedTools || requestedTools.includes('recommend')) {
    const isEducation = /education|educational|degree|study|course|college|school/.test(lower);
    const projectType = isEducation ? 'education' : /agriculture|farm|crop|dairy|animal/.test(lower) ? 'agriculture'
      : /factory|manufactur|production/.test(lower) ? 'manufacturing'
      : /service|repair|transport|trading/.test(lower) ? 'services'
      : 'shop';
    const recResult = TOOLS.recommend.fn({ state: state ?? undefined, projectCost: cost, projectType, annualIncome: income });
    results.push({ tool: 'recommend', result: recResult });
  }

  // Tool 2: nearest partners (if state found)
  if (state && (!requestedTools || requestedTools.includes('nearestPartners'))) {
    const statesData = TOOLS.getStates.fn() as { states: string[]; count: number };
    const matchedState = statesData.states.find((s: string) => s.toLowerCase().includes(state.toLowerCase()));
    if (matchedState) {
      // Get a sample lat/lng from locator for that state
      const sample = locator.find((b: any) => b.state === matchedState);
      if (sample) {
        const nearResult = TOOLS.nearestPartners.fn({ lat: sample.lat, lng: sample.lng, radiusKm: 50, limit: 5, state: matchedState });
        results.push({ tool: 'nearestPartners', result: nearResult });
      }
    }
  }

  // Tool 3: fund availability
  if (state && (!requestedTools || requestedTools.includes('fundAvailability'))) {
    const faResult = TOOLS.fundAvailability.fn(state);
    results.push({ tool: 'fundAvailability', result: faResult });
  }

  // Tool 4: state scheme availability
  if (state && (!requestedTools || requestedTools.includes('stateSchemeAvailability'))) {
    const ssaResult = TOOLS.stateSchemeAvailability.fn(state);
    results.push({ tool: 'stateSchemeAvailability', result: ssaResult });
  }

  res.json({ goal, state, parsedIncome: income, parsedCost: cost, agentSteps: results.length, results });
});

// ─── Conversational chat (Gemini, grounded in this dataset) ──────────────────
// POST /api/chat  { message: string, history?: [{role:'user'|'model', text}] }
app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body ?? {};

  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }
  if (message.length > 2000) {
    return res.status(413).json({ error: 'message too long' });
  }
  if (!geminiConfigured()) {
    // explicit, so the client can fall back to the rule-based agent
    return res.status(503).json({ error: 'Chat is not configured on the server', configured: false });
  }

  try {
    const { reply, grounding } = await geminiChat(
      message.trim(),
      Array.isArray(history) ? history : [],
    );
    res.json({
      reply,
      // let the UI offer "open calculator" / "see partners" without re-asking
      state: (grounding as any).detectedState ?? null,
      recommendation:
        (grounding as any).recommendationForTheseNumbers?.recommendations?.[0] ?? null,
    });
  } catch (e: any) {
    if (e?.rateLimited) {
      // the free tier allows 20 requests/minute; tell the client so it can
      // fall back to the rule-based agent rather than failing outright
      console.warn('chat rate-limited by Gemini');
      return res.status(429).json({
        error: 'Rate limited by the AI provider',
        retryAfterSeconds: e.retryAfterSeconds ?? 30,
      });
    }
    console.error('chat error:', e.message);
    res.status(502).json({ error: 'Chat service failed', detail: e.message });
  }
});

// tells the frontend whether to show the LLM chat or the rule-based agent
app.get('/api/chat/status', (_req, res) => res.json({ configured: geminiConfigured() }));

// ─── Scheme Graph ─────────────────────────────────────────────────────────────
app.get('/api/graph/schemes', (_req, res) => {
  const graph = TOOLS.schemeGraph.fn();
  res.json(graph);
});

// ─── Core Tools ──────────────────────────────────────────────────────────────
app.post('/api/recommend', (req, res) => {
  const result = TOOLS.recommend.fn(req.body);
  res.json(result);
});

app.post('/api/emi', async (req, res) => {
  const result = TOOLS.emi.fn(req.body);
  res.json(result);
});

app.get('/api/partners', (req, res) => {
  const result = TOOLS.findPartners.fn(req.query as any);
  res.json(result);
});

app.get('/api/partners/nearest', (req, res) => {
  const result = TOOLS.nearestPartners.fn(req.query as any);
  res.json(result);
});

app.get('/api/schemes', (_req, res) => {
  const result = TOOLS.getAllSchemes.fn();
  res.json(result);
});

app.get('/api/schemes/:code', (req, res) => {
  const result = TOOLS.schemeDetails.fn(req.params.code) as any;
  // a missing scheme is a 404, not a 200 carrying an error string
  if (result?.error) return res.status(404).json(result);
  res.json(result);
});

app.get('/api/states', (_req, res) => {
  const result = TOOLS.getStates.fn();
  res.json(result);
});

app.get('/api/caste/:caste', (req, res) => {
  const result = TOOLS.checkCaste.fn(req.params.caste) as any;
  if (result?.found === false) return res.status(404).json(result);
  res.json(result);
});

app.get('/api/fund/:state', (req, res) => {
  const result = TOOLS.fundAvailability.fn(req.params.state) as any;
  if (result?.status === 'unknown') return res.status(404).json(result);
  res.json(result);
});

app.post('/api/translate', async (req, res) => {
  const result = await toolTranslate(req.body);
  res.json(result);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 PS92 API ready at http://localhost:${PORT}`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/tools          ← AI tool registry`);
  console.log(`   POST /api/ai/execute     ← call single tool`);
  console.log(`   POST /api/ai/agent       ← multi-tool agent`);
  console.log(`   POST /api/chat           ← Gemini chat ${geminiConfigured() ? '(key loaded)' : '(NO KEY — set GEMINI_API_KEY)'}`);
  console.log(`   POST /api/recommend`);
  console.log(`   POST /api/emi`);
  console.log(`   GET  /api/partners`);
  console.log(`   GET  /api/partners/nearest?lat=&lng=&radius=`);
  console.log(`   GET  /api/schemes`);
  console.log(`   GET  /api/schemes/:code`);
  console.log(`   GET  /api/states`);
  console.log(`   GET  /api/caste/:caste`);
  console.log(`   GET  /api/fund/:state`);
  console.log(`   POST /api/translate`);
  console.log(`   GET  /api/graph/schemes`);
});
