#!/usr/bin/env node
/**
 * parse_bank_branches.js
 * 
 * Parses the RBI banks.sql (142K branches) and extracts:
 * 1. All PSB branches in Tamil Nadu, Uttar Pradesh, Himachal Pradesh, Bihar
 * 2. All RRB branches in those states
 * 3. Outputs partner_branches.json with real branch data
 * 
 * NSFDC Channel Partners (PSBs):
 *   SBI, PNB, Bank of Baroda, Canara Bank, Indian Bank, Union Bank,
 *   Indian Overseas Bank, Bank of India, Central Bank, UCO Bank, Punjab & Sind Bank
 * 
 * NSFDC Channel Partners (RRBs):
 *   Bihar Gramin Bank, Dakshin Bihar Gramin Bank, Uttar Bihar Gramin Bank,
 *   Baroda UP Gramin Bank, Madhya Pradesh Gramin Bank, etc.
 */

const fs = require('fs');
const path = require('path');

const SQL_FILE = path.join(__dirname, 'data', 'banks_raw.sql');
const OUTPUT_FILE = path.join(__dirname, 'output', 'partner_branches.json');

// NSFDC PSB channel partners (case-insensitive matching)
const PSB_NAMES = [
  'STATE BANK OF INDIA',
  'PUNJAB NATIONAL BANK',
  'BANK OF BARODA',
  'CANARA BANK',
  'INDIAN BANK',
  'UNION BANK OF INDIA',
  'INDIAN OVERSEAS BANK',
  'BANK OF INDIA',
  'CENTRAL BANK OF INDIA',
  'UCO BANK',
  'PUNJAB AND SIND BANK',
];

// NSFDC RRB channel partners
const RRB_NAMES = [
  'BIHAR GRAMIN BANK',
  'DAKSHIN BIHAR GRAMIN BANK',
  'UTTAR BIHAR GRAMIN BANK',
  'BARODA UP GRAMIN BANK',
  'MADHYA PRADESH GRAMIN BANK',
  'CHHATTISGARH RAJYA GRAMIN BANK',
  'ANDHRA PRADESH GRAMENA BANK',
  'SARVA UP GRAMIN BANK',
  'KARNATAKA GRAMEENA BANK',
  'TAMIL NADU GRAMINA BANK',
  'PUDUCHERRY GRAMIN BANK',
];

// ALL states/UTs in India (nationwide coverage)
const TARGET_STATES = [
  'ANDHRA PRADESH', 'ARUNACHAL PRADESH', 'ASSAM', 'BIHAR',
  'CHHATTISGARH', 'GOA', 'GUJARAT', 'HARYANA',
  'HIMACHAL PRADESH', 'JHARKHAND', 'KARNATAKA', 'KERALA',
  'MADHYA PRADESH', 'MAHARASHTRA', 'MANIPUR', 'MEGHALAYA',
  'MIZORAM', 'NAGALAND', 'ODISHA', 'PUNJAB',
  'RAJASTHAN', 'SIKKIM', 'TAMIL NADU', 'TELANGANA',
  'TRIPURA', 'UTTAR PRADESH', 'UTTARAKHAND', 'WEST BENGAL',
  'DELHI', 'JAMMU AND KASHMIR', 'CHANDIGARH',
  'PUDUCHERRY', 'ANDAMAN AND NICOBAR ISLAND',
  'DADRA AND NAGAR HAVELI', 'DAMAN AND DIU', 'LAKSHADWEEP',
];

// NSFDC partner type mapping
const PARTNER_TYPES = {
  'STATE BANK OF INDIA': 'PSB',
  'PUNJAB NATIONAL BANK': 'PSB',
  'BANK OF BARODA': 'PSB',
  'CANARA BANK': 'PSB',
  'INDIAN BANK': 'PSB',
  'UNION BANK OF INDIA': 'PSB',
  'INDIAN OVERSEAS BANK': 'PSB',
  'BANK OF INDIA': 'PSB',
  'CENTRAL BANK OF INDIA': 'PSB',
  'UCO BANK': 'PSB',
  'PUNJAB AND SIND BANK': 'PSB',
};

// Mark RRBs
for (const rrb of RRB_NAMES) {
  PARTNER_TYPES[rrb] = 'RRB';
}

function parseSQL(sqlContent) {
  const branches = [];
  
  // Match INSERT INTO `banks` ... VALUES
  // Each row: (id, 'BANK', 'IFSC', 'MICR', 'BRANCH', 'ADDRESS', 'CONTACT', 'CITY', 'DISTRICT', 'STATE')
  const valueRegex = /\((\d+),\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)'\)/g;
  
  let match;
  while ((match = valueRegex.exec(sqlContent)) !== null) {
    const [, id, bank, ifsc, micr, branch, address, contact, city, district, state] = match;
    
    branches.push({
      id: parseInt(id),
      bank: bank.trim(),
      ifsc: ifsc.trim(),
      micr: micr.trim(),
      branch: branch.trim(),
      address: address.trim(),
      contact: contact.trim(),
      city: city.trim(),
      district: district.trim(),
      state: state.trim(),
    });
  }
  
  return branches;
}

function normalizeState(state) {
  const map = {
    'TAMIL NADU': 'Tamil Nadu',
    'UTTAR PRADESH': 'Uttar Pradesh',
    'HIMACHAL PRADESH': 'Himachal Pradesh',
    'BIHAR': 'Bihar',
  };
  return map[state.toUpperCase()] || state;
}

function main() {
  console.log('Reading SQL file...');
  const sql = fs.readFileSync(SQL_FILE, 'utf-8');
  console.log(`SQL file size: ${(sql.length / 1024 / 1024).toFixed(1)} MB`);
  
  console.log('Parsing branches...');
  const allBranches = parseSQL(sql);
  console.log(`Total branches parsed: ${allBranches.length}`);
  
  // Filter: target states + NSFDC partner banks
  const allPartnerBanks = [...PSB_NAMES, ...RRB_NAMES];
  
  const filtered = allBranches.filter(b => {
    const stateMatch = TARGET_STATES.includes(b.state.toUpperCase());
    const bankMatch = allPartnerBanks.some(pb => 
      b.bank.toUpperCase().includes(pb) || pb.includes(b.bank.toUpperCase())
    );
    return stateMatch && bankMatch;
  });
  
  console.log(`Filtered branches (target states + NSFDC partners): ${filtered.length}`);
  
  // Group by state
  const byState = {};
  for (const b of filtered) {
    const state = normalizeState(b.state);
    if (!byState[state]) byState[state] = [];
    byState[state].push(b);
  }
  
  for (const [state, branches] of Object.entries(byState)) {
    const bankCounts = {};
    for (const b of branches) {
      bankCounts[b.bank] = (bankCounts[b.bank] || 0) + 1;
    }
    console.log(`\n${state}: ${branches.length} branches`);
    for (const [bank, count] of Object.entries(bankCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${bank}: ${count}`);
    }
  }
  
  // Build output format
  const output = filtered.map(b => {
    const bankUpper = b.bank.toUpperCase();
    let partnerType = 'PSB';
    let nsfdcPartnerName = b.bank;
    
    // Check RRB
    for (const rrb of RRB_NAMES) {
      if (bankUpper.includes(rrb) || rrb.includes(bankUpper)) {
        partnerType = 'RRB';
        nsfdcPartnerName = rrb;
        break;
      }
    }
    
    return {
      partnerName: nsfdcPartnerName,
      partnerType,
      branchName: b.branch,
      ifsc: b.ifsc,
      address: b.address,
      contact: b.contact,
      city: b.city,
      district: b.district,
      state: normalizeState(b.state),
    };
  });
  
  // Write output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${output.length} branches to ${OUTPUT_FILE}`);
  
  // Also write a summary
  const summary = {
    totalBranches: output.length,
    byState: {},
    byPartnerType: {},
    byBank: {},
  };
  
  for (const b of output) {
    summary.byState[b.state] = (summary.byState[b.state] || 0) + 1;
    summary.byPartnerType[b.partnerType] = (summary.byPartnerType[b.partnerType] || 0) + 1;
    summary.byBank[b.partnerName] = (summary.byBank[b.partnerName] || 0) + 1;
  }
  
  const summaryFile = path.join(__dirname, 'output', 'partner_branches_summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  console.log(`Summary: ${summaryFile}`);
}

main();
