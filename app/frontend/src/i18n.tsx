import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from './api';

export type LangCode = 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'ml' | 'mr' | 'bn' | 'gu' | 'pa';

export const LANGUAGES: { code: LangCode; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
];

type Dict = Record<string, { en: string; hi: string }>;

function makeDict(d: Dict) {
  return d;
}

const STRINGS = makeDict({
  appName: { en: 'Saksham', hi: 'सक्षम' },
  tagline: { en: 'AI-driven scheme matching for SC entrepreneurs', hi: 'अनुसूचित जाति उद्यमियों के लिए AI-आधारित योजना मिलान' },

  navHome: { en: 'Home', hi: 'होम' },
  navRecommender: { en: 'Scheme Finder', hi: 'योजना खोज' },
  navCalculator: { en: 'EMI Calculator', hi: 'EMI कैलकुलेटर' },
  navLocator: { en: 'Partner Locator', hi: 'पार्टनर लोकेटर' },
  navSchemes: { en: 'All Schemes', hi: 'सभी योजनाएं' },
  language: { en: 'Language', hi: 'भाषा' },
  listen: { en: 'Speak', hi: 'बोलें' },
  listenHint: { en: 'Use your voice', hi: 'अपनी आवाज़ का उपयोग करें' },

  homeTitle: { en: 'Find the right scheme. See what you will pay. Locate who can actually finance it.', hi: 'सही योजना खोजें। जानें कितना देना होगा। कौन वित्त दे सकता है, पता करें।' },
  homeSubtitle: { en: 'A bilingual platform connecting Scheduled Caste entrepreneurs to concessional loans — up to 90% of project cost at 6.5–8% interest, through healthy channel partners.', hi: 'अनुसूचित जाति के उद्यमियों को रियायती ऋण से जोड़ने वाला बहुभाषी मंच — 6.5–8% ब्याज पर परियोजना लागत का 90% तक, स्वस्थ चैनल पार्टनर्स के माध्यम से।' },
  card1Title: { en: '1 · Smart Scheme Recommender', hi: '1 · स्मार्ट योजना सिफारिशकर्ता' },
  card1Desc: { en: 'Answer a few questions about your project, cost, income and education. Get the schemes you actually qualify for — ranked, with EMIs.', hi: 'अपनी परियोजना, लागत, आय और शिक्षा के बारे में कुछ प्रश्नों के उत्तर दें। जिन योजनाओं के लिए आप पात्र हैं उन्हें EMI के साथ रैंकिंग में पाएं।' },
  card2Title: { en: '2 · Financial Calculator', hi: '2 · वित्तीय कैलकुलेटर' },
  card2Desc: { en: 'Quarterly EMIs with moratorium periods (3–12 months) and a full amortization schedule — exactly how these loans actually work.', hi: 'मोरेटोरियम अवधि (3–12 महीने) के साथ त्रैमासिक EMI और पूरी परिशोधन अनुसूची — ये ऋण वास्तव में कैसे काम करते हैं।' },
  card3Title: { en: '3 · Geo-Spatial Partner Locator', hi: '3 · जियो-स्पेशल पार्टनर लोकेटर' },
  card3Desc: { en: 'Find the nearest SCA, bank or NBFC-MFI that can actually disburse your loan — filtered by fund utilization and NPA health.', hi: 'अपने निकटतम SCA, बैंक या NBFC-MFI खोजें जो वास्तव में आपका ऋण दे सके — कोष उपयोग और NPA स्वास्थ्य के आधार पर फ़िल्टर।' },
  ctaStart: { en: 'Find my scheme', hi: 'मेरी योजना खोजें' },
  ctaPrice: { en: 'Calculate my EMI', hi: 'मेरी EMI गणना करें' },
  ctaLocate: { en: 'Find a partner near me', hi: 'मेरे पास पार्टनर खोजें' },

  recommendTitle: { en: 'Scheme Recommender', hi: 'योजना सिफारिशकर्ता' },
  recommendDesc: { en: 'Tell us about your venture and we will rank the schemes you qualify for.', hi: 'अपने उद्यम के बारे में बताएं, हम आपके लिए पात्र योजनाओं की रैंकिंग करेंगे।' },
  fieldState: { en: 'Your State', hi: 'आपका राज्य' },
  fieldProjectType: { en: 'Project Type', hi: 'परियोजना प्रकार' },
  fieldCost: { en: 'Project Cost (₹)', hi: 'परियोजना लागत (₹)' },
  fieldIncome: { en: 'Annual Family Income (₹)', hi: 'वार्षिक पारिवारिक आय (₹)' },
  fieldEducation: { en: 'Education Status', hi: 'शिक्षा स्थिति' },
  fieldCaste: { en: 'Caste (optional — for SC verification)', hi: 'जाति (वैकल्पिक — SC सत्यापन के लिए)' },
  projectShop: { en: 'Shop / Retail', hi: 'दुकान / खुदरा' },
  projectAgriculture: { en: 'Agriculture', hi: 'कृषि' },
  projectManufacturing: { en: 'Manufacturing', hi: 'विनिर्माण' },
  projectServices: { en: 'Services', hi: 'सेवाएं' },
  projectEducation: { en: 'Education', hi: 'शिक्षा' },
  projectOther: { en: 'Other', hi: 'अन्य' },
  eduNotFormal: { en: 'Not formally educated', hi: 'औपचारिक शिक्षित नहीं' },
  eduSchool: { en: 'School (up to 12th)', hi: 'स्कूल (12वीं तक)' },
  eduCollege: { en: 'College / Graduate', hi: 'कॉलेज / स्नातक' },
  recompute: { en: 'Get my recommendations', hi: 'मेरी सिफारिशें पाएं' },
  recommendEmpty: { en: 'No schemes matched. Check your income (≤ ₹5L) and project cost (≤ ₹50L).', hi: 'कोई योजना मेल नहीं खाई। अपनी आय (≤ ₹5 लाख) और परियोजना लागत (≤ ₹50 लाख) जांचें।' },
  schemeTypeNational: { en: 'National (NSFDC)', hi: 'राष्ट्रीय (NSFDC)' },
  schemeTypeState: { en: 'State Scheme', hi: 'राज्य योजना' },
  rate: { en: 'Interest', hi: 'ब्याज' },
  maxLoan: { en: 'Max loan', hi: 'अधिकतम ऋण' },
  monthlyEMI: { en: 'Monthly EMI', hi: 'मासिक EMI' },
  quarterlyEMI: { en: 'Quarterly EMI', hi: 'त्रैमासिक EMI' },
  coverage: { en: 'covered of project cost', hi: 'परियोजना लागत का कवरेज' },
  tenureYears: { en: 'Tenure', hi: 'अवधि' },
  moratorium: { en: 'Moratorium', hi: 'मोरेटोरियम' },
  score: { en: 'Match score', hi: 'मिलान स्कोर' },
  recommendationMatches: { en: 'of {n} schemes matched', hi: '{n} में से योजनाएं मेल खाईं' },
  tryCalc: { en: 'Calculate this EMI', hi: 'इस EMI की गणना करें' },

  calcTitle: { en: 'Financial Calculator', hi: 'वित्तीय कैलकुलेटर' },
  calcDesc: { en: 'Quarterly repayments with moratorium — the way NSFDC loans actually work.', hi: 'मोरेटोरियम के साथ त्रैमासिक पुनर्भुगतान — जैसे NSFDC ऋण वास्तव में काम करते हैं।' },
  fieldAmount: { en: 'Loan Amount (₹)', hi: 'ऋण राशि (₹)' },
  fieldRate: { en: 'Interest Rate (%)', hi: 'ब्याज दर (%)' },
  fieldTenure: { en: 'Tenure (years)', hi: 'अवधि (वर्ष)' },
  fieldMoratorium: { en: 'Moratorium (months)', hi: 'मोरेटोरियम (महीने)' },
  presets: { en: 'Scheme presets', hi: 'योजना प्रीलोड' },
  calcBtn: { en: 'Calculate', hi: 'गणना करें' },
  principal: { en: 'Inflated principal', hi: 'बढ़ी हुई मूल राशि' },
  totalInterest: { en: 'Total interest', hi: 'कुल ब्याज' },
  quarterlyInstallment: { en: 'Quarterly installment', hi: 'त्रैमासिक किस्त' },
  amortization: { en: 'Quarterly amortization schedule', hi: 'त्रैमासिक परिशोधन अनुसूची' },
  quarterCol: { en: 'Qtr', hi: 'तिमाही' },
  paymentCol: { en: 'Payment', hi: 'भुगतान' },
  principalCol: { en: 'Principal', hi: 'मूलधन' },
  interestCol: { en: 'Interest', hi: 'ब्याज' },
  balanceCol: { en: 'Balance', hi: 'शेष' },
  savingsNote: { en: 'During moratorium, simple interest accrues and gets added to the principal before repayment starts.', hi: 'मोरेटोरियम के दौरान साधारण ब्याज जमा होता है और पुनर्भुगतान शुरू होने से पहले मूलधन में जुड़ जाता है।' },

  locatorTitle: { en: 'Partner Locator & Router', hi: 'पार्टनर लोकेटर और राउटर' },
  locatorDesc: { en: 'Nearest eligible channel partner for your loan — filtered by fund utilization and NPA health.', hi: 'आपके ऋण के लिए निकटतम पात्र चैनल पार्टनर — कोष उपयोग और NPA स्वास्थ्य के अनुसार।' },
  useMyLocation: { en: 'Use my location', hi: 'मेरा स्थान उपयोग करें' },
  orEnterCoords: { en: 'or enter coordinates', hi: 'या निर्देशांक दर्ज करें' },
  lat: { en: 'Latitude', hi: 'अक्षांश' },
  lng: { en: 'Longitude', hi: 'देशांतर' },
  radiusKm: { en: 'Radius (km)', hi: 'त्रिज्या (किमी)' },
  partnerType: { en: 'Partner type', hi: 'पार्टनर प्रकार' },
  anyType: { en: 'Any type', hi: 'कोई भी प्रकार' },
  healthyOnly: { en: 'Only healthy partners (no CRITICAL NPA)', hi: 'केवल स्वस्थ पार्टनर (कोई CRITICAL NPA नहीं)' },
  search: { en: 'Search', hi: 'खोजें' },
  partnersFound: { en: '{n} partner(s) found', hi: '{n} पार्टनर मिले' },
  distanceKm: { en: 'Distance', hi: 'दूरी' },
  healthScore: { en: 'Health', hi: 'स्वास्थ्य' },
  gnpa: { en: 'GNPA', hi: 'GNPA' },
  eligible: { en: 'Eligible', hi: 'पात्र' },
  notEligible: { en: 'Not eligible', hi: 'पात्र नहीं' },
  fundStatusTitle: { en: 'State fund utilization', hi: 'राज्य कोष उपयोग' },
  noPartners: { en: 'No partners found in this area. Try a larger radius.', hi: 'इस क्षेत्र में कोई पार्टनर नहीं मिला। बड़ी त्रिज्या आज़माएं।' },
  locating: { en: 'Locating you…', hi: 'आपका स्थान खोजा जा रहा है…' },
  locationError: { en: 'Could not get location. Enter coordinates instead.', hi: 'स्थान नहीं मिल सका। निर्देशांक दर्ज करें।' },
  legendLow: { en: 'LOW risk — shown first', hi: 'LOW जोखिम — पहले दिखाया गया' },
  legendMed: { en: 'MEDIUM risk — flagged', hi: 'MEDIUM जोखिम — चिह्नित' },
  legendHigh: { en: 'HIGH risk — restricted', hi: 'HIGH जोखिम — प्रतिबंधित' },
  legendCrit: { en: 'CRITICAL — hidden / blocked', hi: 'CRITICAL — छिपा / ब्लॉक' },
  youAreHere: { en: 'You are here', hi: 'आप यहां हैं' },

  schemesTitle: { en: 'All Schemes', hi: 'सभी योजनाएं' },
  schemesDesc: { en: 'Every national and state scheme in the platform — rates, limits and tenure.', hi: 'प्लेटफ़ॉर्म की सभी राष्ट्रीय और राज्य योजनाएं — दरें, सीमाएं और अवधि।' },
  nationalTab: { en: 'National', hi: 'राष्ट्रीय' },
  stateTab: { en: 'State schemes', hi: 'राज्य योजनाएं' },
  incomeCap: { en: 'Income cap', hi: 'आय सीमा' },
  loading: { en: 'Loading…', hi: 'लोड हो रहा है…' },
  error: { en: 'Something went wrong. Is the backend running on port 3001?', hi: 'कुछ गलत हो गया। क्या बैकएंड 3001 पोर्ट पर चल रहा है?' },
  rulesEngine: { en: 'Rules engine: caste must be SC, family income ≤ ₹5L, project cost ≤ ₹50L. Micro Finance (≤ ₹1.4L @ 6.5%), Term Loan (₹1.4L–₹50L @ 8–9%), Aajeevika (≤ ₹1.4L @ 15%), Udyam Nidhi (≤ ₹5L @ 13–15%), Educational Loan (6.5%).', hi: 'नियम इंजन: जाति SC होना चाहिए, पारिवारिक आय ≤ ₹5 लाख, परियोजना लागत ≤ ₹50 लाख। माइक्रो फाइनेंस (≤ ₹1.4 लाख @ 6.5%), टर्म लोन (₹1.4 लाख–₹50 लाख @ 8–9%), आजीविका (≤ ₹1.4 लाख @ 15%), उद्यम निधि (≤ ₹5 लाख @ 13–15%), शैक्षिक ऋण (6.5%)।' },
  exampleHint: { en: 'Example: a ₹1,00,000 shop project in Tamil Nadu with an annual family income of ₹2,00,000.', hi: 'उदाहरण: तमिलनाडु में ₹1,00,000 की दुकान परियोजना और ₹2,00,000 की वार्षिक पारिवारिक आय।' },
  whyMatters: { en: 'Why this matters', hi: 'यह क्यों महत्वपूर्ण है' },
  whyMattersBody: { en: 'Loan applications under the Channel Finance System only go through authorised Channel Partners (SCA / PSB / RRB / NBFC-MFI). Most applicants do not know whether they qualify for a Micro Finance Scheme (≤ ₹1.4L), a Term Loan (≤ ₹50L) or the Educational Loan Scheme — and where the nearest healthy partner is. This platform closes that gap.', hi: 'चैनल वित्त प्रणाली के तहत ऋण आवेदन केवल अधिकृत चैनल पार्टनर्स (SCA / PSB / RRB / NBFC-MFI) के माध्यम से जाते हैं। अधिकांश आवेदकों को नहीं पता कि वे माइक्रो फाइनेंस योजना (≤ ₹1.4 लाख), टर्म लोन (≤ ₹50 लाख) या शैक्षिक ऋण योजना के लिए पात्र हैं या नहीं — और निकटतम स्वस्थ पार्टनर कहां है। यह मंच यह अंतर समाप्त करता है।' },
  build: { en: 'Build for Bharat by Bhasha · SIH 26092', hi: 'भाषा द्वारा भारत के लिए बनाया गया · SIH 26092' },
});

type StringKey = keyof typeof STRINGS;

function isStaticLang(code: LangCode): boolean {
  return code === 'en' || code === 'hi';
}

interface I18nCtx {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
  tx: (text: string) => Promise<string>;
  isStatic: (code?: LangCode) => boolean;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<LangCode>(() => {
    const saved = (localStorage.getItem('ps92.lang') as LangCode) || 'en';
    return LANGUAGES.some((l) => l.code === saved) ? saved : 'en';
  });
  // Dynamic overlay for regional (non EN/HI) languages — translated on demand via MyMemory API.
  const [overlay, setOverlay] = useState<Partial<Record<StringKey, string>>>({});

  useEffect(() => {
    localStorage.setItem('ps92.lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  // When switching to a regional language, translate the static UI strings once.
  useEffect(() => {
    setOverlay({});
    if (isStaticLang(lang)) return;
    let cancelled = false;

    async function translateAll() {
      const keys = Object.keys(STRINGS) as StringKey[];
      const next: Partial<Record<StringKey, string>> = {};
      // Sequential (MyMemory is rate-limited) — small batches, generous pauses.
      for (let i = 0; i < keys.length; i += 5) {
        if (cancelled) return;
        const batch = keys.slice(i, i + 5);
        await Promise.all(
          batch.map(async (k) => {
            try {
              const res = await api.translate({ text: STRINGS[k].en, sourceLang: 'en', targetLang: lang });
              if (res.translatedText && !res.error) next[k] = res.translatedText;
            } catch { /* keep fallback */ }
          }),
        );
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 350));
      }
      if (!cancelled) setOverlay(next);
    }
    void translateAll();
    return () => { cancelled = true; };
  }, [lang]);

  const t = useCallback(
    (key: StringKey, vars?: Record<string, string | number>) => {
      const entry = STRINGS[key] as Record<string, string>;
      let s = isStaticLang(lang) ? (entry[lang] ?? entry.hi ?? entry.en) : (overlay[key] ?? entry.hi ?? entry.en);
      if (vars) {
        for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
      }
      return s;
    },
    [lang, overlay],
  );

  const tx = useCallback(
    async (text: string) => {
      if (!text || lang === 'en') return text;
      const res = await api.translate({ text, sourceLang: 'en', targetLang: lang });
      return res.translatedText ?? text;
    },
    [lang],
  );

  const value = useMemo<I18nCtx>(
    () => ({ lang, setLang, t, tx, isStatic: (c?: LangCode) => isStaticLang(c ?? lang) }),
    [lang, t, tx],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

