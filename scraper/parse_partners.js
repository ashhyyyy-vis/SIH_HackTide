const fs = require('fs');

/**
 * Parse extracted PDF text into structured partner data.
 * Each NSFDC PDF uses a numbered-list format:
 *   1 Name, Address City, State - PIN
 */

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Andaman & Nikobar', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Dadra & Nagar Haveli and Daman and Diu',
  'Dadra & Nagar Haveli, Daman & Diu',
  'Dadra N.Haweli,D&Diu', 'Dadra & Nagar Haveli, Daman',
  'Delhi', 'Jammu and Kashmir', 'Jammu & Kashmir',
  'Ladakh', 'Lakshadweep', 'Lakshdweep', 'Puducherry',
  'Tamilnadu'
];

function extractState(line) {
  for (const state of INDIAN_STATES) {
    // Case-insensitive match at start or after number
    const idx = line.toLowerCase().indexOf(state.toLowerCase());
    if (idx === 0) {
      return state;
    }
  }
  return null;
}

function parseSCA(text) {
  // Format: "Sl.No | State/UT | Name | Address"
  // Records: "N StateName SCA_Start..." then name continuation then address
  // Name ends with acronym in parens (XXX) — that's the address delimiter
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const partners = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip headers/page markers
    if (/^(sl\.|no\.|state\/ut|list of|page|\d+ of|^\d+$)/i.test(line) && line.length < 30) continue;

    // Detect new record: line starting with a number followed by text
    const newRecord = line.match(/^(\d+)\s+(.+)$/);
    if (newRecord) {
      if (current) partners.push(current);
      current = {
        serial_no: parseInt(newRecord[1]),
        raw_state: newRecord[2].trim(),
        state: null,
        state_continuation: [],
        name_lines: [],
        address_lines: [],
        has_address: false,
        start_idx: i
      };

      // Peek ahead to complete multi-line state names
      // State name ends when we hit either:
      //   (a) a complete match in INDIAN_STATES, OR
      //   (b) a line containing an acronym in parens (start of SCA name), OR
      //   (c) a line containing pincode (start of address)
      let stateCandidate = newRecord[2].trim();
      let matchedState = extractState(stateCandidate);

      let peek = i + 1;
      while (peek < lines.length && !matchedState) {
        const next = lines[peek];
        // Stop peeking if we hit another record (starts with N + text)
        if (/^\d+\s+/.test(next)) break;
        // Stop peeking if this looks like SCA name (contains acronym) or address (pincode)
        if (/\([A-Z]{2,}\)/.test(next) || /[-–]\s?\d{6}/.test(next)) break;
        // Otherwise consume as state continuation (multi-line state name)
        // Accept anything up to 4 lines, including commas (e.g., "Haveli, Daman")
        stateCandidate += ' ' + next;
        matchedState = extractState(stateCandidate);
        current.state_continuation.push(next);
        peek++;
        // Don't peek more than 4 lines for safety
        if (current.state_continuation.length >= 4) break;
      }

      current.state = matchedState || stateCandidate;
      i = peek - 1; // Skip the lines we consumed
      continue;
    }

    if (!current) continue;

    // Check if this is an address line (contains pincode/state-standard suffix)
    if (
      current.has_address ||
      /[-–]\s?\d{6}/.test(line) ||
      /(tamilnadu|karnataka|kerala|maharashtra|gujarat|rajasthan|uttar pradesh|west bengal|madhya pradesh|union territory|silvassa|pondicherry|port blair|srinagar|jammu|leh|neermargho)$/i.test(line) && current.name_lines.length > 0
    ) {
      current.has_address = true;
      current.address_lines.push(line);
      continue;
    }

    // Check if the previous content ended an acronym (name complete)
    if (current.name_lines.length > 0) {
      const lastNameLine = current.name_lines[current.name_lines.length - 1];
      if (/\([A-Z]+\)/.test(lastNameLine)) {
        current.has_address = true;
        current.address_lines.push(line);
        continue;
      }
    }

    // Otherwise it's part of the SCA name
    current.name_lines.push(line);
  }
  if (current) partners.push(current);

  return partners.map(p => {
    const name = p.name_lines.join(' ');
    const address = p.address_lines.join(', ');
    const abbrMatch = name.match(/\(([A-Z]+)\)\s*/);
    const abbreviation = abbrMatch ? abbrMatch[1] : null;

    return {
      serial_no: p.serial_no,
      state: p.state || p.raw_state,
      name: name.replace(/\s*\([A-Z]+\)\s*$/, '').replace(/\s+/g, ' ').trim(),
      abbreviation,
      address: address.replace(/\s+/g, ' ').trim()
    };
  });
}

function parseNumberedList(text, hasState = false) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const partners = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip headers
    if (/^(list of|s\.?no|sl\.?no|\.\.\.|total)/i.test(line) && line.length < 40) continue;

    // Detect new record: "N Name" or "N.\tName" or "1  Name"
    const newRecord = line.match(/^(\d+)[\s.)]+\t?(.*)$/);
    if (newRecord) {
      if (current) partners.push(current);
      current = {
        serial_no: parseInt(newRecord[1]),
        raw_fields: [newRecord[2].trim()]
      };
      continue;
    }

    if (current) {
      current.raw_fields.push(line);
    }
  }
  if (current) partners.push(current);

  // Simplify: first field is name, rest is address
  return partners.map(p => {
    const fields = p.raw_fields;
    const first = fields[0] || '';

    // Try to detect "Name, City" pattern in first field
    let name = first;

    return {
      serial_no: p.serial_no,
      name: name,
      address: fields.slice(1).join(', ') || first
    };
  });
}

function parseAll(text, partnerType) {
  switch (partnerType) {
    case 'State_Channelizing_Agencies':
      return parseSCA(text);
    case 'Other_Agencies':
      return parseNumberedList(text, true);
    case 'Small_Finance_Banks':
      return parseNumberedList(text);
    default:
      return parseNumberedList(text);
  }
}

async function main() {
  console.log('========================================');
  console.log('  Partner PDF Parser v2');
  console.log('========================================\n');

  const pdfFile = './output/partner_pdfs_parsed.json';
  if (!fs.existsSync(pdfFile)) {
    console.log('❌ Run download_pdfs.js first!');
    return;
  }

  const pdfs = JSON.parse(fs.readFileSync(pdfFile, 'utf8'));
  const allPartners = {};

  for (const pdf of pdfs) {
    if (pdf.status !== 'success' || !pdf.full_text) {
      console.log(`⚠️  Skipping ${pdf.name} (no text)`);
      continue;
    }

    console.log(`\n📄 Parsing: ${pdf.name}...`);
    const partners = parseAll(pdf.full_text, pdf.name);
    allPartners[pdf.name] = {
      partner_type: pdf.name,
      total_partners: partners.length,
      partners: partners
    };

    console.log(`   Partners found: ${partners.length}`);
    if (partners.length > 0) {
      console.log(`   Sample: ${JSON.stringify(partners[0], null, 2)}`);
    }
  }

  // Save all parsed partners
  fs.writeFileSync(
    './output/partners_structured.json',
    JSON.stringify(allPartners, null, 2)
  );

  // Summary
  let totalPartners = 0;
  Object.values(allPartners).forEach(p => totalPartners += p.total_partners);

  console.log('\n========================================');
  console.log(`✅ Parsed ${Object.keys(allPartners).length} PDFs, found ${totalPartners} total partner entries`);
  console.log('📁 Saved to output/partners_structured.json');
  console.log('========================================');
}

main();