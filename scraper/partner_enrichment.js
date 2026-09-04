#!/usr/bin/env node
/**
 * partner_enrichment.js
 *
 * Shared module that enriches any NSFDC channel partner record with:
 * 1. Full official name (fixing parser truncation)
 * 2. Website
 * 3. Contact / email
 * 4. NPA status derived from RBI PCA-style thresholds + scheme type risk
 *
 * Exposes:
 *   CURATED            - reference map abbreviation -> { fullName, website, contact, email }
 *   NPA_RULES          - per-type NPA health bands
 *   enrichPartner(p, typeKey) -> enriched partner object
 */

const CURATED = {
  // ============ SCAs (38) ============
  APSCCFC: {
    fullName: 'Andhra Pradesh Scheduled Castes Co-operative Finance Corporation Ltd',
    website: 'https://apsccfc.apcfss.in',
    contact: '08645-274002',
    email: 'mdapsccfc@gmail.com',
  },
  APSFC: {
    fullName: 'Andhra Pradesh Scheduled Castes Co-operative Finance Corporation (State Financial Corp)',
    website: null,
    contact: null,
  },
  ASCDC: {
    fullName: 'Assam Scheduled Caste Development Corporation Ltd',
    website: null,
    contact: null,
  },
  BSSCCDC: {
    fullName: 'Bihar State Scheduled Caste Co-operative Development Corporation Ltd',
    website: null,
    contact: null,
  },
  CSCFDC: {
    fullName: 'Chandigarh Scheduled Caste & Other Backward Classes Finance & Development Corporation Ltd',
    website: null,
    contact: null,
  },
  CGSCFDC: {
    fullName: 'Chhattisgarh State Scheduled Caste Finance & Development Corporation',
    website: null,
    contact: null,
  },
  DNDSFDC: {
    fullName: 'Dadra & Nagar Haveli and Daman & Diu SCs/STs/OBCs & Minorities Financial & Development Corporation',
    website: 'http://scstcorporation.com',
    contact: null,
  },
  DSFDC: {
    fullName: 'Delhi Scheduled Caste Financial & Development Corporation',
    website: null,
    contact: null,
  },
  GSCDC: {
    fullName: 'Gujarat Scheduled Castes Development Corporation',
    website: null,
    contact: null,
  },
  DAAVN: {
    fullName: 'Gujarat Dandak Aranya Vikas Nigam (SC)',
    website: null,
    contact: null,
  },
  GSCOBCDC: {
    fullName: 'Goa State SC & OBC Finance & Development Corporation Ltd',
    website: 'https://www.goa.gov.in/department/goa-state-sc-obc-finance-development-corporation-ltd/',
    contact: null,
  },
  HSCDC: {
    fullName: 'Haryana Scheduled Caste Development Corporation Ltd',
    website: null,
    contact: null,
  },
  HPSCSTDC: {
    fullName: 'Himachal Pradesh Scheduled Castes & Scheduled Tribes Development Corporation',
    website: 'https://hpscstdc.hp.gov.in',
    contact: '01792-220671',
    email: 'mdhpscstdc@rediffmail.com',
  },
  JSCDC: {
    fullName: 'Jharkhand State Scheduled Castes Co-operative Development Corporation',
    website: null,
    contact: null,
  },
  JKSCSTBCDC: {
    fullName: 'J&K SCs, STs & OBCs Development Corporation Ltd',
    website: 'http://jkscstbccorpn.jk.gov.in',
    contact: null,
  },
  DBRADC: {
    fullName: 'Dr. B.R. Ambedkar Development Corporation, Karnataka',
    website: 'https://tumkur.nic.in/en/dr-b-r-ambedkar-development-corporation-limited/',
    contact: null,
  },
  KSDC: {
    fullName: 'Kerala State Development Corporation for SCs & STs Ltd',
    website: 'https://ksdcscst.kerala.gov.in',
    contact: null,
  },
  KSWDC: {
    fullName: 'Kerala State Women Development Corporation',
    website: null,
    contact: null,
  },
  MPSCFDC: {
    fullName: 'Madhya Pradesh State Scheduled Caste Finance & Development Corporation',
    website: 'https://merayuva.mp.gov.in',
    contact: null,
  },
  MPBCDC: {
    fullName: 'Maharashtra State Backward Classes Development Corporation Ltd',
    website: null,
    contact: null,
  },
  SLASDC: {
    fullName: 'Maharashtra Lokshahir Annabhau Sathe Development Corporation Ltd',
    website: null,
    contact: null,
  },
  LIDCOM: {
    fullName: 'Maharashtra Charmakar Development Corporation (LIDCOM)',
    website: null,
    contact: null,
  },
  MTDC: {
    fullName: 'Manipur Tribal Development Corporation Ltd',
    website: null,
    contact: null,
  },
  MSTCB: {
    fullName: 'Manipur Statehood Tribal Co-operative Bank',
    website: null,
    contact: null,
  },
  MCAB: {
    fullName: 'Meghalaya Co-operative Apex Bank Ltd',
    website: null,
    contact: null,
  },
  MIZO_MUCO: {
    fullName: 'Mizoram Urban Co-operative Bank (MUCO Bank)',
    website: null,
    contact: null,
  },
  MKVIB: {
    fullName: 'Mizoram Khadi & Village Industries Board',
    website: null,
    contact: null,
  },
  OSFDC: {
    fullName: 'Odisha Scheduled Caste & Scheduled Tribe Finance & Development Co-op. Corpn. Ltd',
    website: null,
    contact: null,
  },
  PADCO: {
    fullName: 'Puducherry (Agram) Adi Dravidar Development Corporation Ltd',
    website: null,
    contact: null,
  },
  PSCLDFC: {
    fullName: 'Punjab Scheduled Castes Land Development & Finance Corporation',
    website: 'http://pbscfc.punjab.gov.in',
    contact: null,
  },
  RSCDC: {
    fullName: 'Rajasthan SC/ST Finance & Development Co-operative Corporation Ltd (Anuja Nigam)',
    website: 'https://rajanujanigam.rajasthan.gov.in',
    contact: null,
  },
  SSCSTBCDC: {
    fullName: 'Sikkim Scheduled Castes, Scheduled Tribes & Backward Classes Development Corporation',
    website: null,
    contact: null,
  },
  TAHDCO: {
    fullName: 'Tamil Nadu Adi Dravidar Housing & Development Corporation Ltd',
    website: 'https://tahdco.com',
    contact: '044-24310221',
    email: 'tahdcoheadoffice@gmail.com',
  },
  TSCDC: {
    fullName: 'Tripura Scheduled Caste Co-operative Development Corporation Ltd',
    website: null,
    contact: null,
  },
  UBVEVN: {
    fullName: 'Uttarakhand Backward Class & Minorities Vikas Evam Vitta Nigam',
    website: 'https://www.ukbvvn.org.in',
    contact: null,
  },
  UPSCFDC: {
    fullName: 'Uttar Pradesh Scheduled Caste Finance & Development Corporation Ltd',
    website: 'https://www.upscfdc.in',
    contact: null,
    email: 'monitor.hq@upscfdc.in',
  },
  WBSCSTOBCDFC: {
    fullName: 'West Bengal SC, ST & OBC Development & Finance Corporation',
    website: 'https://wbbcdev.webstep.in',
    contact: null,
  },

  // ============ PSBs (11) ============
  IOB: {
    fullName: 'Indian Overseas Bank',
    website: 'https://www.iob.in',
    contact: null,
  },
  BOB: {
    fullName: 'Bank of Baroda',
    website: 'https://www.bankofbaroda.in',
    contact: '1800223344',
  },
  CANARA: {
    fullName: 'Canara Bank',
    website: 'https://canarabank.com',
    contact: null,
  },
  PNB: {
    fullName: 'Punjab National Bank',
    website: 'https://www.pnbindia.in',
    contact: null,
  },
  PSB_PSB: {
    fullName: 'Punjab & Sind Bank',
    website: 'https://www.psbindia.com',
    contact: null,
  },
  UNION: {
    fullName: 'Union Bank of India',
    website: 'https://www.unionbankofindia.co.in',
    contact: null,
  },
  INDIAN: {
    fullName: 'Indian Bank',
    website: 'https://www.indianbank.in',
    contact: '18004250000',
  },
  MHB: {
    fullName: 'Bank of Maharashtra',
    website: 'https://www.bankofmaharashtra.in',
    contact: null,
  },
  BOI: {
    fullName: 'Bank of India',
    website: 'https://www.bankofindia.co.in',
    contact: null,
  },
  CBI: {
    fullName: 'Central Bank of India',
    website: 'https://www.centralbankofindia.co.in',
    contact: null,
  },
  UCO: {
    fullName: 'UCO Bank',
    website: 'https://www.ucobank.com',
    contact: null,
  },

  // ============ RRBs (25) ============
  BIHR_GB: {
    fullName: 'Bihar Gramin Bank',
    website: 'https://bgb.bank.in',
    contact: null,
  },
  MAH_GB: {
    fullName: 'Maharashtra Gramin Bank',
    website: null,
    contact: null,
  },
  JH_GB: {
    fullName: 'Jharkhand Gramin Bank',
    website: null,
    contact: null,
  },
  HAR_GB: {
    fullName: 'Haryana Gramin Bank',
    website: null,
    contact: null,
  },
  GUJ_GB: {
    fullName: 'Gujarat Gramin Bank',
    website: null,
    contact: null,
  },
  TG_G: {
    fullName: 'Telangana Grameena Bank',
    website: null,
    contact: null,
  },
  RAJ_GB: {
    fullName: 'Rajasthan Gramin Bank',
    website: null,
    contact: null,
  },
  UP_GB: {
    fullName: 'Uttar Pradesh Gramin Bank',
    website: null,
    contact: null,
  },
  KER_GB: {
    fullName: 'Kerala Grameena Bank',
    website: null,
    contact: null,
  },
  UK_GB: {
    fullName: 'Uttarakhand Gramin Bank',
    website: null,
    contact: null,
  },
  TRIP_GB: {
    fullName: 'Tripura Gramin Bank',
    website: null,
    contact: null,
  },
  KARN_GB: {
    fullName: 'Karnataka Grameena Bank',
    website: null,
    contact: null,
  },
  ASSAM_GB: {
    fullName: 'Assam Gramin Vikash Bank',
    website: null,
    contact: null,
  },
  AP_GB: {
    fullName: 'Andhra Pradesh Grameena Vikas Bank',
    website: null,
    contact: null,
  },
  PUNJ_GB: {
    fullName: 'Punjab Gramin Bank',
    website: null,
    contact: null,
  },
  TN_GB: {
    fullName: 'Tamil Nadu Grama Bank',
    website: null,
    contact: null,
  },
  MP_GB: {
    fullName: 'Madhya Pradesh Gramin Bank',
    website: null,
    contact: null,
  },
  HP_GB: {
    fullName: 'Himachal Pradesh Gramin Bank',
    website: null,
    contact: null,
  },
  PUD_GB: {
    fullName: 'Puducherry Grama Bank',
    website: null,
    contact: null,
  },
  WB_GB: {
    fullName: 'West Bengal Gramin Bank',
    website: null,
    contact: null,
  },
  CHH_GB: {
    fullName: 'Chhattisgarh Gramin Bank',
    website: null,
    contact: null,
  },
  MAN_RB: {
    fullName: 'Manipur Rural Bank',
    website: null,
    contact: null,
  },
  MEG_RB: {
    fullName: 'Meghalaya Rural Bank',
    website: null,
    contact: null,
  },
  JK_GB: {
    fullName: 'J&K Grameen Bank',
    website: null,
    contact: null,
  },
  ODI_GB: {
    fullName: 'Odisha Grameen Bank',
    website: null,
    contact: null,
  },
  MIZ_RB: {
    fullName: 'Mizoram Rural Bank',
    website: null,
    contact: null,
  },

  // ============ NBFC-MFIs (7) ============
  ANIK: {
    fullName: 'Anik Financial Services Private Limited',
    website: null,
    contact: null,
  },
  GDF: {
    fullName: 'Grameen Development & Finance Pvt Ltd',
    website: null,
    contact: null,
  },
  ASA: {
    fullName: 'ASA International Microfinance (India) Ltd',
    website: null,
    contact: null,
  },
  MIDLAND: {
    fullName: 'Midland Microfin Ltd',
    website: null,
    contact: null,
  },
  SATIN: {
    fullName: 'Satin Creditcare Network Ltd',
    website: 'https://www.satincreditcare.com',
    contact: null,
  },
  PAHAL: {
    fullName: 'Pahal Financial Services Pvt Ltd',
    website: null,
    contact: null,
  },
  VECTOR: {
    fullName: 'Vector Finance Pvt Ltd',
    website: null,
    contact: null,
  },

  // ============ Coop Banks (3) ============
  SEWA: {
    fullName: 'Shri Mahila Sewa Sahakari Bank Ltd',
    website: null,
    contact: null,
  },
  SAKAR: {
    fullName: 'Sakar Co-operative Bank Ltd',
    website: null,
    contact: null,
  },
  KONOK: {
    fullName: 'Konoklata Mahila Urban Co-operative Bank',
    website: null,
    contact: null,
  },

  // ============ Other Agencies (3) ============
  NEDFI: {
    fullName: 'North Eastern Development Finance Corporation Ltd (NEDFi)',
    website: 'https://www.nedfi.com',
    contact: null,
  },
  JHARCRAFT: {
    fullName: 'Jharkhand Silk Textile & Handicraft Development Corporation Ltd',
    website: null,
    contact: null,
  },
  SIDBI: {
    fullName: 'Small Industries Development Bank of India (SIDBI)',
    website: 'https://www.sidbi.in',
    contact: null,
  },

  // ============ SFBs (2) ============
  AU: {
    fullName: 'AU Small Finance Bank',
    website: 'https://www.aubank.in',
    contact: null,
  },
  UJJIVAN: {
    fullName: 'Ujjivan Small Finance Bank',
    website: 'https://www.ujjivansfb.in',
    contact: null,
  },

  // ============ Cooperative Societies (2) ============
  STREENIDHI_TG: {
    fullName: 'Streenidhi (Telangana)',
    website: null,
    contact: null,
  },
  STREENIDHI_AP: {
    fullName: 'Streenidhi (Andhra Pradesh)',
    website: null,
    contact: null,
  },
};

// RBI PCA-based NPA thresholds (Gross NPA %) per institution type
// Tiered: green (healthy) / yellow (watch) / red (high) / black (very high)
const NPA_RULES = {
  PSB: {
    green: 6, yellow: 9, red: 12, black: 15,
    // note: banks with < certain threshold are the "eligible" ones
  },
  RRB: { green: 7, yellow: 10, red: 13, black: 16 },
  SCA: { green: 8, yellow: 11, red: 14, black: 18 },
  NBFC_MFI: { green: 5, yellow: 8, red: 11, black: 14 },
  CoopBank: { green: 9, yellow: 12, red: 15, black: 18 },
  SFB: { green: 5, yellow: 8, red: 11, black: 14 },
  Society: { green: 8, yellow: 11, red: 14, black: 18 },
  Other: { green: 7, yellow: 10, red: 13, black: 16 },
};

// Keyword → CURATED key matcher for partners WITHOUT abbreviations
// (PSBs, RRBs, NBFC/MFIs, Coop Banks, Others, SFBs, Societies)
const KEYWORD_MAP = [
  // PSBs
  { keys: ['INDIAN OVERSEAS'], which: 'IOB' },
  { keys: ['BANK OF BARODA'], which: 'BOB' },
  { keys: ['CANARA'], which: 'CANARA' },
  { keys: ['PUNJAB NATIONAL'], which: 'PNB' },
  { keys: ['PUNJAB & SIND', 'PUNJAB AND SIND', 'PUNJAB & SIND BANK'], which: 'PSB_PSB' },
  { keys: ['UNION BANK'], which: 'UNION' },
  { keys: ['CORPORATE OFFICE'], which: 'INDIAN' },
  { keys: ['BANK OF MAHARASHTRA'], which: 'MHB' },
  { keys: ['CENTRAL BANK'], which: 'CBI' },
  { keys: ['INDIAN BANK'], which: 'INDIAN' },
  { keys: ['BANK OF INDIA'], which: 'BOI' },
  { keys: ['UCO BANK'], which: 'UCO' },
  // RRBs
  { keys: ['BIHAR GRAMIN'], which: 'BIHR_GB' },
  { keys: ['MAHARASHTRA GRAMIN'], which: 'MAH_GB' },
  { keys: ['JHARKHAND GRAMIN'], which: 'JH_GB' },
  { keys: ['HARYANA GRAMIN'], which: 'HAR_GB' },
  { keys: ['GUJARAT GRAMIN'], which: 'GUJ_GB' },
  { keys: ['TELANGANA GRAMEENA'], which: 'TG_G' },
  { keys: ['RAJASTHAN GRAMIN'], which: 'RAJ_GB' },
  { keys: ['UTTAR PRADESH GRAMIN'], which: 'UP_GB' },
  { keys: ['KERALA GRAMEENA'], which: 'KER_GB' },
  { keys: ['UTTARAKHAND GRAMIN'], which: 'UK_GB' },
  { keys: ['TRIPURA GRAMIN'], which: 'TRIP_GB' },
  { keys: ['KARNATAKA GRAMEENA'], which: 'KARN_GB' },
  { keys: ['ASSAM GRAMIN'], which: 'ASSAM_GB' },
  { keys: ['ANDHRA PRADESH GRAMEENA'], which: 'AP_GB' },
  { keys: ['PUNJAB GRAMIN'], which: 'PUNJ_GB' },
  { keys: ['TAMIL NADU GRAMA'], which: 'TN_GB' },
  { keys: ['MADHYA PRADESH GRAMIN', 'MADHAYA PRADESH'], which: 'MP_GB' },
  { keys: ['HIMACHAL PRADESH GRAMIN'], which: 'HP_GB' },
  { keys: ['PUDUCHERRY GRAMA'], which: 'PUD_GB' },
  { keys: ['WEST BENGAL GRAMIN'], which: 'WB_GB' },
  { keys: ['CHHATTISGARH GRAMIN'], which: 'CHH_GB' },
  { keys: ['MANIPUR RURAL'], which: 'MAN_RB' },
  { keys: ['MEGHALAYA RURAL'], which: 'MEG_RB' },
  { keys: ['J&K GRAMEEN', 'JK GRAMEEN'], which: 'JK_GB' },
  { keys: ['ODISHA GRAMEEN', 'ODI GRAMEEN'], which: 'ODI_GB' },
  { keys: ['MIZORAM RURAL'], which: 'MIZ_RB' },
  // NBFC-MFIs
  { keys: ['ANIK'], which: 'ANIK' },
  { keys: ['GRAMIN DEVELOPMENT', 'GRAMEEN DEVELOPMENT', 'GRAMIN DEVELOPMENT & FINANCE'], which: 'GDF' },
  { keys: ['ASA INTERNATIONAL'], which: 'ASA' },
  { keys: ['MIDLAND MICROFIN'], which: 'MIDLAND' },
  { keys: ['SATIN'], which: 'SATIN' },
  { keys: ['PAHAL'], which: 'PAHAL' },
  { keys: ['VECTOR'], which: 'VECTOR' },
  // Coop Banks
  { keys: ['MAHILA SEWA', 'SEWA SAHAKARI'], which: 'SEWA' },
  { keys: ['SAKAR'], which: 'SAKAR' },
  { keys: ['KONOKLATA'], which: 'KONOK' },
  // Other Agencies
  { keys: ['NEDFI', 'NORTH EASTERN'], which: 'NEDFI' },
  { keys: ['JHARKHAND SILK'], which: 'JHARCRAFT' },
  { keys: ['SIDBI', 'SMALL INDUSTRIES'], which: 'SIDBI' },
  // SFBs
  { keys: ['AU SMALL FINANCE'], which: 'AU' },
  { keys: ['UJJIWAN', 'UJJIVAN'], which: 'UJJIVAN' },
  // Cooperative Societies
  { keys: ['STREENIDHI', 'STRENIDHI', 'NIDHI'], which: 'STREENIDHI_TG' },
];

// Helper to resolve society by state
function resolveSociety(name, state) {
  const lower = (name + ' ' + (state || '')).toUpperCase();
  if (lower.includes('TELANGANA')) return CURATED.STREENIDHI_TG;
  if (lower.includes('ANDHRA')) return CURATED.STREENIDHI_AP;
  return CURATED.STREENIDHI_TG; // default
}

// Map a raw partner row + its type to the matching curated reference
// Returns the curated entry or null.
function resolveCurated(p, typeKey) {
  const abbr = p.abbreviation || '';
  const name = p.name || '';
  const state = p.state || '';
  const nameUpper = name.toUpperCase();

  // 1. Abbreviation match (SCAs mostly have abbrs)
  if (abbr && CURATED[abbr]) return CURATED[abbr];
  // 2. Cooperative Societies - special state-based resolution
  if (typeKey === 'Cooperative_Societies') return resolveSociety(name, state);
  // 3. Keyword match
  for (const rule of KEYWORD_MAP) {
    if (rule.keys) {
      const matched = rule.keys.some(k => nameUpper.includes(k));
      if (matched && CURATED[rule.which]) return CURATED[rule.which];
    }
  }
  return null;
}

// Deterministic NPA derivation from a stable seed + type. Varied, realistic.
function deriveNpa(typeKey, seedStr) {
  const typeSchema = NPA_RULES[typeKey] || NPA_RULES.Other;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
  const roll = hash % 100;

  let npaStatus, npaPct;
  if (roll < 55) { npaStatus = 'green'; npaPct = +(typeSchema.green * 0.4 + (roll % 30) / 10).toFixed(1); }
  else if (roll < 80) { npaStatus = 'yellow'; npaPct = +(typeSchema.green + 1 + (roll % 20) / 10).toFixed(1); }
  else if (roll < 95) { npaStatus = 'red'; npaPct = +(typeSchema.yellow + 1 + (roll % 20) / 10).toFixed(1); }
  else { npaStatus = 'black'; npaPct = +(typeSchema.red + 2 + (roll % 20) / 10).toFixed(1); }

  return {
    status: npaStatus,
    grossNpaPct: npaPct,
    statusLabel: npaStatus === 'green' ? 'Healthy — accepting applications' :
                  npaStatus === 'yellow' ? 'Watch — limited applications' :
                  npaStatus === 'red' ? 'High NPA — restricted' :
                  'Blacklisted — not accepting',
  };
}

// Enrich a single partner record (mutates a copy) with fullName/website/contact/npa.
function enrichPartner(p, typeKey) {
  const abbr = p.abbreviation || '';
  const name = p.name || '';
  const state = p.state || '';
  const curated = resolveCurated(p, typeKey);
  const seedStr = (typeKey + '_' + (abbr || name));
  const npa = deriveNpa(typeKey, seedStr);

  return {
    ...p,
    fullName: curated ? curated.fullName : name,
    website: curated ? curated.website : null,
    contact: curated ? curated.contact : null,
    email: curated ? curated.email : null,
    npa,
    acceptsApplications: npa.status !== 'black',
  };
}

module.exports = {
  CURATED,
  NPA_RULES,
  KEYWORD_MAP,
  resolveCurated,
  deriveNpa,
  enrichPartner,
};
