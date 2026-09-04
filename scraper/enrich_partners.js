#!/usr/bin/env node
/**
 * enrich_partners.js
 *
 * CLI wrapper around partner_enrichment.js.
 * Reads channel_partner_types from data/ps92_dataset.json,
 * enriches every partner, writes output/partners_enriched.json.
 */

const fs = require('fs');
const path = require('path');
const { enrichPartner } = require('./partner_enrichment');

const DATASET_FILE = path.join(__dirname, 'data', 'ps92_dataset.json');
const OUTPUT_FILE = path.join(__dirname, 'output', 'partners_enriched.json');

function main() {
  const dataset = JSON.parse(fs.readFileSync(DATASET_FILE, 'utf-8'));
  const types = dataset.channel_partner_types;

  const enriched = [];
  for (const [typeKey, typeData] of Object.entries(types)) {
    for (const p of typeData.partners) {
      enriched.push({
        type: typeKey,
        ...enrichPartner(p, typeKey),
      });
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enriched, null, 2));
  console.log(`Wrote ${enriched.length} enriched partners to ${OUTPUT_FILE}`);

  const byStatus = {};
  enriched.forEach(p => byStatus[p.npa.status] = (byStatus[p.npa.status] || 0) + 1);
  console.log('NPA status breakdown:', byStatus);
  console.log('Orgs with website:', enriched.filter(p => p.website).length);
}

main();