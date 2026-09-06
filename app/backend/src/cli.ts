#!/usr/bin/env node
/**
 * PS92 CLI Demo — test all AI tools
 * Run: node src/cli.ts
 */
import { toolRecommend, toolEMI, toolFindPartners, toolNearestPartners, toolSchemeDetails, toolGetAllSchemes, toolGetStates, toolCheckCaste, toolFundAvailability, toolStateSchemeAvailability, toolSchemeGraph } from './tools.js';

const API = 'http://localhost:3001/api';

async function call(method: string, path: string, body?: any): Promise<any> {
  const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${API}${path}`, opts);
  return r.json();
}

async function main() {
  console.log('\n🏦 PS92 CLI Demo\n' + '═'.repeat(40));

  // 1. Health
  const health = await call('GET', '/health');
  console.log(`\n✅ API: ${health.schemes} schemes, ${health.branches} branches\n`);

  // 2. Recommend
  console.log('📋 Tool: recommend — ₹50,000 shop project, ₹2L income, Tamil Nadu');
  const rec = toolRecommend({ state: 'Tamil Nadu', projectCost: 50000, annualIncome: 200000, projectType: 'shop' });
  rec.recommendations.slice(0, 3).forEach((r: any, i: number) => {
    console.log(`  ${i+1}. ${r.name} (${r.type})`);
    console.log(`     Rate: ${r.rate}% | EMI: ₹${r.monthlyEMI}/mo | Coverage: ${r.coverage}%`);
  });

  // 3. EMI
  console.log('\n📊 Tool: emi — ₹50,000, 8%, 5yr, 3mo moratorium');
  const emi = toolEMI({ amount: 50000, rate: 8, tenureYears: 5, moratoriumMonths: 3 });
  console.log(`  Principal after moratorium: ₹${emi.principal}`);
  console.log(`  Quarterly installment: ₹${emi.quarterlyInstallment}`);
  console.log(`  Total interest: ₹${emi.totalInterest}`);
  console.log(`  Schedule: ${emi.schedule.length} quarters`);

  // 4. States
  console.log('\n🗺️ Tool: getStates');
  const states = toolGetStates();
  console.log(`  ${states.states.slice(0, 5).join(', ')}... (${states.count} total)`);

  // 5. Caste check
  console.log('\n👥 Tool: checkCaste — "Chamar"');
  const caste = toolCheckCaste('Chamar');
  console.log(`  Found: ${caste.found} | ${caste.note}`);

  // 6. Fund availability
  console.log('\n💰 Tool: fundAvailability — Tamil Nadu');
  const fa = toolFundAvailability('Tamil Nadu');
  console.log(`  Status: ${fa.status} | Utilization: ${((fa.utilization ?? 0)*100).toFixed(0)}%`);

  // 7. State schemes
  console.log('\n🏛️ Tool: stateSchemeAvailability — Bihar');
  const ssa = toolStateSchemeAvailability('Bihar');
  console.log(`  ${ssa.schemes.length} schemes: ${ssa.schemes.map((s: any) => s.name).join(', ')}`);

  // 8. Scheme graph
  console.log('\n🔗 Tool: schemeGraph');
  const graph = toolSchemeGraph();
  console.log(`  ${graph.totalNodes} scheme nodes | Sample edges:`);
  graph.edges.slice(0, 3).forEach((e: any) => console.log(`    ${e.from} → ${e.to}`));

  // 9. AI Agent (multi-tool)
  console.log('\n🤖 Tool: ai/agent — "find a shop loan in Maharashtra with 2L income"');
  const agent = await call('POST', '/ai/agent', { goal: 'find a shop loan in Maharashtra with 2L income' });
  console.log(`  Parsed state: ${agent.state} | Cost: ₹${agent.parsedCost} | Income: ₹${agent.parsedIncome}`);
  console.log(`  Agent steps: ${agent.agentSteps}`);
  agent.results.forEach((r: any) => {
    if (r.tool === 'recommend') {
      r.result.recommendations.slice(0, 2).forEach((s: any) => console.log(`  [${s.name}] EMI ₹${s.monthlyEMI}/mo, ${s.coverage}% coverage`));
    }
  });

  console.log('\n✅ All tools working!\n');
}

main().catch(console.error);
