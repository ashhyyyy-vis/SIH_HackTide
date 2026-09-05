import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { api } from '../api';
import type { SchemesResponse } from '../types';
import { inr, pct, years } from '../format';

export function Schemes() {
  const { t } = useI18n();
  const [data, setData] = useState<SchemesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'national' | 'state'>('national');

  useEffect(() => {
    api.schemes()
      .then(setData)
      .catch(() => setError(t('error')));
  }, [t]);

  return (
    <>
      <div className="page-head">
        <h1>{t('schemesTitle')}</h1>
        <p>{t('schemesDesc')}</p>
      </div>

      {error && <div className="error-box">{error}</div>}
      {!data && !error && <div className="card muted">{t('loading')}</div>}

      {data && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button className={'btn btn-sm ' + (tab === 'national' ? 'btn-primary' : 'btn-ghost')} onClick={() => setTab('national')}>
              {t('nationalTab')} ({data.national.length})
            </button>
            <button className={'btn btn-sm ' + (tab === 'state' ? 'btn-primary' : 'btn-ghost')} onClick={() => setTab('state')}>
              {t('stateTab')} ({data.state.length})
            </button>
          </div>

          {tab === 'national' && data.national.map((s) => (
            <div key={s.code} className="reco">
              <div className="top">
                <div>
                  <h3>{s.name}</h3>
                  <span className="tag national">{s.type}</span> <span className="tag low">#{s.code}</span>
                </div>
              </div>
              <div className="metrics">
                <div className="metric"><b>{pct(s.rate)}</b><span>{t('rate')}</span></div>
                <div className="metric"><b>{inr(s.maxAmount)}</b><span>{t('maxLoan')}</span></div>
                <div className="metric"><b>{years(s.tenureYears)}</b><span>{t('tenureYears')}</span></div>
              </div>
            </div>
          ))}

          {tab === 'state' && data.state.map((s) => (
            <div key={s.code} className="reco">
              <div className="top">
                <div>
                  <h3>{s.name}</h3>
                  <span className="tag state">{s.state}</span> <span className="tag low">#{s.code}</span>
                </div>
              </div>
              <div className="metrics">
                <div className="metric"><b>{s.rate == null ? '—' : pct(s.rate)}</b><span>{t('rate')}</span></div>
                <div className="metric"><b>{s.maxAmount == null ? '—' : inr(s.maxAmount)}</b><span>{t('maxLoan')}</span></div>
                <div className="metric">
                  <b>{s.incomeLimit == null ? '∞' : inr(s.incomeLimit)}</b>
                  <span>{t('incomeCap')}</span>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </>
  );
}