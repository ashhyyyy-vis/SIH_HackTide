import { useState, type ReactNode } from 'react';
import { useI18n, LANGUAGES } from './i18n';
import { Home } from './pages/Home';
import { Recommender } from './pages/Recommender';
import { Calculator } from './pages/Calculator';
import { Locator } from './pages/Locator';
import { Schemes } from './pages/Schemes';
import { Chat } from './pages/Chat';
import { VoiceButton } from './components/VoiceButton';

export type Page = 'home' | 'chat' | 'recommend' | 'calculator' | 'locator' | 'schemes';

function Header({ page, setPage, onVoice }: { page: Page; setPage: (p: Page) => void; onVoice: (text: string) => void }) {
  const { t, lang, setLang } = useI18n();
  const [langOpen, setLangOpen] = useState(false);

  const tabs: { id: Page; label: string }[] = [
    { id: 'chat', label: 'Ask AI' },
    { id: 'recommend', label: t('navRecommender') },
    { id: 'calculator', label: t('navCalculator') },
    { id: 'locator', label: t('navLocator') },
    { id: 'schemes', label: t('navSchemes') },
  ];

  return (
    <header className="top">
      <div className="bar">
        <a className="brand" href="#" onClick={(e) => { e.preventDefault(); setPage('home'); }}>
          <span className="logo">स</span>
          <span>
            {t('appName')}
            <small>{t('tagline')}</small>
          </span>
        </a>
        <VoiceButton onTranscript={onVoice} />
        <button className="lang-btn" onClick={() => setLangOpen((v) => !v)}>
          {LANGUAGES.find((l) => l.code === lang)?.native ?? lang} ▾
        </button>
        <nav className="tabs">
          {tabs.map((tb) => (
            <button key={tb.id} className={page === tb.id ? 'active' : ''} onClick={() => setPage(tb.id)}>
              {tb.label}
            </button>
          ))}
        </nav>
        {langOpen && (
          <div className="lang-pop">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                className={l.code === lang ? 'active' : ''}
                onClick={() => { setLang(l.code); setLangOpen(false); }}
              >
                <b>{l.native}</b>
                {l.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

function Layout({ page, setPage, voiceQuery, onVoice }: {
  page: Page;
  setPage: (p: Page) => void;
  voiceQuery: string | null;
  onVoice: (text: string) => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <Header page={page} setPage={setPage} onVoice={onVoice} />
      <main>
        {page === 'home' && <Home go={setPage} />}
        {page === 'chat' && <Chat />}
        {page === 'recommend' && <Recommender go={setPage} voiceQuery={voiceQuery} />}
        {page === 'calculator' && <Calculator go={setPage} />}
        {page === 'locator' && <Locator />}
        {page === 'schemes' && <Schemes />}
      </main>
      <footer>AI-Driven Scheme Matching for Marginalized Entrepreneurs · PS92 (SIH26092) · {t('build')}</footer>
      {page !== 'chat' && (
        <button className="fab" onClick={() => setPage('chat')} title="Ask the AI assistant">
          🗨️ <span>Ask AI</span>
        </button>
      )}
    </>
  );
}

export default function App(): ReactNode {
  const [page, setPage] = useState<Page>('home');
  const [voiceQuery, setVoiceQuery] = useState<string | null>(null);

  function onVoice(text: string) {
    setVoiceQuery(text);
    setPage('recommend');
  }

  return <Layout page={page} setPage={setPage} voiceQuery={voiceQuery} onVoice={onVoice} />;
}