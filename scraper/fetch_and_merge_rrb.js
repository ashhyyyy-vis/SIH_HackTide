/**
 * fetch_and_merge_rrb.js
 * 
 * 1. Downloads latest IFSC data from Razorpay
 * 2. Extracts RRB branches
 * 3. Maps old RRB names to our consolidated names
 * 4. Merges with existing locator (PSB + SCA) to create new locator with RRBs
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Simple CSV parser that handles quoted fields with commas
function parseCSV(csvText) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < csvText.length) {
    const char = csvText[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
      i++;
      continue;
    }
    
    if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
      i++;
      continue;
    }
    
    if (char === '\n' && !inQuotes) {
      currentRow.push(currentField);
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      i++;
      continue;
    }
    
    if (char === '\r' && !inQuotes) {
      i++;
      continue;
    }
    
    currentField += char;
    i++;
  }
  
  // Push last row
  if (currentRow.length > 0 || currentField !== '') {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  
  return rows;
}

// Our RRB list from dataset (cleaned names)
// Note: dataset has malformed names (commas, typos, suffixes) - we clean them here
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

// Mapping from IFSC bank names to our cleaned RRB names
// IFSC data has both old (pre-2020) and new (post-2020) RRB names
// We map ALL variants to our 25 cleaned names
const RRB_MAPPING = {
  // === New consolidated names (post-2020) that appear in IFSC === 
  'Karnataka Gramin Bank': 'Karnataka Grameena Bank',
  'Rajasthan Marudhara Gramin Bank': 'Rajasthan Gramin Bank',
  'TELANGANA GRAMEENA BANK': 'Telangana Grameena Bank',
  'Maharashtra Gramin Bank': 'Maharashtra Gramin Bank',
  'Kerala Gramin Bank': 'Kerala Grameena Bank',
  'Chhattisgarh Rajya Gramin Bank': 'Chhattisgarh Gramin Bank',
  
  // === Old names (pre-2020) that need mapping to new === 
  // Bihar: Dakshin + Uttar Bihar -> Bihar Gramin Bank
  'Dakshin Bihar Gramin Bank': 'Bihar Gramin Bank',
  'Uttar Bihar Gramin Bank': 'Bihar Gramin Bank',
  
  // Haryana: Sarva Haryana -> Haryana Gramin Bank
  'Sarva Haryana Gramin Bank': 'Haryana Gramin Bank',
  
  // Gujarat: Saurashtra + Baroda Gujarat -> Gujarat Gramin Bank
  'Saurashtra Gramin Bank': 'Gujarat Gramin Bank',
  'Baroda Gujarat Gramin Bank': 'Gujarat Gramin Bank',
  
  // Uttar Pradesh: Baroda UP + Prathama UP + Sarva Haryana + Purvanchal -> UP Gramin Bank
  'Baroda Uttar Pradesh Gramin Bank': 'Uttar Pradesh Gramin Bank',
  'Prathama UP Gramin Bank': 'Uttar Pradesh Gramin Bank',
  'Purvanchal Gramin Bank': 'Uttar Pradesh Gramin Bank',
  
  // Karnataka: Karnataka Vikas + Chaitanya Godavari + Saptagiri + Pragathi Krishna -> Karnataka Grameena Bank
  'Karnataka Vikas Grameena Bank': 'Karnataka Grameena Bank',
  'Chaitanya Godavari Grameena Bank': 'Karnataka Grameena Bank',
  'Saptagiri Grameena Bank': 'Karnataka Grameena Bank',
  'Pragathi Krishna Gramin Bank': 'Karnataka Grameena Bank',
  
  // Andhra Pradesh: Andhra Pragathi + Andhra Pradesh Grameena Vikas -> Andhra Pradesh Grameena Bank
  'Andhra Pradesh Grameena Vikas Bank': 'Andhra Pradesh Grameena Bank',
  'Andhra Pragathi Grameena Bank': 'Andhra Pradesh Grameena Bank',
  
  // West Bengal: Paschim Banga + Uttarbanga + Bangiya -> West Bengal Gramin Bank
  'Paschim Banga Gramin Bank': 'West Bengal Gramin Bank',
  'Uttarbanga Kshetriya Gramin Bank': 'West Bengal Gramin Bank',
  'Bangiya Gramin Vikash Bank': 'West Bengal Gramin Bank',
  
  // Madhya Pradesh: Madhyanchal + Vidharbha Kokan -> Madhya Pradesh Gramin Bank
  'Madhyanchal Gramin Bank': 'Madhya Pradesh Gramin Bank',
  'Vidharbha Kokan Gramin Bank': 'Madhya Pradesh Gramin Bank',
  
  // Gujarat: Narmada Jhabua -> Gujarat Gramin Bank
  'Narmada Jhabua Gramin Bank': 'Gujarat Gramin Bank',
  
  // Odisha: Utkal Grameen -> Odisha Grameen Bank
  'Utkal Grameen Bank': 'Odisha Grameen Bank',
  
  // Others (direct matches)
  'Jharkhand Rajya Gramin Bank': 'Jharkhand Gramin Bank',
  'Uttarakhand Gramin Bank': 'Uttarakhand Gramin Bank',
  'Tripura Gramin Bank': 'Tripura Gramin Bank',
  'Punjab Gramin Bank': 'Punjab Gramin Bank',
  'Tamil Nadu Grama Bank': 'Tamil Nadu Grama Bank',
  'Himachal Pradesh Gramin Bank': 'Himachal Pradesh Gramin Bank',
  'Puducherry Grama Bank': 'Puducherry Grama Bank',
  'Assam Gramin Vikash Bank': 'Assam Gramin Bank',
  'J&K Grameen Bank': 'J&K Grameen Bank',
  'Manipur Rural Bank': 'Manipur Rural Bank',
  'Meghalaya Rural Bank': 'Meghalaya Rural Bank',
  'Mizoram Rural Bank': 'Mizoram Rural Bank',
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

// Main function
async function main() {
  const ifscUrl = 'https://github.com/razorpay/ifsc/releases/download/v2.0.62/IFSC.csv';
  const csvPath = '/tmp/ifsc_full.csv';
  
  console.log('Using existing IFSC file...');
  if (!fs.existsSync(csvPath)) {
    console.log('⚠️  File not found, attempting download...');
    try {
      await downloadFile(ifscUrl, csvPath);
      console.log('✅ Downloaded IFSC.csv');
    } catch (err) {
      console.log('⚠️  Download failed:', err.message);
      return;
    }
  } else {
    console.log('✅ Using cached file');
  }
  
  console.log('Parsing CSV...');
  const csvText = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(csvText);
  console.log(`✅ Parsed ${rows.length} rows`);
  
  const header = rows[0];
  const bankIdx = header.indexOf('BANK');
  const ifscIdx = header.indexOf('IFSC');
  const branchIdx = header.indexOf('BRANCH');
  const centreIdx = header.indexOf('CENTRE');
  const districtIdx = header.indexOf('DISTRICT');
  const stateIdx = header.indexOf('STATE');
  const addressIdx = header.indexOf('ADDRESS');
  const contactIdx = header.indexOf('CONTACT');
  
  console.log('Extracting RRB branches...');
  const rrbBranches = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length <= bankIdx) continue;
    
    const bank = row[bankIdx];
    if (!bank) continue;
    
    // Check if this is an RRB
    const bankUpper = bank.toUpperCase();
    if (!bankUpper.includes('GRAMIN') && !bankUpper.includes('GRAMEEN')) continue;
    
    // Map to consolidated name
    const consolidated = RRB_MAPPING[bank] || bank;
    
    rrbBranches.push({
      partnerName: consolidated,
      partnerType: 'Regional_Rural_Banks',
      branchName: row[branchIdx] || '',
      ifsc: row[ifscIdx] || '',
      address: row[addressIdx] || '',
      contact: row[contactIdx] || '',
      city: row[centreIdx] || '',
      district: row[districtIdx] || '',
      state: row[stateIdx] || '',
      lat: null,
      lng: null,
    });
  }
  
  console.log(`✅ Found ${rrbBranches.length} RRB branches`);
  
  // Group by consolidated RRB
  const byConsolidated = {};
  for (const b of rrbBranches) {
    if (!byConsolidated[b.partnerName]) byConsolidated[b.partnerName] = [];
    byConsolidated[b.partnerName].push(b);
  }
  
  console.log('RRB branches by consolidated bank:');
  for (const [name, bs] of Object.entries(byConsolidated)) {
    console.log(`  ${name}: ${bs.length} branches`);
  }
  
  // Load existing locator
  console.log('\nLoading existing locator...');
  const existingLocator = JSON.parse(fs.readFileSync('./output/partner_locator.json', 'utf8'));
  console.log(`✅ Loaded ${existingLocator.length} existing branches`);
  
  // Merge: existing + RRB
  const mergedLocator = [...existingLocator, ...rrbBranches];
  console.log(`✅ Merged locator: ${mergedLocator.length} branches`);
  
  // Save merged locator
  const outputPath = path.join(__dirname, 'output', 'partner_locator_with_rrb.json');
  fs.writeFileSync(outputPath, JSON.stringify(mergedLocator, null, 2));
  console.log(`\n✅ Saved merged locator to ${outputPath}`);
  
  // Also save just RRB branches
  const rrbPath = path.join(__dirname, 'output', 'rrb_branches_only.json');
  fs.writeFileSync(rrbPath, JSON.stringify(rrbBranches, null, 2));
  console.log(`✅ Saved RRB branches only to ${rrbPath}`);
  
  // Summary
  const byType = {};
  mergedLocator.forEach(b => byType[b.partnerType] = (byType[b.partnerType] || 0) + 1);
  console.log('\nFinal locator breakdown:');
  for (const [t, c] of Object.entries(byType)) {
    console.log(`  ${t}: ${c}`);
  }
}

main().catch(console.error);
