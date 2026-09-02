const fetch = require('node-fetch');
const fs = require('fs');
const { PDFParse } = require('pdf-parse');

const PDF_URLS = [
  {
    name: 'State_Channelizing_Agencies',
    url: 'https://nsfdc.nic.in/storage/channel-partners/attachments/20260401_164458_Ip6UJm.pdf'
  },
  {
    name: 'Public_Sector_Banks',
    url: 'https://nsfdc.nic.in/storage/channel-partners/attachments/20260408_100623_Bea3za.pdf'
  },
  {
    name: 'Regional_Rural_Banks',
    url: 'https://nsfdc.nic.in/storage/channel-partners/attachments/20260401_163145_9tiTZM.pdf'
  },
  {
    name: 'NBFC_MFIs',
    url: 'https://nsfdc.nic.in/storage/channel-partners/attachments/20251223_101231_7smjJC.pdf'
  },
  {
    name: 'Cooperative_Banks',
    url: 'https://nsfdc.nic.in/storage/channel-partners/attachments/20251223_101341_Zcm8s6.pdf'
  },
  {
    name: 'Other_Agencies',
    url: 'https://nsfdc.nic.in/storage/channel-partners/attachments/20260408_101214_Yw5CGQ.pdf'
  },
  {
    name: 'Small_Finance_Banks',
    url: 'https://nsfdc.nic.in/storage/uploads/images/banners/20260408_100851_UrGTfH.pdf'
  },
  {
    name: 'Cooperative_Societies',
    url: 'https://nsfdc.nic.in/storage/uploads/images/banners/20260408_101711_6Iyved.pdf'
  }
];

const PDF_DIR = './output/pdfs';

async function downloadPDFs() {
  if (!fs.existsSync(PDF_DIR)) {
    fs.mkdirSync(PDF_DIR, { recursive: true });
  }

  console.log('🔍 Downloading NSFDC Partner PDFs...\n');
  const results = [];

  for (const pdf of PDF_URLS) {
    try {
      console.log(`⬇️  Downloading: ${pdf.name}...`);
      const res = await fetch(pdf.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
      });

      if (!res.ok) {
        console.log(`   ⚠️  HTTP ${res.status} for ${pdf.name}`);
        results.push({ name: pdf.name, status: 'error', error: `HTTP ${res.status}` });
        continue;
      }

      const buffer = await res.buffer();
      const filePath = `${PDF_DIR}/${pdf.name}.pdf`;
      fs.writeFileSync(filePath, buffer);

      console.log(`   ✅ Saved: ${filePath} (${(buffer.length / 1024).toFixed(1)} KB)`);

      // Parse PDF
      console.log(`   📄 Parsing: ${pdf.name}...`);
      const parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      const textContent = typeof data === 'string' ? data : (data.text || '');

      // Try to extract table-like data
      const lines = textContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      results.push({
        name: pdf.name,
        url: pdf.url,
        status: 'success',
        file_path: filePath,
        file_size_kb: (buffer.length / 1024).toFixed(1),
        pages: data.numpages || (data.pages ? data.pages.length : 1),
        text_length: textContent.length,
        lines: lines.length,
        text_preview: textContent.substring(0, 2000),
        full_text: textContent
      });

      console.log(`   📊 Pages: ${data.numpages}, Text: ${textContent.length} chars, Lines: ${lines.length}`);

    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      results.push({ name: pdf.name, status: 'error', error: err.message });
    }
  }

  // Save parsed results
  fs.writeFileSync(
    './output/partner_pdfs_parsed.json',
    JSON.stringify(results, null, 2)
  );

  console.log('\n========================================');
  console.log(`✅ Downloaded and parsed ${results.filter(r => r.status === 'success').length}/${PDF_URLS.length} PDFs`);
  console.log('📁 Saved to output/partner_pdfs_parsed.json');
  console.log('========================================');

  return results;
}

async function main() {
  console.log('========================================');
  console.log('  NSFDC Partner PDF Downloader');
  console.log('========================================\n');

  await downloadPDFs();
}

main();
