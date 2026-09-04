import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const dataset = JSON.parse(
  readFileSync(join(__dirname, 'data', 'ps92_dataset.json'), 'utf-8')
);

export const locator = JSON.parse(
  readFileSync(join(__dirname, 'data', 'partner_locator_final.json'), 'utf-8')
);

console.log(`✅ Loaded: ${dataset.schemes.length} schemes | ${dataset.state_schemes.length} state schemes | ${locator.length} branches`);
