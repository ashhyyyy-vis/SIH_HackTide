const fetch = require('node-fetch');
const fs = require('fs');
const XLSX = require('xlsx');

const PERFORMANCE_LINKS = JSON.parse(fs.readFileSync('./output/nsfdc_performance_links.json', 'utf8')).download_links;

const XLSX_DIR = './output/xlsx';

async function downloadPerformanceExcel() {
  if (!fs.existsSync(XLSX_DIR)) {
    fs.mkdirSync(XLSX_DIR, { recursive: true });
  }

  console.log('🔍 Downloading NSFDC Performance Data (Excel)...\n');
  const results = [];

  for (let i = 0; i < PERFORMANCE_LINKS.length; i++) {
    const link = PERFORMANCE_LINKS[i];
    try {
      const res = await fetch(link.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
      });

      if (!res.ok) {
        console.log(`⚠️  [${i + 1}] HTTP ${res.status}`);
        continue;
      }

      const buffer = await res.buffer();
      const filePath = `${XLSX_DIR}/performance_${i + 1}.xlsx`;
      fs.writeFileSync(filePath, buffer);

      // Parse Excel
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheets = workbook.SheetNames.map(name => ({
        name,
        rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 })
      }));

      const totalRows = sheets.reduce((acc, s) => acc + (s.rows.length || 0), 0);
      console.log(`✅ [${i + 1}] Saved: ${filePath} (${(buffer.length / 1024).toFixed(1)} KB) | ${workbook.SheetNames.length} sheets | ${totalRows} rows`);

      // Show first few rows of first sheet for preview
      if (sheets[0] && sheets[0].rows[0]) {
        console.log(`   Header: ${JSON.stringify(sheets[0].rows.slice(0, 3))}`);
      }

      results.push({
        index: i,
        url: link.url,
        file_path: filePath,
        file_size_kb: (buffer.length / 1024).toFixed(1),
        sheets: workbook.SheetNames,
        preview: sheets[0] ? sheets[0].rows.slice(0, 5) : []
      });

    } catch (err) {
      console.log(`❌ [${i + 1}] Error: ${err.message}`);
    }
  }

  fs.writeFileSync(
    './output/performance_data_summary.json',
    JSON.stringify(results, null, 2)
  );

  console.log(`\n✅ Downloaded ${results.length}/${PERFORMANCE_LINKS.length} Excel files`);
  console.log('📁 Saved to output/xlsx/ + output/performance_data_summary.json');
}

downloadPerformanceExcel();