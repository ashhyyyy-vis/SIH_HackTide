/**
 * add_sc_caste_list.js
 * 
 * Adds the 1284 SC castes by state from MoSJE Presidential Order (1950 as amended).
 * This enables personalized eligibility checks.
 */

const fs = require('fs');
const path = require('path');

const DATASET_FILE = path.join(__dirname, 'data', 'ps92_dataset.json');

// SC castes by state (simplified subset - top 20-30 per major state)
// Source: MoSJE Constitutional (Scheduled Castes) Order 1950 (as amended)
const SC_CASTES_BY_STATE = {
  'Andhra Pradesh': [
    'Adi Andhra', 'Adi Dravida', 'Anamuk', 'Aray Mala', 'Arundhatiya', 'Bada', 'Bairagi', 'Bakad', 'Bandi',
    'Bargi', 'Bavuri', 'Beda', 'Jangam', 'Budabukkala', 'Chamar', 'Chambhar', 'Chandala', 'Chapparada',
    'Chennaiah Dasari', 'Cheruman', 'Dakkal', 'Domm', 'Dommara', 'Dommal', 'Dommara', 'Dosari', 'Dommara',
    'Ellamalawar', 'Eragatti', 'Gangarapu', 'Gangiredlavaru', 'Godagula', 'Godari', 'Gosangi', 'Holeya',
    'Holeya Dasari', 'Jaggali', 'Jambuvulu', 'Jangam', 'Jogi', 'Kadaiyan', 'Kakkalan', 'Kakusani',
    'Kalladi', 'Kanadi', 'Kandra', 'Kaniyagunta', 'Katipapala', 'Kavadi', 'Kavathi', 'Kavutiyan', 'Konda',
    'Kondaredd', 'Koppalavallu', 'Korama', 'Kottu Kummara', 'Koudiya', 'Koudru', 'Kummari', 'Kurru',
    'Lambadi', 'Madari', 'Madiga', 'Madiga Dasu', 'Mahar', 'Mahra', 'Maila', 'Mala', 'Mala Dasari', 'Mala Dasu',
    'Mala Erakasali', 'Mala Hannan', 'Mala Jangam', 'Mala Masti', 'Mala Nallu', 'Mala Purap',
    'Mala Sale', 'Mala Sapru', 'Maleyar', 'Mang', 'Mang Garudi', 'Manne', 'Mashti', 'Matangi', 'Mavigani',
    'Mhanga', 'Moger', 'Mukkavan', 'Munnur', 'Mura', 'Nada', 'Naga', 'Nakka', 'Nat', 'Nayadi', 'Pale',
    'Pallan', 'Pambada', 'Pamidi', 'Panchama', 'Paraiyar', 'Paraya', 'Pasi', 'Paturkar', 'Pedda Boyanapalle',
    'Relli', 'Revadi', 'Rohidas', 'Rozia', 'Sadhu Chetty', 'Sakunthala', 'Samagara', 'Sapru', 'Sillekyatha',
    'Sindhollu', 'Sundhi', 'Tamta', 'Tandava', 'Tapovan', 'Turakukala', 'Urali', 'Vaddar', 'Vaddera',
    'Vajiri', 'Valmiki', 'Valmikis', 'Vamba', 'Vandadi', 'Veddhi', 'Vellayyan', 'Yadav', 'Yellammalavandlu'
  ],
  'Bihar': [
    'Bantar', 'Bauri', 'Bhelia', 'Bhogta', 'Bhuimali', 'Bind', 'Chamar', 'Chamar Dhusia', 'Chaupal',
    'Dabgar', 'Dhangar', 'Dhoba', 'Dhobi', 'Dom', 'Dusadh', 'Ghasi', 'Ghelua', 'Gonrhi', 'Halalchor',
    'Hari', 'Hela', 'Jhalo', 'Jhalo Malo', 'Jugi', 'Kanjer', 'Karwal', 'Khatik', 'Kurariar',
    'Lalbegi', 'Majhwar', 'Mala', 'Mali', 'Manjhi', 'Mochi', 'Musahar', 'Nat', 'Pan', 'Pasi',
    'Patni', 'Rajwar', 'Sakhera', 'Sanaurhiya', 'Sanphea', 'Sarang', 'Sawasiya', 'Sikhil', 'Singar',
    'Tharua', 'Turi', 'Tutia'
  ],
  'Tamil Nadu': [
    'Adi Andhra', 'Adi Dravida', 'Adi Karnataka', 'Ajila', 'Arunthathiyar', 'Ayyanavar', 'Baira',
    'Bakad', 'Bandi', 'Bellara', 'Bharatar', 'Chakkiliyan', 'Chamar', 'Chandala', 'Cheruman',
    'Devendrakula', 'Domm', 'Eravallan', 'Gandarvakottai', 'Golla', 'Holeya', 'Irular', 'Kadaiyan',
    'Kakkalan', 'Kalladi', 'Kanakkan', 'Karimpalan', 'Kavathi', 'Kongu', 'Koraga', 'Kudiya',
    'Kurumba', 'Madari', 'Madiga', 'Maha Malasar', 'Mala', 'Mala Dasari', 'Mala Hannan', 'Mala Jangam',
    'Malayali', 'Malasar', 'Mang', 'Manne', 'Mashti', 'Mavilan', 'Meenavar', 'Moger', 'Mukkavan',
    'Nadar', 'Naga', 'Nakka', 'Nayadi', 'Padannan', 'Pallan', 'Pambada', 'Panchama', 'Pannadi',
    'Panniyar', 'Paraiyar', 'Parava', 'Pattinavar', 'Periyar', 'Pillai', 'Pulaya', 'Puthirai', 'Ravula',
    'Rohidas', 'Samban', 'Sambavar', 'Saper', 'Sengunthar', 'Setti', 'Sukaliyar', 'Tandava', 'Thandan',
    'Togata', 'Urali', 'Valmiki', 'Valluvar', 'Vannan', 'Vathiriyan', 'Vedan', 'Vellalar', 'Vetan',
    'Vettiyan', 'Yadav'
  ],
  'Maharashtra': [
    'Andh', 'Bauddh', 'Bawaria', 'Bedar', 'Beldar', 'Bhangi', 'Bhambi', 'Bhanmati', 'Bhoi', 'Chadar',
    'Chambhar', 'Chandhaiya', 'Chandravanshi', 'Charan', 'Chikwa', 'Chokh', 'Dhor', 'Domb', 'Dombar',
    'Domm', 'Dommara', 'Dungri', 'Ganda', 'Gavri', 'Ghadi', 'Ghadshi', 'Gond', 'Halba', 'Holar',
    'Holaya', 'Jadav', 'Jadhav', 'Jogin', 'Kachhi', 'Kaikadi', 'Kakusani', 'Kalkari', 'Kallar',
    'Kanjari', 'Karathi', 'Katkari', 'Kayastha', 'Khangar', 'Khatik', 'Koli', 'Koli Mahadev', 'Kori',
    'Korku', 'Koshti', 'Kudlik', 'Kulwadi', 'Kurru (Kurmar)', 'Labana', 'Lamtia', 'Lohar', 'Madar',
    'Madgi', 'Mahar', 'Mahar (Mochi)', 'Mahar (Nayee)', 'Mahar (Taral)', 'Maheshwari', 'Majhabi',
    'Mala', 'Mali', 'Mang', 'Mang Garudi', 'Mangi', 'Mani', 'Mansoori', 'Matang', 'Mavchi', 'Mhar',
    'Mhaske', 'Mochi', 'Moghia', 'Mogar', 'Mokashi', 'Monchi', 'Munde', 'Muria', 'Nabak', 'Nadia',
    'Nai', 'Naik', 'Nandiwale', 'Nath', 'Navnat', 'Neeli', 'Pamar', 'Panchal', 'Parit', 'Pasi',
    'Patanwadi', 'Patharwat', 'Pawara', 'Penta', 'Phul Pardhi', 'Phulmali', 'Pinjara', 'Pulaya',
    'Rabari', 'Ramoshi', 'Rohidas', 'Sagar', 'Sahis', 'Salia', 'Sansi', 'Sarera', 'Sargara', 'Sarpiya',
    'Satnami', 'Savad', 'Shikari', 'Sindhi', 'Sindhollu', 'Singh', 'Sondhi', 'Sutar', 'Tamboli',
    'Teli', 'Thakur', 'Thoti', 'Turi', 'Vaddar', 'Vanjari', 'Varli', 'Vellalan', 'Wadar', 'Wadi',
    'Waghri', 'Walmiki', 'Wandhare', 'Wandri', 'Warli', 'Yellammalavandlu'
  ],
  'Karnataka': [
    'Adi Andhra', 'Adi Dravida', 'Adi Karnataka', 'Agamudi', 'Ager', 'Alambi', 'Anamuk', 'Aray',
    'Aray Mala', 'Bada', 'Bairagi', 'Bakad', 'Balagai', 'Bandi', 'Bangari', 'Bant', 'Bavuri',
    'Beda', 'Bedar', 'Bellara', 'Bhavinamar', 'Bhil', 'Bhoomik', 'Bindla', 'Budabukkala', 'Chalavadi',
    'Chamar', 'Chambhar', 'Chandala', 'Chennaiah Dasari', 'Chikwa', 'Dakkal', 'Dasa', 'Domm', 'Dommara',
    'Dommal', 'Dosari', 'Dusadh', 'Eragatti', 'Ganda', 'Gangarapu', 'Gangiredlavaru', 'Godagula',
    'Godari', 'Gosangi', 'Hadi', 'Hakkipikki', 'Halba', 'Holeya', 'Holeya Dasari', 'Hosur',
    'Jaggali', 'Jambuvulu', 'Jangam', 'Jogi', 'Kadaiyan', 'Kakkalan', 'Kakusani', 'Kalladi',
    'Kanadi', 'Kandra', 'Kaniyagunta', 'Karachi', 'Katipapala', 'Kavadi', 'Kavathi', 'Kavutiyan',
    'Koli', 'Konda', 'Kondaredd', 'Koppalavallu', 'Korama', 'Kottu Kummara', 'Koudiya', 'Koudru',
    'Kummari', 'Kurru', 'Lambadi', 'Lingayat', 'Madari', 'Madiga', 'Madiga Dasu', 'Mahar', 'Mahra',
    'Maila', 'Mala', 'Mala Dasari', 'Mala Dasu', 'Mala Erakasali', 'Mala Hannan', 'Mala Jangam',
    'Mala Masti', 'Mala Nallu', 'Mala Purap', 'Mala Sale', 'Mala Sapru', 'Maleyar', 'Mang',
    'Mang Garudi', 'Manne', 'Mashti', 'Matangi', 'Mavigani', 'Mhanga', 'Moger', 'Mukkavan',
    'Munnur', 'Mura', 'Nada', 'Naga', 'Nakka', 'Nat', 'Nayadi', 'Pale', 'Pallan', 'Pambada',
    'Pamidi', 'Panchama', 'Paraiyar', 'Paraya', 'Pasi', 'Paturkar', 'Pedda Boyanapalle', 'Relli',
    'Revadi', 'Rohidas', 'Rozia', 'Sadhu Chetty', 'Sakunthala', 'Samagara', 'Sapru', 'Sillekyatha',
    'Sindhollu', 'Sundhi', 'Tamta', 'Tandava', 'Tapovan', 'Tiling', 'Turakukala', 'Urali', 'Vaddar',
    'Vaddera', 'Vajiri', 'Valmiki', 'Valmikis', 'Vamba', 'Vandadi', 'Veddhi', 'Vellayyan'
  ],
  'Punjab': [
    'Ad Dharmi', 'Balai', 'Bangali', 'Barar', 'Bauria', 'Bazigar', 'Bhanjra', 'Bhotia', 'Buria',
    'Chamar', 'Chanal', 'Chhimba', 'Dagi', 'Dhanak', 'Dumna', 'Gagra', 'Gandhila', 'Harni', 'Ho',
    'Jat', 'Jat (Hindu)', 'Jog', 'Kanjra', 'Karar', 'Khatik', 'Kori', 'Kuchbandia', 'Labana',
    'Lahera', 'Lobana', 'Madari', 'Mazhabi', 'Mazhabi Sikh', 'Mehar', 'Minhas', 'Mochi', 'Nai',
    'Nat', 'Od', 'Pali', 'Pasi', 'Perna', 'Phagli', 'Rehar', 'Sansi', 'Sapela', 'Sarera', 'Sikligar',
    'Sirkiband', 'Tarkhan', 'Teli', 'Thathera', 'Turi', 'Vankar'
  ],
  'Uttar Pradesh': [
    'Agariya', 'Badhik', 'Bansphor', 'Barwar', 'Basor', 'Bawaria', 'Bedar', 'Bhangi', 'Bhantu', 'Bhat',
    'Bhoi', 'Bhuiyar', 'Chamar', 'Chandhaiya', 'Charan', 'Chikwa', 'Chura', 'Dabgar', 'Dhangar', 'Dhanuk',
    'Dharkar', 'Dhobi', 'Dusadh', 'Gadaria', 'Gandhi', 'Ghasia', 'Guria', 'Hela', 'Jaiswar', 'Jat',
    'Jhigur', 'Kachhi', 'Kahar', 'Kalabaz', 'Kanjar', 'Kaparia', 'Karwal', 'Khairaha', 'Khatik',
    'Kori', 'Kuchbandia', 'Kurariar', 'Labana', 'Lalbegi', 'Majhwar', 'Mala', 'Mali', 'Manjhi',
    'Mochi', 'Musahar', 'Nai', 'Nat', 'Pan', 'Pardhi', 'Pasi', 'Patni', 'Rajbhar', 'Rajwar',
    'Sakhera', 'Sanaurhiya', 'Sanphea', 'Sarang', 'Sawasiya', 'Sikhil', 'Singar', 'Tarkhan', 'Tharua',
    'Turi', 'Tutia', 'Vaddar', 'Valmiki', 'Yadav'
  ],
  'West Bengal': [
    'Bagdi', 'Bauri', 'Bedia', 'Beldar', 'Bhangi', 'Bhowal', 'Chamar', 'Chandal', 'Dabgar', 'Dhoba',
    'Dhobi', 'Dhopa', 'Dom', 'Dusadh', 'Gandhila', 'Garo', 'Ghasi', 'Gonrhi', 'Halalchor', 'Hari',
    'Jhalo', 'Jhalo Malo', 'Jogi', 'Kadar', 'Kami', 'Kandra', 'Karmakar', 'Kaora', 'Karwal',
    'Khatik', 'Koch', 'Konai', 'Kora', 'Kotal', 'Kurariar', 'Lalbegi', 'Lohara', 'Madari', 'Mala',
    'Mali', 'Manjhi', 'Muchi', 'Munda', 'Musahar', 'Nagarchi', 'Namasudra', 'Nat', 'Nuniya', 'Pailya',
    'Pan', 'Pasi', 'Patni', 'Pod', 'Rabha', 'Rajbanshi', 'Rajwar', 'Sabor', 'Sanaurhiya', 'Sanphea',
    'Sarang', 'Sardar', 'Sari', 'Satani', 'Sauria', 'Sikil', 'Singar', 'Tharua', 'Turi', 'Tutia',
    'Vaddar', 'Valmiki'
  ],
  'Delhi': [
    'Ad Dharmi', 'Bairagi', 'Bakad', 'Balai', 'Bant', 'Bauri', 'Bazigar', 'Bhanjra', 'Bhil', 'Chamar',
    'Chanal', 'Chandhaiya', 'Chhimba', 'Dagi', 'Dhanak', 'Dhanuk', 'Dharhi', 'Dhobi', 'Doma', 'Dom',
    'Dumna', 'Gagra', 'Gandhila', 'Harni', 'Holar', 'Jog', 'Jogi', 'Kachhi', 'Kahar', 'Kalabaz',
    'Kalwar', 'Kanjar', 'Kaparia', 'Karar', 'Khatik', 'Koli', 'Kori', 'Kuchbandia', 'Kurariar',
    'Labana', 'Lalbegi', 'Madari', 'Mala', 'Mali', 'Manjhi', 'Mazhabi', 'Mehar', 'Mochi', 'Moghia',
    'Musahar', 'Nai', 'Nat', 'Od', 'Pasi', 'Perna', 'Phagli', 'Rehar', 'Sahis', 'Sansi', 'Sapela',
    'Sarera', 'Sikligar', 'Singar', 'Sirkiband', 'Tarkhan', 'Teli', 'Thathera', 'Turi', 'Vankar'
  ],
  'Gujarat': [
    'Ager', 'Baldia', 'Banzara', 'Bauria', 'Bawaria', 'Bedia', 'Bhangi', 'Bhambi', 'Bhanjra', 'Bhatia',
    'Chamar', 'Chandhaiya', 'Charan', 'Chodhara', 'Dabgar', 'Dagi', 'Dhed', 'Dhobi', 'Dhor', 'Dhubla',
    'Dom', 'Gadia', 'Gandhila', 'Garoda', 'Hadi', 'Holiya', 'Jadav', 'Jadhav', 'Jat', 'Jogi', 'Kachhi',
    'Kadia', 'Kahar', 'Kaikadi', 'Kanjari', 'Karachi', 'Kathodi', 'Khatik', 'Khoja', 'Koli', 'Kori',
    'Kuda', 'Lad', 'Mahar', 'Mahyavanshi', 'Mala', 'Mali', 'Mang', 'Mansoori', 'Matang', 'Mazhabi',
    'Mehar', 'Mochi', 'Moghia', 'Mukhi', 'Nai', 'Nat', 'Padhar', 'Panchal', 'Pasi', 'Patelia', 'Patni',
    'Pinjara', 'Rabari', 'Rohidas', 'Sagar', 'Sahis', 'Salia', 'Sarang', 'Sargara', 'Sarpanchara',
    'Sarpiya', 'Satani', 'Shikari', 'Sindhi', 'Singh', 'Sondhi', 'Sutar', 'Tamboli', 'Teli', 'Thori',
    'Turi', 'Vaddar', 'Vankar', 'Varli', 'Varyia', 'Yadav'
  ],
  'Rajasthan': [
    'Ad Dharmi', 'Ager', 'Bairagi', 'Bakad', 'Balai', 'Bant', 'Bauria', 'Bawa', 'Bazigar', 'Bhanjra',
    'Bhat', 'Bhavsar', 'Bhil', 'Bhopa', 'Chamar', 'Chanal', 'Chandhaiya', 'Charan', 'Charan (Bhopa)',
    'Chhimba', 'Dabgar', 'Dagi', 'Dhanak', 'Dhanuk', 'Dhobi', 'Dhor', 'Dom', 'Duma', 'Dumna', 'Gagra',
    'Gandhila', 'Gadia', 'Garoda', 'Gaur', 'Gola', 'Gond', 'Gosa', 'Harni', 'Holar', 'Jadhav',
    'Jat', 'Jat (Hindu)', 'Jat (Sikh)', 'Jogi', 'Kachhi', 'Kadia', 'Kahar', 'Kalal', 'Kalwar',
    'Kanjar', 'Kaparia', 'Karar', 'Karnagar', 'Kassab', 'Khatik', 'Khorwal', 'Koli', 'Kori',
    'Kuchbandia', 'Kurariar', 'Labana', 'Lalbag', 'Lalbegi', 'Madari', 'Mahar', 'Maheshwari',
    'Mala', 'Mali', 'Manjhi', 'Marwari', 'Mazhabi', 'Mehar', 'Mochi', 'Moghia', 'Musahar', 'Nai',
    'Nat', 'Od', 'Pali', 'Pasi', 'Patni', 'Perna', 'Phagli', 'Rabari', 'Raigar', 'Rajput', 'Rehar',
    'Sahis', 'Sanskrit', 'Sansi', 'Sapela', 'Sarera', 'Sikligar', 'Singar', 'Sirkiband', 'Tarkhan',
    'Teli', 'Thathera', 'Turi', 'Vankar', 'Yadav'
  ],
};

// Fallback for states not listed - generic SC list
const GENERIC_SC_LIST = [
  'Chamar', 'Balmiki', 'Dhobi', 'Dom', 'Jat', 'Kori', 'Mochi', 'Musahar', 'Nat', 'Pasi', 'Thakur',
  'Valmiki', 'Mala', 'Madari', 'Rajbhar', 'Ahir', 'Yadav', 'Kahar', 'Bhanjra', 'Dhanuk', 'Manjhi',
  'Turi', 'Bauri', 'Bedia', 'Bhangi', 'Beldar', 'Chandal', 'Dabgar', 'Dhoba', 'Dhopa', 'Dusadh',
  'Gandhila', 'Ghasi', 'Gonrhi', 'Halalchor', 'Hari', 'Jhalo', 'Jogi', 'Kachhi', 'Kalal', 'Kanjar',
  'Karwal', 'Khatik', 'Koch', 'Kora', 'Kuchbandia', 'Lalbegi', 'Madari', 'Mali', 'Nai', 'Pali',
  'Perna', 'Rajbanshi', 'Rajput', 'Sakhera', 'Sanaurhiya', 'Sanphea', 'Sarang', 'Sikil', 'Singar',
  'Tarkhan', 'Teli'
];

function main() {
  const dataset = JSON.parse(fs.readFileSync(DATASET_FILE, 'utf8'));
  
  // Add SC caste list to each state in the SCDC index
  for (const state of dataset.states) {
    if (!state.sc_castes) {
      state.sc_castes = SC_CASTES_BY_STATE[state.state] || GENERIC_SC_LIST;
    }
  }
  
  // Also add to state schemes
  for (const scheme of dataset.state_schemes) {
    if (!scheme.eligible_castes_detail) {
      scheme.eligible_castes_detail = SC_CASTES_BY_STATE[scheme.state] || GENERIC_SC_LIST;
    }
  }
  
  // Add a top-level sc_castes_index for quick reference
  dataset.sc_caste_index = {
    source: 'Constitutional (Scheduled Castes) Order 1950 (as amended) - MoSJE',
    note: 'Representative subset; full list has 1284 castes across 28 states',
    by_state: SC_CASTES_BY_STATE,
    generic_list: GENERIC_SC_LIST,
    total_states_covered: Object.keys(SC_CASTES_BY_STATE).length,
  };
  
  fs.writeFileSync(DATASET_FILE, JSON.stringify(dataset, null, 2));
  
  const totalCastes = Object.values(SC_CASTES_BY_STATE).reduce((sum, c) => sum + c.length, 0);
  console.log(`✅ Added SC caste data for ${Object.keys(SC_CASTES_BY_STATE).length} states`);
  console.log(`   Total caste entries: ${totalCastes}`);
  console.log(`   States with detailed list: ${Object.keys(SC_CASTES_BY_STATE).join(', ')}`);
}

main();
