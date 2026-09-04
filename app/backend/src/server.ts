import express from 'express';
import cors from 'cors';
import { TOOLS, toolTranslate } from './tools.js';
import { dataset, locator } from './data.js';

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
  if (!tool || !TOOLS[tool]) return res.status(400).json({ error: `Unknown tool: ${tool}. Available: ${Object.keys(TOOLS).join(', ')}` });
  try {
    const fn = TOOLS[tool].fn as any;
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

  // Parse income
  const incomeMatch = lower.match(/(?:income|earning)[:\s]*₹?\s*([\d.]+)/);
  const income = incomeMatch ? Number(incomeMatch[1].replace(/l$/i, '00000')) * 100000 : 200000;

  // Parse cost
  const costMatch = lower.match(/(?:cost|loan|amount|₹)[:\s]*₹?\s*([\d.]+)/);
  const cost = costMatch ? Number(costMatch[1].replace(/l$/i, '00000')) * 100000 : 50000;

  // Tool 1: recommend schemes
  if (!requestedTools || requestedTools.includes('recommend')) {
    const recResult = TOOLS.recommend.fn({ state, projectCost: cost, annualIncome: income });
    results.push({ tool: 'recommend', result: recResult });
  }

  // Tool 2: nearest partners (if state found)
  if (state && (!requestedTools || requestedTools.includes('nearestPartners'))) {
    const statesData = TOOLS.getStates.fn();
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
  const result = TOOLS.schemeDetails.fn(req.params.code);
  res.json(result);
});

app.get('/api/states', (_req, res) => {
  const result = TOOLS.getStates.fn();
  res.json(result);
});

app.get('/api/caste/:caste', (req, res) => {
  const result = TOOLS.checkCaste.fn(req.params.caste);
  res.json(result);
});

app.get('/api/fund/:state', (req, res) => {
  const result = TOOLS.fundAvailability.fn(req.params.state);
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
