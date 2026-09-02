# PS92 Data Scraper

Automated scraper that pulls **real NSFDC + state SCA data** for the PS92 app
(AI-Driven Scheme Matching for Marginalized SC Entrepreneurs).

## What it scrapes

| Step | Command | Source | Output |
|---|---|---|---|
| 1. NSFDC schemes + partners page | `node scrape_nsfdc.js` | nsfdc.nic.in/scheme, /our-channel-partners, /allocation-of-funds, /performance-data | `output/nsfdc_schemes.json`, `output/nsfdc_channel_partners.json`, `output/nsfdc_performance_links.json` |
| 2. Partner PDFs | `node download_pdfs.js` | 8 partner-list PDFs from nsfdc.nic.in | `output/pdfs/*.pdf`, `output/partner_pdfs_parsed.json` |
| 3. Structured partner records | `node parse_partners.js` | parsed PDF text | `output/partners_structured.json` (91 partner entries) |
| 4. Performance Excel files | `node download_performance.js` | 8 disbursement .xlsx files | `output/xlsx/*.xlsx` |
| 5. Extract performance data | `node extract_performance.js` | downloaded xlsx | `output/performance_extracted.json` |
| 6. State SCA rate cards | `node scrape_rate_cards.js` | TAHDCO (TN), Maharashtra atrocity portal | `output/state_sca_rate_cards.json` |
| 7. **Build final dataset** | `node build_dataset.js` | everything above | **`data/ps92_dataset.json`** |

**One-shot:** `node run_all.js` (but run the steps in order via the Make target below).

## Quick start

```bash
cd scraper
npm install
node scrape_nsfdc.js          # step 1
node download_pdfs.js         # step 2
node parse_partners.js        # step 3
node download_performance.js  # step 4
node extract_performance.js   # step 5
node scrape_rate_cards.js     # step 6
node build_dataset.js         # step 7 → data/ps92_dataset.json
```

## Dataset: `data/ps92_dataset.json`

Consolidated seed data for the app:

- **`eligibility`** — caste = SC, income ≤ ₹5L (revised 7 Jan 2026), 10% margin money, 90% loan finance. Verified live.
- **`schemes`** — the 5 core schemes with exact rates/moratoria:
  - **MFS** 6.5%, 3yr, 3mo moratorium (≤₹1.40L)
  - **Term Loan** 8%, 7yr, 6mo (12mo plantation/construction) (₹1.40L–₹50L)
  - **AMY** 15%, 3yr, 3mo (via NBFC-MFIs only)
  - **UNY** 13%(coop)/15%(SFB), 5yr, 3mo (≤₹5L)
  - **ELS** 6.5% men / 5.5% women, course+1yr moratorium
- **`npa_thresholds`** — RBI PCA-based green/yellow/red/black NPA cutoffs per institution type (for the novel "eligible partner" filter).
- **`channel_partner_types`** — 8 partner categories, 91 real entries with names/abbreviations/addresses.
- **`disbursement`** — real scheme-wise (₹ crore), state-wise allocation vs actuals (₹ lakh), and agency-wise figures from the official Excel files.
- **`state_specific_rate_cards`** — TAHDCO Term Loan slab rates (3–10% beneficiary) confirming state variation.

## Notes / caveats

- `parse_nsfdc.js` may 404 on English scheme pages (`/en/...`); the primary `/scheme` page
  (Hindi + English) has everything and is the source of truth used in the dataset.
- Geo coordinates for partner locator are **not in the PDFs** — the app stubs lat/lng and NPA
  flags from the `npa_thresholds` + real disbursement distributions. In production you'd
  integrate SCA quarterly reporting.
- Rate cards vary by state SCA. TAHDCO's Term Loan uses slab rates (3%/6% up to ₹5L, 5%/8%
  ₹5–10L, 6%/9% ₹10–20L, 7%/10% ₹20–45L) — a good example of the state-first lookup the recommender does.