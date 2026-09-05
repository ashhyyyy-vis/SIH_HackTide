import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { api } from '../api';
import { RESP_STATES, type Recommendation, type RecommendResponse } from '../types';
import { inr, pct, years } from '../format';
import type { Page } from '../App';

function parseLakhs(s: string | null): number | null {
  if (!s) return null;
  const lakh = s.match(/(\d+(?:\.\d+)?)\s*lakh/i);
  if (lakh) return Math.round(Number(lakh[1]) * 100000);
  const k = s.match(/(\d+(?:\.\d+)?)\s*(?:thousand|hundred\s*thousand|k\b)/i);
  if (k) return Math.round(Number(k[1]) * 1000);
  const plain = s.match(/(?:^|\s)(\d{4,7})(?:\s|$)/);
  if (plain) return Number(plain[1]);
  return null;
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

export function Recommender({ go, voiceQuery }: { go: (p: Page) => void; voiceQuery: string | null }) {
  const { t } = useI18n();
  const [state, setState] = useState('Tamil Nadu');
  const [projectType, setProjectType] = useState('shop');
  const [cost, setCost] = useState('100000');
  const [income, setIncome] = useState('200000');
  const [education, setEducation] = useState('college');
  const [caste, setCaste] = useState('Chamar');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecommendResponse | null>(null);

  // Voice / natural-language query → prefill form and auto-search atomically
  useEffect(() => {
    if (!voiceQuery) return;
    const q = normalize(voiceQuery);
    const parsed: { state?: string; cost?: number; income?: number; type?: string } = {};

    const matchedState = RESP_STATES.find((s) => q.includes(normalize(s)));
    if (matchedState) parsed.state = matchedState;
    if (/(education|degree|study|course|college|school)/.test(q)) parsed.type = 'education';
    else if (/(farm|agriculture|crop|animal|dairy)/.test(q)) parsed.type = 'agriculture';
    else if (/(factory|manufactur|production)/.test(q)) parsed.type = 'manufacturing';
    else if (/(service|repair|transport|trading)/.test(q)) parsed.type = 'services';
    else if (/(shop|store|retail|business)/.test(q)) parsed.type = 'shop';

    const inc = parseLakhs(matchValue(q, /\bincome(?:\s+of|\s*)?[: ]*(.+?)(?:,|\.|$)/));
    const cst = parseLakhs(matchValue(q, /\bcost(?:\s+of|\s*)?[: ]*(.+?)(?:,|\.|$)/));
    if (inc != null) parsed.income = inc;
    if (cst != null) parsed.cost = cst;

    if (parsed.state) setState(parsed.state);
    if (parsed.type) setProjectType(parsed.type);
    if (parsed.income != null) setIncome(String(parsed.income));
    if (parsed.cost != null) setCost(String(parsed.cost));

    void run({
      state: parsed.state ?? state,
      projectType: parsed.type ?? projectType,
      projectCost: parsed.cost ?? Number(cost),
      annualIncome: parsed.income ?? Number(income),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceQuery]);

  function matchValue(q: string, re: RegExp): string | null {
    const m = q.match(re);
    if (!m || !m[1] || m[1].length > 80) return null;
    const inner = m[1].replace(/\band\b.*$/i, '').split(/\s+/)[0];
    return inner || null;
  }

  async function run(input?: {
    state?: string;
    projectType?: string;
    projectCost?: number;
    annualIncome?: number;
  }) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.recommend({
        state: input?.state ?? state,
        projectType: input?.projectType ?? projectType,
        projectCost: input?.projectCost ?? Number(cost),
        annualIncome: input?.annualIncome ?? Number(income),
        educationStatus: education,
        caste: caste || undefined,
      });
      setResult(res);
    } catch (e) {
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  }

  const projectTypes = [
    ['shop', t('projectShop')],
    ['agriculture', t('projectAgriculture')],
    ['manufacturing', t('projectManufacturing')],
    ['services', t('projectServices')],
    ['education', t('projectEducation')],
    ['other', t('projectOther')],
  ];

  return (
    <>
      <div className="page-head">
        <h1>{t('recommendTitle')}</h1>
        <p>{t('recommendDesc')}</p>
      </div>

      <div className="grid-2">
        <form
          className="card"
          onSubmit={(e) => { e.preventDefault(); void run(); }}
        >
          <label className="field">
            <span>{t('fieldState')}</span>
            <select value={state} onChange={(e) => setState(e.target.value)}>
              {RESP_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{t('fieldProjectType')}</span>
            <select value={projectType} onChange={(e) => setProjectType(e.target.value)}>
              {projectTypes.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{t('fieldCost')}</span>
            <input type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} />
          </label>

          <label className="field">
            <span>{t('fieldIncome')}</span>
            <input type="number" min={0} value={income} onChange={(e) => setIncome(e.target.value)} />
          </label>

          <label className="field">
            <span>{t('fieldEducation')}</span>
            <select value={education} onChange={(e) => setEducation(e.target.value)}>
              <option value="none">{t('eduNotFormal')}</option>
              <option value="school">{t('eduSchool')}</option>
              <option value="college">{t('eduCollege')}</option>
            </select>
          </label>

          <label className="field">
            <span>{t('fieldCaste')}</span>
            <input type="text" value={caste} onChange={(e) => setCaste(e.target.value)} />
          </label>

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? <><span className="spinner" />&nbsp;</> : null}
            {t('recompute')}
          </button>
        </form>

        <div>
          {error && <div className="error-box">{error}</div>}

          {!result && !error && (
            <div className="card">
              <p className="muted">{t('exampleHint')}</p>
              <p className="muted">{t('rulesEngine')}</p>
            </div>
          )}

          {result && (
            <>
              <div className="muted" style={{ marginBottom: 10 }}>
                {result.recommendations.length > 0
                  ? t('recommendationMatches', { n: result.recommendations.length })
                  : t('recommendEmpty')}
              </div>
              {result.recommendations.map((r, i) => (
                <SchemeCard key={r.code + i} r={r} onCalc={() => go('calculator')} />
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export function SchemeCard({ r, onCalc }: { r: Recommendation; onCalc: () => void }) {
  const { t } = useI18n();
  const isState = r.type === 'state';

  return (
    <div className="reco">
      <div className="top">
        <div>
          <h3>{r.name}</h3>
          <span className={'tag ' + r.type}>{isState ? t('schemeTypeState') : t('schemeTypeNational')}</span>{' '}
          {isState && r.state && <span className="tag state">{r.state}</span>}
          <span className="tag low">#{r.code}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="muted">{t('score')}</div>
          <b style={{ fontSize: 21 }}>{r.score}</b>
        </div>
      </div>

      <div className="metrics">
        <div className="metric">
          <b>{pct(r.rate)}</b>
          <span>{t('rate')}</span>
        </div>
        <div className="metric">
          <b>{inr(r.maxLoan)}</b>
          <span>{t('maxLoan')}</span>
        </div>
        <div className="metric">
          <b>{inr(r.monthlyEMI * 3)}/mo</b>
          <span>{t('quarterlyEMI')}</span>
        </div>
        <div className="metric">
          <b>{r.coverage}%</b>
          <span>{t('coverage')}</span>
        </div>
        <div className="metric">
          <b>{years(r.tenureYears)}</b>
          <span>{t('tenureYears')}</span>
        </div>
        <div className="metric">
          <b>{r.moratoriumMonths} mo</b>
          <span>{t('moratorium')}</span>
        </div>
      </div>

      <div className="mt" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div className="bar"><i style={{ width: `${r.coverage}%` }} /></div>
        </div>
        <button className="btn btn-sm btn-secondary" onClick={onCalc}>{t('tryCalc')}</button>
      </div>
    </div>
  );
}