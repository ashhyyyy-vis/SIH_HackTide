import React, { useState, useRef, useEffect, useCallback } from "react";
import { askAgent } from "../api";
import { t } from "../i18n";

/* ============================================================
   Floating AI chat widget.

   Data flow for one message:
     this file  ->  askAgent() in src/api.js
                ->  POST {VITE_API_BASE_URL}/api/ai/agent   (app/backend)
                ->  server.ts parses the goal, runs its tools
                ->  formatAgentReply() turns the result into text
                ->  rendered below as an assistant bubble

   Text-to-speech uses the browser's Web Speech API only. No audio is
   ever sent to a backend — neither backend exposes a TTS route.

   Styling reuses the app's design tokens, passed in as `T`, so this
   introduces no second design system and no extra dependency.
   ============================================================ */

/* BCP-47 tags for SpeechSynthesis, indexed to match LANGS in i18n.js */
const SPEECH_LANGS = ["en-IN", "hi-IN", "kn-IN", "mr-IN", "ta-IN", "te-IN", "bn-IN", "gu-IN"];

let nextId = 1;

/** Render **bold** spans from the formatter without pulling in a markdown lib. */
function RichText({ text }) {
  return text.split("\n\n").map((para, i) => (
    <p key={i} style={{ margin: i === 0 ? 0 : "8px 0 0" }}>
      {para.split(/(\*\*[^*]+\*\*)/g).map((chunk, j) =>
        chunk.startsWith("**") && chunk.endsWith("**") ? (
          <strong key={j}>{chunk.slice(2, -2)}</strong>
        ) : (
          <React.Fragment key={j}>{chunk}</React.Fragment>
        )
      )}
    </p>
  ));
}

export default function AIChat({ T, lang = 0, onOpenCalculator, onFindPartners }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  /* auto-scroll to the newest message */
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending, open]);

  /* focus the box when the panel opens */
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  /* stop any speech and cancel any in-flight request when unmounting */
  useEffect(() => {
    return () => {
      if (ttsSupported) window.speechSynthesis.cancel();
      abortRef.current?.abort();
    };
  }, [ttsSupported]);

  /* ---------------- text to speech ---------------- */
  const stopSpeaking = useCallback(() => {
    if (!ttsSupported) return;
    window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, [ttsSupported]);

  const toggleSpeak = useCallback(
    (msg) => {
      if (!ttsSupported) return;
      // clicking the message that is already talking stops it
      if (speakingId === msg.id) return stopSpeaking();

      // starting a new message always cancels the previous one
      window.speechSynthesis.cancel();

      const utter = new SpeechSynthesisUtterance(msg.text.replace(/\*\*/g, ""));
      utter.lang = SPEECH_LANGS[lang] ?? "en-IN";
      utter.rate = 0.95;
      utter.onend = () => setSpeakingId((cur) => (cur === msg.id ? null : cur));
      utter.onerror = () => setSpeakingId((cur) => (cur === msg.id ? null : cur));

      setSpeakingId(msg.id);
      window.speechSynthesis.speak(utter);
    },
    [speakingId, stopSpeaking, ttsSupported, lang]
  );

  /* ---------------- sending ---------------- */
  const send = useCallback(async () => {
    const goal = input.trim();
    if (!goal || pending) return; // empty-input guard + duplicate-request guard

    const userMsg = { id: nextId++, role: "user", text: goal };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setPending(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { text, state, calc } = await askAgent(goal, { signal: controller.signal });
      setMessages((m) => [
        ...m,
        {
          id: nextId++,
          role: "ai",
          text: text || t("I could not find an answer for that.", lang),
          state,
          calc,
        },
      ]);
    } catch (e) {
      const msg =
        e?.status === 408
          ? t("That took too long. Please try again.", lang)
          : e?.status
            ? t("The server returned an error. Please try again.", lang)
            : t("Could not reach the server. Is the backend running?", lang);
      setMessages((m) => [...m, { id: nextId++, role: "ai", text: msg, error: true }]);
    } finally {
      setPending(false);
      abortRef.current = null;
    }
  }, [input, pending, lang]);

  const onKeyDown = (e) => {
    // Enter sends, Shift+Enter makes a newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const close = () => {
    stopSpeaking();
    setOpen(false);
  };

  /* ---------------- launcher button ---------------- */
  if (!open) {
    return (
      <button
        className="msFloat"
        onClick={() => setOpen(true)}
        aria-label={t("Open AI assistant", lang)}
        title={t("Open AI assistant", lang)}
        style={{
          position: "fixed", right: 22, bottom: 22, zIndex: 60,
          width: 58, height: 58, borderRadius: 999, border: "none",
          background: T.green, color: "#fff", fontSize: 26, cursor: "pointer",
          boxShadow: "0 8px 22px rgba(14,92,43,.35)",
        }}
      >
        &#129302;
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label={t("AI assistant", lang)}
      style={{
        position: "fixed", zIndex: 60,
        right: "max(16px, env(safe-area-inset-right))",
        bottom: "max(16px, env(safe-area-inset-bottom))",
        // responsive: near-fullscreen on phones, panel on desktop
        width: "min(400px, calc(100vw - 32px))",
        height: "min(560px, calc(100vh - 32px))",
        display: "flex", flexDirection: "column",
        background: "#fff", borderRadius: 16,
        border: `1px solid ${T.border}`,
        boxShadow: "0 18px 50px rgba(15,31,23,.22)",
        overflow: "hidden",
      }}
    >
      {/* header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 14px", background: T.green, color: "#fff", flexShrink: 0,
      }}>
        <span aria-hidden="true" style={{ fontSize: 20 }}>&#129302;</span>
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{t("AI assistant", lang)}</div>
          <div style={{ fontSize: 11.5, opacity: 0.9 }}>{t("Ask about schemes, EMI or partners", lang)}</div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => { stopSpeaking(); setMessages([]); }}
            aria-label={t("Clear conversation", lang)}
            title={t("Clear conversation", lang)}
            style={{
              marginLeft: "auto", background: "rgba(255,255,255,.18)", color: "#fff",
              border: "none", height: 30, padding: "0 10px", borderRadius: 8,
              fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {t("Clear", lang)}
          </button>
        )}
        <button
          onClick={close}
          aria-label={t("Close", lang)}
          style={{
            marginLeft: messages.length > 0 ? 6 : "auto",
            background: "rgba(255,255,255,.18)", color: "#fff",
            border: "none", width: 30, height: 30, borderRadius: 8,
            fontSize: 17, cursor: "pointer", lineHeight: 1,
          }}
        >
          &times;
        </button>
      </div>

      {/* messages */}
      <div
        ref={listRef}
        style={{
          flex: 1, overflowY: "auto", padding: 14,
          background: T.mint, display: "flex", flexDirection: "column", gap: 10,
        }}
      >
        {messages.length === 0 && (
          <div style={{ fontSize: 13.5, color: T.slate, lineHeight: 1.6 }}>
            {t("Ask me things like:", lang)}
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {[
                t("A tailoring shop in Karnataka, cost 2 lakh, income 1.5 lakh", lang),
                t("Education loan in Kerala for a B.Tech course", lang),
              ].map((ex) => (
                <button
                  key={ex}
                  onClick={() => { setInput(ex); inputRef.current?.focus(); }}
                  style={{
                    textAlign: "left", background: "#fff", border: `1px solid ${T.border}`,
                    borderRadius: 10, padding: "8px 11px", fontSize: 13,
                    color: T.ink, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div key={m.id} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "86%" }}>
                <div style={{
                  background: isUser ? T.green : "#fff",
                  color: isUser ? "#fff" : m.error ? T.red : T.ink,
                  border: isUser ? "none" : `1px solid ${m.error ? "#F0CBC7" : T.border}`,
                  borderRadius: 12,
                  borderBottomRightRadius: isUser ? 3 : 12,
                  borderBottomLeftRadius: isUser ? 12 : 3,
                  padding: "9px 12px", fontSize: 14, lineHeight: 1.55,
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  <RichText text={m.text} />
                </div>

                {/* turn the answer into navigation, using the data the agent
                    actually returned rather than re-asking the backend */}
                {!isUser && (m.calc || m.state) && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    {m.calc && onOpenCalculator && (
                      <button
                        onClick={() => onOpenCalculator(m.calc, m.state)}
                        style={{
                          background: "#fff", border: `1px solid ${T.green}`, color: T.green,
                          borderRadius: 999, padding: "4px 11px", fontSize: 12,
                          fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        }}
                      >
                        {t("Open repayment calculator", lang)}
                      </button>
                    )}
                    {m.state && onFindPartners && (
                      <button
                        onClick={() => onFindPartners(m.state)}
                        style={{
                          background: "#fff", border: `1px solid ${T.green}`, color: T.green,
                          borderRadius: 999, padding: "4px 11px", fontSize: 12,
                          fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        }}
                      >
                        {t("See partners in {state}", lang, { state: m.state })}
                      </button>
                    )}
                  </div>
                )}

                {/* speaker control — assistant messages only */}
                {!isUser && ttsSupported && (
                  <button
                    onClick={() => toggleSpeak(m)}
                    aria-label={speakingId === m.id ? t("Stop reading", lang) : t("Read aloud", lang)}
                    title={speakingId === m.id ? t("Stop reading", lang) : t("Read aloud", lang)}
                    style={{
                      marginTop: 4, display: "inline-flex", alignItems: "center", gap: 5,
                      background: speakingId === m.id ? T.greenBg : "transparent",
                      border: `1px solid ${speakingId === m.id ? T.green : T.border}`,
                      color: speakingId === m.id ? T.green : T.slate,
                      borderRadius: 999, padding: "3px 9px", fontSize: 11.5,
                      cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                    }}
                  >
                    <span aria-hidden="true">{speakingId === m.id ? "⏹" : "\u{1F50A}"}</span>
                    {speakingId === m.id ? t("Stop", lang) : t("Listen", lang)}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* typing indicator */}
        {pending && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{
              background: "#fff", border: `1px solid ${T.border}`, borderRadius: 12,
              borderBottomLeftRadius: 3, padding: "10px 14px",
              display: "flex", gap: 4, alignItems: "center",
            }}>
              {[0, 1, 2].map((i) => (
                <span key={i} className="msDot" style={{
                  width: 6, height: 6, borderRadius: 999, background: T.slate,
                  animationDelay: `${i * 0.15}s`,
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* composer */}
      <div style={{
        display: "flex", gap: 8, padding: 10, borderTop: `1px solid ${T.border}`,
        background: "#fff", flexShrink: 0, alignItems: "flex-end",
      }}>
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("Type your question…", lang)}
          aria-label={t("Type your question…", lang)}
          style={{
            flex: 1, resize: "none", maxHeight: 96, minHeight: 38,
            padding: "9px 11px", borderRadius: 10,
            border: `1.5px solid ${T.border}`, fontSize: 14,
            fontFamily: "inherit", color: T.ink, lineHeight: 1.45, outline: "none",
          }}
        />
        <button
          onClick={send}
          disabled={pending || !input.trim()}
          aria-label={t("Send", lang)}
          className="hoverBtn"
          style={{
            height: 38, padding: "0 16px", borderRadius: 10, border: "none",
            background: pending || !input.trim() ? "#B7DCC4" : T.green,
            color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "inherit",
            cursor: pending || !input.trim() ? "not-allowed" : "pointer",
          }}
        >
          {t("Send", lang)}
        </button>
      </div>
    </div>
  );
}
