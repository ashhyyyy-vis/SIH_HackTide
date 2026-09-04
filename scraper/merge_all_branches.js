/**
 * merge_all_branches.js
 * 
 * Merges all branch sources into one final locator:
 * - partner_locator.json (PSB + RRB + SCA)
 * - missing_partner_branches.json (SFB, NBFC-MFI, Other, UT)
 * 
 * Output: output/partner_locator_final.json
 */

const fs = require('fs');
const path = require('path');

const psbRrbSca = JSON.parse(fs.readFileSync('./output/partner_locator.json', 'utf8'));
const missing = JSON.parse(fs.readFileSync('./output/missing_partner_branches.json', 'utf8'));

const merged = [...psbRrbSca, ...missing];

// Deduplicate by ifsc + branchName + partnerName
const seen = new Set();
const deduped = [];
for (const b of merged) {
  const key = `${b.ifsc || ''}|${b.branchName || ''}|${b.partnerName || ''}`;
  if (seen.has(key)) continue;
  seen.add(key);
  deduped.push(b);
}

const outputPath = path.join(__dirname, 'output', 'partner_locator_final.json');
fs.writeFileSync(outputPath, JSON.stringify(deduped, null, 2));

const byType = {};
deduped.forEach(b => byType[b.partnerType] = (byType[b.partnerType] || 0) + 1);

console.log('Merged locator:');
console.log('  Total:', deduped.length);
console.log('  By type:', byType);
console.log('  Saved to:', outputPath);
