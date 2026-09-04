# Data Sources — PS92 (SIH26092)

Complete catalog of every data source used in this project.

---

## 1. Problem Statement & Research

| Source | URL | What We Got | Output File |
|---|---|---|---|
| SIH Problem Statements JSON | `sih.json` (local) | PS92 definition at line 1549 | `sih.json` |
| PS92 Approach Doc | `PS92-approach.md` (local) | Full build plan, tech stack, 4-phase timeline | `PS92-approach.md` |
| PS92 Component Solutions | `PS92-component-solutions.md` (local) | Recommender decision tree, EMI formulas, locator logic | `PS92-component-solutions.md` |
| PS92 Data Sources | `PS92-data-sources.md` (local) | 27 SCDC websites, state-by-state data sources | `PS92-data-sources.md` |
| PS92 GitHub Research | `PS92-github-research.md` (local) | Reusable precedents (Fuse.js, MyMemory API, Genkit+Zod) | `PS92-github-research.md` |
| PS92 Risk Assessment | `PS92-risk-assessment.md` (local) | Risks (PDF-only partner data, EMI moratorium non-standard) | `PS92-risk-assessment.md` |
| PS92 Research Notes | `PS92-research-notes.md` (local) | Domain research (NSFDC ecosystem, channel partners, eligibility) | `PS92-research-notes.md` |

---

## 2. NSFDC Official Website (nsfdc.nic.in)

All scraped via `scraper/scrape_nsfdc.js` and `scraper/download_pdfs.js`.

| Page / Asset | URL | What We Got | Output File |
|---|---|---|---|
| Scheme page | `nsfdc.nic.in/scheme` | 5 core scheme definitions (MFS, Term Loan, AMY, UNY, ELS) with rates, limits, moratoria | `output/nsfdc_schemes.json` |
| Channel Partners page | `nsfdc.nic.in/our-channel-partners` | Links to 8 partner-list PDFs | `output/nsfdc_channel_partners.json` |
| Allocation of Funds | `nsfdc.nic.in/allocation-of-funds` | State-wise allocation data | `output/nsfdc_allocation.json` |
| Performance Data | `nsfdc.nic.in/performance-data` | Links to 8 disbursement Excel files | `output/nsfdc_performance_links.json` |
| FAQs | `nsfdc.nic.in/faqs` | Confirmed "102 partners" total, eligibility criteria, channel finance system | (web research) |
| **8 Partner PDFs** | `nsfdc.nic.in/storage/channel-partners/attachments/...` | 91 real partner organizations with names, types, addresses | `output/pdfs/*.pdf`, `output/partner_pdfs_parsed.json`, `output/partners_structured.json` |
| **8 Performance Excels** | `nsfdc.nic.in/storage/performance-data/attachments/...` | Scheme-wise disbursement figures (₹ crore), state-wise allocation vs actuals | `output/xlsx/*.xlsx`, `output/performance_extracted.json` |

### Partner PDFs Downloaded

| PDF | Category | Entries |
|---|---|---|
| `Channel partners-SCA.pdf` | State Channelizing Agencies | 32 |
| `Channel partners-PSB.pdf` | Public Sector Banks | 11 |
| `Channel partners-RRB.pdf` | Regional Rural Banks | 25 |
| `Channel partners-NBFC.pdf` | NBFC-MFIs | 4 |
| `Channel partners-Coop.pdf` | Cooperative Banks | 9 |
| `Channel partners-SFB.pdf` | Small Finance Banks | 5 |
| `Channel partners-Societies.pdf` | Cooperative Societies | 2 |
| `Channel partners-Others.pdf` | Other Agencies (SIDBI, NEDFi, etc.) | 3 |

---

## 3. RBI Bank Branch Database (Primary Branch Data)

| Source | URL | What We Got | Output File |
|---|---|---|---|
| IndiaBankDatabase (GitHub) | `github.com/MistrySaurabh/IndiaBankDatabase` | **142,399 bank branches** across India — bank name, IFSC, MICR, branch, address, contact, city, district, state | `data/banks_raw.sql` |
| Original data from | `rbi.org.in/scripts/bs_viewcontent.aspx?Id=2009.com/` | RBI Master Office File (MOF) of all bank branches | (via GitHub mirror) |

### Filtered for Our Project

After filtering to **all 36 states/UTs** + **11 NSFDC PSB partners**:

| State | Branches |
|---|---|
| Uttar Pradesh | 8,821 |
| Maharashtra | 6,012 |
| Tamil Nadu | 5,954 |
| Andhra Pradesh | 5,189 |
| West Bengal | 4,682 |
| Karnataka | 4,285 |
| Gujarat | 4,264 |
| Rajasthan | 3,728 |
| Punjab | 3,679 |
| Madhya Pradesh | 3,647 |
| Kerala | 3,624 |
| Bihar | 3,650 |
| Odisha | 2,645 |
| Haryana | 2,252 |
| Delhi | 1,970 |
| Jharkhand | 1,926 |
| Assam | 1,352 |
| Chandigarh | 1,302 |
| Uttarakhand | 1,248 |
| Himachal Pradesh | 1,130 |
| Jammu & Kashmir | 451 |
| Goa | 382 |
| Telangana | 312 |
| Meghalaya | 195 |
| Chhattisgarh | 171 |
| Puducherry | 145 |
| Tripura | 225 |
| Manipur | 114 |
| Arunachal Pradesh | 95 |
| Sikkim | 95 |
| Nagaland | 101 |
| Mizoram | 72 |
| Andaman & Nicobar | 41 |
| Daman & Diu | 22 |
| Dadra & Nagar Haveli | 20 |
| Lakshadweep | 2 |
| **Total** | **73,803** |

Parsed by `scraper/parse_bank_branches.js` → `output/partner_branches.json`

---

## 4. SCA District Office Data (Web Scraped)

Real district-level office data scraped from SCA websites via web search.

### TAHDCO — Tamil Nadu (38 offices)

| Source | URL | What We Got |
|---|---|---|
| TAHDCO District Managers | `tahdco.com/district-managers.php` | 38 district manager offices with addresses, phone numbers, emails |
| TAHDCO About Us | `tahdco.com/about-us.php` | Confirmed "38 offices in each district HQ" |
| TAHDCO NSFDC Schemes | `tahdco.com/livelihood-program-nscfdc.php` | Active NSFDC loan processing details |
| TAHDCO RTI | `tahdco.com/rti-pio.php` | PIO contact numbers for all 38 districts |

**Districts covered:** Ariyalur, Chennai, Coimbatore, Cuddalore, Dharmapuri, Dindigul, Erode, Kancheepuram, Kanyakumari, Karur, Krishnagiri, Madurai, Nagapattinam, Namakkal, Nilgiris, Perambalur, Pudukkottai, Ramanathapuram, Ranipet, Salem, Sivaganga, Thanjavur, Theni, Thiruvallur, Thiruvarur, Tiruchirapalli, Tirunelveli, Tirupattur, Tiruvannamalai, Tiruppur, Thoothukkudi, Vellore, Villupuram, Virudhunagar, Chengalpattu, Tenkasi, Kallakurichi, Myladuthurai

### UPSCFDC — Uttar Pradesh (75 offices)

| Source | URL | What We Got |
|---|---|---|
| UPSCFDC Contacts | `upscfdc.in/contacts` | 75 district offices with email IDs (DSWO/UPSCFDC contacts) |
| UPSCFDC Employees | `upscfdc.in/employees` | District-wise employee directory |

**Districts covered:** All 75 districts of Uttar Pradesh (Agra through Varanasi)

### HPSCSTDC — Himachal Pradesh (12+6 offices)

| Source | URL | What We Got |
|---|---|---|
| HPSCSTDC Contact Us | `hpscstdc.hp.gov.in/contact-us` | 12 District Manager offices + 6 Assistant Manager offices |
| HPSCSTDC Telephone | `himachalservices.nic.in/hpscstdc/NigamEng-Telephone.htm` | Full telephone directory with 21 entries |
| HPSCSTDC NSFDC Term Loan | `hpscstdc.hp.gov.in/scheme/term-loan` | Active NSFDC loan processing details |

**Districts covered:** Bilaspur, Chamba (Bharmour), Hamirpur, Kangra (Dharamshala), Kinnaur, Kullu, Lahaul & Spiti (Kaza, Keylong), Mandi (Sarkaghat), Shimla (Jubbal), Sirmaur, Solan, Una

### APSCCFC — Andhra Pradesh

| Source | URL | What We Got |
|---|---|---|
| APSCCFC Home | `apsccfc.apcfss.in` | Head office info, confirmed as NSFDC SCA |
| NSKFDC Channel Agencies List | `nskfdc.nic.in/en/content/home/list-channelizing-agencies` | Listed APSCCFC with address |
| Kakinada District SC Corp | `kakinada.ap.gov.in/departments/sc-corporation/` | District SC society structure |

---

## 5. Verification Sources (Web Research)

Partner authenticity verified against:

| Partner Verified | Source | Confirmed |
|---|---|---|
| APSCCFC | nsfdc.nic.in channel partners list, nskfdc.nic.in list | ✅ est. 1974 |
| TAHDCO | tahdco.com (active NSFDC loan processing) | ✅ 38 district offices |
| Satin Creditcare Network | Listed NBFC-MFI, 3.3M clients, 29 states | ✅ |
| Bihar Gramin Bank | Wikipedia, NSFDC RRB page, paisasetu.in | ✅ Now "Bihar Gramin Bank" post-merger |
| NSFDC "102 partners" | nsfdc.nic.in/faqs | ✅ Confirmed |
| All 11 PSBs | NSFDC channel partners page | ✅ |
| Dakshin Bihar Gramin Bank | Wikipedia, bankingallinfo.com | ✅ 1078 branches, merged May 2025 |

---

## 6. State SCA Rate Cards (Web Scraped)

| Source | URL | What We Got | Output File |
|---|---|---|---|
| TAHDCO Term Loan | `tahdco.com/...` | Slab rates: 3-10% beneficiary based on loan amount | `output/state_sca_rate_cards.json` |
| Maharashtra Atrocity Portal | `mahamisc.nic.in` | SC/ST loan schemes for Maharashtra | `output/state_sca_rate_cards.json` |
| TAHDCO NSFDC Schemes | `tahdco.com/livelihood-program-nscfdc.php` | Active scheme processing details | (research) |
| 27 SCDC websites | Various (see PS92-data-sources.md) | State-wise SCDC information | `PS92-data-sources.md` |

---

## 7. District Centroid Data

| Source | What We Got | Used In |
|---|---|---|
| Census of India / Survey of India (reference) | Approximate lat/lng for ~170 districts across TN, UP, HP, Bihar | `build_partner_locator.js` — geocoding 19,555 bank branches |
| State centroids (reference) | Fallback geocoding for branches with non-standard district names | `build_partner_locator.js` — 6,510 branches geocoded at state level |

---

## 8. Output Files Summary

| File | Size | Contents |
|---|---|---|
| `data/ps92_dataset.json` | 199 KB | Consolidated seed dataset (7 schemes, 14 state schemes, 29 SCDCs, 91 partners, NPA thresholds, disbursement) |
| `data/banks_raw.sql` | 26 MB | Full RBI bank branch database (142K branches) |
| `output/partner_locator.json` | 26 MB | **73,928 partner branches** with lat/lng (73,803 bank + 125 SCA) across all 36 states/UTs |
| `output/partner_locator.geojson` | — | GeoJSON version for Leaflet map |
| `output/partner_branches.json` | 5.9 MB | 73,803 bank branches (pre-geocoding) |
| `output/partners_structured.json` | 20 KB | 91 NSFDC partner HQs from PDF parsing |
| `output/performance_extracted.json` | 40 KB | Scheme-wise disbursement figures |
| `output/state_sca_rate_cards.json` | 307 KB | Scraped state SCA rate tables |
| `output/nsfdc_schemes.json` | 122 KB | Raw NSFDC scheme page scrape |

---

## 9. Scripts

| Script | Purpose |
|---|---|
| `scrape_nsfdc.js` | Scrape NSFDC scheme page, channel partners page, allocation, performance links |
| `download_pdfs.js` | Download 8 partner-list PDFs from NSFDC |
| `parse_partners.js` | Parse PDF text → structured partner JSON (91 entries) |
| `download_performance.js` | Download 8 disbursement Excel files |
| `extract_performance.js` | Extract scheme-wise figures from Excel |
| `scrape_rate_cards.js` | Scrape TAHDCO and Maharashtra rate cards |
| `scrape_all_state_cards.js` | Scrape multiple state SCA websites |
| `build_dataset.js` | Assemble everything into `ps92_dataset.json` |
| `parse_bank_branches.js` | Parse RBI SQL database → filter 73,803 branches for all 36 states/UTs |
| `build_partner_locator.js` | Combine bank branches + SCA offices → geocoded `partner_locator.json` (nationwide) |
| `run_all.js` | Run all scraper steps sequentially |
