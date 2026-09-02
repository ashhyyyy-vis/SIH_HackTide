const { execSync } = require('child_process');
const fs = require('fs');

const scripts = [
  { name: 'NSFDC Schemes + Channel Partners', cmd: 'node scrape_nsfdc.js' },
  { name: 'Partner PDF Download & Parse', cmd: 'node download_pdfs.js' },
  { name: 'Partner PDF Structured Parser', cmd: 'node parse_partners.js' },
  { name: 'State SCA Sites', cmd: 'node scrape_state_sca.js' }
];

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   PS92 Automated Data Scraper       ║');
  console.log('║   NSFDC + State SCA Data            ║');
  console.log('╚══════════════════════════════════════╝\n');

  const startTime = Date.now();
  const results = [];

  for (const script of scripts) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`▶ Running: ${script.name}`);
    console.log('='.repeat(50));

    try {
      const output = execSync(script.cmd, {
        cwd: __dirname,
        encoding: 'utf8',
        timeout: 120000,
        stdio: 'pipe'
      });
      console.log(output);
      results.push({ script: script.name, status: 'success' });
    } catch (err) {
      console.log(err.stdout || '');
      console.error(err.stderr || err.message);
      results.push({ script: script.name, status: 'error', error: err.message });
    }
  }

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n' + '═'.repeat(50));
  console.log('  SCRAPING SUMMARY');
  console.log('═'.repeat(50));

  for (const r of results) {
    const icon = r.status === 'success' ? '✅' : '❌';
    console.log(`  ${icon} ${r.script}`);
  }

  // List output files
  const outputDir = './output';
  if (fs.existsSync(outputDir)) {
    console.log('\n📁 Output files:');
    const files = fs.readdirSync(outputDir, { recursive: true });
    for (const f of files) {
      if (typeof f === 'string' && f.endsWith('.json')) {
        const stat = fs.statSync(`${outputDir}/${f}`);
        console.log(`   ${f} (${(stat.size / 1024).toFixed(1)} KB)`);
      }
    }
  }

  console.log(`\n⏱  Total time: ${elapsed}s`);
  console.log('═'.repeat(50));
}

main();
