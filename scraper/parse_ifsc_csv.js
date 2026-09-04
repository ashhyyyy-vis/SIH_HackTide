/**
 * Simple CSV parser that handles quoted fields with embedded commas
 */

const fs = require('fs');

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
      currentRow.push(currentField.trim());
      currentField = '';
      i++;
      continue;
    }
    
    if (char === '\n' && !inQuotes) {
      currentRow.push(currentField.trim());
      rows.push(currentRow);
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
  
  // Push the last row
  if (currentRow.length > 0 || currentField.trim() !== '') {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }
  
  return rows;
}

// Test
const csv = fs.readFileSync('/tmp/ifsc_latest.csv', 'utf8');
const rows = parseCSV(csv);

console.log('Total rows:', rows.length);
console.log('Header:', rows[0]);
console.log('First data row:', rows[1]);

// Count RRB branches
const rrbBranches = [];
for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (row.length < 5) continue;
  
  const bank = row[0];
  if (!bank) continue;
  
  if (bank.toUpperCase().includes('GRAMIN') || bank.toUpperCase().includes('GRAMEEN')) {
    rrbBranches.push(row);
  }
}

console.log('RRB branches found:', rrbBranches.length);
console.log('Sample RRB:', rrbBranches[0]);
