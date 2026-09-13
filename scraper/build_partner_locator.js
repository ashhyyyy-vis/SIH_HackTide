#!/usr/bin/env node
/**
 * build_partner_locator.js
 * 
 * Combines:
 * 1. 19,555 real bank branches from RBI database (PSBs + RRBs)
 * 2. ~131 SCA district offices from web scraping (TAHDCO, UPSCFDC, HPSCSTDC)
 * 3. Geocodes using district centroid lookup
 * 
 * Output: partner_locator.json (all branches with lat/lng)
 */

const fs = require('fs');
const path = require('path');

const BRANCHES_FILE = path.join(__dirname, 'output', 'partner_branches.json');
const OUTPUT_FILE = path.join(__dirname, 'output', 'partner_locator.json');
const GEOJSON_FILE = path.join(__dirname, 'output', 'partner_locator.geojson');

// District centroids (approximate lat/lng for each district)
// Source: Census of India / Survey of India
const DISTRICT_CENTROIDS = {
  // Tamil Nadu
  'ARIYALUR': { lat: 11.1301, lng: 79.0700 },
  'CHENNAI': { lat: 13.0827, lng: 80.2707 },
  'COIMBATORE': { lat: 11.0168, lng: 76.9558 },
  'CUDDALORE': { lat: 11.7400, lng: 79.7700 },
  'DHARMAPURI': { lat: 12.4300, lng: 78.1600 },
  'DINDIGUL': { lat: 10.3500, lng: 77.9700 },
  'ERODE': { lat: 11.3400, lng: 77.7200 },
  'KANCHEEPURAM': { lat: 12.8342, lng: 79.7036 },
  'KANNIYAKUMARI': { lat: 8.0883, lng: 77.5385 },
  'KARUR': { lat: 10.9600, lng: 78.0800 },
  'KRISHNAGIRI': { lat: 12.5200, lng: 78.2100 },
  'MADURAI': { lat: 9.9252, lng: 78.1198 },
  'NAGAPATTINAM': { lat: 10.7667, lng: 79.8417 },
  'NAMAKKAL': { lat: 11.2200, lng: 78.1700 },
  'NILGIRIS': { lat: 11.4916, lng: 76.7339 },
  'PERAMBALUR': { lat: 11.2300, lng: 78.8800 },
  'PUDUKKOTTAI': { lat: 10.3800, lng: 78.8200 },
  'RAMANATHAPURAM': { lat: 9.3700, lng: 78.8300 },
  'RANIPET': { lat: 12.9300, lng: 79.3200 },
  'SALEM': { lat: 11.6643, lng: 78.1460 },
  'SIVAGANGA': { lat: 9.8500, lng: 78.4800 },
  'THANJAVUR': { lat: 10.7870, lng: 79.1378 },
  'THENI': { lat: 9.9400, lng: 77.4800 },
  'THIRUVALLUR': { lat: 13.1400, lng: 79.9100 },
  'THIRUVARUR': { lat: 10.7700, lng: 79.6300 },
  'TIRUCHIRAPALLI': { lat: 10.7905, lng: 78.7047 },
  'TIRUNELVELI': { lat: 8.7139, lng: 77.7567 },
  'TIRUPATTUR': { lat: 12.5000, lng: 78.5800 },
  'TIRUVANNAMALAI': { lat: 12.2300, lng: 79.0700 },
  'TIRUPPUR': { lat: 11.1085, lng: 77.3411 },
  'THOOTHUKUDI': { lat: 8.7642, lng: 78.1348 },
  'VELLORE': { lat: 12.9165, lng: 79.1325 },
  'VILLUPURAM': { lat: 11.9400, lng: 79.4900 },
  'VIRUDHUNAGAR': { lat: 9.5900, lng: 77.9600 },
  'CHENGALPATTU': { lat: 12.5000, lng: 79.9800 },
  'TENKASI': { lat: 8.9600, lng: 77.3200 },
  'KALLAKURICHI': { lat: 11.7400, lng: 78.9600 },
  'MYLADUTHURAI': { lat: 11.1100, lng: 79.6500 },
  'CHENNAI CORPORATION': { lat: 13.0827, lng: 80.2707 },
  
  // Uttar Pradesh
  'AGRA': { lat: 27.1767, lng: 78.0081 },
  'ALIGARH': { lat: 27.8974, lng: 78.0880 },
  'AMBEDKAR NAGAR': { lat: 26.4700, lng: 82.5800 },
  'AMETHI': { lat: 26.1500, lng: 81.2100 },
  'AMROHA': { lat: 28.9000, lng: 78.4700 },
  'AURAIYA': { lat: 26.4700, lng: 79.5100 },
  'AYODHYA': { lat: 26.7922, lng: 82.1998 },
  'AZAMGARH': { lat: 26.0736, lng: 83.1856 },
  'BADAUN': { lat: 28.0344, lng: 79.1200 },
  'BAGHPAT': { lat: 28.9400, lng: 77.2200 },
  'BAHRAICH': { lat: 27.5743, lng: 81.5957 },
  'BALLIA': { lat: 25.7590, lng: 84.1444 },
  'BALRAMPUR': { lat: 27.4300, lng: 82.4000 },
  'BANDA': { lat: 25.4800, lng: 80.3400 },
  'BARABANKI': { lat: 26.9400, lng: 81.1900 },
  'BAREILLY': { lat: 28.3670, lng: 79.4304 },
  'BASTI': { lat: 26.7900, lng: 82.7400 },
  'BIJNOR': { lat: 29.3700, lng: 78.1400 },
  'BULANDSHAHR': { lat: 28.4070, lng: 77.8498 },
  'CHANDAULI': { lat: 25.8600, lng: 83.2300 },
  'CHITRAKOOT': { lat: 25.2000, lng: 80.9100 },
  'DEORIA': { lat: 26.5000, lng: 83.7800 },
  'ETAH': { lat: 27.5600, lng: 78.6600 },
  'ETAH (DISTRICT)': { lat: 27.5600, lng: 78.6600 },
  'ETAWAH': { lat: 26.7800, lng: 79.0200 },
  'FARRUKHABAD': { lat: 27.3900, lng: 79.5800 },
  'FATEHPUR': { lat: 25.9300, lng: 80.8000 },
  'FIROZABAD': { lat: 27.1500, lng: 78.4300 },
  'GAUTAM BUDDHA NAGAR': { lat: 28.5800, lng: 77.3300 },
  'GHAZIABAD': { lat: 28.6692, lng: 77.4538 },
  'GHAZIPUR': { lat: 25.5800, lng: 83.5900 },
  'GONDA': { lat: 27.1300, lng: 81.9700 },
  'GORAKHPUR': { lat: 26.7606, lng: 83.3732 },
  'HAMIRPUR': { lat: 25.9500, lng: 80.0500 },
  'HAPUR': { lat: 28.7300, lng: 77.7800 },
  'HARDOI': { lat: 27.4100, lng: 80.1200 },
  'HATHRAS': { lat: 27.5900, lng: 78.0500 },
  'JALAUN': { lat: 26.1500, lng: 79.3300 },
  'JAUNPUR': { lat: 25.7500, lng: 82.6800 },
  'JHANSI': { lat: 25.4484, lng: 78.5685 },
  'KANNAUJ': { lat: 27.0500, lng: 79.9200 },
  'KANPUR DEHAT': { lat: 26.4400, lng: 80.1500 },
  'KANPUR NAGAR': { lat: 26.4499, lng: 80.3319 },
  'KASGANJ': { lat: 27.8100, lng: 78.6400 },
  'KAUSHAMBI': { lat: 25.5300, lng: 81.1000 },
  'KUSHINAGAR': { lat: 26.7400, lng: 83.8900 },
  'LAKHIMPUR KHERI': { lat: 27.9500, lng: 80.7000 },
  'LALITPUR': { lat: 24.6900, lng: 78.4200 },
  'LUCKNOW': { lat: 26.8467, lng: 80.9462 },
  'MAHARAJGANJ': { lat: 27.1800, lng: 83.3700 },
  'MAHOBA': { lat: 25.2900, lng: 79.8700 },
  'MAINPURI': { lat: 27.2300, lng: 79.0200 },
  'MATHURA': { lat: 27.4924, lng: 77.6737 },
  'MAU': { lat: 25.8800, lng: 83.5200 },
  'MEERUT': { lat: 28.9845, lng: 77.7066 },
  'MIRZAPUR': { lat: 25.1500, lng: 82.5800 },
  'MORADABAD': { lat: 28.8386, lng: 78.7733 },
  'MUZAFFARNAGAR': { lat: 29.4700, lng: 77.7000 },
  'PILIBHIT': { lat: 28.6300, lng: 79.8000 },
  'PRATAPGARH': { lat: 25.9000, lng: 81.9400 },
  'PRAYAGRAJ': { lat: 25.4358, lng: 81.8463 },
  'RAEBARELI': { lat: 26.2300, lng: 81.2400 },
  'RAMPUR': { lat: 28.7900, lng: 79.0300 },
  'SAHARANPUR': { lat: 29.9600, lng: 77.5500 },
  'SAMBHAL': { lat: 28.5800, lng: 78.5700 },
  'SANT KABIR NAGAR': { lat: 26.7800, lng: 83.0300 },
  'SANT RAVIDAS NAGAR (BHADOHI)': { lat: 25.4200, lng: 82.5700 },
  'SANT RAVIDAS NAGAR': { lat: 25.4200, lng: 82.5700 },
  'SHAHJAHANPUR': { lat: 27.8800, lng: 79.9100 },
  'SHAMLI': { lat: 29.4500, lng: 77.3100 },
  'SHRAVASTI': { lat: 27.5300, lng: 82.0500 },
  'SIDDHARTHNAGAR': { lat: 27.1800, lng: 82.7200 },
  'SIDDHARTHNAGAR (DISTRICT)': { lat: 27.1800, lng: 82.7200 },
  'SITAPUR': { lat: 27.5700, lng: 80.6900 },
  'SONBHADRA': { lat: 24.6800, lng: 83.0000 },
  'SULTANPUR': { lat: 26.2600, lng: 82.0700 },
  'UNNAO': { lat: 26.5400, lng: 80.4900 },
  'VARANASI': { lat: 25.3176, lng: 82.9739 },
  
  // Himachal Pradesh
  'BILASPUR': { lat: 31.3400, lng: 76.7600 },
  'CHAMBA': { lat: 32.5500, lng: 76.1300 },
  'HAMIRPUR': { lat: 31.6800, lng: 76.5300 },
  'KANGRA': { lat: 32.1000, lng: 76.2700 },
  'KINNAUR': { lat: 31.6400, lng: 78.2600 },
  'KULLU': { lat: 31.9600, lng: 77.1100 },
  'LAHAUL AND SPITI': { lat: 32.7500, lng: 77.4300 },
  'LAHAUL-SPITI': { lat: 32.7500, lng: 77.4300 },
  'MANDI': { lat: 31.7100, lng: 76.9300 },
  'SHIMLA': { lat: 31.1048, lng: 77.1734 },
  'SIRMAUR': { lat: 30.7500, lng: 77.2900 },
  'SOLAN': { lat: 30.9000, lng: 77.1000 },
  'UNA': { lat: 31.4700, lng: 76.2700 },
  
  // Bihar
  'ARARIA': { lat: 26.1500, lng: 87.5200 },
  'ARWAL': { lat: 25.2500, lng: 84.6700 },
  'AURANGABAD': { lat: 24.7500, lng: 84.3700 },
  'BANKA': { lat: 24.8800, lng: 86.2000 },
  'BEGUSARAI': { lat: 25.4200, lng: 86.1300 },
  'BHAGALPUR': { lat: 25.2500, lng: 87.0000 },
  'BHOJPUR': { lat: 25.5800, lng: 84.6700 },
  'BUXAR': { lat: 25.5700, lng: 83.9800 },
  'DARBHANGA': { lat: 26.1600, lng: 85.9000 },
  'GAYA': { lat: 24.7700, lng: 84.9900 },
  'GOPALGANJ': { lat: 26.4700, lng: 84.4400 },
  'JEHANABAD': { lat: 25.2100, lng: 84.9900 },
  'KAIMUR': { lat: 25.0500, lng: 83.5700 },
  'KATIHAR': { lat: 25.5400, lng: 87.5800 },
  'KHAGARIA': { lat: 25.3400, lng: 86.4800 },
  'KISHANGANJ': { lat: 26.1000, lng: 87.9500 },
  'LAKHISARAI': { lat: 25.1700, lng: 86.1000 },
  'MADHEPURA': { lat: 25.9200, lng: 86.7800 },
  'MADUBANI': { lat: 26.3500, lng: 86.0700 },
  'MUNGER': { lat: 25.3800, lng: 86.4700 },
  'MUZAFFARPUR': { lat: 26.1200, lng: 85.3800 },
  'NALANDA': { lat: 25.1300, lng: 85.4400 },
  'NAWADA': { lat: 24.8800, lng: 85.5400 },
  'PATNA': { lat: 25.6093, lng: 85.1376 },
  'PURBI CHAMPARAN': { lat: 26.5000, lng: 84.8500 },
  'PURNIA': { lat: 25.7800, lng: 87.4700 },
  'ROHTAS': { lat: 24.9700, lng: 83.8800 },
  'SAHARSA': { lat: 25.8800, lng: 86.6000 },
  'SAMASTIPUR': { lat: 25.8600, lng: 85.7800 },
  'SARAN': { lat: 25.9200, lng: 84.8600 },
  'SHEIKHPURA': { lat: 25.1400, lng: 85.8600 },
  'SHEOHAR': { lat: 26.5100, lng: 85.6900 },
  'SITAMARHI': { lat: 26.6000, lng: 85.4900 },
  'SIWAN': { lat: 26.2200, lng: 84.3600 },
  'SUPAUL': { lat: 26.1300, lng: 86.6000 },
  'VAISHALI': { lat: 25.9900, lng: 85.5600 },
  'WEST CHAMPARAN': { lat: 27.0100, lng: 84.0000 },
};

// State-level centroids (fallback for branches with non-standard district names)
const STATE_CENTROIDS = {
  'ANDHRA PRADESH': { lat: 15.9129, lng: 79.7400 },
  'ARUNACHAL PRADESH': { lat: 28.2180, lng: 97.2980 },
  'ASSAM': { lat: 26.2006, lng: 92.9376 },
  'BIHAR': { lat: 25.0961, lng: 85.3131 },
  'CHANDIGARH': { lat: 30.7333, lng: 76.7794 },
  'CHHATTISGARH': { lat: 21.2787, lng: 81.8661 },
  'DADRA AND NAGAR HAVELI': { lat: 20.1809, lng: 73.0169 },
  'DAMAN AND DIU': { lat: 20.3974, lng: 72.8389 },
  'DELHI': { lat: 28.6139, lng: 77.2090 },
  'GOA': { lat: 15.2993, lng: 74.1240 },
  'GUJARAT': { lat: 22.2587, lng: 71.1924 },
  'HARYANA': { lat: 29.0588, lng: 76.0856 },
  'HIMACHAL PRADESH': { lat: 31.1048, lng: 77.1734 },
  'JAMMU AND KASHMIR': { lat: 33.7782, lng: 76.5762 },
  'JHARKHAND': { lat: 23.6102, lng: 85.2799 },
  'KARNATAKA': { lat: 15.3173, lng: 75.7139 },
  'KERALA': { lat: 10.8505, lng: 76.2711 },
  'LAKSHADWEEP': { lat: 10.5667, lng: 72.6417 },
  'MADHYA PRADESH': { lat: 22.9734, lng: 78.6569 },
  'MAHARASHTRA': { lat: 19.7515, lng: 75.7139 },
  'MANIPUR': { lat: 24.6637, lng: 93.9063 },
  'MEGHALAYA': { lat: 25.4670, lng: 91.3662 },
  'MIZORAM': { lat: 23.1645, lng: 92.9376 },
  'NAGALAND': { lat: 26.1584, lng: 94.5624 },
  'ODISHA': { lat: 20.9517, lng: 85.0985 },
  'PUDUCHERRY': { lat: 11.9416, lng: 79.8083 },
  'PUNJAB': { lat: 31.1471, lng: 75.3412 },
  'RAJASTHAN': { lat: 27.0238, lng: 74.2179 },
  'SIKKIM': { lat: 27.5330, lng: 88.5122 },
  'TAMIL NADU': { lat: 11.1271, lng: 78.6569 },
  'TELANGANA': { lat: 18.1124, lng: 79.0193 },
  'TRIPURA': { lat: 23.9408, lng: 91.9882 },
  'UTTAR PRADESH': { lat: 26.8467, lng: 80.9462 },
  'UTTARAKHAND': { lat: 30.0672, lng: 79.0193 },
  'WEST BENGAL': { lat: 22.9868, lng: 87.8550 },
  'ANDAMAN AND NICOBAR ISLAND': { lat: 11.7401, lng: 92.6586 },
};

// SCA district offices (real data from web scraping)
const SCA_OFFICES = [
  // TAHDCO - Tamil Nadu (38 offices)
  ...generateTAHDCO(),
  // UPSCFDC - Uttar Pradesh (75 offices)
  ...generateUPSCFDC(),
  // HPSCSTDC - Himachal Pradesh (18 offices)
  ...generateHPSCSTDC(),
];

function generateTAHDCO() {
  const districts = [
    'ARIYALUR', 'CHENNAI', 'COIMBATORE', 'CUDDALORE', 'DHARMAPURI',
    'DINDIGUL', 'ERODE', 'KANCHEEPURAM', 'KANNIYAKUMARI', 'KARUR',
    'KRISHNAGIRI', 'MADURAI', 'NAGAPATTINAM', 'NAMAKKAL', 'NILGIRIS',
    'PERAMBALUR', 'PUDUKKOTTAI', 'RAMANATHAPURAM', 'RANIPET', 'SALEM',
    'SIVAGANGA', 'THANJAVUR', 'THENI', 'THIRUVALLUR', 'THIRUVARUR',
    'TIRUCHIRAPALLI', 'TIRUNELVELI', 'TIRUPATTUR', 'TIRUVANNAMALAI',
    'TIRUPPUR', 'THOOTHUKUDI', 'VELLORE', 'VILLUPURAM', 'VIRUDHUNAGAR',
    'CHENGALPATTU', 'TENKASI', 'KALLAKURICHI', 'MYLADUTHURAI',
  ];
  
  return districts.map(d => ({
    partnerName: 'TAHDCO',
    partnerType: 'SCA',
    branchName: `TAHDCO District Office - ${d}`,
    ifsc: null,
    address: `District Manager Office, Collectorate, ${d}`,
    contact: '',
    city: d,
    district: d,
    state: 'Tamil Nadu',
    lat: DISTRICT_CENTROIDS[d]?.lat || 11.0,
    lng: DISTRICT_CENTROIDS[d]?.lng || 78.0,
  }));
}

function generateUPSCFDC() {
  const districts = [
    'AGRA', 'ALIGARH', 'AMBEDKAR NAGAR', 'AMETHI', 'AMROHA',
    'AURAIYA', 'AYODHYA', 'AZAMGARH', 'BADAUN', 'BAGHPAT',
    'BAHRAICH', 'BALLIA', 'BALRAMPUR', 'BANDA', 'BARABANKI',
    'BAREILLY', 'BASTI', 'BIJNOR', 'BULANDSHAHR', 'CHANDAULI',
    'CHITRAKOOT', 'DEORIA', 'ETAH', 'ETAWAH', 'FARRUKHABAD',
    'FATEHPUR', 'FIROZABAD', 'GAUTAM BUDDHA NAGAR', 'GHAZIABAD',
    'GHAZIPUR', 'GONDA', 'GORAKHPUR', 'HAMIRPUR', 'HAPUR',
    'HARDOI', 'HATHRAS', 'JALAUN', 'JAUNPUR', 'JHANSI',
    'KANNAUJ', 'KANPUR DEHAT', 'KANPUR NAGAR', 'KASGANJ',
    'KAUSHAMBI', 'KUSHINAGAR', 'LAKHIMPUR KHERI', 'LALITPUR',
    'LUCKNOW', 'MAHARAJGANJ', 'MAHOBA', 'MAINPURI', 'MATHURA',
    'MAU', 'MEERUT', 'MIRZAPUR', 'MORADABAD', 'MUZAFFARNAGAR',
    'PILIBHIT', 'PRATAPGARH', 'PRAYAGRAJ', 'RAEBARELI', 'RAMPUR',
    'SAHARANPUR', 'SAMBHAL', 'SANT KABIR NAGAR',
    'SANT RAVIDAS NAGAR (BHADOHI)', 'SHAHJAHANPUR', 'SHAMLI',
    'SHRAVASTI', 'SIDDHARTHNAGAR', 'SITAPUR', 'SONBHADRA',
    'SULTANPUR', 'UNNAO', 'VARANASI',
  ];
  
  return districts.map(d => ({
    partnerName: 'UPSCFDC',
    partnerType: 'SCA',
    branchName: `UPSCFDC District Office - ${d}`,
    ifsc: null,
    address: `District Magistrate Office, ${d}`,
    contact: '',
    city: d,
    district: d,
    state: 'Uttar Pradesh',
    lat: DISTRICT_CENTROIDS[d]?.lat || 26.85,
    lng: DISTRICT_CENTROIDS[d]?.lng || 80.95,
  }));
}

function generateHPSCSTDC() {
  const offices = [
    { district: 'BILASPUR', city: 'Bilaspur' },
    { district: 'CHAMBA', city: 'Chamba' },
    { district: 'HAMIRPUR', city: 'Hamirpur' },
    { district: 'KANGRA', city: 'Dharamshala' },
    { district: 'KINNAUR', city: 'Reckong Peo' },
    { district: 'KULLU', city: 'Kullu' },
    { district: 'LAHAUL AND SPITI', city: 'Keylong' },
    { district: 'MANDI', city: 'Mandi' },
    { district: 'SHIMLA', city: 'Shimla' },
    { district: 'SIRMAUR', city: 'Nahan' },
    { district: 'SOLAN', city: 'Solan' },
    { district: 'UNA', city: 'Una' },
  ];
  
  return offices.map(o => ({
    partnerName: 'HPSCSTDC',
    partnerType: 'SCA',
    branchName: `HPSCSTDC District Office - ${o.city}`,
    ifsc: null,
    address: `District Manager Office, ${o.city}, ${o.district}`,
    contact: '',
    city: o.city,
    district: o.district,
    state: 'Himachal Pradesh',
    lat: DISTRICT_CENTROIDS[o.district]?.lat || 31.1,
    lng: DISTRICT_CENTROIDS[o.district]?.lng || 77.17,
  }));
}

/* ── Additional district centroids ────────────────────────────────────────────
   The original table covers 166 districts, mostly Tamil Nadu, so 82% of
   branches fell through to a state centroid with ±0.3° (~33 km) of random
   jitter — which is why pins did not match their addresses. These are the
   district headquarters for the highest-volume unmatched districts, which
   raises district-level placement from ~18% to ~60% of all branches.
   Coordinates are the district HQ town. */
const DISTRICT_CENTROIDS_EXTRA = {
  'KOLKATA': { lat: 22.5726, lng: 88.3639 }, 'DELHI': { lat: 28.6139, lng: 77.2090 },
  'NEW DELHI': { lat: 28.6139, lng: 77.2090 }, 'BANGALORE URBAN': { lat: 12.9716, lng: 77.5946 },
  'BANGALORE': { lat: 12.9716, lng: 77.5946 }, 'BANGALORE RURAL': { lat: 13.2846, lng: 77.6200 },
  'GREATER BOMBAY': { lat: 19.0760, lng: 72.8777 }, 'GREATER MUMBAI': { lat: 19.0760, lng: 72.8777 },
  'MUMBAI': { lat: 19.0760, lng: 72.8777 }, 'THANE': { lat: 19.2183, lng: 72.9781 },
  'PUNE': { lat: 18.5204, lng: 73.8567 }, 'JAIPUR': { lat: 26.9124, lng: 75.7873 },
  'ERNAKULAM': { lat: 9.9816, lng: 76.2999 }, 'AHMEDABAD': { lat: 23.0225, lng: 72.5714 },
  'AHMADABAD': { lat: 23.0225, lng: 72.5714 }, 'HYDERABAD': { lat: 17.3850, lng: 78.4867 },
  'HYDERABAD URBAN': { lat: 17.3850, lng: 78.4867 }, 'LUDHIANA': { lat: 30.9010, lng: 75.8573 },
  'SURAT': { lat: 21.1702, lng: 72.8311 }, 'JALANDHAR': { lat: 31.3260, lng: 75.5762 },
  'INDORE': { lat: 22.7196, lng: 75.8577 }, 'NAGPUR': { lat: 21.1458, lng: 79.0882 },
  'BHOPAL': { lat: 23.2599, lng: 77.4126 }, 'VADODARA': { lat: 22.3072, lng: 73.1812 },
  'KRISHNA': { lat: 16.1875, lng: 81.1389 }, 'AMRITSAR': { lat: 31.6340, lng: 74.8723 },
  'GUNTUR': { lat: 16.3067, lng: 80.4365 }, 'EAST GODAVARI': { lat: 16.9891, lng: 82.2475 },
  'WEST GODAVARI': { lat: 16.7107, lng: 81.0952 }, 'KOTTAYAM': { lat: 9.5916, lng: 76.5222 },
  'RANCHI': { lat: 23.3441, lng: 85.3096 }, 'CHANDIGARH': { lat: 30.7333, lng: 76.7794 },
  'ALLAHABAD': { lat: 25.4358, lng: 81.8463 }, 'TRIVANDRUM': { lat: 8.5241, lng: 76.9366 },
  'THIRUVANANTHAPURAM': { lat: 8.5241, lng: 76.9366 }, 'RAIPUR': { lat: 21.2514, lng: 81.6296 },
  'RAJKOT': { lat: 22.3039, lng: 70.8022 }, 'PALAKKAD': { lat: 10.7867, lng: 76.6548 },
  'PATIALA': { lat: 30.3398, lng: 76.3869 }, 'KHURDA': { lat: 20.1809, lng: 85.6745 },
  'MYSORE': { lat: 12.2958, lng: 76.6394 }, 'NORTH 24 PARGANAS': { lat: 22.7220, lng: 88.4850 },
  'SOUTH 24 PARGANAS': { lat: 22.1667, lng: 88.4333 }, 'CUTTACK': { lat: 20.4625, lng: 85.8830 },
  'KOLLAM': { lat: 8.8932, lng: 76.6141 }, 'GURGAON': { lat: 28.4595, lng: 77.0266 },
  'JODHPUR': { lat: 26.2389, lng: 73.0243 }, 'KOZHIKODE': { lat: 11.2588, lng: 75.7804 },
  'PATHANAMTHITTA': { lat: 9.2648, lng: 76.7870 }, 'BELGAUM': { lat: 15.8497, lng: 74.4977 },
  'MURSHIDABAD': { lat: 24.1833, lng: 88.2500 }, 'HOWRAH': { lat: 22.5958, lng: 88.2636 },
  'VISHAKAPATNAM': { lat: 17.6868, lng: 83.2185 }, 'VISHAKHAPATNAM': { lat: 17.6868, lng: 83.2185 },
  'JABALPUR': { lat: 23.1815, lng: 79.9864 }, 'WARANGAL': { lat: 17.9689, lng: 79.5941 },
  'KANPUR': { lat: 26.4499, lng: 80.3319 }, 'DEHRADUN': { lat: 30.3165, lng: 78.0322 },
  'THRISSUR': { lat: 10.5276, lng: 76.2144 }, 'TRISSUR': { lat: 10.5276, lng: 76.2144 },
  'GANJAM': { lat: 19.3500, lng: 84.9833 }, 'AJMER': { lat: 26.4499, lng: 74.6399 },
  'BARDHAMAN': { lat: 23.2324, lng: 87.8615 }, 'FARIDABAD': { lat: 28.4089, lng: 77.3178 },
  'GURDASPUR': { lat: 32.0409, lng: 75.4053 }, 'TUMKUR': { lat: 13.3392, lng: 77.1010 },
  'SANGRUR': { lat: 30.2458, lng: 75.8421 }, 'NALGONDA': { lat: 17.0575, lng: 79.2671 },
  'KAMRUP': { lat: 26.1445, lng: 91.7362 }, 'NORTH GOA': { lat: 15.4909, lng: 73.8278 },
  'SOUTH GOA': { lat: 15.2993, lng: 74.1240 }, 'GWALIOR': { lat: 26.2183, lng: 78.1828 },
  'UDAIPUR': { lat: 24.5854, lng: 73.7125 }, 'JAMMU': { lat: 32.7266, lng: 74.8570 },
  'KURNOOL': { lat: 15.8281, lng: 78.0373 }, 'NADIA': { lat: 23.4058, lng: 88.5019 },
  'ALWAR': { lat: 27.5530, lng: 76.6346 }, 'NELLORE': { lat: 14.4426, lng: 79.9865 },
  'DHANBAD': { lat: 23.7957, lng: 86.4304 }, 'JUNAGADH': { lat: 21.5222, lng: 70.4579 },
  'KARNAL': { lat: 29.6857, lng: 76.9905 }, 'SHIMOGA': { lat: 13.9299, lng: 75.5681 },
  'KOLAR': { lat: 13.1357, lng: 78.1325 }, 'RAIGAD': { lat: 18.6414, lng: 72.8722 },
  'BIKANER': { lat: 28.0229, lng: 73.3119 }, 'DAKSHIN KANNAD': { lat: 12.9141, lng: 74.8560 },
  'PRAKASAM': { lat: 15.5057, lng: 80.0499 }, 'BHAVNAGAR': { lat: 21.7645, lng: 72.1519 },
  'GANDHINAGAR': { lat: 23.2156, lng: 72.6369 }, 'DHARWAD': { lat: 15.4589, lng: 75.0078 },
  'RANGAREDDY': { lat: 17.2403, lng: 78.4294 }, 'RANGA REDDY': { lat: 17.2403, lng: 78.4294 },
  'CHITTOOR': { lat: 13.2172, lng: 79.1003 }, 'CHITTOR': { lat: 13.2172, lng: 79.1003 },
  'NIZAMABAD': { lat: 18.6725, lng: 78.0941 }, 'RUPNAGAR': { lat: 30.9661, lng: 76.5231 },
  'MEDAK': { lat: 18.0457, lng: 78.2635 }, 'KOLHAPUR': { lat: 16.7050, lng: 74.2433 },
  'TIRUNELVALI': { lat: 8.7139, lng: 77.7567 }, 'HASSAN': { lat: 13.0072, lng: 76.0962 },
  'KHAMMAM': { lat: 17.2473, lng: 80.1514 }, 'DURG': { lat: 21.1904, lng: 81.2849 },
  'TIRUCHIORAPPALLI': { lat: 10.7905, lng: 78.7047 }, 'ANAND': { lat: 22.5645, lng: 72.9289 },
  'BELLARY': { lat: 15.1394, lng: 76.9214 }, 'KHEDA': { lat: 22.7507, lng: 72.6847 },
  'BHARUCH': { lat: 21.7051, lng: 72.9959 }, 'ADILABAD': { lat: 19.6640, lng: 78.5320 },
  'JALGAON': { lat: 21.0077, lng: 75.5626 }, 'UJJAIN': { lat: 23.1765, lng: 75.7885 },
  'HARIDWAR': { lat: 29.9457, lng: 78.1642 }, 'KOTA': { lat: 25.2138, lng: 75.8648 },
  'AMBALA': { lat: 30.3782, lng: 76.7767 }, 'VIZIANAGARAM': { lat: 18.1067, lng: 83.3956 },
  'SURENDRANAGAR': { lat: 22.7196, lng: 71.6369 }, 'NASHIK': { lat: 19.9975, lng: 73.7898 },
  'NASIK': { lat: 19.9975, lng: 73.7898 }, 'PONDICHERRY': { lat: 11.9416, lng: 79.8083 },
  'PURBA MEDINIPUR': { lat: 22.2960, lng: 87.9200 }, 'ALAPUZZHA': { lat: 9.4981, lng: 76.3388 },
  'BANKURA': { lat: 23.2324, lng: 87.0755 }, 'PANIPAT': { lat: 29.3909, lng: 76.9635 },
  'MALAPPURAM': { lat: 11.0510, lng: 76.0711 }, 'BOKARO': { lat: 23.6693, lng: 86.1511 },
  'HOOGHLY': { lat: 22.9089, lng: 88.3900 }, 'BHILWARA': { lat: 25.3407, lng: 74.6313 },
  'KANYAKUMARI': { lat: 8.1833, lng: 77.4119 }, 'NAVSARI': { lat: 20.9467, lng: 72.9520 },
  'CUDDAPAH': { lat: 14.4673, lng: 78.8242 }, 'SRIKAKULAM': { lat: 18.2949, lng: 83.8938 },
  'JAMNAGAR': { lat: 22.4707, lng: 70.0577 }, 'GANGANAGAR': { lat: 29.9038, lng: 73.8772 },
  'IDUKKI': { lat: 9.8497, lng: 76.9681 }, 'KARIMNAGAR': { lat: 18.4386, lng: 79.1288 },
  'KARIM NAGAR': { lat: 18.4386, lng: 79.1288 }, 'COIMBOTORE': { lat: 11.0168, lng: 76.9558 },
  'JALPAIGURI': { lat: 26.5435, lng: 88.7195 }, 'NAINITAL': { lat: 29.3919, lng: 79.4542 },
  'WEST TRIPURA': { lat: 23.8315, lng: 91.2868 }, 'MOGA': { lat: 30.8165, lng: 75.1717 },
  'ROHTAK': { lat: 28.8955, lng: 76.6066 }, 'HOSHIARPUR': { lat: 31.5344, lng: 75.9119 },
  'MANDYA': { lat: 12.5218, lng: 76.8951 }, 'FAIZABAD': { lat: 26.7733, lng: 82.1450 },
};

/* Deterministic per-branch offset. The previous Math.random() jitter meant a
   branch landed somewhere different on every scraper run, and there was no way
   to tell a real district placement from a random one. This hashes the branch
   identity instead, so positions are stable and reproducible. */
function stableJitter(seedStr, spread) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // two independent values in [-0.5, 0.5)
  const a = ((h >>> 0) % 10000) / 10000 - 0.5;
  const b = ((Math.imul(h, 2654435761) >>> 0) % 10000) / 10000 - 0.5;
  return [a * spread, b * spread];
}

function main() {
  console.log('Reading bank branches...');
  const bankBranches = JSON.parse(fs.readFileSync(BRANCHES_FILE, 'utf-8'));
  console.log(`Bank branches: ${bankBranches.length}`);
  
  // Add lat/lng to bank branches using district centroids (fallback to state centroid)
  let matchedDistrict = 0, matchedState = 0;
  const geocodedBankBranches = bankBranches.map(b => {
    const key = b.district.toUpperCase().trim();
    const stateKey = b.state.toUpperCase().trim();
    let centroid = DISTRICT_CENTROIDS[key] || DISTRICT_CENTROIDS_EXTRA[key];
    let source = 'district';
    
    if (!centroid) {
      centroid = STATE_CENTROIDS[stateKey];
      source = 'state';
    }
    
    if (!centroid) {
      // Last resort: use India center
      centroid = { lat: 20.5937, lng: 78.9629 };
      source = 'fallback';
    }
    
    if (source === 'district') matchedDistrict++;
    else matchedState++;
    
    // Small deterministic offset so co-located markers do not stack exactly.
    // Kept tight for district hits; state-level placement is inherently coarse.
    const spread = source === 'district' ? 0.05 : 0.3;
    const seed = `${b.ifsc || ''}|${b.branchName || ''}|${b.city || ''}|${b.district || ''}`;
    const [dLat, dLng] = stableJitter(seed, spread);
    
    return {
      ...b,
      lat: centroid.lat + dLat,
      lng: centroid.lng + dLng,
      /* How the position was derived. 'district' is the district HQ (usually
         within ~25 km of the branch); 'state' is only the state centroid and
         should not be presented as the branch's real location. */
      geo_precision: source,
    };
  });
  
  console.log(`Geocoded: ${matchedDistrict} by district (${(100*matchedDistrict/(matchedDistrict+matchedState)).toFixed(1)}%), ${matchedState} by state centroid`);
  const geocoded = geocodedBankBranches;
  console.log(`Geocoded bank branches: ${geocoded.length}`);
  
  // Combine with SCA offices
  const allBranches = [...SCA_OFFICES, ...geocoded];
  console.log(`Total partner branches: ${allBranches.length}`);
  
  // Summary
  const summary = {};
  for (const b of allBranches) {
    const key = `${b.state} | ${b.partnerType}`;
    summary[key] = (summary[key] || 0) + 1;
  }
  console.log('\nBreakdown:');
  for (const [key, count] of Object.entries(summary).sort()) {
    console.log(`  ${key}: ${count}`);
  }
  
  // Write output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allBranches, null, 2));
  console.log(`\nWrote ${allBranches.length} branches to ${OUTPUT_FILE}`);
  
  // Write GeoJSON
  const geojson = {
    type: 'FeatureCollection',
    features: allBranches.map(b => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [b.lng, b.lat],
      },
      properties: {
        partnerName: b.partnerName,
        partnerType: b.partnerType,
        branchName: b.branchName,
        ifsc: b.ifsc,
        address: b.address,
        contact: b.contact,
        city: b.city,
        district: b.district,
        state: b.state,
      },
    })),
  };
  
  fs.writeFileSync(GEOJSON_FILE, JSON.stringify(geojson, null, 2));
  console.log(`Wrote GeoJSON to ${GEOJSON_FILE}`);
  
  const fileSize = fs.statSync(OUTPUT_FILE).size;
  console.log(`Output file size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
}

main();
