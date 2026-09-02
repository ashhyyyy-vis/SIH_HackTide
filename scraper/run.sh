#!/bin/bash
# One-shot automated scraper for PS92 data
set -e
cd "$(dirname "$0")"

echo "═══ PS92 Automated Scraper ═══"

echo "▶ [1/7] NSFDC schemes + partner pages"
node scrape_nsfdc.js

echo "▶ [2/7] Download partner PDFs"
node download_pdfs.js

echo "▶ [3/7] Parse partner records"
node parse_partners.js

echo "▶ [4/7] Download performance Excel files"
node download_performance.js

echo "▶ [5/7] Extract performance data"
node extract_performance.js

echo "▶ [6/7] State SCA rate cards"
node scrape_rate_cards.js

echo "▶ [7/7] Build consolidated dataset"
node build_dataset.js

echo ""
echo "✅ Done → data/ps92_dataset.json"
ls -la data/ps92_dataset.json