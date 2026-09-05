import { useI18n } from '../i18n';
import type { Page } from '../App';

export function Home({ go }: { go: (p: Page) => void }) {
  const { t, lang } = useI18n();

  const features = [
    {
      id: 'recommend' as Page,
      icon: '🎯',
      title: t('card1Title'),
      desc: t('card1Desc'),
      cta: t('ctaStart'),
      color: '#1e88e5',
    },
    {
      id: 'calculator' as Page,
      icon: '📊',
      title: t('card2Title'),
      desc: t('card2Desc'),
      cta: t('ctaPrice'),
      color: '#059669',
    },
    {
      id: 'locator' as Page,
      icon: '🗺️',
      title: t('card3Title'),
      desc: t('card3Desc'),
      cta: t('ctaLocate'),
      color: '#f97316',
    },
  ];

  return (
    <>
      <section className="hero">
        <h1>{t('homeTitle')}</h1>
        <p>{t('homeSubtitle')}</p>
        <div className="cta-row">
          <button className="btn btn-primary" onClick={() => go('chat')}>💬 {lang === 'hi' ? 'AI से पूछें' : 'Ask the AI assistant'}</button>
          <button className="btn btn-secondary" onClick={() => go('recommend')}>{t('ctaStart')}</button>
          <button className="btn btn-ghost" onClick={() => go('calculator')}>{t('ctaPrice')}</button>
        </div>
      </section>

      <div className="grid-3">
        {features.map((f) => (
          <a key={f.id} className="card feature" href="#" onClick={(e) => { e.preventDefault(); go(f.id); }}>
            <span className="icon" style={{ background: f.color + '1a', color: f.color }}>{f.icon}</span>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
            <div className="mt">
              <span className="btn btn-sm btn-secondary">{f.cta} →</span>
            </div>
          </a>
        ))}
      </div>

      <div className="info-note" style={{ marginTop: 20 }}>
        <b>{t('whyMatters')}:</b> {t('whyMattersBody')}
      </div>
    </>
  );
}