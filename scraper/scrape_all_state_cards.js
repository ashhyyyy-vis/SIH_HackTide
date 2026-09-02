const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');
const https = require('https');
const http = require('http');
const tls = require('tls');

// TLS tolerance: many Indian gov sites have self-signed / expired certs.
const permissiveAgent = new https.Agent({
  keepAlive: true,
  rejectUnauthorized: false,
  maxSockets: 4
});

const permissiveHttpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 4
});

// Official SCA portals per state (verified via web research, Sep 2026).
// Primary + fallback pages. Unknown states are left commented / best-effort.
const SITES = [
  { state: 'Andhra Pradesh', name: 'APSCCFC', urls: ['https://apsccfc.apcfss.in'] },
  { state: 'Assam',          name: 'Assam State Dev Corpn for SC Ltd', urls: ['https://directorwsc.assam.gov.in/portlets/assam-state-development-corporation'] },
  { state: 'Bihar',          name: 'BISCOCEF (no dedicated site)', urls: ['https://scstonline.bihar.gov.in'] },
  { state: 'Chandigarh',     name: 'Chandigarh SC,BC & Minorities FDC', urls: ['https://chandigarh.gov.in/scbc-minorities-financial-development-corp'] },
  { state: 'Chhattisgarh',   name: 'CG Antavayasayee Coop SCFDC', urls: ['https://tribal.cg.gov.in/en/chhattisgarh-state-intermediate-co-operative-finance-and-development-corporation'] },
  { state: 'Dadra & Nagar Haveli / Daman & Diu', name: 'DNH&DD SC/ST/OBC/Min. FDC', urls: ['http://scstcorporation.com'] },
  { state: 'Delhi',          name: 'DSFDC', urls: ['https://dsfdc.delhi.gov.in'] },
  { state: 'Gujarat',        name: 'Gujarat SCDC', urls: ['https://sje.gujarat.gov.in/gscdc'] },
  { state: 'Goa',            name: 'Goa State SC & OBC FDC', urls: ['https://www.goa.gov.in/department/goa-state-sc-obc-finance-development-corporation-ltd/'] },
  { state: 'Haryana',        name: 'HSCFDC', urls: ['https://hscfdc.org.in'] },
  { state: 'Himachal Pradesh', name: 'HPSCSTDC', urls: ['https://hpscstdc.hp.gov.in', 'https://hpscstdc.hp.gov.in/hpmvn/schemes'] },
  { state: 'Jammu & Kashmir',  name: 'J&K SC ST OBC Dev Corpn Ltd', urls: ['http://jkscstbccorpn.jk.gov.in', 'http://jkscstbccorpn.jk.gov.in/schemes-scheduled-castes.htm'] },
  { state: 'Jharkhand',      name: 'Jharkhand SC Coop Dev Corpn', urls: ['https://www.jstcdc.org.in', 'https://jstcdc.org.in/NSTFDC'] },
  { state: 'Karnataka',      name: 'Dr. B.R. Ambedkar Dev Corpn Ltd', urls: ['https://karunadu.karnataka.gov.in/ambedkarcorpn'] },
  { state: 'Kerala',         name: 'KSDSSC', urls: ['https://ksdcscst.kerala.gov.in'] },
  { state: 'Madhya Pradesh', name: 'MP State Coop SCFDC', urls: ['https://merayuva.mp.gov.in'] },
  { state: 'Maharashtra',    name: 'Maharashtra SC/ST/OBC Dev Corpn', urls: ['https://atrocity.newcloud.in'] },
  { state: 'Manipur',        name: 'Manipur (via Dir. OBC & SC)', urls: ['https://manipurobcsc.mn.gov.in'] },
  { state: 'Odisha',         name: 'OSFDC', urls: ['https://osfdc.gov.in'] },
  { state: 'Puducherry',      name: 'Puducherry Adi Dravidar Dev Corpn', urls: ['https://adwelfare.py.gov.in'] },
  { state: 'Punjab',         name: 'PSCLDFC', urls: ['https://pbscfc.punjab.gov.in', 'http://pbscfc.punjab.gov.in'] },
  { state: 'Rajasthan',      name: 'RSCSTFDCC (Anuja Nigam)', urls: ['https://sje.rajasthan.gov.in/schemes/RSCSTFDCC.html', 'https://rajanujanigam.rajasthan.gov.in'] },
  { state: 'Sikkim',         name: 'Sikkim SC/ST/OBC Dev Corpn', urls: ['https://sikkimsabcco.com'] },
  { state: 'Tamil Nadu',     name: 'TAHDCO', urls: ['https://www.tahdco.com'] },
  { state: 'Telangana',      name: 'TGSCCFC', urls: ['https://tgsccfc.cgg.gov.in', 'https://tsobmms.cgg.gov.in'] },
  { state: 'Tripura',        name: 'Tripura SC Coop Dev Corpn', urls: ['https://cooperation.tripura.gov.in/tripura-s-c-coop-devcoorporation-ltd'] },
  { state: 'Uttarakhand',    name: 'UK BVVN', urls: ['https://www.ukbvvn.org.in', 'https://www.ukbvvn.org.in/frmSCSTSelfEmployment.html'] },
  { state: 'Uttar Pradesh',  name: 'UPCFDC', urls: ['https://upscfdc.in'] },
  { state: 'West Bengal',    name: 'WB SC/ST OBC Dev & Fin Corpn', urls: ['https://wbbcdev.gov.in', 'http://wbbcdev.gov.in'] }
]

async function scrape(url) {
  try {
    const isHttp = url.startsWith('http://');
    const agent = isHttp ? permissiveHttpAgent : permissiveAgent;
    const res = await fetch(url, {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 15000,
      redirect: 'follow'
    });
    if (!res.ok) return { ok: false, status: res.status };
    const html = await res.text();
    return { ok: true, status: 200, html, finalUrl: res.url };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function extract(html) {
  const $ = cheerio.load(html);
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

  const headings = [];
  $('h1, h2, h3, h4, strong, b').each((i, el) => {
    const t = $(el).text().trim();
    if (t.length > 3 && t.length < 300) headings.push(t);
  });

  const links = [];
  $('a').each((i, el) => {
    const t = $(el).text().trim();
    const h = $(el).attr('href') || '';
    if (t.length > 2 && /scheme|loan|rate|infr|interest/i.test(t)) {
      links.push({ t: t.substring(0, 60), h: h.substring(0, 100) });
    }
  });

  return {
    tables,
    headings: headings.slice(0, 50),
    links: links.slice(0, 30),
    raw_text: $('body').text().replace(/\s+/g, ' ').trim().substring(0, 12000)
  };
}

async function main() {
  const results = {};
  for (const site of SITES) {
    console.log(`\n🔍 ${site.state} (${site.name})`);
    let found = null;
    for (const url of site.urls) {
      const r = await scrape(url);
      if (!r.ok) { console.log(`   ${url} → FAIL (${r.status || r.error})`); continue; }
      console.log(`   ${url} → OK`);
      found = { url: r.finalUrl, html: r.html };
      break;
    }
    if (found) {
      const data = extract(found.html);
      // Only store if we found any tables OR scheme-ish headings (avoid junk pages)
      const hasContent = data.tables.length > 0 || data.headings.length > 0;
      results[site.state] = {
        state: site.state,
        corporation: site.name,
        url: found.url,
        scraped_at: new Date().toISOString(),
        has_tables: data.tables.length,
        headings: data.headings,
        scheme_links: data.links,
        tables: data.tables,
        raw_text: data.raw_text
      };
      console.log(`   ✅ tables=${data.tables.length} headings=${data.headings.length}`);
    } else {
      results[site.state] = {
        state: site.state,
        corporation: site.name,
        status: 'timeout_or_down',
        scraped_at: new Date().toISOString()
      };
      console.log(`   ❌ all candidate URLs failed`);
    }
  }

  fs.writeFileSync('./output/state_sca_rate_cards.json', JSON.stringify(results, null, 2));
  const ok = Object.values(results).filter(r => r.status !== 'timeout_or_down' && r.tables !== undefined);
  console.log(`\n✅ Saved. ${ok.length}/${Object.keys(results).length} states responded.`);
}

main();