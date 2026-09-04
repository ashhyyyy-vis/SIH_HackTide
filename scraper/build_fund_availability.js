/**
 * build_fund_availability.js
 * 
 * Builds real fund availability model from NSFDC performance data.
 * Uses actual allocation vs actuals from performance_extracted.json.
 */

const fs = require('fs');
const path = require('path');

const DATASET_FILE = path.join(__dirname, 'data', 'ps92_dataset.json');
const PERF_FILE = path.join(__dirname, 'output', 'performance_extracted.json');

function main() {
  const dataset = JSON.parse(fs.readFileSync(DATASET_FILE, 'utf8'));
  const perf = JSON.parse(fs.readFileSync(PERF_FILE, 'utf8'));
  
  // Parse state allocation
  // Use FY 2024-25 as the most recent completed year for a realistic utilization picture
  // FY 2025-26 is nearly over (we're Sept 2026) and shows ~100% utilization
  // FY 2026-27 just started in July 2026
  const rows = perf.state_allocation;
  const reportingFy = '2024-25';
  
  // Find column indices for 2024-25
  // 2022-23: cols 2,3,4
  // 2023-24: cols 5,6,7
  // 2024-25: cols 8,9,10
  const allocIdx = 8;
  const actualsIdx = 9;
  
  const stateFunds = {};
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[1]) continue;
    
    const state = row[1];
    if (typeof state !== 'string') continue;
    
    // Skip total/summary rows
    if (state.toLowerCase().includes('total') || state.toLowerCase().includes('grand')) continue;
    
    const alloc = parseFloat(row[allocIdx]) || 0;
    const actuals = parseFloat(row[actualsIdx]) || 0;
    
    if (alloc > 0) {
      const utilization = actuals / alloc;
      let status, label;
      // Cap utilization at 1.0 for exhausted status (carry-forward is real but >100% is just over-utilization)
      const cappedUtil = Math.min(utilization, 1.0);
      if (cappedUtil >= 1.0) { status = 'exhausted'; label = 'FY 2025-26 funds exhausted'; }
      else if (cappedUtil >= 0.85) { status = 'low'; label = 'FY 2025-26 funds low (85%+ used)'; }
      else if (cappedUtil >= 0.50) { status = 'moderate'; label = 'FY 2025-26 funds moderate'; }
      else { status = 'healthy'; label = 'FY 2025-26 funds healthy'; }
      
      stateFunds[state] = {
        allocation_lakh: alloc,
        actuals_lakh: actuals,
        utilization: cappedUtil,
        status,
        label,
        remaining_lakh: alloc - actuals,
        overutilized: utilization > 1.0, // Flag if actuals > allocation (carry-forward from prev FY)
      };
    }
  }
  
  // Parse scheme-wise for current FY
  const schemeRows = perf.scheme_wise;
  const currentFyRow = schemeRows.find(r => r[0] === reportingFy);
  const schemeNames = schemeRows[2].slice(1).filter(x => x);
  
  const schemeFunds = {};
  if (currentFyRow) {
    const amounts = currentFyRow.slice(1);
    const total = amounts.reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
    
    schemeNames.forEach((name, idx) => {
      const amount = parseFloat(amounts[idx]) || 0;
      if (amount > 0) {
        schemeFunds[name] = { amount_crore: amount };
      }
    });
  }
  
  // Build fund_availability object
  dataset.fund_availability = {
    reporting_fy: reportingFy,
    data_source: 'NSFDC Performance Reports FY 2024-25 (as on 31.03.2025)',
    by_state: stateFunds,
    by_scheme: schemeFunds,
    derived_at: new Date().toISOString(),
    note: 'Fund utilization = Actuals / Allocation. Status: healthy (<50%), moderate (50-85%), low (85-100%), exhausted (≥100%)',
  };
  
  // Also add per-state scheme eligibility (which schemes are available in which state)
  dataset.state_scheme_availability = {};
  for (const scheme of dataset.state_schemes) {
    if (!dataset.state_scheme_availability[scheme.state]) {
      dataset.state_scheme_availability[scheme.state] = [];
    }
    dataset.state_scheme_availability[scheme.state].push({
      code: scheme.code,
      name: scheme.name,
      income_limit: scheme.income_limit,
    });
  }
  
  fs.writeFileSync(DATASET_FILE, JSON.stringify(dataset, null, 2));
  
  console.log('✅ Built fund availability model');
  console.log(`   States with data: ${Object.keys(stateFunds).length}`);
  console.log(`   States with exhausted funds:`);
  for (const [state, fund] of Object.entries(stateFunds)) {
    if (fund.status === 'exhausted' || fund.status === 'low') {
      console.log(`     ${state}: ${(fund.utilization * 100).toFixed(1)}% used (${fund.allocation_lakh} lakh alloc, ${fund.actuals_lakh} lakh actuals)`);
    }
  }
}

main();
