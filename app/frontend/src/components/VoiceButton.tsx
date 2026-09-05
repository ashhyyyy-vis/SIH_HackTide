import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: (e: SpeechRecognitionEventLike) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
  stop: () => void;
}

type SpeechCtor = new () => SpeechRecognitionLike;

function getRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

const VOICE_HINT = {
  en: 'Try saying: shop loan in Tamil Nadu with 2 lakh income',
  hi: 'Try saying: तमिलनाडु में दो लाख आय पर दुकान ऋण',
};

export function VoiceButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const { t, lang } = useI18n();
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [blob, setBlob] = useState<string | null>(null);
  const rec = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const r = getRecognition();
    if (r) {
      r.continuous = false;
      r.interimResults = false;
      r.onresult = (e) => {
        const transcript = e.results[0]?.[0]?.transcript ?? '';
        setBlob(transcript);
        setListening(false);
        onTranscript(transcript);
      };
      r.onend = () => setListening(false);
      r.onerror = () => setListening(false);
      rec.current = r;
    } else {
      setSupported(false);
    }
  }, [onTranscript]);

  useEffect(() => {
    if (rec.current && supported) rec.current.lang = lang === 'en' ? 'en-IN' : lang;
  }, [lang, supported]);

  function toggle() {
    const r = rec.current;
    if (!r) return;
    if (listening) {
      r.stop();
      setListening(false);
    } else {
      r.lang = lang === 'en' ? 'en-IN' : lang;
      try {
        r.start();
        setListening(true);
      } catch {
        setListening(false);
      }
    }
  }

  if (!supported) return null;

  return (
    <>
      <button
        className={'voice-btn' + (listening ? ' listening' : '')}
        onClick={toggle}
        title={t('listenHint')}
        aria-label={t('listen')}
      >
        🎤
      </button>
      {listening && (
        <div style={{ position: 'fixed', bottom: 18, left: '50%', transform: 'translateX(-50%)', zIndex: 70 }}>
          <div className="card" style={{ padding: '10px 18px', background: '#fff' }}>
            🎤 <b>{t('listen')}…</b> <span className="muted">{lang === 'en' ? VOICE_HINT.en : VOICE_HINT.hi}</span>
          </div>
        </div>
      )}
      {blob && !listening && (
        <div style={{ position: 'fixed', bottom: 18, left: '50%', transform: 'translateX(-50%)', zIndex: 70, maxWidth: '92vw' }}>
          <div className="card" style={{ padding: '10px 18px', background: '#fff' }}>
            <b>“{blob}”</b>
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 10 }} onClick={() => setBlob(null)}>✕</button>
          </div>
        </div>
      )}
    </>
  );
}