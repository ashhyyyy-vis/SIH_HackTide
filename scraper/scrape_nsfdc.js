const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');

const SCHEME_URL = 'https://nsfdc.nic.in/scheme';
const ELIGIBILITY_URL = 'https://nsfdc.nic.in/eligibility-requirements';

async function scrapeSchemeCatalog() {
  console.log('🔍 Scraping NSFDC Scheme Catalog...');

  try {
    // Scrape scheme details
    const schemeRes = await fetch(SCHEME_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const schemeHtml = await schemeRes.text();
    const $scheme = cheerio.load(schemeHtml);

    // Scrape eligibility requirements
    const eligRes = await fetch(ELIGIBILITY_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const eligHtml = await eligRes.text();
    const $elig = cheerio.load(eligHtml);

    // Extract all text content for analysis
    const schemeText = $scheme('body').text().replace(/\s+/g, ' ').trim();
    const eligText = $elig('body').text().replace(/\s+/g, ' ').trim();

    // Extract tables
    const schemeTables = [];
    $scheme('table').each((i, table) => {
      const rows = [];
      $scheme(table).find('tr').each((j, row) => {
        const cells = [];
        $scheme(row).find('td, th').each((k, cell) => {
          cells.push($scheme(cell).text().trim());
        });
        if (cells.length > 0) rows.push(cells);
      });
      if (rows.length > 0) schemeTables.push(rows);
    });

    const eligTables = [];
    $elig('table').each((i, table) => {
      const rows = [];
      $elig(table).find('tr').each((j, row) => {
        const cells = [];
        $elig(row).find('td, th').each((k, cell) => {
          cells.push($elig(cell).text().trim());
        });
        if (cells.length > 0) rows.push(cells);
      });
      if (rows.length > 0) eligTables.push(rows);
    });

    // Extract headings and paragraphs
    const schemeContent = [];
    $scheme('h1, h2, h3, h4, p, li').each((i, el) => {
      const text = $scheme(el).text().trim();
      if (text.length > 5) {
        schemeContent.push({
          tag: el.tagName,
          text: text
        });
      }
    });

    const eligContent = [];
    $elig('h1, h2, h3, h4, p, li').each((i, el) => {
      const text = $elig(el).text().trim();
      if (text.length > 5) {
        eligContent.push({
          tag: el.tagName,
          text: text
        });
      }
    });

    const result = {
      scraped_at: new Date().toISOString(),
      source_urls: {
        schemes: SCHEME_URL,
        eligibility: ELIGIBILITY_URL
      },
      scheme_tables: schemeTables,
      eligibility_tables: eligTables,
      scheme_content: schemeContent,
      eligibility_content: eligContent,
      raw_scheme_text: schemeText.substring(0, 50000),
      raw_eligibility_text: eligText.substring(0, 50000)
    };

    fs.writeFileSync(
      './output/nsfdc_schemes.json',
      JSON.stringify(result, null, 2)
    );

    console.log(`✅ Scraped ${schemeTables.length} scheme tables, ${eligTables.length} eligibility tables`);
    console.log(`✅ ${schemeContent.length} scheme content blocks, ${eligContent.length} eligibility content blocks`);
    console.log('📁 Saved to output/nsfdc_schemes.json');

    return result;

  } catch (err) {
    console.error('❌ Error scraping schemes:', err.message);
    return null;
  }
}

// Also scrape channel partners page
async function scrapeChannelPartners() {
  console.log('\n🔍 Scraping Channel Partners page...');

  try {
    const res = await fetch('https://nsfdc.nic.in/our-channel-partners', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    // Find PDF links
    const pdfLinks = [];
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && (href.endsWith('.pdf') || href.includes('.pdf'))) {
        const fullUrl = href.startsWith('http')
          ? href
          : `https://nsfdc.nic.in${href.startsWith('/') ? '' : '/'}${href}`;
        pdfLinks.push({ text, url: fullUrl });
      }
    });

    // Extract content
    const content = [];
    $('h1, h2, h3, h4, p').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 5) {
        content.push({ tag: el.tagName, text });
      }
    });

    const result = {
      scraped_at: new Date().toISOString(),
      source_url: 'https://nsfdc.nic.in/our-channel-partners',
      pdf_links: pdfLinks,
      content: content,
      raw_text: $('body').text().replace(/\s+/g, ' ').trim().substring(0, 30000)
    };

    fs.writeFileSync(
      './output/nsfdc_channel_partners.json',
      JSON.stringify(result, null, 2)
    );

    console.log(`✅ Found ${pdfLinks.length} PDF links`);
    pdfLinks.forEach(p => console.log(`   📄 ${p.text}: ${p.url}`));

    return result;

  } catch (err) {
    console.error('❌ Error scraping channel partners:', err.message);
    return null;
  }
}

// Scrape allocation of funds
async function scrapeAllocation() {
  console.log('\n🔍 Scraping Fund Allocation data...');

  try {
    const res = await fetch('https://nsfdc.nic.in/allocation-of-funds', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const html = await res.text();
    const $ = cheerio.load(html);

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

    const result = {
      scraped_at: new Date().toISOString(),
      source_url: 'https://nsfdc.nic.in/allocation-of-funds',
      tables: tables,
      raw_text: $('body').text().replace(/\s+/g, ' ').trim().substring(0, 30000)
    };

    fs.writeFileSync(
      './output/nsfdc_allocation.json',
      JSON.stringify(result, null, 2)
    );

    console.log(`✅ Found ${tables.length} allocation tables`);
    return result;

  } catch (err) {
    console.error('❌ Error scraping allocation:', err.message);
    return null;
  }
}

// Scrape performance data page (for Excel download links)
async function scrapePerformanceLinks() {
  console.log('\n🔍 Scraping Performance Data links...');

  try {
    const res = await fetch('https://nsfdc.nic.in/performance-data', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    const downloadLinks = [];
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && (href.endsWith('.xlsx') || href.endsWith('.xls') || href.endsWith('.csv') || href.includes('.xlsx') || href.includes('.xls'))) {
        const fullUrl = href.startsWith('http')
          ? href
          : `https://nsfdc.nic.in${href.startsWith('/') ? '' : '/'}${href}`;
        downloadLinks.push({ text, url: fullUrl });
      }
    });

    const result = {
      scraped_at: new Date().toISOString(),
      source_url: 'https://nsfdc.nic.in/performance-data',
      download_links: downloadLinks,
      raw_text: $('body').text().replace(/\s+/g, ' ').trim().substring(0, 30000)
    };

    fs.writeFileSync(
      './output/nsfdc_performance_links.json',
      JSON.stringify(result, null, 2)
    );

    console.log(`✅ Found ${downloadLinks.length} download links`);
    downloadLinks.forEach(l => console.log(`   📊 ${l.text}: ${l.url}`));

    return result;

  } catch (err) {
    console.error('❌ Error scraping performance links:', err.message);
    return null;
  }
}

async function main() {
  console.log('========================================');
  console.log('  NSFDC Data Scraper for PS92');
  console.log('========================================\n');

  await scrapeSchemeCatalog();
  await scrapeChannelPartners();
  await scrapeAllocation();
  await scrapePerformanceLinks();

  console.log('\n========================================');
  console.log('  ✅ All NSFDC scraping complete!');
  console.log('========================================');
}

main();
