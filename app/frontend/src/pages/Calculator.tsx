import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { api } from '../api';
import type { EmiResponse } from '../types';
import { inr, fmtNumber } from '../format';
import type { Page } from '../App';

const PRESETS = [
  { name: 'Micro Finance (MCF)', amount: 125000, rate: 6.5, tenureYears: 3, moratoriumMonths: 3 },
  { name: 'Micro Finance (MSY)', amount: 125000, rate: 6, tenureYears: 3, moratoriumMonths: 3 },
  { name: 'Term Loan (Suvidha)', amount: 900000, rate: 8, tenureYears: 5, moratoriumMonths: 6 },
  { name: 'Term Loan (Utkarsh)', amount: 4500000, rate: 9, tenureYears: 7, moratoriumMonths: 6 },
  { name: 'Aajeevika MFY', amount: 125000, rate: 15, tenureYears: 3, moratoriumMonths: 3 },
  { name: 'Educational Loan', amount: 1000000, rate: 6.5, tenureYears: 10, moratoriumMonths: 12 },
];

export function Calculator({ go }: { go: (p: Page) => void }) {
  const { t } = useI18n();
  const [amount, setAmount] = useState('125000');
  const [rate, setRate] = useState('6.5');
  const [tenure, setTenure] = useState('3');
  const [moratorium, setMoratorium] = useState('3');
  const [result, setResult] = useState<EmiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [presetIdx, setPresetIdx] = useState(-1);

  useEffect(() => {
    void calculate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function calculate() {
    setError(null);
    try {
      const res = await api.emi({
        amount: Number(amount) || 0,
        rate: Number(rate) || 0,
        tenureYears: Number(tenure) || 0,
        moratoriumMonths: Number(moratorium) || 0,
      });
      setResult(res);
    } catch {
      setError(t('error'));
    }
  }

  function applyPreset(i: number) {
    const p = PRESETS[i];
    setPresetIdx(i);
    setAmount(String(p.amount));
    setRate(String(p.rate));
    setTenure(String(p.tenureYears));
    setMoratorium(String(p.moratoriumMonths));
  }

  return (
    <>
      <div className="page-head">
        <h1>{t('calcTitle')}</h1>
        <p>{t('calcDesc')}</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="muted" style={{ marginBottom: 10 }}>{t('presets')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {PRESETS.map((p, i) => (
              <button
                key={p.name}
                className={'btn btn-sm ' + (presetIdx === i ? 'btn-primary' : 'btn-ghost')}
                onClick={() => applyPreset(i)}
              >
                {p.name}
              </button>
            ))}
          </div>

          <label className="field">
            <span>{t('fieldAmount')}</span>
            <input type="number" min={0} value={amount} onChange={(e) => { setAmount(e.target.value); setPresetIdx(-1); }} />
          </label>
          <label className="field">
            <span>{t('fieldRate')}</span>
            <input type="number" min={0} step={0.1} value={rate} onChange={(e) => { setRate(e.target.value); setPresetIdx(-1); }} />
          </label>
          <div className="grid-2">
            <label className="field">
              <span>{t('fieldTenure')}</span>
              <input type="number" min={0} value={tenure} onChange={(e) => { setTenure(e.target.value); setPresetIdx(-1); }} />
            </label>
            <label className="field">
              <span>{t('fieldMoratorium')}</span>
              <input type="number" min={0} value={moratorium} onChange={(e) => { setMoratorium(e.target.value); setPresetIdx(-1); }} />
            </label>
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => void calculate()}>
            {t('calcBtn')}
          </button>
          <div className="info-note">{t('savingsNote')}</div>
        </div>

        <div>
          {error && <div className="error-box">{error}</div>}
          {result && (
            <div className="card">
              <div className="grid-3">
                <div className="metric">
                  <b>{inr(result.principal)}</b>
                  <span>{t('principal')}</span>
                </div>
                <div className="metric">
                  <b>{inr(result.quarterlyInstallment)}</b>
                  <span>{t('quarterlyInstallment')}</span>
                </div>
                <div className="metric">
                  <b>{inr(result.totalInterest)}</b>
                  <span>{t('totalInterest')}</span>
                </div>
              </div>

              <div className="muted mt">{t('amortization')}</div>
              <div className="chart">
                {result.schedule.map((s) => (
                  <div key={s.quarter} style={{ height: `${Math.max(3, (s.balance / result.principal) * 100)}%` }} title={`Q${s.quarter}: ${fmtNumber(s.balance)}`} />
                ))}
              </div>

              <div className="table-wrap mt">
                <table className="sched">
                  <thead>
                    <tr>
                      <th>{t('quarterCol')}</th>
                      <th>{t('paymentCol')}</th>
                      <th>{t('principalCol')}</th>
                      <th>{t('interestCol')}</th>
                      <th>{t('balanceCol')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.schedule.map((s) => (
                      <tr key={s.quarter}>
                        <td>Q{s.quarter}</td>
                        <td>{fmtNumber(s.payment)}</td>
                        <td>{fmtNumber(s.principal)}</td>
                        <td>{fmtNumber(s.interest)}</td>
                        <td>{fmtNumber(s.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button className="btn btn-secondary mt" style={{ width: '100%' }} onClick={() => go('locator')}>
                {t('ctaLocate')}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}