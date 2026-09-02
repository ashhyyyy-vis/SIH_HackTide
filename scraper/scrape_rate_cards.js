const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');

// Verified working URLs from web search
const SITES = [
  {
    state: 'National',
    name: 'NSFDC All Schemes',
    url: 'https://nsfdc.nic.in/en/schemes/'
  },
  {
    state: 'Tamil Nadu',
    name: 'TAHDCO - Term Loan',
    url: 'https://www.tahdco.com/nscfdc-term-loan.php'
  },
  {
    state: 'Tamil Nadu',
    name: 'TAHDCO - Livelihood Program',
    url: 'https://www.tahdco.com/livelihood-program-nscfdc.php'
  },
  {
    state: 'Maharashtra',
    name: 'Maharashtra Atrocity Portal - Economic Upliftment',
    url: 'https://atrocity.newcloud.in/EconomicUpliftment.php'
  }
];

async function scrape(site) {
  console.log(`\n🔍 ${site.state}: ${site.name}`);
  try {
    const res = await fetch(site.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 20000,
      redirect: 'follow'
    });

    if (!res.ok) {
      console.log(`   ⚠️  HTTP ${res.status}`);
      return null;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Extract tables (scheme rate cards are in tables)
    const tables = [];
    $('table').each((i, table) => {
      const rows = [];
      $(table).find('tr').each((j, row) => {
        const cells = [];
        $(row).find('td, th').each((k, cell) => {
          cells.push($(cell).text().trim());
        });
        if (cells.some(c => c.length > 0)) rows.push(cells);
      });
      if (rows.length > 0) tables.push(rows);
    });

    // Extract headings + paragraphs
    const headings = [];
    $('h1, h2, h3, h4, strong, b').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 3 && text.length < 300) headings.push(text);
    });

    return {
      state: site.state,
      source: site.name,
      url: site.url,
      scraped_at: new Date().toISOString(),
      tables,
      headings: headings.slice(0, 60),
      raw_text: $('body').text().replace(/\s+/g, ' ').trim().substring(0, 20000)
    };

  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    return null;
  }
}

async function main() {
  const results = {};
  for (const site of SITES) {
    const data = await scrape(site);
    if (data) {
      const key = `${site.state}_${site.name.replace(/\s+/g, '_')}`;
      results[key] = data;
      console.log(`   ✅ Tables: ${data.tables.length}, Headings: ${data.headings.length}`);
      // Print first table if present
      if (data.tables[0]) {
        console.log('   Preview:', JSON.stringify(data.tables[0].slice(0, 8)));
      }
    }
  }

  fs.writeFileSync('./output/state_sca_rate_cards.json', JSON.stringify(results, null, 2));
  console.log('\n✅ Saved to output/state_sca_rate_cards.json');
}

main();