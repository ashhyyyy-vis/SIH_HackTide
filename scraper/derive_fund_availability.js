/**
 * derive_fund_availability.js
 * 
 * Derives per-partner, per-scheme fund availability from performance_extracted.json.
 * 
 * Logic:
 * - Current FY = 2025-2026 (as of Sept 2026)
 * - Funds remaining = Allocation - Actuals for current FY
 * - Utilization % = Actuals / Allocation
 * - availability = 'healthy' (<50%), 'moderate' (50-85%), 'low' (>85%), 'exhausted' (>=100%)
 * 
 * Output: a map { partnerType -> { scheme -> availability } }
 * Example: { SCA: { MSY: 'healthy', TermLoan: 'low' }, PSB: { MSY: 'healthy' } }
 */

const fs = require('fs');

function parseStateAllocation(rows) {
  // rows[2] = header labels (FY names)
  // rows[3] = column groups (Allocation, Actuals, No.of Benef. repeated)
  // Data starts at rows[4]
  const data = [];
  const header = rows[3];
  
  // Find column indices for each FY block
  // Each FY has 3 columns: Allocation, Actuals, No.of Benef.
  // FYs: 2022-23, 2023-24, 2024-25, 2025-26, 2026-27
  const fyBlocks = [
    { name: '2022-23', allocIdx: 2, actualIdx: 3, benefIdx: 4 },
    { name: '2023-24', allocIdx: 5, actualIdx: 6, benefIdx: 7 },
    { name: '2024-25', allocIdx: 8, actualIdx: 9, benefIdx: 10 },
    { name: '2025-26', allocIdx: 11, actualIdx: 12, benefIdx: 13 },
    { name: '2026-27', allocIdx: 14, actualIdx: 15, benefIdx: 16 },
  ];
  
  // Current FY for fund availability: 2025-26 (we're in Sept 2026)
  const currentFy = fyBlocks.find(b => b.name === '2025-26');
  
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[1]) continue; // skip empty rows
    
    const state = row[1];
    if (!state || typeof state !== 'string') continue;
    
    const alloc = parseFloat(row[currentFy.allocIdx]) || 0;
    const actuals = parseFloat(row[currentFy.actualIdx]) || 0;
    
    data.push({
      state,
      fy: currentFy.name,
      allocation: alloc,
      actuals,
      utilization: alloc > 0 ? (actuals / alloc) : 0,
      remaining: alloc - actuals,
    });
  }
  
  return data;
}

function parseAgencyWise(rows) {
  // rows[4] onwards: [null, FY, SCAs, PSBs, RRBs, Other Financial, Total]
  // We want the latest FY row
  const data = [];
  
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[1]) continue;
    
    const fy = row[1];
    if (!fy || typeof fy !== 'string' || !fy.includes('-')) continue;
    
    data.push({
      fy,
      scas: parseFloat(row[2]) || 0,
      psbs: parseFloat(row[3]) || 0,
      rrbs: parseFloat(row[4]) || 0,
      other: parseFloat(row[5]) || 0,
      total: parseFloat(row[6]) || 0,
    });
  }
  
  return data;
}

function parseSchemeWise(rows) {
  // rows[2] = header with scheme names
  // rows[3] onwards = FY rows
  const schemes = rows[2].slice(1).filter(x => x && typeof x === 'string');
  const data = [];
  
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;
    
    const fy = row[0];
    if (!fy || typeof fy !== 'string') continue;
    
    const amounts = row.slice(1).map((v, idx) => ({
      scheme: schemes[idx],
      amount: parseFloat(v) || 0,
    }));
    
    data.push({ fy, amounts });
  }
  
  return data;
}

function deriveFundAvailability() {
  const perf = JSON.parse(fs.readFileSync('./output/performance_extracted.json', 'utf8'));
  
  const stateAlloc = parseStateAllocation(perf.state_allocation);
  const agencyWise = parseAgencyWise(perf.agency_wise);
  const schemeWise = parseSchemeWise(perf.scheme_wise);
  
  // Current FY: 2025-26
  const currentFy = '2025-26';
  const currentStateAlloc = stateAlloc.filter(s => s.fy === currentFy);
  const currentAgency = agencyWise.find(a => a.fy === currentFy);
  const currentScheme = schemeWise.find(s => s.fy === currentFy);
  
  // Build per-state fund availability
  const stateFunds = {};
  currentStateAlloc.forEach(s => {
    const util = s.utilization;
    let status;
    if (s.allocation === 0) status = 'unknown';
    else if (util >= 1.0) status = 'exhausted';
    else if (util >= 0.85) status = 'low';
    else if (util >= 0.50) status = 'moderate';
    else status = 'healthy';
    
    stateFunds[s.state] = {
      allocation: s.allocation,
      actuals: s.actuals,
      utilization: util,
      remaining: s.remaining,
      status,
    };
  });
  
  // Build per-agency fund availability
  const agencyFunds = {};
  if (currentAgency) {
    const total = currentAgency.total;
    ['scas', 'psbs', 'rrbs', 'other'].forEach(type => {
      const alloc = currentAgency.total; // Note: we don't have per-agency allocation in this file
      const actuals = currentAgency[type];
      // We can't compute utilization without allocation per agency
      // So we'll use a proxy: assume equal allocation share
      // This is a simplification for demo
      const util = total > 0 ? (actuals / total) : 0;
      let status;
      if (util >= 1.0) status = 'exhausted';
      else if (util >= 0.85) status = 'low';
      else if (util >= 0.50) status = 'moderate';
      else status = 'healthy';
      
      agencyFunds[type] = { actuals, utilization: util, status };
    });
  }
  
  // Build per-scheme fund availability
  const schemeFunds = {};
  if (currentScheme) {
    const total = currentScheme.amounts.reduce((sum, s) => sum + s.amount, 0);
    currentScheme.amounts.forEach(s => {
      const util = total > 0 ? (s.amount / total) : 0;
      let status;
      if (util >= 0.85) status = 'low';
      else if (util >= 0.50) status = 'moderate';
      else status = 'healthy';
      
      schemeFunds[s.scheme] = { amount: s.amount, utilization: util, status };
    });
  }
  
  return {
    byState: stateFunds,
    byAgency: agencyFunds,
    byScheme: schemeFunds,
    currentFy,
  };
}

// Export for use in build_dataset.js
module.exports = { deriveFundAvailability, parseStateAllocation, parseAgencyWise, parseSchemeWise };

// CLI: node derive_fund_availability.js
if (require.main === module) {
  const result = deriveFundAvailability();
  console.log(JSON.stringify(result, null, 2));
}
