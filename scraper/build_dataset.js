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
  // UNIFIED SHAPE: every entry has the exact same keys, with null for unused fields.
  // Common keys:
  //   state, code, name, source, description,
  //   eligible_castes[], target_gender, age_min, age_max, income_limit,
  //   unit_cost_min, unit_cost_max,
  //   funding{ grant_pct, grant_amount_max, margin_money_pct, margin_money_interest_pa,
  //            bank_loan_pct, interest_pa_beneficiary, interest_pa_men, interest_pa_women,
  //            tenure_years, repayment_note },
  //   tiers[] (optional, for graded funding),
  //   portal, notes
  const state_specific_schemes = [
    {
      state: 'Telangana',
      code: 'RYV',
      name: 'Rajiv Yuva Vikasam (Bank Linked Subsidy)',
      source: 'GO Ms No 3, 2024 (tgmfc.com PDF) + tsobmms.cgg.gov.in',
      description: 'State subsidy on top of bank loan for unemployed SC/ST/Backward Class/Minority youth.',
      eligible_castes: ['SC', 'ST', 'Backward Class', 'Minority'],
      target_gender: null,
      age_min: 18, age_max: 45,
      income_limit: 250000,
      unit_cost_min: 0, unit_cost_max: 400000,
      funding: {
        grant_pct: null, grant_amount_max: null,
        margin_money_pct: null, margin_money_interest_pa: null,
        bank_loan_pct: null, interest_pa_beneficiary: null,
        interest_pa_men: null, interest_pa_women: null,
        tenure_years: null, repayment_note: 'Tiered subsidy; no bank loan in any tier (bank only above unit cost).'
      },
      tiers: [
        { unit_cost_max: 50000,  grant_pct: 100, beneficiary_contribution_pct: 0,  bank_loan_pct: 0 },
        { unit_cost_max: 100000, grant_pct: 90,  beneficiary_contribution_pct: 10, bank_loan_pct: 0 },
        { unit_cost_max: 200000, grant_pct: 80,  beneficiary_contribution_pct: 20, bank_loan_pct: 0 },
        { unit_cost_max: 400000, grant_pct: 70,  beneficiary_contribution_pct: 30, bank_loan_pct: 0 }
      ],
      portal: 'https://tsobmms.cgg.gov.in',
      notes: 'Subsidy credited via Direct Benefit Transfer.'
    },
    {
      state: 'Telangana',
      code: 'DALIT_BANDHU',
      name: 'Dalit Bandhu',
      source: 'Telangana SC Co-op Dev Corp (tgsccfc.cgg.gov.in) + 16 Aug 2021 launch',
      description: '1 million rupees per Scheduled Caste family as 100% grant, no repayment, no bank linkage.',
      eligible_castes: ['SC'],
      target_gender: null,
      age_min: null, age_max: null,
      income_limit: null,
      unit_cost_min: null, unit_cost_max: 1000000,
      funding: {
        grant_pct: 100, grant_amount_max: 1000000,
        margin_money_pct: null, margin_money_interest_pa: null,
        bank_loan_pct: 0, interest_pa_beneficiary: null,
        interest_pa_men: null, interest_pa_women: null,
        tenure_years: null, repayment_note: 'No repayment. Of the 1M, 990,000 to beneficiary + 10,000 to Dalit Rakshan Nidhi fund.'
      },
      tiers: [],
      portal: 'https://tgsccfc.cgg.gov.in',
      notes: 'Family-level (not individual), Direct Benefit Transfer based. Sectors: agriculture, industry, retail, transport, services, animal husbandry. Helplines: 09000289154, 09000219154, 18005992525, 040-23315970.'
    },
    {
      state: 'Madhya Pradesh',
      code: 'DBAKY',
      name: 'Dr. Bhimrao Ambedkar Aarthik Kalyan Yojana',
      source: 'merayuva.mp.gov.in (MPSCDCFC scheme)',
      description: 'Subsidy plus loan for Scheduled Caste self-employment.',
      eligible_castes: ['SC'],
      target_gender: null,
      age_min: null, age_max: null,
      income_limit: null,
      unit_cost_min: 10000, unit_cost_max: 100000,
      funding: {
        grant_pct: null, grant_amount_max: null,
        margin_money_pct: null, margin_money_interest_pa: null,
        bank_loan_pct: null, interest_pa_beneficiary: 7,
        interest_pa_men: null, interest_pa_women: null,
        tenure_years: 5, repayment_note: null
      },
      tiers: [],
      portal: 'https://merayuva.mp.gov.in',
      notes: '7% interest subsidy on loans of 10,000 to 1,00,000 rupees for up to 5 years.'
    },
    {
      state: 'Rajasthan',
      code: 'PM_AJAY_RAJ',
      name: 'PM-AJAY Income Generation (via Anuja Nigam)',
      source: 'pmajay.dosje.gov.in + sje.rajasthan.gov.in',
      description: 'Subsidy on bank loans for Scheduled Caste beneficiaries, up to 50,000 rupees or 50% of unit cost.',
      eligible_castes: ['SC'],
      target_gender: null,
      age_min: null, age_max: null,
      income_limit: null,
      unit_cost_min: null, unit_cost_max: null,
      funding: {
        grant_pct: 50, grant_amount_max: 50000,
        margin_money_pct: null, margin_money_interest_pa: null,
        bank_loan_pct: null, interest_pa_beneficiary: null,
        interest_pa_men: null, interest_pa_women: null,
        tenure_years: null, repayment_note: 'Grant = lower of 50% of unit cost OR 50,000 rupees. Bank loan / balance is separate.'
      },
      tiers: [],
      portal: 'https://rajanujanigam.rajasthan.gov.in',
      notes: 'Disbursed by Rajasthan Scheduled Caste/Scheduled Tribe Finance and Development Co-operative Corporation (Anuja Nigam).'
    },
    {
      state: 'Uttarakhand',
      code: 'UKBVVN_SC_SELFEMP',
      name: 'SC/ST Self-Employment (UK BVVN)',
      source: 'ukbvvn.org.in/frmSCSTSelfEmployment.html',
      description: 'Bank loan plus margin money plus grant for SC/ST projects.',
      eligible_castes: ['SC', 'ST'],
      target_gender: null,
      age_min: null, age_max: null,
      income_limit: null,
      unit_cost_min: 20000, unit_cost_max: 700000,
      funding: {
        grant_pct: 50, grant_amount_max: 10000,
        margin_money_pct: 25, margin_money_interest_pa: 4,
        bank_loan_pct: null, interest_pa_beneficiary: null,
        interest_pa_men: null, interest_pa_women: null,
        tenure_years: null, repayment_note: 'Margin money repaid over 60 monthly installments at 4% p.a.'
      },
      tiers: [],
      portal: 'https://www.ukbvvn.org.in',
      notes: 'PM-AJAY separately covers SC self-employment support.'
    },
    {
      state: 'Uttarakhand',
      code: 'UKBVVN_JEEVIKA_AVSAR',
      name: 'Jeevika Avsar Protsahan Yojana (UK BVVN)',
      source: 'ukbvvn.org.in + govtschemes.in',
      description: 'Livelihood scheme for SC/ST/Divyang with bank loan, margin money, subsidy and training.',
      eligible_castes: ['SC', 'ST', 'Divyang'],
      target_gender: null,
      age_min: null, age_max: null,
      income_limit: null,
      unit_cost_min: null, unit_cost_max: null,
      funding: {
        grant_pct: null, grant_amount_max: null,
        margin_money_pct: null, margin_money_interest_pa: null,
        bank_loan_pct: null, interest_pa_beneficiary: null,
        interest_pa_men: null, interest_pa_women: null,
        tenure_years: null, repayment_note: null
      },
      tiers: [],
      portal: 'https://www.ukbvvn.org.in/JeevikaAvsarYojna.html',
      notes: 'ST subsidy up to 50,000; SC subsidy up to 10,000; SC income limit 1,05,600 (rural) / 1,29,840 (urban).'
    },
    {
      state: 'Goa',
      code: 'GOA_GRAHA_SURAKSHA',
      name: 'Graha Suraksha (House Repair)',
      source: 'goa.gov.in (Goa State SC & OBC FDC)',
      description: 'Low-interest house repair loan for SC/Other Backward Class.',
      eligible_castes: ['SC', 'Other Backward Class'],
      target_gender: null,
      age_min: null, age_max: null,
      income_limit: null,
      unit_cost_min: null, unit_cost_max: 200000,
      funding: {
        grant_pct: null, grant_amount_max: null,
        margin_money_pct: null, margin_money_interest_pa: null,
        bank_loan_pct: null, interest_pa_beneficiary: 4,
        interest_pa_men: null, interest_pa_women: null,
        tenure_years: null, repayment_note: null
      },
      tiers: [],
      portal: 'https://www.goa.gov.in/department/goa-state-sc-obc-finance-development-corporation-ltd/',
      notes: 'Funded by the State Government.'
    },
    {
      state: 'Dadra & Nagar Haveli / Daman & Diu',
      code: 'DNH_GAAY',
      name: 'Gir Adarsh Aajeevika Yojana (GAAY)',
      source: 'scstcorporation.com/gaay.html',
      description: 'Dairy farming (Gir cow) financial assistance for women.',
      eligible_castes: ['SC', 'ST', 'Other Backward Class', 'Minority', 'Divyang'],
      target_gender: 'women',
      age_min: 18, age_max: 55,
      income_limit: null,
      unit_cost_min: null, unit_cost_max: null,
      funding: {
        grant_pct: null, grant_amount_max: null,
        margin_money_pct: null, margin_money_interest_pa: null,
        bank_loan_pct: null, interest_pa_beneficiary: null,
        interest_pa_men: null, interest_pa_women: null,
        tenure_years: null, repayment_note: null
      },
      tiers: [],
      portal: 'http://scstcorporation.com',
      notes: 'Partners with Dept. of Animal Husbandry & Veterinary Services. Sub-schemes GAAY-IDDP and GAAY-SSU.'
    },
    {
      state: 'Dadra & Nagar Haveli / Daman & Diu',
      code: 'DNH_MFS',
      name: 'Micro Finance Scheme (DNH and DD corporation)',
      source: 'scstcorporation.com',
      description: 'Micro-finance loan up to 25,000 rupees for 3 years.',
      eligible_castes: ['SC', 'ST', 'Other Backward Class', 'Minority', 'Divyang'],
      target_gender: null,
      age_min: null, age_max: null,
      income_limit: null,
      unit_cost_min: null, unit_cost_max: 25000,
      funding: {
        grant_pct: null, grant_amount_max: null,
        margin_money_pct: null, margin_money_interest_pa: null,
        bank_loan_pct: null, interest_pa_beneficiary: 6,
        interest_pa_men: null, interest_pa_women: null,
        tenure_years: 3, repayment_note: null
      },
      tiers: [],
      portal: 'http://scstcorporation.com',
      notes: null
    },
    {
      state: 'Jammu & Kashmir',
      code: 'JK_VETLS',
      name: 'Vocational Education and Training Loan Scheme (VETLS)',
      source: 'jkscstbccorpn.in/schemes-scheduled-castes.htm',
      description: 'Loan for Scheduled Caste students pursuing short vocational training courses.',
      eligible_castes: ['SC'],
      target_gender: null,
      age_min: null, age_max: null,
      income_limit: null,
      unit_cost_min: null, unit_cost_max: null,
      funding: {
        grant_pct: null, grant_amount_max: null,
        margin_money_pct: null, margin_money_interest_pa: null,
        bank_loan_pct: null, interest_pa_beneficiary: null,
        interest_pa_men: 4, interest_pa_women: 3,
        tenure_years: null, repayment_note: 'Repayment starts 6 months after course completion or employment, whichever is earlier.'
      },
      tiers: [],
      portal: 'http://jkscstbccorpn.jk.gov.in',
      notes: null
    },
    {
      state: 'Karnataka',
      code: 'KA_BANK_LINKED',
      name: 'Dr. B.R. Ambedkar Development Corporation Bank-Linked Scheme',
      source: 'tumkur.nic.in/en/dr-b-r-ambedkar-development-corporation-limited/',
      description: 'Subsidy plus bank loan for Scheduled Caste projects.',
      eligible_castes: ['SC'],
      target_gender: null,
      age_min: null, age_max: null,
      income_limit: null,
      unit_cost_min: null, unit_cost_max: null,
      funding: {
        grant_pct: 50, grant_amount_max: 35000,
        margin_money_pct: null, margin_money_interest_pa: null,
        bank_loan_pct: null, interest_pa_beneficiary: 6,
        interest_pa_men: null, interest_pa_women: null,
        tenure_years: null, repayment_note: 'Larger projects (Integrated Scheme for Beneficiaries) get 33% subsidy up to 2,00,000.'
      },
      tiers: [],
      portal: null,
      notes: 'Corporation website not resolvable from all networks; data via district NIC page.'
    },
    {
      state: 'Kerala',
      code: 'KERALA_ED_LOAN',
      name: 'KSDCSCST Education Loan',
      source: 'ksdcscst.kerala.gov.in',
      description: 'Education loan for SC/ST students.',
      eligible_castes: ['SC', 'ST'],
      target_gender: null,
      age_min: null, age_max: null,
      income_limit: 350000,
      unit_cost_min: null, unit_cost_max: 400000,
      funding: {
        grant_pct: null, grant_amount_max: null,
        margin_money_pct: null, margin_money_interest_pa: null,
        bank_loan_pct: null, interest_pa_beneficiary: 6,
        interest_pa_men: null, interest_pa_women: null,
        tenure_years: null, repayment_note: null
      },
      tiers: [],
      portal: 'https://ksdcscst.kerala.gov.in',
      notes: null
    },
    {
      state: 'Punjab',
      code: 'PB_DLS',
      name: 'PSCLDFC Direct Lending Scheme',
      source: 'pbscfc.punjab.gov.in',
      description: 'Direct loan for Scheduled Caste self-employment.',
      eligible_castes: ['SC'],
      target_gender: null,
      age_min: null, age_max: null,
      income_limit: null,
      unit_cost_min: null, unit_cost_max: null,
      funding: {
        grant_pct: null, grant_amount_max: null,
        margin_money_pct: null, margin_money_interest_pa: null,
        bank_loan_pct: null, interest_pa_beneficiary: null,
        interest_pa_men: null, interest_pa_women: null,
        tenure_years: null, repayment_note: 'Interest by slab: 5% up to 50,000; 8% above 50,000.'
      },
      tiers: [],
      portal: 'http://pbscfc.punjab.gov.in',
      notes: null
    },
    {
      state: 'Himachal Pradesh',
      code: 'HP_TL',
      name: 'HPSCSTDC Term Loan (NSFDC collaboration)',
      source: 'hpscstdc.hp.gov.in',
      description: 'Margin money plus NSFDC term loan for SC projects above 50,000 rupees.',
      eligible_castes: ['SC'],
      target_gender: null,
      age_min: null, age_max: null,
      income_limit: null,
      unit_cost_min: 50000, unit_cost_max: null,
      funding: {
        grant_pct: null, grant_amount_max: null,
        margin_money_pct: 10, margin_money_interest_pa: null,
        bank_loan_pct: 80, interest_pa_beneficiary: null,
        interest_pa_men: null, interest_pa_women: null,
        tenure_years: null, repayment_note: '10% HPSCSTDC margin money + 80% NSFDC term loan.'
      },
      tiers: [],
      portal: 'https://hpscstdc.hp.gov.in',
      notes: 'Sectors: agriculture and allied, services including transport, industrial.'
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

  // Load state SCA rate-card data from the new scraper.
  // We only pull structured rate tables from the scrape (not raw HTML/text);
  // raw scrape stays in output/state_sca_rate_cards.json for offline reference.
  let stateScraped = {};
  try {
    stateScraped = JSON.parse(fs.readFileSync('./output/state_sca_rate_cards.json', 'utf8'));
  } catch (_) { /* optional */ }

  // Only emit graph-ready triples for states that produced real rate tables.
  const state_scraped_rate_tables = [];
  for (const [state, rec] of Object.entries(stateScraped)) {
    if (!rec || !Array.isArray(rec.tables) || rec.tables.length === 0) continue;
    for (let i = 0; i < rec.tables.length; i++) {
      const rows = rec.tables[i];
      // Heuristic: skip navigation/footer tables (<2 rows, no numbers).
      const hasNumber = rows.some(r => r.some(c => /[\d₹%]/.test(c || '')));
      if (rows.length < 2 || !hasNumber) continue;
      state_scraped_rate_tables.push({
        state,
        corporation: rec.corporation,
        source_url: rec.url,
        table_index: i,
        row_count: rows.length,
        rows
      });
    }
  }

  // ------------------------------------------------------------------
  // SCHEMA DOCUMENTATION (plain-English map of every field in this file)
  // ------------------------------------------------------------------
  const schema = {
    intro: 'PS92 dataset of Scheduled Caste entrepreneurship loans. Every section uses full words; amounts are in rupees unless noted; percentages are per-annum interest unless stated otherwise.',
    top_level_sections: {
      meta: 'Source, accuracy and disclaimer information plus a graph-format note.',
      states: 'All State/Union Territory Scheduled Castes Development Corporations (SCDCs) we located, with full name and official website. 29 entries. Node type: State + its SCDC.',
      schemes: 'The national loan schemes run by NSFDC (National Scheduled Castes Finance and Development Corporation). 7 entries. Node type: Scheme.',
      state_schemes: 'State-specific schemes run by individual states on top of the national ones (often more generous). 14 entries. Node type: StateScheme. ALL entries share identical keys.',
      channel_partner_types: 'The organisations that disburse NSFDC loans (State Channelizing Agencies, public sector banks, regional rural banks, etc). 8 types, 91 partners. Node type: ChannelPartner.',
      eligibility: 'The rules everybody must satisfy globally (caste, income ceiling, margin money, loan-to-cost ratio).',
      npa_thresholds: 'Non-Performing-Asset (bad-loan) health bands used to score a lending partner. Keys are partner types.',
      disbursement: 'How much money went where - by scheme, by state, and by agency.',
      state_scraped_rate_tables: 'Real numeric rate tables scraped from state SCDC websites, kept only where the page contained actual figures (not navigation menus).'
    },
    states_entry: {
      state: 'Full state or union territory name.',
      scda_name: 'Full name of the development corporation.',
      url: 'Official website where its schemes are published.',
      note: 'Optional remark, e.g. when a corporation has no resolvable website (present only on a few entries).'
    },
    schemes_entry: {
      code: 'Short stable code for the scheme (e.g. MSY).',
      name: 'Full scheme name.',
      legacy_aliases: 'Older codes that pointed at this scheme before it was renamed/split (kept so old code keeps working).',
      description: 'What the scheme is for.',
      project_cost_min: 'Smallest qualifying project cost in rupees.',
      project_cost_max: 'Largest qualifying project cost in rupees.',
      max_loan_pct: 'Maximum portion of project cost NSFDC will lend (percent).',
      max_loan_amount: 'Maximum loan amount in rupees.',
      rate_ca: 'Interest NSFDC charges the Channelizing Agent (percent).',
      rate_beneficiary: 'Interest the beneficiary pays (percent).',
      tenure_years: 'Repayment period in years.',
      repayment_frequency: 'How often repayment happens (e.g. quarterly).',
      moratorium_months: 'Grace period before repayment starts (months).',
      channels: 'Which partner types deliver this scheme.',
      target_gender: 'Whether the scheme is for women only (else null).',
      notes: 'Extra detail, e.g. an Education Loan has separate India and abroad rates.'
    },
    state_schemes_entry: {
      state: 'State or union territory running the scheme.',
      code: 'Short stable code.',
      name: 'Full scheme name.',
      source: 'Origin of the figures (Government Order, official page).',
      description: 'What the scheme does.',
      eligible_castes: 'Castes/communities that qualify (e.g. SC, ST, Other Backward Class).',
      target_gender: 'Women-only schemes mark "women", else null.',
      age_min: 'Minimum age (null if not set).',
      age_max: 'Maximum age (null if not set).',
      income_limit: 'Maximum annual family income in rupees (null if not set or varies - see notes).',
      unit_cost_min: 'Smallest project outlay in rupees.',
      unit_cost_max: 'Largest project outlay in rupees.',
      funding: {
        grant_pct: 'Share of the scheme given free as a grant (percent of unit cost).',
        grant_amount_max: 'Cap on the grant in rupees.',
        margin_money_pct: 'Share the beneficiary must bring as margin money (percent).',
        margin_money_interest_pa: 'Interest on the margin money loan (percent).',
        bank_loan_pct: 'Share financed by a bank (percent).',
        interest_pa_beneficiary: 'Single beneficiary interest rate where one applies (percent).',
        interest_pa_men: 'Interest for men where it differs (percent).',
        interest_pa_women: 'Interest for women where it differs (percent).',
        tenure_years: 'Repayment period in years.',
        repayment_note: 'Human description of repayment terms.'
      },
      tiers: 'Optional graded funding - a list of slots with different grant/contribution shares by project size (only Telangana Rajiv Yuva Vikasam uses this; empty array otherwise).',
      portal: 'Official application portal URL (null if none).',
      notes: 'Extra context such as helplines, sector lists, or which global scheme it overrides.'
    },
    channel_partner_types_entry: {
      count: 'Number of individual partners of this type.',
      schemes: 'Which scheme codes this partner type delivers.',
      partners: 'List of the individual partner organisations.'
    },
    eligibility_rules: {
      caste: 'A Scheduled Caste certificate is required.',
      income_max: 'Annual family income ceiling, raised to 5 lakh rupees from 7 Jan 2026.',
      margin_money_pct: 'Beneficiary must self-fund this share (percent).',
      loan_finance_pct: 'Maximum share NSFDC finances (percent).',
      entity_types: 'Who can apply (individual, partnership, cooperative society).',
      all_members_sc_required: 'In partnership/cooperative, every member must be Scheduled Caste.'
    },
    npa_thresholds_entry: {
      intro: 'For each partner type, the bank non-performing-asset percentage bands.',
      low: 'Below this = healthy (green).',
      medium: 'Between medium and high = caution.',
      high: 'Between high and critical = stressed.',
      critical: 'At or above this = critical (red).'
    },
    disbursement_entry: {
      scheme_wise_crore: 'How much was lent per scheme, in crores of rupees.',
      state_allocation_lakh: 'Funds allocated per state, in lakhs of rupees.',
      agency_wise_crore: 'Funds handled per agency type, in crores.'
    },
    state_scraped_rate_tables_entry: {
      state: 'State the table came from.',
      corporation: 'Corporation whose website hosted it.',
      source_url: 'The exact page scraped.',
      table_index: 'Position of the table on that page.',
      row_count: 'Number of data rows.',
      rows: 'The table cells as a 2-D array.'
    },
    graph_mapping: {
      nodes: ['State', 'SCDC', 'Scheme', 'StateScheme', 'ChannelPartner', 'NPATier', 'Eligibility'],
      edges: [
        '(State)-[:HAS_SCDA]->(SCDC)',
        '(SCDC)-[:IMPLEMENTS]->(Scheme)',
        '(StateScheme)-[:OPERATED_BY]->(SCDC)',
        '(StateScheme)-[:OVERLAYS]->(Scheme)',
        '(Scheme)-[:IMPLEMENTED_VIA]->(ChannelPartner)',
        '(Scheme)-[:HAS_THRESHOLD]->(NPATier)',
        '(Beneficiary)-[:ELIGIBLE_FOR]->(Scheme)',
        '(Beneficiary)-[:ELIGIBLE_FOR]->(StateScheme)'
      ],
      note: 'StateScheme codes are unique per state, so keying on (state, code) gives stable node IDs.'
    }
  };

  // GRAPH-READY FORM
  // Each section maps cleanly to Neo4j nodes/edges:
  //   nodes: State, SCDC, Scheme, StateScheme, ChannelPartner, NPATier, Eligibility
  //   edges: (State)-[:HAS_SCDA]->(SCDC)
  //          (StateScheme)-[:OPERATED_BY]->(SCDC)
  //          (Scheme)-[:IMPLEMENTED_VIA]->(ChannelPartner)
  //          (Scheme)-[:HAS_THRESHOLD]->(NPATier)
  //          (StateScheme)-[:OVERLAYS]->(Scheme)   // when state augments a national scheme
  //          (Beneficiary)-[:ELIGIBLE_FOR]->(Scheme | StateScheme)
  const dataset = {
    meta: {
      generated_at: new Date().toISOString(),
      source: 'Live scrape of nsfdc.nic.in, state SCDCs, + official performance Excel files',
      data_accuracy: 'NSFDC rates verified against live scheme page (30-04-2026). Income ceiling raised to ₹5L from 07-01-2026 per PIB release.',
      disclaimer: 'For hackathon demo. Rates verified from NSFDC; state SCAs may vary. Final eligibility verified by SCA/NSFDC.',
      graph_format: 'neo4j-ready — see schema.graph_mapping for node/edge mapping'
    },
    schema,
    // Nodes
    states: state_scda_index,                         // State + SCDC
    schemes,                                          // National NSFDC schemes
    state_schemes: state_specific_schemes,            // State-specific schemes
    channel_partner_types: partnerTypes,              // Channel partners
    // Edges / properties
    eligibility,                                      // global eligibility rules
    npa_thresholds,                                   // NPA health-score bands per partner type
    disbursement: {
      scheme_wise_crore: perf.scheme_wise,            // Scheme → crores
      state_allocation_lakh: perf.state_allocation,   // State → allocation
      agency_wise_crore: perf.agency_wise             // Agency → crores
    },
    // Optional: structured rate-card tables scraped from state SCDCs.
    // Only included where the page returned real numeric tables.
    state_scraped_rate_tables
  };

  fs.writeFileSync('./data/ps92_dataset.json', JSON.stringify(dataset, null, 2));
  console.log(`✅ Schemes: ${schemes.length}`);
  console.log(`✅ State schemes: ${state_specific_schemes.length} (across ${new Set(state_specific_schemes.map(s => s.state)).size} states)`);
  console.log(`✅ State SCDA index: ${state_scda_index.length}`);
  console.log(`✅ Partner types: ${Object.keys(partnerTypes).length} (${Object.values(partnerTypes).reduce((a, t) => a + t.count, 0)} total entries)`);
  console.log(`✅ Scraped rate tables (structured): ${state_scraped_rate_tables.length}`);
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