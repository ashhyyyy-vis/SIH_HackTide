const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');

const SCHEME_PAGES = [
  { code: 'MFS', name: 'Micro Finance Scheme', url: 'https://nsfdc.nic.in/en/micro-credit-finance' },
  { code: 'TERM_LOAN', name: 'Term Loan', url: 'https://nsfdc.nic.in/en/term-loan' },
  { code: 'ELS', name: 'Educational Loan Scheme', url: 'https://nsfdc.nic.in/en/educational-loan-scheme' },
  { code: 'AMY', name: 'Aajeevika Microfinance Yojana', url: 'https://nsfdc.nic.in/en/aajeevika-microfinance-yojana' },
  { code: 'UNY', name: 'Udyam Nidhi Yojana', url: 'https://nsfdc.nic.in/en/udyam-nidhi-yojana' },
  { code: 'MSY', name: 'Mahila Samriddhi Yojana', url: 'https://nsfdc.nic.in/en/mahila-samriddhi-yojana' },
  { code: 'SUVIDHA', name: 'Suvidha Loan', url: 'https://nsfdc.nic.in/en/suvidha-loan' },
  { code: 'UTKARSH', name: 'Utkarsh Loan', url: 'https://nsfdc.nic.in/en/utkarsh-loan' },
  { code: 'FAQ', name: 'FAQs', url: 'https://nsfdc.nic.in/faqs' },
  { code: 'ALL_SCHEMES', name: 'All Schemes', url: 'https://nsfdc.nic.in/en/all-schemes' }
];

async function scrapePage(scheme) {
  try {
    const res = await fetch(scheme.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 20000
    });

    if (!res.ok) {
      console.log(`⚠️  ${scheme.code}: HTTP ${res.status}`);
      return null;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Get main content
    const content = [];
    $('h1, h2, h3, h4, p, li, td, th').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 3 && text.length < 2000) content.push(text);
    });

    // Deduplicate preserving order
    const seen = new Set();
    const unique = content.filter(t => !seen.has(t) && seen.add(t));

    const tables = [];
    $('table').each((i, table) => {
      const rows = [];
      $(table).find('tr').each((j, row) => {
        const cells = [];
        $(row).find('td, th').each((k, cell) => cells.push($(cell).text().trim()));
        if (cells.some(c => c.length > 0)) rows.push(cells);
      });
      if (rows.length > 0) tables.push(rows);
    });

    return {
      code: scheme.code,
      name: scheme.name,
      url: scheme.url,
      content: unique,
      tables
    };

  } catch (err) {
    console.log(`❌  ${scheme.code}: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('🔍 Scraping NSFDC individual scheme pages...\n');
  const results = [];

  for (const scheme of SCHEME_PAGES) {
    const data = await scrapePage(scheme);
    if (data) {
      results.push(data);
      console.log(`✅ ${scheme.code}: ${data.content.length} blocks, ${data.tables.length} tables`);
    }
  }

  fs.writeFileSync('./output/nsfdc_scheme_details.json', JSON.stringify(results, null, 2));
  console.log(`\n✅ Scraped ${results.length} pages → output/nsfdc_scheme_details.json`);
}

main();