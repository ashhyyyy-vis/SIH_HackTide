const fs = require('fs');
const XLSX = require('xlsx');

/**
 * Extract scheme-wise disbursement data from performance Excel files
 * performance_4 = scheme-wise disbursement status
 * performance_6 = channeling agency-wise
 */
function extractData() {
  const out = {};
  const wb4 = XLSX.readFile('./output/xlsx/performance_4.xlsx');
  const sheet4 = wb4.Sheets[wb4.SheetNames[0]];
  const rows4 = XLSX.utils.sheet_to_json(sheet4, { header: 1 });

  // Scheme-wise data (remove empty rows)
  const filtered4 = rows4.filter(r => r.some(c => c !== null && c !== undefined && String(c).trim() !== ''));
  out.scheme_wise = filtered4;

  // Show structure
  console.log('📊 SCHEME-WISE DISBURSEMENT (performance_4):');
  filtered4.forEach((r, i) => {
    if (i < 20) console.log('  ', JSON.stringify(r));
  });

  // performance_2 - allocation vs actuals by state (most valuable for state-first recommender)
  const wb2 = XLSX.readFile('./output/xlsx/performance_2.xlsx');
  const sheet2 = wb2.Sheets[wb2.SheetNames[0]];
  const rows2 = XLSX.utils.sheet_to_json(sheet2, { header: 1 });
  const filtered2 = rows2.filter(r => r.some(c => c !== null && c !== undefined && String(c).trim() !== ''));
  out.state_allocation = filtered2;

  console.log('\n🏢 STATE-WISE ALLOCATION vs ACTUALS (performance_2):');
  filtered2.slice(0, 10).forEach(r => console.log('  ', JSON.stringify(r)));

  // performance_6 - channeling agency-wise disbursement
  const wb6 = XLSX.readFile('./output/xlsx/performance_6.xlsx');
  const sheet6 = wb6.Sheets[wb6.SheetNames[0]];
  const rows6 = XLSX.utils.sheet_to_json(sheet6, { header: 1 });
  const filtered6 = rows6.filter(r => r.some(c => c !== null && c !== undefined && String(c).trim() !== ''));
  out.agency_wise = filtered6;

  console.log('\n🏦 CHANNELING AGENCY-WISE DISBURSEMENT (performance_6):');
  filtered6.slice(0, 10).forEach(r => console.log('  ', JSON.stringify(r)));

  fs.writeFileSync('./output/performance_extracted.json', JSON.stringify(out, null, 2));
  console.log('\n✅ Saved to output/performance_extracted.json');
}

extractData();