/**
 * fetch_rrb_branches.js
 * 
 * Fetches RRB branches from Razorpay's IFSC dataset and merges with our locator.
 * 
 * Steps:
 * 1. Download latest IFSC.csv from Razorpay releases
 * 2. Extract branches for all RRB banks
 * 3. Map old RRB names to our consolidated RRB names
 * 4. Merge with existing locator (PSB + SCA) to create new locator with RRBs
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Our RRB list from dataset (25 consolidated RRBs)
const OUR_RRBS = [
  'Bihar Gramin Bank',
  'Maharashtra Gramin Bank',
  'Jharkhand Gramin Bank',
  'Haryana Gramin Bank',
  'Gujarat Gramin Bank',
  'Telangana Grameena Bank',
  'Rajasthan Gramin Bank',
  'Uttar Pradesh Gramin Bank',
  'Kerala Grameena Bank',
  'Uttarakhand Gramin Bank',
  'Tripura Gramin Bank',
  'Karnataka Grameena Bank',
  'Assam Gramin Bank',
  'Andhra Pradesh Grameena Bank',
  'Punjab Gramin Bank',
  'Tamil Nadu Grama Bank',
  'Madhya Pradesh Gramin Bank',
  'Himachal Pradesh Gramin Bank',
  'Puducherry Grama Bank',
  'West Bengal Gramin Bank',
  'Chhattisgarh Gramin Bank',
  'Manipur Rural Bank',
  'Meghalaya Rural Bank',
  'J&K Grameen Bank',
  'Odisha Grameen Bank',
  'Mizoram Rural Bank',
];

// Mapping from our consolidated RRB names to old RRB names in IFSC data
// Based on 2020 RRB consolidation
const RRB_MAPPING = {
  'Bihar Gramin Bank': ['Dakshin Bihar Gramin Bank', 'Uttar Bihar Gramin Bank'],
  'Maharashtra Gramin Bank': ['Maharashtra Gramin Bank'],
  'Jharkhand Gramin Bank': ['Jharkhand Rajya Gramin Bank'],
  'Haryana Gramin Bank': ['Sarva Haryana Gramin Bank'],
  'Gujarat Gramin Bank': ['Saurashtra Gramin Bank', 'Baroda Gujarat Gramin Bank'],
  'Telangana Grameena Bank': ['TELANGANA GRAMEENA BANK'],
  'Rajasthan Gramin Bank': ['Rajasthan Marudhara Gramin Bank'],
  'Uttar Pradesh Gramin Bank': ['Baroda Uttar Pradesh Gramin Bank', 'Prathama UP Gramin Bank', 'Sarva Haryana Gramin Bank'],
  'Kerala Grameena Bank': ['Kerala Gramin Bank'],
  'Uttarakhand Gramin Bank': ['Uttarakhand Gramin Bank'],
  'Tripura Gramin Bank': ['Tripura Gramin Bank'],
  'Karnataka Grameena Bank': ['Karnataka Gramin Bank', 'Karnataka Vikas Grameena Bank', 'Chaitanya Godavari Grameena Bank'],
  'Assam Gramin Bank': ['Assam Gramin Vikash Bank'],
  'Andhra Pradesh Grameena Bank': ['Andhra Pradesh Grameena Vikas Bank', 'Andhra Pragathi Grameena Bank'],
  'Punjab Gramin Bank': ['Punjab Gramin Bank'],
  'Tamil Nadu Grama Bank': ['Tamil Nadu Grama Bank'],
  'Madhya Pradesh Gramin Bank': ['Madhyanchal Gramin Bank', 'Vidharbha Kokan Gramin Bank'],
  'Himachal Pradesh Gramin Bank': ['Himachal Pradesh Gramin Bank'],
  'Puducherry Grama Bank': ['Puducherry Grama Bank'],
  'West Bengal Gramin Bank': ['Paschim Banga Gramin Bank', 'Uttarbanga Kshetriya Gramin Bank', 'Bangiya Gramin Vikash Bank'],
  'Chhattisgarh Gramin Bank': ['Chhattisgarh Rajya Gramin Bank'],
  'Manipur Rural Bank': ['Manipur Rural Bank'],
  'Meghalaya Rural Bank': ['Meghalaya Rural Bank'],
  'J&K Grameen Bank': ['J&K Grameen Bank'],
  'Odisha Grameen Bank': ['Utkal Grameen Bank'],
  'Mizoram Rural Bank': ['Mizoram Rural Bank'],
};

// Download file
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(dest);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

// Parse IFSC CSV and extract RRB branches
function extractRRBBranches(csvPath) {
  const csv = fs.readFileSync(csvPath, 'utf8');
  const lines = csv.split('\n');
  const header = lines[0].split(',').map(h => h.trim());
  
  const branches = [];
  const ifscToBank = {}; // IFSC -> bank name mapping
  
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(c => c.trim());
    if (row.length < header.length) continue;
    
    const bank = row[header.indexOf('BANK')];
    const ifsc = row[header.indexOf('IFSC')];
    const branch = row[header.indexOf('BRANCH')];
    const centre = row[header.indexOf('CENTRE')];
    const district = row[header.indexOf('DISTRICT')];
    const state = row[header.indexOf('STATE')];
    const address = row[header.indexOf('ADDRESS')];
    const contact = row[header.indexOf('CONTACT')];
    
    if (!bank || !ifsc) continue;
    
    // Check if this bank is an RRB (old name)
    const bankUpper = bank.toUpperCase();
    const isRRB = bankUpper.includes('GRAMIN') || bankUpper.includes('GRAMEEN') || bankUpper.includes('RRB');
    
    if (isRRB) {
      branches.push({
        bank,
        ifsc,
        branch,
        centre,
        district,
        state,
        address,
        contact,
      });
      ifscToBank[ifsc] = bank;
    }
  }
  
  return { branches, ifscToBank };
}

// Map old RRB names to our consolidated names
function mapToConsolidated(bankName) {
  const bankUpper = bankName.toUpperCase();
  
  for (const [consolidated, oldNames] of Object.entries(RRB_MAPPING)) {
    for (const old of oldNames) {
      if (bankUpper.includes(old.toUpperCase().replace(/[&\/]/g, ''))) {
        return consolidated;
      }
    }
  }
  
  // If no mapping found, use the bank name as-is
  return bankName;
}

// Main function
async function main() {
  const ifscUrl = 'https://github.com/razorpay/ifsc/releases/download/v2.0.62/IFSC.csv';
  const csvPath = '/tmp/ifsc_rrb.csv';
  
  console.log('Downloading IFSC data from Razorpay...');
  try {
    await downloadFile(ifscUrl, csvPath);
    console.log('✅ Downloaded IFSC.csv');
  } catch (err) {
    console.log('⚠️  Download failed, using cached file if available');
  }
  
  console.log('Extracting RRB branches...');
  const { branches } = extractRRBBranches(csvPath);
  console.log(`✅ Found ${branches.length} RRB branches`);
  
  // Group by consolidated RRB name
  const byConsolidated = {};
  for (const b of branches) {
    const consolidated = mapToConsolidated(b.bank);
    if (!byConsolidated[consolidated]) byConsolidated[consolidated] = [];
    byConsolidated[consolidated].push(b);
  }
  
  console.log('RRB branches by consolidated bank:');
  for (const [name, bs] of Object.entries(byConsolidated)) {
    console.log(`  ${name}: ${bs.length} branches`);
  }
  
  // Save RRB branches to output
  const outputPath = path.join(__dirname, 'output', 'rrb_branches.json');
  fs.writeFileSync(outputPath, JSON.stringify(branches, null, 2));
  console.log(`\n✅ Saved ${branches.length} RRB branches to ${outputPath}`);
  
  // Also save grouped by consolidated
  const groupedPath = path.join(__dirname, 'output', 'rrb_branches_grouped.json');
  fs.writeFileSync(groupedPath, JSON.stringify(byConsolidated, null, 2));
  console.log(`✅ Saved grouped RRB branches to ${groupedPath}`);
}

main().catch(console.error);
