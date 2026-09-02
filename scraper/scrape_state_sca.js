const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');

// State SCDC websites (scrape 3 states for demo)
const STATE_SITES = [
  {
    state: 'Maharashtra',
    name: 'Maharashtra State SC Development Corporation',
    urls: [
      'https://pscscmahasamadhan.org',
      'https://msfdc.mahaonline.gov.in'
    ]
  },
  {
    state: 'Rajasthan',
    name: 'Rajasthan State SC/ST/OBC Finance & Development Corporation',
    urls: [
      'https://scstrj.in',
      'https://socialjustice.rajasthan.gov.in'
    ]
  },
  {
    state: 'Tamil Nadu',
    name: 'Tamil Nadu State SC Development Corporation',
    urls: [
      'https://tamilnaduscdc.org',
      'https://socialwelfare.tn.gov.in'
    ]
  }
];

async function scrapeStateSite(stateInfo) {
  console.log(`\n🔍 Scraping ${stateInfo.state}: ${stateInfo.name}...`);

  for (const url of stateInfo.urls) {
    try {
      console.log(`   Trying: ${url}`);
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000,
        redirect: 'follow'
      });

      if (!res.ok) {
        console.log(`   ⚠️  HTTP ${res.status}`);
        continue;
      }

      const html = await res.text();
      const $ = cheerio.load(html);

      // Extract content
      const content = [];
      $('h1, h2, h3, h4, p, li, table').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 5 && text.length < 2000) {
          content.push({ tag: el.tagName, text });
        }
      });

      // Extract tables
      const tables = [];
      $('table').each((i, table) => {
        const rows = [];
        $(table).find('tr').each((j, row) => {
          const cells = [];
          $(row).find('td, th').each((k, cell) => {
            cells.push($(cell).text().trim());
          });
          if (cells.length > 0) rows.push(cells);
        });
        if (rows.length > 0) tables.push(rows);
      });

      // Find scheme-related links
      const schemeLinks = [];
      $('a[href]').each((i, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().trim().toLowerCase();
        if (text.includes('scheme') || text.includes('loan') || text.includes('rate') ||
            text.includes('interest') || text.includes('eligibility') ||
            href.includes('scheme') || href.includes('loan')) {
          const fullUrl = href.startsWith('http') ? href : new URL(href, url).href;
          schemeLinks.push({ text: $(el).text().trim(), url: fullUrl });
        }
      });

      // Extract PDF links
      const pdfLinks = [];
      $('a[href]').each((i, el) => {
        const href = $(el).attr('href') || '';
        if (href.includes('.pdf')) {
          const fullUrl = href.startsWith('http') ? href : new URL(href, url).href;
          pdfLinks.push({ text: $(el).text().trim(), url: fullUrl });
        }
      });

      const result = {
        state: stateInfo.state,
        org_name: stateInfo.name,
        source_url: url,
        scraped_at: new Date().toISOString(),
        content: content.slice(0, 100),
        tables: tables,
        scheme_links: schemeLinks,
        pdf_links: pdfLinks,
        raw_text: $('body').text().replace(/\s+/g, ' ').trim().substring(0, 30000)
      };

      console.log(`   ✅ Content: ${content.length} blocks, Tables: ${tables.length}, Scheme links: ${schemeLinks.length}`);
      return result;

    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
    }
  }

  return {
    state: stateInfo.state,
    org_name: stateInfo.name,
    scraped_at: new Date().toISOString(),
    error: 'All URLs failed'
  };
}

async function main() {
  console.log('========================================');
  console.log('  State SCA Rate Card Scraper');
  console.log('========================================\n');

  const results = {};
  for (const site of STATE_SITES) {
    const data = await scrapeStateSite(site);
    results[site.state] = data;
  }

  fs.writeFileSync(
    './output/state_sca_data.json',
    JSON.stringify(results, null, 2)
  );

  console.log('\n========================================');
  console.log(`✅ Scraped ${Object.keys(results).length} state SCA sites`);
  console.log('📁 Saved to output/state_sca_data.json');
  console.log('========================================');
}

main();
