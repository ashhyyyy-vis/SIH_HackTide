const fs = require('fs');

/**
 * Build the final consolidated PS92 dataset from all scraped sources.
 * Sources: nsfdc_schemes.json, partners_structured.json, performance_extracted.json,
 *          state_sca_rate_cards.json (TAHDCO + Maharashtra)
 * This becomes the seed data JSON for the PS92 app.
 */

function main() {
  console.log('🗂  Building consolidated PS92 dataset...\n');

  // 1. SCHEMES - LIVE NSFDC 2026 catalog (verified nsfdc.nic.in/en/schemes, 30-04-2026).
  // Source: https://nsfdc.nic.in/en/schemes/ + https://nsfdc.nic.in/faqs
  // The FAQ still lists the classic "five primary schemes" (MFS, Term Loan, AMY, UNY, ELS)
  // but the live catalog uses new names. We keep BOTH: live names for accuracy,
  // and a `legacy_aliases` field for backward compat with older system notes.
  const schemes = [
    {
      code: 'MSY',
      name: 'Mahila Samriddhi Yojana',
      legacy_aliases: ['MFS'],
      description: 'Micro credit for women beneficiaries for units up to ₹1.40 lakh.',
      project_cost_min: 0,
      project_cost_max: 140000,
      max_loan_pct: 90,
      max_loan_amount: 125000,
      rate_ca: 2,
      rate_beneficiary: 6,
      tenure_years: 3,
      repayment_frequency: 'quarterly',
      moratorium_months: 3,
      channels: ['SCA', 'PSB', 'RRB'],
      target_gender: 'women',
      notes: 'New name for women-focused micro-finance (was part of MFS).'
    },
    {
      code: 'MCF',
      name: 'Micro-Credit Finance',
      legacy_aliases: ['MFS'],
      description: 'Micro credit for small business activities for units up to ₹1.40 lakh.',
      project_cost_min: 0,
      project_cost_max: 140000,
      max_loan_pct: 90,
      max_loan_amount: 125000,
      rate_ca: 2.5,
      rate_beneficiary: 6.5,
      tenure_years: 3,
      repayment_frequency: 'quarterly',
      moratorium_months: 3,
      channels: ['SCA', 'PSB', 'RRB'],
      notes: 'New name for general micro-finance (was MFS).'
    },
    {
      code: 'SUVIDHA',
      name: 'Suvidha Loan',
      legacy_aliases: ['TERM_LOAN'],
      description: 'Term loan for units costing up to ₹10 lakh (income-generating projects).',
      project_cost_min: 140001,
      project_cost_max: 1000000,
      max_loan_pct: 90,
      max_loan_amount: 900000,
      rate_ca: 4,
      rate_beneficiary: 8,
      tenure_years: 5,
      repayment_frequency: 'quarterly',
      moratorium_months: 6,
      moratorium_plantation_construction: 12,
      channels: ['SCA', 'PSB', 'RRB'],
      notes: 'Replaces the small-project end of the old "Term Loan".'
    },
    {
      code: 'UTKARSH',
      name: 'Utkarsh Loan',
      legacy_aliases: ['TERM_LOAN'],
      description: 'Term loan for larger projects (₹10L–₹50L).',
      project_cost_min: 1000001,
      project_cost_max: 5000000,
      max_loan_pct: 90,
      max_loan_amount: 4500000,
      rate_ca: 5,
      rate_beneficiary: 9,
      tenure_years: 7,
      repayment_frequency: 'quarterly',
      moratorium_months: 6,
      moratorium_plantation_construction: 12,
      channels: ['SCA', 'PSB', 'RRB'],
      notes: 'Replaces the large-project end of the old "Term Loan".'
    },
    {
      code: 'AMY',
      name: 'Aajeevika Microfinance Yojana',
      description: 'Need-based micro finance via selected NBFC-MFIs for projects up to ₹1.40 lakh.',
      project_cost_min: 0,
      project_cost_max: 140000,
      max_loan_pct: 90,
      max_loan_amount: 125000,
      rate_ca: 5,
      rate_beneficiary: 15,
      tenure_years: 3,
      repayment_frequency: 'quarterly',
      moratorium_months: 3,
      channels: ['NBFC-MFI'],
      notes: 'Higher rate (15%) as MFIs are for-profit. Faster disbursal.'
    },
    {
      code: 'UNY',
      name: 'Udyam Nidhi Yojana',
      description: 'Loans for small/micro activities costing up to ₹5 lakh via cooperatives and small finance banks.',
      project_cost_min: 0,
      project_cost_max: 500000,
      max_loan_pct: 90,
      max_loan_amount: 450000,
      rate_coop: 13,
      rate_sfb: 15,
      rate_ca: 5,
      rate_beneficiary: 13,
      tenure_years: 5,
      repayment_frequency: 'quarterly_or_half_yearly',
      moratorium_months: 3,
      channels: ['COOP_BANK', 'COOP_SOCIETY', 'SFB'],
      notes: '13% via Cooperative Banks/Societies, 15% via Small Finance Banks.'
    },
    {
      code: 'ELS',
      name: 'Educational Loan Scheme',
      description: 'Loan for regular full-time professional/technical courses in India or abroad.',
      project_cost_min: 0,
      project_cost_max: 4000000,
      max_loan_pct: 90,
      max_loan_amount_india: 3000000,
      max_loan_amount_abroad: 4000000,
      rate_ca_india_men: 2,
      rate_ca_india_women: 1.5,
      rate_beneficiary_india_men: 6,
      rate_beneficiary_india_women: 5.5,
      rate_ca_abroad_men: 3,
      rate_ca_abroad_women: 2.5,
      rate_beneficiary_abroad_men: 7,
      rate_beneficiary_abroad_women: 6.5,
      tenure_years_not_started: 12,
      tenure_years_started: 10,
      moratorium: 'Course period + 1 year (if repayment not started); up to 6 months if disbursed & started',
      channels: ['SCA', 'PSB', 'RRB'],
      courses: ['Engineering', 'Medical', 'Management/MBA', 'Law', 'Nursing', 'Pharmacy', 'CA', 'M.Phil', 'PhD']
    }
  ];

  // 2. ELIGIBILITY RULES - from NSFDC FAQ + PIB release (2026 revision)
  const eligibility = {
    caste: { required: 'SC', message: 'Beneficiary must belong to a Scheduled Caste' },
    income_max: { value: 500000, inclusive: true, revised: '7 Jan 2026', message: 'Family income ≤ ₹5 lakh per annum' },
    margin_money_pct: 10,
    loan_finance_pct: 90,
    entity_types: ['individual', 'partnership', 'cooperative_society'],
    all_members_sc_required: true,
    note: 'Partnership/coop: ALL members must be SC. SC status is state-specific.'
  };

  // 3. STATE-SPECIFIC SCHEMES (from state SCDCs / live sources, Sep 2026).
  // These supplement the NSFDC catalog; state schemes are often more generous
  // (e.g. Telangana's 80% subsidy, MP's 7% subsidy on micro loans).
  const state_specific_schemes = [
    {
      state: 'Telangana',
      scheme_code: 'RYV',
      scheme_name: 'Rajiv Yuva Vikasam (RYV) - Bank Linked Subsidy',
      source: 'GO Ms No 3, 2024 (tgmfc.com PDF) + tsobmms.cgg.gov.in',
      description: 'State subsidy on top of bank loan for SC/ST/BC/Minority unemployed youth.',
      eligible_caste: ['SC', 'ST', 'BC', 'Minority'],
      age_min: 18, age_max: 45,
      income_max: 250000,
      tiers: [
        { unit_cost_max: 50000,  subsidy_pct: 100, beneficiary_contribution: 0,  bank_loan_pct: 0   },
        { unit_cost_max: 100000, subsidy_pct: 90,  beneficiary_contribution: 10, bank_loan_pct: 0   },
        { unit_cost_max: 200000, subsidy_pct: 80,  beneficiary_contribution: 20, bank_loan_pct: 0   },
        { unit_cost_max: 400000, subsidy_pct: 70,  beneficiary_contribution: 30, bank_loan_pct: 0   }
      ],
      unit_cost_max: 400000,
      portal: 'https://tsobmms.cgg.gov.in',
      notes: 'Subsidy credited via DBT; bank loan only beyond unit cost or for additional financing.'
    },
    {
      state: 'Telangana',
      scheme_code: 'DALIT_BANDHU',
      scheme_name: 'Dalit Bandhu',
      source: 'Telangana SC Co-op Dev Corp (tgsccfc.cgg.gov.in) + 16 Aug 2021 launch',
      description: '₹10,00,000 per SC family as 100% grant (no repayment, no bank linkage).',
      eligible_caste: ['SC'],
      amount_per_family: 1000000,
      breakdown: { 'grant_to_beneficiary': 990000, 'rakshan_nidhi': 10000 },
      sectors: ['Agriculture & Allied', 'Manufacturing & Industry', 'Retail & Shops', 'Transport', 'Services & Supplies', 'Animal Husbandry'],
      helpline: ['09000289154', '09000219154', '18005992525', '040-23315970'],
      notes: 'DBT-based, family-level (not individual). 100% grant; no bank linkage; no repayment.'
    },
    {
      state: 'Madhya Pradesh',
      scheme_code: 'DBAKY',
      scheme_name: 'Dr. Bhimrao Ambedkar Aarthik Kalyan Yojana',
      source: 'merayuva.mp.gov.in (MPSCDCFC scheme)',
      description: 'Subsidy-cum-loan for SC self-employment.',
      eligible_caste: ['SC'],
      unit_cost_range: [10000, 100000],
      rate_beneficiary: 7,
      tenure_years: 5,
      notes: '7% interest subsidy on loans ₹10K–1L, up to 5 years.'
    },
    {
      state: 'Rajasthan',
      scheme_code: 'PM_AJAY',
      scheme_name: 'PM-AJAY Income Generation (via Anuja Nigam)',
      source: 'pmajay.dosje.gov.in + sje.rajasthan.gov.in',
      description: 'Subsidy of up to ₹50,000 or 50% of unit cost (whichever is lower) on bank loans for SC beneficiaries.',
      eligible_caste: ['SC'],
      subsidy: { amount_max: 50000, pct_max: 50, mode: 'min(amount, pct*unit_cost)' },
      portal: 'https://rajanujanigam.rajasthan.gov.in',
      notes: 'Disbursed via Rajasthan SC/ST Finance & Dev Co-op Corp (Anuja Nigam).'
    },
    {
      state: 'Uttarakhand',
      scheme_code: 'UKBVVN_SC_SELFEMP',
      scheme_name: 'SC/ST Self-Employment (UK BVVN)',
      source: 'ukbvvn.org.in/frmSCSTSelfEmployment.html',
      description: 'Bank loan + margin money + grant for SC/ST projects costing ₹20K–7L.',
      eligible_caste: ['SC', 'ST'],
      unit_cost_range: [20000, 700000],
      grant: { max_amount: 10000, pct: 50 },
      margin_money: { pct: 25, rate_pa: 4, repay_months: 60 },
      notes: 'PM-AJAY separately covers SC self-employment support.'
    },
    {
      state: 'Uttarakhand',
      scheme_code: 'UKBVVN_JEEVIKA_AVSAR',
      scheme_name: 'Jeevika Avsar Protsahan Yojana (UK BVVN)',
      source: 'ukbvvn.org.in + govtschemes.in',
      description: 'SC/ST/Divyang livelihood scheme with bank loan + margin money + subsidy + training.',
      eligible_caste: ['SC', 'ST', 'Divyang'],
      components: ['bank_finance', 'margin_money', 'subsidy', 'skill_training'],
      st_subsidy_max: 50000,
      sc_subsidy_max: 10000,
      sc_income_limit_rural: 105600,
      sc_income_limit_urban: 129840
    },
    {
      state: 'Goa',
      scheme_code: 'GOA_GRAHA_SURAKSHA',
      scheme_name: 'Graha Suraksha (House Repair)',
      source: 'goa.gov.in (Goa State SC & OBC FDC)',
      description: 'Low-interest loan for SC/OBC house repair, up to ₹2 lakh at 4% p.a.',
      eligible_caste: ['SC', 'OBC'],
      unit_cost_max: 200000,
      rate_beneficiary: 4,
      notes: 'Funded by State Government.'
    },
    {
      state: 'Dadra & Nagar Haveli / Daman & Diu',
      scheme_code: 'DNH_GAAY',
      scheme_name: 'Gir Adarsh Aajeevika Yojana (GAAY)',
      source: 'scstcorporation.com/gaay.html',
      description: 'Dairy farming (Gir cow) financial assistance for women SC/ST/OBC/Minority/Divyang.',
      eligible_caste: ['SC', 'ST', 'OBC', 'Minority', 'Divyang'],
      target_gender: 'women',
      age_min: 18, age_max: 55,
      collab: 'Dept. of Animal Husbandry & Veterinary Services, UT Admin',
      notes: 'GAAY-IDDP and GAAY-SSU sub-schemes.'
    },
    {
      state: 'Dadra & Nagar Haveli / Daman & Diu',
      scheme_code: 'DNH_MFS',
      scheme_name: 'Micro Finance Scheme (DNH&DD corp)',
      source: 'scstcorporation.com',
      description: 'Micro-finance loan up to ₹25,000 for 3 years at 6% p.a.',
      eligible_caste: ['SC', 'ST', 'OBC', 'Minority', 'Divyang'],
      unit_cost_max: 25000,
      rate_beneficiary: 6,
      tenure_years: 3
    },
    {
      state: 'Jammu & Kashmir',
      scheme_code: 'JK_VETLS',
      scheme_name: 'Vocational Education & Training Loan Scheme (VETLS)',
      source: 'jkscstbccorpn.in/schemes-scheduled-castes.htm',
      description: 'Loan for SC students pursuing short vocational training courses.',
      eligible_caste: ['SC'],
      rate_men: 4, rate_women: 3,
      moratorium: '6 months after course completion or employment, whichever is earlier'
    },
    {
      state: 'Karnataka',
      scheme_code: 'KA_BANK_LINKED',
      scheme_name: 'Dr. B.R. Ambedkar Dev Corpn - Bank-Linked Scheme',
      source: 'tumkur.nic.in/en/dr-b-r-ambedkar-development-corporation-limited/',
      description: 'Subsidy-cum-bank loan for SC projects.',
      eligible_caste: ['SC'],
      subsidy: { amount_max: 35000, pct_max: 50, note: 'whichever is lower' },
      isb_subsidy: { pct: 33, amount_max: 200000 },
      rate_beneficiary: 6
    },
    {
      state: 'Kerala',
      scheme_code: 'KERALA_ED_LOAN',
      scheme_name: 'KSDCSCST Education Loan',
      source: 'ksdcscst.kerala.gov.in',
      description: 'Education loan for SC/ST students at 6% p.a.',
      eligible_caste: ['SC', 'ST'],
      unit_cost_max: 400000,
      rate_beneficiary: 6,
      income_max: 350000
    },
    {
      state: 'Punjab',
      scheme_code: 'PB_DLS',
      scheme_name: 'PSCLDFC Direct Lending Scheme (DLS)',
      source: 'pbscfc.punjab.gov.in',
      description: 'Direct loan for SC self-employment.',
      eligible_caste: ['SC'],
      tiers: [
        { amount_max: 50000,  rate_pa: 5 },
        { amount_max: null,   rate_pa: 8, note: 'above ₹50K' }
      ]
    },
    {
      state: 'Himachal Pradesh',
      scheme_code: 'HP_TL',
      scheme_name: 'HPSCSTDC Term Loan (NSFDC collaboration)',
      source: 'hpscstdc.hp.gov.in',
      description: 'Margin money + NSFDC term loan for SC projects above ₹50K.',
      eligible_caste: ['SC'],
      funding_pattern: { 'hpscstdc_margin_money_pct': 10, 'nsfdc_term_loan_pct': 80 },
      sectors: ['Agriculture & Allied', 'Services (incl. Transport)', 'Industrial']
    }
  ];

  // 3. CHANNEL PARTNERS from parsed PDFs (partner types + counts). Geo-data is stubbed.
  const partnerRaw = JSON.parse(fs.readFileSync('./output/partners_structured.json', 'utf8'));
  const partnerTypes = {};
  for (const [type, data] of Object.entries(partnerRaw)) {
    partnerTypes[type] = {
      count: data.total_partners,
      schemes: getSchemesForType(type),
      partners: data.partners  // store ALL, not just sample
    };
  }

  // 4. DISBURSEMENT DATA from performance Excel files
  const perf = JSON.parse(fs.readFileSync('./output/performance_extracted.json', 'utf8'));

  // 5. NPA thresholds (RBI PCA + sector benchmarks, from risk assessment)
  const npa_thresholds = {
    PSB: { low: 3, medium: 6, high: 10, critical: 10 },
    RRB: { low: 10, medium: 15, high: 20, critical: 20 },
    NBFC_MFI: { low: 4, medium: 10, high: 15, critical: 15 },
    COOP_BANK: { low: 5, medium: 10, high: 15, critical: 15 },
    SFB: { low: 3, medium: 6, high: 10, critical: 10 },
    SCA: { low: 3, medium: 6, high: 10, critical: 10 }
  };

  // STATE SCDA INDEX - verified websites for all 27 SCDCs (Sep 2026).
  // Source: https://socialjustice.gov.in/schemes/36 + state websearches.
  const state_scda_index = [
    { state: 'Andhra Pradesh', scda_name: 'APSCCFC', url: 'https://apsccfc.apcfss.in' },
    { state: 'Assam',          scda_name: 'Assam State Dev Corpn for SC Ltd', url: 'https://directorwsc.assam.gov.in/portlets/assam-state-development-corporation' },
    { state: 'Bihar',          scda_name: 'BISCOCEF (no dedicated site)', url: 'https://scstonline.bihar.gov.in' },
    { state: 'Chandigarh',     scda_name: 'Chandigarh SC,BC & Minorities FDC', url: 'https://chandigarh.gov.in/scbc-minorities-financial-development-corp' },
    { state: 'Chhattisgarh',   scda_name: 'CG Antavayasayee Co-op SCFDC', url: 'https://tribal.cg.gov.in' },
    { state: 'Dadra & Nagar Haveli / Daman & Diu', scda_name: 'DNH&DD SC/ST/OBC/Min. FDC', url: 'http://scstcorporation.com' },
    { state: 'Delhi',          scda_name: 'DSFDC', url: 'https://dsfdc.delhi.gov.in' },
    { state: 'Goa',            scda_name: 'Goa State SC & OBC FDC', url: 'https://www.goa.gov.in/department/goa-state-sc-obc-finance-development-corporation-ltd/' },
    { state: 'Gujarat',        scda_name: 'Gujarat SCDC', url: 'https://sje.gujarat.gov.in/gscdc' },
    { state: 'Haryana',        scda_name: 'HSCFDC', url: 'https://hscfdc.org.in' },
    { state: 'Himachal Pradesh', scda_name: 'HPSCSTDC', url: 'https://hpscstdc.hp.gov.in' },
    { state: 'Jammu & Kashmir', scda_name: 'J&K SC ST OBC Dev Corpn', url: 'http://jkscstbccorpn.jk.gov.in' },
    { state: 'Jharkhand',      scda_name: 'Jharkhand State SC Co-op Dev Corpn', url: 'https://www.jstcdc.org.in' },
    { state: 'Karnataka',      scda_name: 'Dr. B.R. Ambedkar Dev Corpn Ltd', url: 'https://karunadu.karnataka.gov.in/ambedkarcorpn', note: 'site not resolvable from all networks; data via district NIC pages' },
    { state: 'Kerala',         scda_name: 'KSDCSCST', url: 'https://ksdcscst.kerala.gov.in' },
    { state: 'Madhya Pradesh', scda_name: 'MP State Co-op SCFDC', url: 'https://merayuva.mp.gov.in' },
    { state: 'Maharashtra',    scda_name: 'Mahatma Phule BC Dev Corpn', url: 'https://atrocity.newcloud.in' },
    { state: 'Manipur',        scda_name: '(no dedicated SCDC; via Dir. OBC&SC + MSCB)', url: 'https://manipurobcsc.mn.gov.in' },
    { state: 'Odisha',         scda_name: 'OSFDC', url: 'https://osfdc.gov.in' },
    { state: 'Puducherry',     scda_name: 'Puducherry Adi Dravidar Dev Corpn', url: 'https://adwelfare.py.gov.in' },
    { state: 'Punjab',         scda_name: 'PSCLDFC', url: 'http://pbscfc.punjab.gov.in' },
    { state: 'Rajasthan',      scda_name: 'RSCSTFDCC (Anuja Nigam)', url: 'https://sje.rajasthan.gov.in/schemes/RSCSTFDCC.html' },
    { state: 'Sikkim',         scda_name: 'Sikkim SC/ST/OBC Dev Corpn', url: 'https://sikkimsabcco.com' },
    { state: 'Tamil Nadu',     scda_name: 'TAHDCO', url: 'https://www.tahdco.com' },
    { state: 'Telangana',      scda_name: 'TGSCCFC', url: 'https://tgsccfc.cgg.gov.in' },
    { state: 'Tripura',        scda_name: 'Tripura SC Co-op Dev Corpn', url: 'https://cooperation.tripura.gov.in/tripura-s-c-coop-devcoorporation-ltd' },
    { state: 'Uttarakhand',    scda_name: 'UK BVVN', url: 'https://www.ukbvvn.org.in' },
    { state: 'Uttar Pradesh',  scda_name: 'UPCFDC', url: 'https://upscfdc.in' },
    { state: 'West Bengal',    scda_name: 'WB SC/ST OBC Dev & Fin Corpn', url: 'https://wbbcdev.gov.in' }
  ];

  // Load state SCA rate-card data from the new scraper
  let stateScraped = {};
  try {
    stateScraped = JSON.parse(fs.readFileSync('./output/state_sca_rate_cards.json', 'utf8'));
  } catch (_) { /* optional */ }

  const dataset = {
    meta: {
      generated_at: new Date().toISOString(),
      source: 'Live scrape of nsfdc.nic.in, state SCDCs, + official performance Excel files',
      data_accuracy: 'NSFDC rates verified against live scheme page (30-04-2026). Income ceiling raised to ₹5L from 07-01-2026 per PIB release.',
      disclaimer: 'For hackathon demo. Rates verified from NSFDC; state SCAs may vary. Final eligibility verified by SCA/NSFDC.'
    },
    eligibility,
    schemes,
    state_specific_schemes,
    state_scda_index,
    npa_thresholds,
    channel_partner_types: partnerTypes,
    disbursement: {
      scheme_wise_crore: perf.scheme_wise,
      state_allocation_lakh: perf.state_allocation,
      agency_wise_crore: perf.agency_wise
    },
    state_scraped_content: stateScraped
  };

  fs.writeFileSync('./data/ps92_dataset.json', JSON.stringify(dataset, null, 2));
  console.log(`✅ Schemes: ${schemes.length}`);
  console.log(`✅ State-specific schemes: ${state_specific_schemes.length}`);
  console.log(`✅ State SCDA index: ${state_scda_index.length}`);
  console.log(`✅ Partner types: ${Object.keys(partnerTypes).length} (${Object.values(partnerTypes).reduce((a, t) => a + t.count, 0)} total entries)`);
  console.log('📁 Saved to data/ps92_dataset.json');
}

function getSchemesForType(type) {
  switch (type) {
    case 'State_Channelizing_Agencies': return ['MSY', 'MCF', 'SUVIDHA', 'UTKARSH', 'ELS'];
    case 'Public_Sector_Banks': return ['MSY', 'MCF', 'SUVIDHA', 'UTKARSH', 'ELS'];
    case 'Regional_Rural_Banks': return ['MSY', 'MCF', 'SUVIDHA', 'UTKARSH', 'ELS'];
    case 'NBFC_MFIs': return ['AMY'];
    case 'Cooperative_Banks': return ['UNY'];
    case 'Cooperative_Societies': return ['UNY'];
    case 'Small_Finance_Banks': return ['UNY'];
    default: return [];
  }
}

main();