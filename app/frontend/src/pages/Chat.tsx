import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '../i18n';
import { agentQuery } from '../api';
import { inr, pct, years } from '../format';

interface Msg {
  id: number;
  from: 'user' | 'bot';
  text?: string;
  agent?: {
    goal: string;
    state: string | null;
    parsedIncome: number;
    parsedCost: number;
    agentSteps?: number;
    results: Array<{ tool: string; result: any }>;
  };
}

const START_MSG_EN = 'Namaste! I am Saksham — your AI assistant for NSFDC schemes. Tell me about your project and income (or tap 🎤 and speak), and I will find your best loan, EMI, and the nearest healthy partner.';
const START_MSG_HI = 'नमस्ते! मैं सक्षम हूं — NSFDC योजनाओं के लिए आपका AI सहायक। अपनी परियोजना और आय बताएं (या 🎤 दबाकर बोलें), और मैं आपकी सर्वोत्तम योजना, EMI और निकटतम स्वस्थ पार्टनर ढूंढूंगा।';

const SUGGESTIONS: Array<{ en: string; hi: string }> = [
  { en: 'I want a ₹1.5 lakh dairy farm loan in Uttar Pradesh, income ₹2 lakh', hi: 'मुझे उत्तर प्रदेश में ₹1.5 लाख का डेयरी फार्म ऋण चाहिए, आय ₹2 लाख' },
  { en: 'Educational loan of ₹8 lakh in Tamil Nadu, income ₹3 lakh', hi: 'तमिलनाडु में ₹8 लाख का शैक्षिक ऋण, आय ₹3 लाख' },
  { en: 'A ₹50,000 shop loan in Maharashtra with ₹1.5 lakh income', hi: 'महाराष्ट्र में ₹50,000 का दुकान ऋण, आय ₹1.5 लाख' },
  { en: 'Manufacturing project ₹25 lakh in Karnataka, income ₹4 lakh', hi: 'कर्नाटक में ₹25 लाख की विनिर्माण परियोजना, आय ₹4 लाख' },
];

let msgId = 0;
const nextId = () => ++msgId;

function toolView(tool: string, result: any): ReactNode {
  if (tool === 'recommend') {
    const recs: Array<{ name: string; type: string; state?: string; rate: number; monthlyEMI: number; coverage: number; score: number; tenureYears: number; maxLoan: number }> = result?.recommendations ?? [];
    if (recs.length === 0) {
      return <p className="muted">No schemes matched. Check income (≤ ₹5L) and project cost (≤ ₹50L).</p>;
    }
    return (
      <div>
        {recs.slice(0, 4).map((r, i) => (
          <div key={i} className="chat-card">
            <div className="cc-top">
              <b>{i + 1}. {r.name}</b>
              <span className={'tag ' + r.type}>{r.type === 'state' ? (r.state ?? 'State') : 'National'}</span>
            </div>
            <div className="cc-metrics">
              <span><b>{pct(r.rate)}</b> rate</span>
              <span><b>{inr(r.monthlyEMI)}/mo</b> EMI</span>
              <span><b>{r.coverage}%</b> funded</span>
              <span><b>{years(r.tenureYears)}</b> tenure</span>
              <span><b>₹{inr(r.maxLoan)}</b> max loan</span>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (tool === 'nearestPartners') {
    const branches = result?.branches ?? [];
    if (branches.length === 0) return <p className="muted">No healthy partners nearby. Try a larger radius.</p>;
    return (
      <div>
        {branches.slice(0, 5).map((b: any, i: number) => (
          <div key={i} className="chat-card">
            <div className="cc-top">
              <b>{b.partnerName} — {b.branchName}</b>
            </div>
            <div className="cc-metrics">
              <span><b>{b.distance_km} km</b> away</span>
              <span><b>{b.health_score ?? '—'}</b> health</span>
              <span><span className={'tag ' + (b.npa_status ?? 'low').toLowerCase()}>{b.npa_status ?? 'LOW'}</span></span>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (tool === 'fundAvailability') {
    const u = result?.utilization;
    return (
      <p className="chat-text-meta">
        💰 <b>{result?.state}</b>: {result?.label ?? result?.status}
        {u != null && <> · {Math.round(u * 100)}% utilized</>}
      </p>
    );
  }
  if (tool === 'stateSchemeAvailability') {
    const list = result?.schemes ?? [];
    if (list.length === 0) return <p className="muted">No state-specific schemes for this state (national schemes still apply).</p>;
    return <p className="chat-text-meta">🏛️ {list.map((s: any) => s.name).slice(0, 6).join(', ')}</p>;
  }
  if (tool === 'state') {
    return null;
  }
  return null;
}

export function Chat() {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setMessages([{ id: nextId(), from: 'bot', text: lang === 'hi' ? START_MSG_HI : START_MSG_EN }]);
  }, [lang]);

  useEffect(() => {
    const w = window as any;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (Ctor) {
      const r = new Ctor();
      r.continuous = false;
      r.interimResults = false;
      r.onresult = (e: any) => {
        const transcript = e.results[0]?.[0]?.transcript ?? '';
        setInput(transcript);
        setListening(false);
        if (transcript.trim()) void send(transcript);
      };
      r.onend = () => setListening(false);
      r.onerror = () => setListening(false);
      recRef.current = r;
    }
  }, []);

  useEffect(() => {
    if (recRef.current) recRef.current.lang = lang === 'en' ? 'en-IN' : lang;
  }, [lang]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  async function send(text: string) {
    const goal = text.trim();
    if (!goal || busy) return;
    const userMsg: Msg = { id: nextId(), from: 'user', text: goal };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setBusy(true);
    try {
      const agent = await agentQuery(goal);
      setMessages((m) => [...m, { id: nextId(), from: 'bot', agent }]);
    } catch {
      setMessages((m) => [...m, { id: nextId(), from: 'bot', text: t('error') }]);
    } finally {
      setBusy(false);
    }
  }

  function toggleListen() {
    const r = recRef.current;
    if (!r) return;
    if (listening) { r.stop(); setListening(false); }
    else {
      r.lang = lang === 'en' ? 'en-IN' : lang;
      try { r.start(); setListening(true); } catch { setListening(false); }
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  return (
    <div className="chat-page">
      <div className="page-head">
        <h1>💬 {lang === 'hi' ? 'AI सहायक' : 'AI Assistant'}</h1>
        <p>{lang === 'hi' ? 'अपनी परियोजना और आय बताएं — बोलें या लिखें। मैं योजना, EMI और निकटतम पार्टनर बताऊंगा।' : 'Describe your project and income — type or speak. I will find your scheme, EMI and the nearest healthy partner.'}</p>
      </div>

      <div className="chat" ref={scrollRef}>
        {messages.map((m) => (
          <div key={m.id} className={'msg ' + (m.from === 'user' ? 'user' : 'bot')}>
            {m.from === 'bot' && <span className="avatar">स</span>}
            <div className="bubble">
              {m.text && <p>{m.text}</p>}
              {m.agent && (
                <div>
                  <p className="muted" style={{ marginBottom: 6 }}>
                    I understood: {m.agent.state ?? 'State?'} · income ₹{m.agent.parsedIncome.toLocaleString('en-IN')} · cost ₹{m.agent.parsedCost.toLocaleString('en-IN')} ({m.agent.agentSteps} tools)
                  </p>
                  {m.agent.results.map((r, i) => (
                    <div key={i}>{toolView(r.tool, r.result)}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="msg bot">
            <span className="avatar">स</span>
            <div className="bubble typing"><i /><i /><i /></div>
          </div>
        )}
      </div>

      <div className="chips">
        {SUGGESTIONS.map((s, i) => (
          <button key={i} className="chip" onClick={() => void send(lang === 'hi' ? s.hi : s.en)}>
            {lang === 'hi' ? s.hi : s.en}
          </button>
        ))}
      </div>

      <div className="chat-input">
        <button className={'voice-btn' + (listening ? ' listening' : '')} onClick={toggleListen} title={t('listenHint')}>
          🎤
        </button>
        <textarea
          rows={1}
          value={input}
          placeholder={t('listen') + ' / ' + t('navRecommender') + '…'}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
        />
        <button
          className="btn btn-primary"
          style={{ padding: '10px 16px' }}
          onClick={() => void send(input)}
          disabled={busy || !input.trim()}
        >
          ➤
        </button>
      </div>
    </div>
  );
}