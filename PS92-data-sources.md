# PS92 - SCDA Data Sources Register

Registry of State Scheduled Castes Development Corporations (SCDCs) with the official
website where rate-card / scheme data was (or will be) sourced. Compiled via web search
+ the Ministry's authoritative list of all 27 SCDCs, Sep 2026.

## Authoritative master list
- **Ministry of Social Justice & Empowerment — Scheme of Assistance to SCDCs**
  Page: https://socialjustice.gov.in/schemes/36
  Official 27-SCDC address list (PDF): https://socialjustice.gov.in/writereaddata/UploadFile/List%20of%2027%20SCDCs%20with%20addresses.pdf

## National apex (NSFDC) rates — live 2026 catalog
- Schemes page (rates table): https://nsfdc.nic.in/en/schemes/
- FAQs (eligibility, income ₹5L from 07-01-2026, five schemes): https://nsfdc.nic.in/faqs
- How to apply (PM-SURAJ portal pmsuraj.dosje.gov.in): https://nsfdc.nic.in/en/how-to-apply
- Ministry NSFDC page (income ₹5L): https://socialjustice.gov.in/schemes/34
- PIB release (income ₹3L→₹5L effective 07-01-2026): https://pib.gov.in/PressReleasePage.aspx?PRID=2222707

## State-by-state data sources
| State | SCDC | Website (source) | Data obtained |
|---|---|---|---|
| Andhra Pradesh | APSCCFC | https://apsccfc.apcfss.in | conf. site |
| Assam | Assam State Dev Corpn for SC Ltd | https://directorwsc.assam.gov.in/portlets/assam-state-development-corporation | est 1975, 51:49; DRI/FOIG/schemes |
| Bihar | Bihar State SC Co-op Dev Corpn (BISCOCEF) | no dedicated site (via scstonline.bihar.gov.in) | income-generating, education loans via BSEFC |
| Chandigarh | Chandigarh SC Financial & Dev Corp / SC,BC & Minorities FDC | https://chandigarh.gov.in/scbc-minorities-financial-development-corp | PDF details |
| Chhattisgarh | CG Antavayasayee Co-op SCFDC | https://tribal.cg.gov.in/en/chhattisgarh-state-intermediate-co-operative-finance-and-development-corporation | SC/ST/BC/Minority loans |
| Dadra & Nagar Haveli, Daman & Diu | DNH&DD SC/ST/OBC/Min. & Handicapped FDC | http://scstcorporation.com | est 1993; loan ≤₹15L; GAAY dairy; MFS ₹25K @6% |
| Delhi | DSFDC | https://dsfdc.delhi.gov.in | schemes |
| Goa | Goa State SC & OBC FDC | https://www.goa.gov.in/department/goa-state-sc-obc-finance-development-corporation-ltd/ | est 1990; Graha Suraksha ≤₹2L @4% |
| Gujarat | Gujarat SCDC | https://sje.gujarat.gov.in/gscdc | NSFDC 1–5% |
| Haryana | HSCFDC | https://hscfdc.org.in | **26 rate tables** (scraped) |
| Himachal Pradesh | HPSCSTDC | https://hpscstdc.hp.gov.in (schemes: /hpmvn/schemes) | Swarojgar ₹50K; Himswablamban; MCF |
| Jammu & Kashmir | J&K SC,ST & OBC Dev Corpn Ltd | https://jkscstbccorpn.in/schemes-scheduled-castes.htm | Term Loan/LVY/MSY/MCF/EDS/VETLS; helpline 1800-180-7163 |
| Jharkhand | Jharkhand State SC Co-op Dev Corpn | https://www.jstcdc.org.in (JSTCDC is ST/BC SCA; SC corp separate) | Mukhyamantri Rojgar Srijan |
| Karnataka | Dr. B.R. Ambedkar Dev Corpn Ltd | via tumkur.nic.in (bank-linked 50% subsidy ≤₹35K; ISB 33% ≤₹2L; 6%) | subsidy/rate |
| Kerala | KSDCSCST | https://ksdcscst.kerala.gov.in | ed loan 6%; income ≤₹3.5L |
| Madhya Pradesh | MP State Co-op SCFDC | https://merayuva.mp.gov.in | Dr. Bhimrao Ambedkar Aarthik Kalyan (7% subsidy, ₹10K–1L, 5yr) |
| Maharashtra | Mahatma Phule BC Dev Corpn Ltd | https://atrocity.newcloud.in | scheme pages |
| Manipur | (via Dir. Welfare OBC & SC) | https://manipurobcsc.mn.gov.in | IGA via MSCB under SCA-to-SCSP; no dedicated SCDC site |
| Odisha | OSFDC | https://osfdc.gov.in | SC/ST/OBC/SK |
| Puducherry | Puducherry Adi Dravidar Dev Corpn | https://adwelfare.py.gov.in | SCLCSS etc. |
| Punjab | PSCLDFC | https://pbscfc.punjab.gov.in | DLS ≤₹50K @5% / >₹50K @8% |
| Rajasthan | RSCSTFDCC (Anuja Nigam) | https://rajanujanigam.rajasthan.gov.in + https://sje.rajasthan.gov.in/schemes/RSCSTFDCC.html | online portal 2023; PM-AJAY ≤₹50K; FY24-25 ₹18.75Cr |
| Sikkim | Sikkim SC/ST & OBC Dev Corpn | https://sikkimsabcco.com | schemes |
| Tamil Nadu | TAHDCO | https://www.tahdco.com | rates |
| Telangana | TGSCCFC / TSSCCFC | https://tgsccfc.cgg.gov.in; OBMMS https://tsobmms.cgg.gov.in | Rajiv Yuva Vikasam (80/70/60% subsidy); Dalit Bandhu ₹10L; OBMS (JS-heavy) |
| Tripura | Tripura SC Co-op Dev Corpn | https://cooperation.tripura.gov.in/tripura-s-c-coop-devcoorporation-ltd | PDF |
| Uttarakhand | UK BVVN | https://www.ukbvvn.org.in (SC/ST Self-Employment: /frmSCSTSelfEmployment.html) | est 25-10-2001; SC/ST self-emp 50% or ₹10K grant + 25% margin @4%; Jeevika Avsar ST ₹50K |
| Uttar Pradesh | UPCFDC | https://upscfdc.in | schemes |
| West Bengal | WB SC/ST OBC Dev & Fin Corpn | https://wbbcdev.gov.in | SC/ST/OBC/SK schemes |

## Notes
- **Income ceiling**: NSFDC eligibility raised ₹3L → **₹5L** from 07-01-2026 (PIB + NSFDC FAQ).
- **NSFDC live schemes (2026)** vs the older 5-scheme set in `build_dataset.js`:
  MSY (₹1.25L loan @6%), MCF @6.5%, Suvidha Loan (≤₹10L, ₹9L @8%, 5yr),
  Utkarsh (₹10–50L, ₹45L @9%, 7yr), ELS (India ₹30L @6%/5.5%; abroad ₹40L @7%/6.5%),
  plus AMY @15% and UNY @13% (co-op) /15% (SFB). MFS≈MCF, old Term Loan≈Suvidha+Utkarsh.
- **No dedicated SCDC websites**: Bihar (BISCOCEF), Manipur — loans/SCA funds channeled via
  state welfare portals/co-op banks; no standalone public rate-card portal found (Sep 2026).
- Scraper: `scraper/scrape_all_state_cards.js` (verified URL list) → `scraper/output/state_sca_rate_cards.json`.
- Haryana (`hscfdc.org.in`) is the richest scraping target so far (26 tables).
