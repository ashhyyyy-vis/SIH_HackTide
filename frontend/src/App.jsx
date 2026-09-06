import React, { useState, useMemo, useRef, useEffect } from "react";
import { LANGS, t } from "./i18n";
import { api, emiQuarters, partnersForState, projectTypeFor, adaptRecommendation, adaptPartner, currentPosition } from "./api";
import AIChat from "./components/AIChat";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

/* ============================================================
   SC LOAN SAHAYAK — PS92 Smart Loan/Scheme Access Platform
   Demo build: Karnataka / Maharashtra / Rajasthan sample data.
   8-language selector · trust-first government fintech UI.
   ============================================================ */

/* ---------------- design tokens ---------------- */
const T = {
  ink: "#0F1F17", navy: "#17803D", navyDeep: "#0E5C2B",
  green: "#17803D", greenBg: "#E4F4E9",
  mint: "#F2FAF4", mintDeep: "#DCF0E2",
  saffron: "#D9741A", saffronBg: "#FDF1E0",
  amber: "#B45309", amberBg: "#FDF3E3",
  red: "#B3352C", redBg: "#FBEDEB",
  slate: "#586A5E", border: "#E1EBE4", bg: "#FFFFFF",
};

const CSS = `
  .lift { transition: transform .18s ease, box-shadow .18s ease; }
  .lift:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(14,92,43,.14); }
  .hoverBtn { transition: filter .15s ease, transform .1s ease; }
  .hoverBtn:hover { filter: brightness(1.08); }
  .hoverBtn:active { transform: translateY(1px); }
  button:focus-visible, select:focus-visible, input:focus-visible { outline: 3px solid #F5B942; outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { .lift, .hoverBtn, .msTab, .msCat { transition: none; } }

  /* --- myScheme-style chrome --- */
  .msTab { transition: background .15s ease, color .15s ease; }
  .msCat { transition: transform .18s ease; cursor: pointer; }
  .msCat:hover { transform: translateY(-4px); }
  .msCat:hover .msCatIcon { filter: saturate(1.25); }
  .msSearch:focus-within { border-color: #17803D; box-shadow: 0 0 0 4px rgba(23,128,61,.12); }
  .msFaq summary { list-style: none; cursor: pointer; }
  .msFaq summary::-webkit-details-marker { display: none; }
  .msFaq summary .chev { transition: transform .2s ease; }
  .msFaq details[open] summary .chev { transform: rotate(180deg); }
  .msFloat { transition: transform .15s ease, box-shadow .15s ease; }
  .msFloat:hover { transform: scale(1.06); }
  .msLink { color: inherit; text-decoration: none; }
  .msLink:hover { text-decoration: underline; }

  /* typing indicator in the AI chat panel */
  .msDot { display: inline-block; animation: msBlink 1s infinite ease-in-out; }
  @keyframes msBlink { 0%, 80%, 100% { opacity: .25; } 40% { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .msDot { animation: none; opacity: .6; } }
`;

const INCOME_CAP = 500000;

/* ---------------- helpers ---------------- */
const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

/* Small async-data hook. Every screen that talks to the backend uses this so
   loading and error states are handled the same way everywhere.
   `loading` is derived by comparing the request key against the settled key,
   which avoids a synchronous setState inside the effect. */
function useAsync(fn, deps, { skip = false } = {}) {
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; });
  const key = JSON.stringify(deps ?? []) + (skip ? "|skip" : "|run");
  const [settled, setSettled] = useState({ key: null, error: null, data: null });

  useEffect(() => {
    if (skip) return undefined;
    let alive = true;
    fnRef.current()
      .then((data) => { if (alive) setSettled({ key, error: null, data }); })
      .catch((error) => { if (alive) setSettled({ key, error, data: null }); });
    return () => { alive = false; };
  }, [key, skip]);

  const done = settled.key === key;
  return {
    loading: !skip && !done,
    error: done ? settled.error : null,
    data: done ? settled.data : null,
  };
}

/* ---------------- primitives ---------------- */
const Btn = ({ kind = "primary", children, onClick, full, disabled, small }) => {
  const base = {
    fontWeight: 700, borderRadius: 10, cursor: disabled ? "not-allowed" : "pointer",
    border: "1.5px solid transparent", fontSize: small ? 14 : 16, fontFamily: "inherit",
    padding: small ? "8px 16px" : "14px 24px", minHeight: small ? 36 : 48,
    width: full ? "100%" : undefined, opacity: disabled ? 0.5 : 1,
  };
  const kinds = {
    primary: { background: T.green, color: "#fff", boxShadow: "0 2px 6px rgba(14,92,43,.22)" },
    secondary: { background: "#fff", color: T.green, borderColor: "#B7DCC4" },
    tertiary: { background: "transparent", color: T.green, textDecoration: "underline", padding: small ? "6px 8px" : "10px 12px", minHeight: 0, fontWeight: 600 },
    success: { background: T.green, color: "#fff", boxShadow: "0 2px 6px rgba(14,92,43,.22)" },
    white: { background: "#fff", color: T.green, boxShadow: "0 3px 10px rgba(15,31,23,.12)" },
  };
  return <button className="hoverBtn" style={{ ...base, ...kinds[kind] }} onClick={disabled ? undefined : onClick}>{children}</button>;
};

const Card = ({ children, pad = 22, style, lift }) => (
  <div className={lift ? "lift" : undefined} style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 12, padding: pad, boxShadow: "0 1px 3px rgba(15,31,23,.06)", ...style }}>{children}</div>
);

const Badge = ({ tone, children }) => {
  const map = { ok: [T.greenBg, T.green], warn: [T.amberBg, T.amber], bad: [T.redBg, T.red], info: ["#E4F4E9", T.navy], saffron: [T.saffronBg, T.saffron] };
  const [bg, fg] = map[tone];
  return <span style={{ background: bg, color: fg, fontSize: 13, fontWeight: 700, padding: "5px 12px", borderRadius: 999, display: "inline-block" }}>{children}</span>;
};

const IconTile = ({ children, from, to }) => (
  <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg, ${from}, ${to})`, display: "grid", placeItems: "center", fontSize: 25, boxShadow: "0 4px 10px rgba(15,31,23,.16)" }}>{children}</div>
);

const Field = ({ label, hint, children }) => (
  <label style={{ display: "block", marginBottom: 18 }}>
    <div style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 4 }}>{label}</div>
    {hint && <div style={{ fontSize: 13.5, color: T.slate, marginBottom: 8, lineHeight: 1.5 }}>{hint}</div>}
    {children}
  </label>
);

const inputStyle = { width: "100%", boxSizing: "border-box", fontSize: 17, padding: "13px 14px", borderRadius: 10, border: `1.5px solid #C9DCD0`, color: T.ink, background: "#fff", fontFamily: "inherit" };

const DemoNote = ({ lang = 0 }) => (
  <div style={{ fontSize: 12.5, color: T.slate, background: "#F2FAF4", border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", marginTop: 14 }}>
    {t("Demo data — scheme parameters may vary by state and channel partner.", lang)}
  </div>
);

/* Each rail step maps to the page it represents, so the rail doubles as a
   breadcrumb you can click. Steps you have not reached yet stay inert —
   jumping to "Why" before answering the wizard would land on an empty page. */
const RAIL_PAGES = ["state", "rec1", "result", "calc", "partners"];

const JourneyRail = ({ step, lang = 0, go, reachable }) => {
  const steps = [["🏛️", "State"], ["📋", "Scheme"], ["💡", "Why"], ["🧮", "Repayment"], ["📍", "Partner"]];
  const canVisit = (i) => {
    if (!go) return false;
    if (i === step) return false;                 // already here
    if (typeof reachable === "function") return reachable(i);
    return i < step;                              // default: only go back
  };

  return (
    <nav aria-label={t("Progress", lang)} style={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
      {steps.map(([ic, label], i) => {
        const active = i === step;
        const done = i < step;
        const clickable = canVisit(i);
        const style = {
          fontSize: 12.5, fontWeight: active ? 800 : 600, padding: "6px 13px", borderRadius: 999,
          background: active ? `linear-gradient(180deg, ${T.navy}, ${T.navyDeep})` : done ? T.greenBg : "#fff",
          color: active ? "#fff" : done ? T.green : T.slate,
          border: `1.5px solid ${active ? T.navyDeep : done ? "#B7DCC4" : T.border}`,
          boxShadow: active ? "0 3px 8px rgba(14,92,43,.25)" : "none",
          fontFamily: "inherit",
          cursor: clickable ? "pointer" : "default",
        };
        return (
          <React.Fragment key={label}>
            {clickable ? (
              <button type="button" className="msTab" onClick={() => go(RAIL_PAGES[i])} style={style}
                aria-label={`${t("Back to", lang)} ${t(label, lang)}`}>
                {done ? "✓" : ic} {t(label, lang)}
              </button>
            ) : (
              <div style={style} aria-current={active ? "step" : undefined}>{done ? "✓" : ic} {t(label, lang)}</div>
            )}
            {i < steps.length - 1 && <div style={{ width: 14, height: 2, background: done ? T.green : T.border, borderRadius: 2 }} />}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

const Page = ({ children, wide }) => (
  <div style={{ maxWidth: wide ? 1040 : 780, margin: "0 auto", padding: "24px 16px 130px" }}>{children}</div>
);

const StickyBar = ({ children, wide }) => (
  <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "#ffffffee", backdropFilter: "blur(6px)", borderTop: `1px solid ${T.border}`, padding: "12px 16px", zIndex: 15, boxShadow: "0 -4px 16px rgba(15,31,23,.06)" }}>
    <div style={{ maxWidth: wide ? 1040 : 780, margin: "0 auto", display: "flex", gap: 10 }}>{children}</div>
  </div>
);

/* ---------------- chrome ---------------- */
const Tricolor = () => (
  <div style={{ display: "flex", height: 4 }}>
    <div style={{ flex: 1, background: "#FF9933" }} /><div style={{ flex: 1, background: "#FFFFFF" }} /><div style={{ flex: 1, background: "#138808" }} />
  </div>
);

const Emblem = ({ size = 34 }) => (
  <svg width={size} height={size * 1.25} viewBox="0 0 40 50" aria-hidden="true">
    <g fill="#0F1F17">
      <circle cx="20" cy="7" r="4.2" />
      <path d="M11.5 13h17l-1.6 5.5h-13.8z" />
      <path d="M13.2 19.5h13.6l-1.3 4.5h-11z" />
      <rect x="17.6" y="24.5" width="4.8" height="14" rx="1.2" />
      <path d="M13 39h14l2 4H11z" />
    </g>
    <circle cx="20" cy="31" r="4.4" fill="none" stroke="#17803D" strokeWidth="1.4" />
    <circle cx="20" cy="31" r="1" fill="#17803D" />
    <text x="20" y="49" textAnchor="middle" fontSize="4.6" fill="#586A5E" fontFamily="serif">{"\u0938\u0924\u094D\u092F\u092E\u0947\u0935 \u091C\u092F\u0924\u0947"}</text>
  </svg>
);

const DigitalIndiaMark = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 2a14 14 0 0 1 0 28" fill="none" stroke="#D9741A" strokeWidth="4" strokeLinecap="round" />
      <path d="M16 30A14 14 0 0 1 16 2" fill="none" stroke="#17803D" strokeWidth="4" strokeLinecap="round" />
      <circle cx="16" cy="16" r="4.5" fill="#1B4C99" />
    </svg>
    <div style={{ lineHeight: 1.05 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: T.ink, fontStyle: "italic" }}>Digital India</div>
      <div style={{ fontSize: 8.5, color: T.slate, letterSpacing: ".02em" }}>Power To Empower</div>
    </div>
  </div>
);

/* header search — live scheme lookup across all demo states */
const HeaderSearch = ({ go, setState, lang, catalogue }) => {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const hits = useMemo(() => {
    const term = q.trim().toLowerCase();
    const cat = catalogue?.data?.schemes;
    if (!term || !cat) return [];
    const all = [
      ...(cat.national ?? []).map((sc) => ({ sc, st: null })),
      ...(cat.state ?? []).map((sc) => ({ sc, st: sc.state })),
    ];
    return all
      .filter(({ sc, st }) =>
        sc.name.toLowerCase().includes(term) ||
        sc.code.toLowerCase().includes(term) ||
        (st ?? "").toLowerCase().includes(term))
      .slice(0, 6);
  }, [q, catalogue]);

  const pick = (h) => { if (h.st) setState(h.st); setQ(""); setOpen(false); go(h.st ? "dashboard" : "state"); };

  return (
    <div style={{ position: "relative", flex: "1 1 340px", maxWidth: 520, minWidth: 200 }}>
      <div className="msSearch" style={{
        display: "flex", alignItems: "center", gap: 8, background: "#fff",
        border: `1px solid ${T.border}`, borderRadius: 10, padding: "9px 14px",
      }}>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => { if (e.key === "Enter" && hits[0]) pick(hits[0]); }}
          placeholder={t("Enter scheme name to search...", lang)}
          aria-label={t("Search schemes", lang)}
          style={{
            flex: 1, border: "none", outline: "none", fontSize: 15, color: T.ink,
            fontFamily: "var(--mono)", background: "transparent", minWidth: 0,
          }}
        />
        <span aria-hidden="true" style={{ fontSize: 17, color: T.ink }}>&#128269;</span>
      </div>
      {open && hits.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#fff",
          border: `1px solid ${T.border}`, borderRadius: 10, boxShadow: "0 12px 32px rgba(15,31,23,.14)",
          overflow: "hidden", zIndex: 40,
        }}>
          {hits.map((h) => (
            <button key={h.sc.code + (h.st ?? "national")} onMouseDown={() => pick(h)} style={{
              display: "block", width: "100%", textAlign: "left", background: "none", border: "none",
              padding: "11px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, color: T.ink,
            }}>
              <b style={{ fontWeight: 700 }}>{h.sc.name}</b>
              <span style={{ color: T.slate, fontSize: 13 }}>
                {" "}&middot; {h.st ?? h.sc.type}{h.sc.maxAmount ? <> &middot; {t("up to", lang)} {inr(h.sc.maxAmount)}</> : null}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Header = ({ lang, setLang, state, go, setState, catalogue }) => (
  <div style={{ position: "sticky", top: 0, zIndex: 30 }}>
    <div style={{ background: "#fff", borderBottom: `1px solid ${T.border}`, boxShadow: "0 1px 6px rgba(15,31,23,.06)" }}>
      <div style={{
        maxWidth: 1320, margin: "0 auto", padding: "10px 20px", display: "flex",
        alignItems: "center", gap: 16, flexWrap: "wrap",
      }}>
        {/* brand */}
        <div onClick={() => go("landing")} title={t("Home", lang)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
          <Emblem />
          <div style={{ width: 1, height: 34, background: T.border }} />
          <div style={{ lineHeight: 1.05 }}>
            <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-0.02em" }}>
              <span style={{ color: T.green }}>Yojana</span><span style={{ color: T.ink }}>Mitra</span>
            </div>
            <div style={{ fontSize: 10.5, color: T.slate }}>{t("Concessional finance for SC entrepreneurs", lang)}</div>
          </div>
          <div style={{ width: 1, height: 34, background: T.border, margin: "0 2px" }} />
          <DigitalIndiaMark />
        </div>

        <div style={{ flex: 1, display: "flex", justifyContent: "center", minWidth: 200 }}>
          <HeaderSearch go={go} setState={setState} lang={lang} catalogue={catalogue} />
        </div>

        {/* right controls */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {state && <Badge tone="ok">&#128205; {state}</Badge>}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span aria-hidden="true" style={{
              width: 34, height: 34, borderRadius: 999, background: T.green, color: "#fff",
              display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800, lineHeight: 1,
            }}>A/&#2309;</span>
            <select value={lang} onChange={(e) => setLang(+e.target.value)} aria-label={t("Language", lang)}
              style={{
                border: "none", background: "transparent", fontSize: 15, fontWeight: 600,
                color: T.ink, fontFamily: "var(--mono)", cursor: "pointer", padding: "4px 2px",
              }}>
              {LANGS.map((l, i) => <option key={l} value={i}>{l}</option>)}
            </select>
          </div>
          <Btn kind="tertiary" small onClick={() => go("admin")}>{t("Admin", lang)}</Btn>
        </div>
      </div>
    </div>
    <div style={{ height: 3, background: "#E07B2E" }} />
  </div>
);

/* floating chrome — accessibility + help bubble, as on myScheme */
const FloatingChrome = ({ lang = 0, onOpenCalculator, onFindPartners }) => (
  <>
    <button className="msFloat" title={t("Accessibility options", lang)} aria-label={t("Accessibility options", lang)}
      onClick={() => { document.body.style.zoom = document.body.style.zoom === "1.15" ? "" : "1.15"; }}
      style={{
        position: "fixed", right: 0, top: 118, zIndex: 25, width: 44, height: 46,
        borderRadius: "10px 0 0 10px", border: "none", background: "#5A45E0", color: "#fff",
        fontSize: 21, cursor: "pointer", boxShadow: "0 4px 14px rgba(90,69,224,.35)",
      }}>&#9855;</button>
    {/* The floating assistant lives in components/AIChat.jsx and owns
        this corner now; it replaces the placeholder button that used to
        sit here and merely navigate home. */}
    <AIChat T={T} lang={lang} onOpenCalculator={onOpenCalculator} onFindPartners={onFindPartners} />
  </>
);

/* ---------------- pages ---------------- */
const CATEGORIES = [
  { ic: "\u{1F3ED}", t: "Business & Entrepreneurship", n: 3, c: "#7C8FA6" },
  { ic: "\u{1F393}", t: "Education & Learning", n: 3, c: "#C2504B" },
  { ic: "\u{1F3E6}", t: "Banking & Financial Services", n: 3, c: "#B5822E" },
  { ic: "\u{1F33E}", t: "Agriculture & Allied Activities", n: 2, c: "#5B7A3A" },
  { ic: "\u{1F6E0}\uFE0F", t: "Skills & Employment", n: 2, c: "#8E5BC4" },
  { ic: "\u{1F469}\u200D\u{1F4BC}", t: "Women Entrepreneurs", n: 2, c: "#C4577A" },
  { ic: "\u{1F3E0}", t: "Housing & Shelter", n: 1, c: "#3C6FA8" },
  { ic: "\u{1F91D}", t: "Social Welfare & Empowerment", n: 4, c: "#D9741A" },
  { ic: "\u{1F69A}", t: "Transport & Mobility", n: 1, c: "#4E9E8C" },
  { ic: "\u2695\uFE0F", t: "Health & Wellness", n: 1, c: "#4AA3A3" },
];

const FAQS = [
  ["What is YojanaMitra, and how is it different from other portals?",
   "It is a single window for concessional credit schemes meant for Scheduled Caste entrepreneurs and students. Other portals list schemes; this one tells you which scheme you actually qualify for, exactly what you will repay each quarter, and which channel partner near you still has funds to disburse."],
  ["How does the eligibility check work?",
   "You answer five short questions — state, type of support, project cost, annual family income and education. We match those against the scheme rules for your state and show you the recommendation along with the reason it was chosen, so nothing is a black box."],
  ["Why are repayments shown quarterly and not monthly?",
   "Concessional loans under these schemes are recovered quarterly, usually after a moratorium period. Showing a monthly EMI would misstate what actually leaves your account, so the calculator lays out every quarterly instalment including the moratorium."],
  ["What does it mean when a partner is marked 'funds exhausted'?",
   "Channel partners receive a fixed allocation each year. Once it is used up, they cannot take new applications until the next release. We hide or flag those partners so you do not travel to an office that cannot help you today."],
  ["Which languages are supported?",
   "The interface is available in eight languages — English, Hindi, Kannada, Marathi, Tamil, Telugu, Bengali and Gujarati. You can switch language at any point from the header without losing your progress."],
];

const SectionHead = ({ kicker, children, align = "center" }) => (
  <div style={{ textAlign: align, marginBottom: 34 }}>
    {kicker && <div style={{ fontSize: 15, color: "#9AA8A0", fontWeight: 600, marginBottom: 8 }}>{kicker}</div>}
    <h2 style={{ fontSize: 38, fontWeight: 800, color: T.ink, lineHeight: 1.15 }}>{children}</h2>
  </div>
);

const StatTile = ({ n, label, onClick }) => (
  <button onClick={onClick} className="lift" style={{
    background: T.greenBg, border: "none", borderRadius: 14, padding: "30px 20px",
    cursor: onClick ? "pointer" : "default", fontFamily: "inherit", textAlign: "center",
  }}>
    <div style={{ fontSize: 46, fontWeight: 800, color: T.ink, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{n}</div>
    <div style={{ fontSize: 15, color: T.navyDeep, marginTop: 10, fontWeight: 600 }}>{label} &rarr;</div>
  </button>
);

const TabPills = ({ tabs, active, onPick, lang = 0 }) => (
  <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 30 }}>
    {tabs.map((tb) => (
      <button key={tb} className="msTab" onClick={() => onPick(tb)} style={{
        border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 700,
        padding: "10px 20px", borderRadius: 8,
        background: active === tb ? T.greenBg : "transparent",
        color: active === tb ? T.navyDeep : T.ink,
      }}>{t(tb, lang)}</button>
    ))}
  </div>
);

/* Custom marker icons using emoji to match the original design */
const createEmojiIcon = (emoji, size = 30, active = false) => {
  return L.divIcon({
    html: `<div style="
      font-size: ${active ? size * 1.4 : size}px;
      line-height: 1;
      filter: ${active ? 'drop-shadow(0 4px 6px rgba(0,0,0,.35))' : 'none'};
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">${emoji}</div>`,
    className: 'emoji-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

/* Component to auto-fit map bounds to show all markers */
const MapBounds = ({ bounds }) => {
  const map = useMap();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!map || !bounds) return;
    
    // Only fit bounds after map is fully initialized
    if (!initialized) {
      setInitialized(true);
      // Small delay to ensure map is ready
      setTimeout(() => {
        try {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
        } catch (e) {
          console.warn('Map bounds fit failed:', e);
        }
      }, 100);
    }
  }, [bounds, map, initialized]);

  return null;
};

/* Full-featured map using Leaflet with OpenStreetMap tiles */
const PartnerMiniMap = ({ partners, anchor, selPartner, setSelPartner, lang }) => {
  const [mapError, setMapError] = useState(null);

  // Calculate relative positions for partners without lat/lng
  const pts = useMemo(() => {
    try {
      // Limit to first 50 partners to prevent overload
      const limitedPartners = partners.slice(0, 50);
      return limitedPartners.map((p) => {
        // If partner has valid lat/lng, use them
        if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
          return { ...p, calculatedLat: p.lat, calculatedLng: p.lng };
        }
        // If partner has distance but no coordinates, calculate relative position
        if (anchor && p.km != null) {
          // Place partners at random angles around the user at their distance
          // Use a deterministic hash of the partner ID for consistent positioning
          const hash = p.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const angle = (hash % 360) * (Math.PI / 180);
          // Convert km to approximate degrees (rough approximation)
          const kmToDeg = 1 / 111; // ~111km per degree
          const latOffset = Math.cos(angle) * p.km * kmToDeg;
          const lngOffset = Math.sin(angle) * p.km * kmToDeg;
          return {
            ...p,
            calculatedLat: anchor.lat + latOffset,
            calculatedLng: anchor.lng + lngOffset,
            isApproximate: true,
          };
        }
        return null;
      }).filter(Boolean);
    } catch (e) {
      console.error('Error calculating partner positions:', e);
      setMapError('Failed to calculate partner positions');
      return [];
    }
  }, [partners, anchor]);

  // Calculate bounds for auto-fitting the map
  const bounds = useMemo(() => {
    const all = [...pts, ...(anchor ? [anchor] : [])];
    if (all.length === 0) return null;
    const lats = all.map((p) => p.calculatedLat);
    const lngs = all.map((p) => p.calculatedLng);
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
  }, [pts, anchor]);

  // Default center (India) if no points
  const defaultCenter = anchor ? [anchor.lat, anchor.lng] : [20.5937, 78.9629];
  const defaultZoom = anchor ? 10 : 5;

  if (mapError) {
    return (
      <Card pad={0} style={{ overflow: "hidden" }}>
        <div style={{
          height: 320, display: "grid", placeItems: "center",
          fontSize: 13.5, color: T.slate, textAlign: "center", padding: 20,
        }}>
          {t("Map error: {error}", lang, { error: mapError })}
        </div>
        <div style={{ padding: "12px 16px", fontSize: 13.5, color: T.slate }}>
          {t("Showing {count} partners in list view instead.", lang, { count: partners.length })}
        </div>
      </Card>
    );
  }

  if (pts.length === 0 && !anchor) {
    return (
      <Card pad={0} style={{ overflow: "hidden" }}>
        <div style={{
          height: 320, display: "grid", placeItems: "center",
          fontSize: 13.5, color: T.slate, textAlign: "center", padding: 20,
        }}>
          {t("No mappable partners for this state yet.", lang)}
        </div>
        <div style={{ padding: "12px 16px", fontSize: 13.5, color: T.slate }}>
          {t("Tap a pin or a partner card to highlight it.", lang)}
        </div>
      </Card>
    );
  }

  try {
    return (
      <Card pad={0} style={{ overflow: "hidden" }}>
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          style={{ height: 320, width: "100%" }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapBounds bounds={bounds} />

        {/* User's location anchor */}
        {anchor && (
          <Marker
            position={[anchor.lat, anchor.lng]}
            icon={createEmojiIcon("🆗", 24)}
          >
            <Popup>{t("You are here", lang)}</Popup>
          </Marker>
        )}

        {/* Partner markers */}
        {pts.map((p) => {
          const active = selPartner && selPartner.id === p.id;
          return (
            <Marker
              key={p.id}
              position={[p.calculatedLat, p.calculatedLng]}
              icon={createEmojiIcon(p.isApproximate ? "📍" : "📍", 30, active)}
              eventHandlers={{
                click: () => setSelPartner(active ? null : p),
              }}
            >
              <Popup>
                <div style={{ minWidth: 150 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.name}</div>
                  {p.km != null && <div style={{ fontSize: 13, color: T.slate }}>{p.km} km</div>}
                  {p.health != null && <div style={{ fontSize: 13, color: T.slate }}>{t("Health", lang)}: {p.health}/100</div>}
                  {p.isApproximate && <div style={{ fontSize: 11, color: T.slate, fontStyle: "italic", marginTop: 4 }}>{t("Approximate location based on distance", lang)}</div>}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      <div style={{ padding: "12px 16px", fontSize: 13.5, color: T.slate }}>
        {selPartner
          ? <><b style={{ color: T.ink }}>{selPartner.name}</b> · {selPartner.km} {t("km", lang)}{selPartner.health != null ? <> · {t("Health", lang)} {selPartner.health}/100</> : null}</>
          : t("Tap a pin or a partner card to highlight it.", lang)}
      </div>
    </Card>
    );
  } catch (e) {
    console.error('Map rendering error:', e);
    setMapError('Failed to render map');
    return (
      <Card pad={0} style={{ overflow: "hidden" }}>
        <div style={{
          height: 320, display: "grid", placeItems: "center",
          fontSize: 13.5, color: T.slate, textAlign: "center", padding: 20,
        }}>
          {t("Map error: {error}", lang, { error: 'Rendering failed' })}
        </div>
        <div style={{ padding: "12px 16px", fontSize: 13.5, color: T.slate }}>
          {t("Showing {count} partners in list view instead.", lang, { count: partners.length })}
        </div>
      </Card>
    );
  }
};

/* card with the left green rule used across myScheme listings */
const RuleCard = ({ title, sub, icon, onClick }) => (
  <button onClick={onClick} className="lift" style={{
    display: "block", width: "100%", textAlign: "left", background: "#fff", cursor: "pointer",
    border: `1px solid ${T.border}`, borderLeft: `4px solid ${T.green}`, borderRadius: 10,
    padding: "18px 20px", fontFamily: "inherit", position: "relative", minHeight: 112,
  }}>
    <div style={{ fontSize: 17, fontWeight: 800, color: T.ink, lineHeight: 1.3, paddingRight: 42 }}>{title}</div>
    <div style={{ fontSize: 14.5, color: T.slate, marginTop: 10 }}>{sub}</div>
    {icon && <span aria-hidden="true" style={{ position: "absolute", right: 16, bottom: 14, fontSize: 30, opacity: .28 }}>{icon}</span>}
  </button>
);

const Footer = ({ go, lang = 0 }) => (
  <footer style={{ background: "#0E5C2B", color: "#D8EEDF", marginTop: 60 }}>
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "44px 20px 28px", display: "grid", gap: 32, gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))" }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 10 }}>YojanaMitra</div>
        <div style={{ fontSize: 14, lineHeight: 1.6 }}>
          {t("A demonstration portal for concessional credit schemes available to Scheduled Caste entrepreneurs and students, built for SIH 2026 (PS92).", lang)}
        </div>
      </div>
      <div>
        <div style={{ fontWeight: 700, color: "#fff", marginBottom: 10, fontSize: 15 }}>{t("Explore", lang)}</div>
        {[["Find my scheme", "state"], ["Repayment calculator", "state"], ["Channel Partners", "state"], ["Admin view", "admin"]].map(([l, pg]) => (
          <button key={l} onClick={() => go(pg)} style={{ display: "block", background: "none", border: "none", color: "#D8EEDF", fontSize: 14, padding: "5px 0", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>{t(l, lang)}</button>
        ))}
      </div>
      <div>
        <div style={{ fontWeight: 700, color: "#fff", marginBottom: 10, fontSize: 15 }}>{t("About the data", lang)}</div>
        <div style={{ fontSize: 14, lineHeight: 1.6 }}>
          {t("Scheme parameters, partner locations and fund status shown here are demonstration data for Karnataka, Maharashtra and Rajasthan. Confirm current terms with your channel partner.", lang)}
        </div>
      </div>
    </div>
    <Tricolor />
    <div style={{ padding: "14px 20px", fontSize: 13, textAlign: "center", background: "#0A461F" }}>
      {t("Demonstration build · not an official Government of India service", lang)}
    </div>
  </footer>
);

const Landing = ({ go, lang, setState, catalogue }) => {
  const [tab, setTab] = useState("Categories");
  const cat = catalogue?.data;
  const states = cat?.allStates ?? [];
  const totalSchemes = (cat?.schemes?.national?.length ?? 0) + (cat?.schemes?.state?.length ?? 0);
  const totalBranches = cat?.health?.branches ?? 0;
  const schemesByState = useMemo(() => {
    const m = {};
    for (const sc of cat?.schemes?.state ?? []) (m[sc.state] ||= []).push(sc);
    return m;
  }, [cat]);

  // Only hit /api/partners while the Channel Partners tab is actually open —
  // the locator holds ~74k branches, so this is deliberately a small sample.
  const partnerSample = useAsync(
    async () => {
      const r = await api.partners({ limit: 6, partnerType: "SCA" });
      return (r.branches ?? []).map(adaptPartner);
    },
    [],
    { skip: tab !== "Channel Partners" }
  );

  return (
    <div>
      {/* ---- hero ---- */}
      <div style={{ background: `linear-gradient(180deg, ${T.mintDeep} 0%, ${T.mint} 45%, #ffffff 100%)` }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "56px 20px 64px", textAlign: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.navyDeep, letterSpacing: ".04em", marginBottom: 22 }}>
            #CONCESSIONALCREDIT / #SCHEMESFORYOU
          </div>
          <h1 style={{ fontSize: 46, fontWeight: 800, color: T.ink, lineHeight: 1.14, maxWidth: 840, margin: "0 auto 18px" }}>
            {t("Loans for your business or studies — explained simply, in your language.", lang)}
          </h1>
          <p style={{ fontSize: 17.5, color: T.slate, lineHeight: 1.6, maxWidth: 660, margin: "0 auto 30px" }}>
            {t("Find the scheme you actually qualify for, see exactly what you will repay every quarter, and reach the nearest partner who can take your application today.", lang)}
          </p>
          <button className="hoverBtn" onClick={() => go("state")} style={{
            background: T.green, color: "#fff", border: "none", borderRadius: 10, fontFamily: "inherit",
            fontSize: 20, fontWeight: 800, padding: "18px 36px", cursor: "pointer",
            boxShadow: "0 6px 20px rgba(14,92,43,.28)",
          }}>
            {t("Get started", lang)} &nbsp;&rarr;
          </button>

          <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", maxWidth: 900, margin: "52px auto 0" }}>
            <StatTile n={totalSchemes || "—"} label={t("Schemes mapped", lang)} onClick={() => go("state")} />
            <StatTile n={states.length || "—"} label={t("States & UTs covered", lang)} onClick={() => go("state")} />
            <StatTile n={totalBranches ? totalBranches.toLocaleString("en-IN") : "—"} label={t("Partner branches", lang)} onClick={() => go("state")} />
          </div>
        </div>
      </div>

      {/* ---- browse tabs ---- */}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "56px 20px 0" }}>
        <TabPills tabs={["Categories", "States/UTs", "Channel Partners"]} active={tab} onPick={setTab} lang={lang} />

        {tab === "Categories" && (
          <>
            <SectionHead>{t("Find schemes based", lang)}<br />{t("on categories", lang)}</SectionHead>
            <div style={{ display: "grid", gap: 34, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
              {CATEGORIES.map((c) => (
                <div key={c.t} className="msCat" onClick={() => go("state")} style={{ textAlign: "center" }}>
                  <div className="msCatIcon" style={{
                    width: 84, height: 84, margin: "0 auto 6px", borderRadius: 999,
                    background: `radial-gradient(circle at 50% 78%, #E8F0F6 0%, #E8F0F6 58%, transparent 60%)`,
                    display: "grid", placeItems: "center", fontSize: 42,
                  }}>{c.ic}</div>
                  <div style={{ fontSize: 16, color: T.green, fontWeight: 700, fontFamily: "var(--mono)" }}>{c.n} {c.n === 1 ? t("Scheme", lang) : t("Schemes", lang)}</div>
                  <div style={{ fontSize: 16.5, color: T.ink, marginTop: 4, lineHeight: 1.35 }}>{t(c.t, lang)}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 26, fontSize: 14, color: T.slate }}>
              {t("Category counts are illustrative — the demo dataset carries {n} costed schemes across {m} states.", lang, { n: totalSchemes, m: states.length })}
            </div>
          </>
        )}

        {tab === "States/UTs" && (
          <>
            <SectionHead>{t("Explore schemes of", lang)}<br />{t("States / UTs", lang)}</SectionHead>
            <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))" }}>
              {states.map((st) => {
                const own = (schemesByState[st] ?? []).length;
                return (
                  <RuleCard key={st} icon={"\u{1F3DB}\uFE0F"} title={st}
                    sub={own
                      ? `${own} ${t("state schemes", lang)} + ${t("national", lang)}`
                      : t("National schemes", lang)}
                    onClick={() => { setState(st); go("dashboard"); }} />
                );
              })}
            </div>
          </>
        )}

        {tab === "Channel Partners" && (
          <>
            <SectionHead>{t("Explore lending", lang)}<br />{t("Channel Partners", lang)}</SectionHead>
            <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))" }}>
              {partnerSample.loading && <Card>{t("Loading…", lang)}</Card>}
              {partnerSample.error && <Card><span style={{ color: T.red }}>{t("Could not reach the server. Is the backend running on port 3001?", lang)}</span></Card>}
              {(partnerSample.data ?? []).map((pt) => (
                <RuleCard key={pt.id} icon={"\u{1F4CD}"} title={pt.name}
                  sub={`${pt.state} · ${t("Health", lang)} ${pt.health ?? "—"}/100 · NPA ${pt.npaStatus}`}
                  onClick={() => { setState(pt.state); go("partners"); }} />
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 18, fontSize: 14, color: T.slate }}>
              {t("{n} partners listed across {m} states · only those with funds and healthy books are recommended.", lang, { n: totalBranches.toLocaleString("en-IN"), m: states.length })}
            </div>
          </>
        )}
      </div>

      {/* ---- how it works ---- */}
      <div style={{ background: T.mint, marginTop: 64, padding: "56px 0" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 20px" }}>
          <SectionHead kicker={t("How it works", lang)}>{t("Three steps, start", lang)}<br />{t("to disbursement", lang)}</SectionHead>
          <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
            {[
              ["\u{1F50D}", "Find the right scheme", "Answer a few simple questions \u2014 we match you to what you qualify for and tell you why."],
              ["\u{1F9EE}", "Know your repayment", "Repayments are quarterly, not monthly. See every instalment before you apply."],
              ["\u{1F4CD}", "Reach an eligible partner", "We only route you to partners with funds available and healthy books."],
            ].map(([ic, tt, d], i) => (
              <div key={tt} style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 12, padding: 26 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <span style={{ width: 46, height: 46, borderRadius: 999, background: T.greenBg, display: "grid", placeItems: "center", fontSize: 23 }}>{ic}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: T.green, fontFamily: "var(--mono)" }}>{t("STEP", lang)} {i + 1}</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 19, marginBottom: 8, color: T.ink }}>{t(tt, lang)}</div>
                <div style={{ fontSize: 15, color: T.slate, lineHeight: 1.6 }}>{t(d, lang)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- FAQ ---- */}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "64px 20px 20px", display: "grid", gap: 46, gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", alignItems: "start" }}>
        <div style={{ background: `linear-gradient(180deg, ${T.mint}, #fff)`, borderRadius: 18, padding: 30, textAlign: "center" }}>
          <div style={{ fontSize: 120, lineHeight: 1 }} aria-hidden="true">&#10068;</div>
          <div style={{ fontSize: 16, color: T.slate, marginTop: 14, lineHeight: 1.6 }}>
            {t("Still unsure whether you qualify? Start the five-question check — it takes about a minute and you can change your answers at any point.", lang)}
          </div>
          <div style={{ marginTop: 18 }}>
            <Btn onClick={() => go("state")}>{t("Find a scheme", lang)}</Btn>
          </div>
        </div>
        <div className="msFaq">
          <div style={{ fontSize: 15, color: "#9AA8A0", fontWeight: 600, marginBottom: 8 }}>{t("Frequently Asked Questions", lang)}</div>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: T.ink, lineHeight: 1.15, marginBottom: 28 }}>
            {t("Checkout our knowledge base for some of your answers!", lang)}
          </h2>
          {FAQS.map(([q, a]) => (
            <details key={q} style={{ borderBottom: `1px solid ${T.border}`, padding: "18px 0" }}>
              <summary style={{ display: "flex", gap: 16, alignItems: "flex-start", fontSize: 17.5, fontWeight: 700, color: T.ink, lineHeight: 1.4 }}>
                <span style={{ flex: 1 }}>{t(q, lang)}</span>
                <span className="chev" aria-hidden="true" style={{ fontSize: 15, color: T.slate, marginTop: 4 }}>&#9662;</span>
              </summary>
              <div style={{ fontSize: 15.5, color: T.slate, lineHeight: 1.7, marginTop: 12, paddingRight: 32 }}>{t(a, lang)}</div>
            </details>
          ))}
        </div>
      </div>

      <Page>
        <DemoNote lang={lang} />
      </Page>
      <Footer go={go} lang={lang} />
    </div>
  );
};

const StateSelect = ({ go, setState, lang, catalogue }) => {
  const cat = catalogue?.data;
  // every state the partner locator covers; national schemes apply in all of
  // them. The 11 with their own state schemes are badged below.
  const states = cat?.allStates ?? [];
  const schemesByState = useMemo(() => {
    const m = {};
    for (const sc of cat?.schemes?.state ?? []) (m[sc.state] ||= []).push(sc);
    return m;
  }, [cat]);
  return (
  <>
    <Page wide>
      <JourneyRail step={0} lang={lang} go={go} />
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <div style={{ fontSize: 15, color: "#9AA8A0", fontWeight: 600, marginBottom: 8 }}>{t("Step {n} of {total}", lang, { n: 1, total: 5 })}</div>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: T.ink, lineHeight: 1.15 }}>{t("Where are you", lang)}<br />{t("applying from?", lang)}</h2>
        <p style={{ color: T.slate, lineHeight: 1.6, maxWidth: 560, margin: "14px auto 0", fontSize: 16 }}>
          {t("Schemes, interest rates and partners are different in every state, so we ask this first — and only once.", lang)}
        </p>
      </div>
      {catalogue?.loading && <Card>{t("Loading…", lang)}</Card>}
      {catalogue?.error && (
        <Card><span style={{ color: T.red }}>{t("Could not reach the server. Is the backend running on port 3001?", lang)}</span></Card>
      )}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
        {states.map((s) => {
          const own = (schemesByState[s] ?? []).length;
          return (
            <RuleCard key={s} icon={"\u{1F3DB}\uFE0F"} title={s}
              sub={own
                ? `${own} ${t("state schemes", lang)} + ${t("national", lang)}`
                : t("National schemes", lang)}
              onClick={() => { setState(s); go("dashboard"); }} />
          );
        })}
      </div>
      <div style={{ fontSize: 13.5, color: T.slate, marginTop: 16, lineHeight: 1.6 }}>
        {t("National schemes apply in every state. Some states add their own schemes on top.", lang)}
      </div>
      <DemoNote lang={lang} />
    </Page>
    <Footer go={go} lang={lang} />
  </>
  );
};

const Dashboard = ({ go, state, lang, setCalc }) => (
  <>
  <Page wide>
    <div style={{ marginBottom: 6, fontSize: 14, color: T.slate }}>
      {t("Your schemes and partner options are based on", lang)} <b style={{ color: T.ink }}>{state}</b>. <Btn kind="tertiary" small onClick={() => go("state")}>{t("Change", lang)}</Btn>
    </div>
    <h2 style={{ fontSize: 34, margin: "6px 0 24px", fontWeight: 800, letterSpacing: "-0.02em" }}>{t("How can we help you today?", lang)}</h2>
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))" }}>
      <Card lift style={{ borderTop: `4px solid ${T.navy}` }}>
        <IconTile from="#2FA05A" to={T.navyDeep}>🔍</IconTile>
        <div style={{ fontWeight: 800, fontSize: 19, margin: "12px 0 4px" }}>{t("Find my scheme", lang)}</div>
        <div style={{ fontSize: 14, color: T.slate, lineHeight: 1.55, marginBottom: 16, minHeight: 44 }}>{t("Answer a few questions and discover schemes you may be eligible for.", lang)}</div>
        <Btn full onClick={() => go("rec1")}>{t("Find a scheme", lang)}</Btn>
      </Card>
      <Card lift style={{ borderTop: `4px solid ${T.green}` }}>
        <IconTile from="#1E9C4C" to="#0E5C2B">🧮</IconTile>
        <div style={{ fontWeight: 800, fontSize: 19, margin: "12px 0 4px" }}>{t("Calculate repayment", lang)}</div>
        <div style={{ fontSize: 14, color: T.slate, lineHeight: 1.55, marginBottom: 16, minHeight: 44 }}>{t("Understand your quarterly repayment before applying.", lang)}</div>
        <Btn full kind="success" onClick={() => { setCalc(null); go("calc"); }}>{t("Calculate", lang)}</Btn>
      </Card>
      <Card lift style={{ borderTop: `4px solid ${T.saffron}` }}>
        <IconTile from="#E88A12" to="#B45309">📍</IconTile>
        <div style={{ fontWeight: 800, fontSize: 19, margin: "12px 0 4px" }}>{t("Find a partner", lang)}</div>
        <div style={{ fontSize: 14, color: T.slate, lineHeight: 1.55, marginBottom: 16, minHeight: 44 }}>{t("Find the nearest eligible channel partner and get directions.", lang)}</div>
        <Btn full kind="secondary" onClick={() => go("partners")}>{t("Find nearby", lang)}</Btn>
      </Card>
    </div>
    <div style={{ marginTop: 18 }}>
      <Card pad={18} style={{ background: "linear-gradient(120deg,#FBFDFC,#EFF8F2)" }}>
        <div style={{ fontSize: 14, color: T.slate, lineHeight: 1.6 }}>
          <b style={{ color: T.ink }}>{t("Application status:", lang)}</b> {t("no application started yet. Begin with", lang)} "{t("Find my scheme", lang)}".{" "}
          {t("Need help? Contact details for your district partner appear on the partner screen.", lang)}
        </div>
      </Card>
    </div>
    <DemoNote lang={lang} />
  </Page>
  <Footer go={go} lang={lang} />
  </>
);

/* ---- recommender ---- */
const StepShell = ({ n, total, title, hint, children, onBack, onNext, nextLabel, err, lang, go }) => (
  <Page>
    <JourneyRail step={1} lang={lang} go={go} />
    <div style={{ fontSize: 13, color: T.slate, marginBottom: 4, fontWeight: 600 }}>{t("Step {n} of {total}", lang, { n, total })}</div>
    <div style={{ height: 8, background: "#DEEEE4", borderRadius: 999, marginBottom: 22 }}>
      <div style={{ width: `${(n / total) * 100}%`, height: 8, background: `linear-gradient(90deg, ${T.navy}, #2FA05A)`, borderRadius: 999, transition: "width .25s" }} />
    </div>
    <h2 style={{ fontSize: 24, margin: "0 0 4px", fontWeight: 800 }}>{title}</h2>
    {hint && <p style={{ color: T.slate, marginTop: 0, lineHeight: 1.5 }}>{hint}</p>}
    {children}
    {err && <div style={{ color: T.red, background: T.redBg, borderRadius: 10, padding: "10px 14px", fontSize: 14, marginTop: 10, border: "1px solid #F0CBC7" }}>{err}</div>}
    <StickyBar>
      <Btn kind="secondary" onClick={onBack}>{t("Back", lang)}</Btn>
      <div style={{ flex: 1 }} />
      <Btn onClick={onNext}>{nextLabel || t("Continue", lang)}</Btn>
    </StickyBar>
  </Page>
);

const SUPPORT_CARDS = [
  { id: "micro", ic: "🛒", t: "Business — Micro Finance", d: "Small loans for shops, tailoring, livestock, street vending and similar work." },
  { id: "term", ic: "🏭", t: "Business — Term Loan", d: "Larger loans for machinery, workshops, transport or expanding a business." },
  { id: "edu", ic: "🎓", t: "Education Loan", d: "For diploma, degree or professional courses in India." },
];

const MoneyInput = ({ value, onChange, placeholder }) => (
  <div style={{ position: "relative" }}>
    <span style={{ position: "absolute", left: 14, top: 13, fontSize: 17, color: T.slate }}>₹</span>
    <input style={{ ...inputStyle, paddingLeft: 32 }} inputMode="numeric" value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))} />
  </div>
);

const Recommender = ({ step, go, form, setForm, err, setErr, lang, state, setRec }) => {
  const set = (patch) => { setErr(""); setForm({ ...form, ...patch }); };
  if (step === 1) return (
    <StepShell n={1} total={5} lang={lang} go={go} err={err} title={t("What type of support do you need?", lang)}
      onBack={() => go("dashboard")}
      onNext={() => (form.support ? go("rec2") : setErr(t("Please choose one option to continue.", lang)))}>
      <div style={{ display: "grid", gap: 12 }}>
        {SUPPORT_CARDS.map((c) => (
          <Card key={c.id} pad={0} lift style={{ borderColor: form.support === c.id ? T.navy : T.border, borderWidth: 2, background: form.support === c.id ? "#F4F8FF" : "#fff" }}>
            <button onClick={() => set({ support: c.id })}
              style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "16px 18px", cursor: "pointer", fontFamily: "inherit", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <span style={{ fontSize: 26 }}>{c.ic}</span>
              <span>
                <span style={{ display: "block", fontWeight: 800, fontSize: 16.5, color: T.ink }}>{t(c.t, lang)} {form.support === c.id ? "✓" : ""}</span>
                <span style={{ display: "block", fontSize: 14, color: T.slate, marginTop: 4, lineHeight: 1.5 }}>{t(c.d, lang)}</span>
              </span>
            </button>
          </Card>
        ))}
      </div>
    </StepShell>
  );
  if (step === 2) return (
    <StepShell n={2} total={5} lang={lang} go={go} err={err} title={t("What is your project?", lang)}
      hint={t("One line is enough — for example 'tailoring unit' or 'B.Tech course'.", lang)}
      onBack={() => go("rec1")}
      onNext={() => (form.project.trim() ? go("rec3") : setErr(t("Please describe your project in a few words.", lang)))}>
      <input style={inputStyle} value={form.project} placeholder={t("e.g., Dairy unit with 4 cows", lang)} onChange={(e) => set({ project: e.target.value })} />
    </StepShell>
  );
  if (step === 3) return (
    <StepShell n={3} total={5} lang={lang} go={go} err={err} title={t("What is the estimated project cost?", lang)}
      hint={t("The total money needed to start — your own savings plus the loan.", lang)}
      onBack={() => go("rec2")}
      onNext={() => { const v = +form.cost; if (!v || v <= 0) return setErr(t("Please enter a valid project cost in rupees.", lang)); go("rec4"); }}>
      <MoneyInput value={form.cost} placeholder="8,00,000" onChange={(v) => set({ cost: v })} />
      {+form.cost > 0 && <div style={{ fontSize: 14, color: T.green, fontWeight: 700, marginTop: 8 }}>{t("You entered", lang)} {inr(+form.cost)}</div>}
    </StepShell>
  );
  if (step === 4) return (
    <StepShell n={4} total={5} lang={lang} go={go} err={err} title={t("What is your family's yearly income?", lang)}
      hint={t("Enter the total income earned by your family in one year, from all sources.", lang)}
      onBack={() => go("rec3")}
      onNext={() => { const v = +form.income; if (!v || v <= 0) return setErr(t("Please enter a valid yearly family income.", lang)); go("rec5"); }}>
      <MoneyInput value={form.income} placeholder="3,00,000" onChange={(v) => set({ income: v })} />
      <div style={{ fontSize: 13.5, color: T.slate, marginTop: 10 }}>{t("These schemes are for families earning up to ₹5,00,000 per year.", lang)}</div>
    </StepShell>
  );
  return (
    <StepShell n={5} total={5} lang={lang} go={go} err={err} title={t("Your education status", lang)}
      hint={t("This helps us match education loans and skill-linked schemes.", lang)}
      nextLabel={t("Find my scheme", lang)}
      onBack={() => go("rec4")}
      onNext={async () => {
        if (+form.income > INCOME_CAP) {
          setRec({ ok: false, why: ["Your family's yearly income is above the ₹5,00,000 limit used by these concessional schemes (demo rule). You may still be eligible for other government schemes — ask your district office."] });
          return go("result");
        }
        setRec({ loading: true });
        go("result");
        try {
          const res = await api.recommend({
            state,
            projectCost: +form.cost,
            annualIncome: +form.income,
            projectType: projectTypeFor(form.support),
            educationStatus: form.edu,
          });
          const top = (res.recommendations ?? [])[0];
          if (!top) {
            setRec({ ok: false, why: ["No scheme in the current dataset matches that combination of project cost and income. Try adjusting the project cost, or ask your district office about other schemes."] });
            return;
          }
          setRec({
            ok: true,
            scheme: adaptRecommendation(top),
            alternatives: (res.recommendations ?? []).slice(1).map(adaptRecommendation),
            financing: top.maxLoan,
            cost: +form.cost,
            income: +form.income,
            edu: form.edu,
            total: res.total,
          });
        } catch {
          setRec({ ok: false, error: true, why: ["Could not reach the server. Is the backend running on port 3001?"] });
        }
      }}>
      <select style={inputStyle} value={form.edu} onChange={(e) => set({ edu: e.target.value })}>
        {["No formal schooling", "Class 8 pass", "Class 10 pass", "Class 12 pass", "Diploma / ITI", "Graduate", "Currently a student"].map((o) => <option key={o} value={o}>{t(o, lang)}</option>)}
      </select>
    </StepShell>
  );
};

/* Documents are not part of the backend contract — no scheme record carries a
   document list. This generic checklist mirrors the NSFDC eligibility block
   (dataset.eligibility) and is clearly frontend-owned. */
const BASE_DOCS = ["Caste certificate", "Income certificate", "Aadhaar", "Bank passbook"];
const PROJECT_DOCS = ["Project report", "Quotations"];
const EDU_DOCS = ["Admission letter", "Fee structure"];

const Result = ({ go, rec, state, showWhy, setShowWhy, setCalc, lang }) => {
  const code = rec?.ok ? rec.scheme.code : null;
  // enrich the recommendation with the scheme's own record (description,
  // channels, cost band) — GET /api/schemes/:code
  const details = useAsync(() => api.schemeDetails(code), [code], { skip: !code });

  if (!rec) return <Page><Card>{t("Start with \"Find my scheme\" from the dashboard.", lang)}</Card></Page>;
  if (rec.loading) return (
    <Page><JourneyRail step={1} lang={lang} go={go} /><Card>{t("Loading…", lang)}</Card></Page>
  );
  if (!rec.ok) return (
    <Page>
      <JourneyRail step={1} lang={lang} go={go} />
      <Card>
        <h2 style={{ marginTop: 0 }}>{t("We couldn't match a scheme", lang)}</h2>
        <p style={{ color: T.slate, lineHeight: 1.55 }}>{t(rec.why[0], lang, rec.why[1])}</p>
        <Btn kind="secondary" onClick={() => go("rec4")}>{t("Edit my answers", lang)}</Btn>
      </Card>
    </Page>
  );

  const s = rec.scheme;
  const d = details.data?.scheme;
  const isEdu = s.code === "ELS";
  const docs = [...BASE_DOCS, ...(isEdu ? EDU_DOCS : PROJECT_DOCS)];

  /* Reasons are derived from the values the backend actually returned, so the
     explainer can never drift from the recommendation it explains. */
  const reasons = [];
  if (d?.project_cost_min != null && d?.project_cost_max != null)
    reasons.push(["Your project cost of {cost} fits this scheme's applicable range ({min}–{max}).",
      { cost: inr(rec.cost), min: inr(d.project_cost_min), max: inr(d.project_cost_max) }]);
  reasons.push(["Your family's yearly income of {income} is within the ₹5,00,000 eligibility limit.", { income: inr(rec.income) }]);
  if (s.type === "state") reasons.push(["Partners offering this scheme are active in {state}.", { state: s.state ?? state }]);
  if (isEdu) reasons.push(["Matched because you are pursuing further studies ({edu}).", { edu: rec.edu }]);

  return (
    <Page>
      <JourneyRail step={2} lang={lang} go={go} reachable={(i) => i !== 2} />
      <Card pad={0} style={{ overflow: "hidden" }}>
        <div style={{ background: `linear-gradient(120deg, ${T.greenBg}, #F3FBF6)`, padding: "20px 24px", borderBottom: `1px solid #D7EEDF` }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Badge tone="ok">{t("Recommended for you", lang)}</Badge>
            <Badge tone="info">{s.code}</Badge>
            <Badge tone={s.type === "state" ? "saffron" : "info"}>{s.type === "state" ? t("State scheme", lang) : t("National scheme", lang)}</Badge>
          </div>
          <h2 style={{ fontSize: 27, margin: "10px 0 2px", fontWeight: 800 }}>{s.name}</h2>
          <div style={{ color: T.slate, fontSize: 14.5, lineHeight: 1.5 }}>{t("Based on what you told us, this appears to be the most suitable option in {state}.", lang, { state })}</div>
          {d?.description && <div style={{ color: T.slate, fontSize: 14, marginTop: 8, lineHeight: 1.55 }}>{d.description}</div>}
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ margin: "0 0 8px", fontWeight: 800 }}>{t("Why this recommendation?", lang)}</div>
          <div style={{ display: "grid", gap: 7 }}>
            {reasons.map((r, i) => (
              <div key={i} style={{ fontSize: 14.5, color: T.ink, display: "flex", gap: 8 }}><span style={{ color: T.green, fontWeight: 800 }}>✓</span><span style={{ lineHeight: 1.5 }}>{t(r[0], lang, r[1])}</span></div>
            ))}
          </div>
          <Btn kind="tertiary" small onClick={() => setShowWhy(!showWhy)}>{showWhy ? t("Hide explanation", lang) : t("Why am I seeing this?", lang)}</Btn>
          {showWhy && (
            <div style={{ background: "#F2FAF4", borderRadius: 12, padding: "13px 16px", fontSize: 14, lineHeight: 1.6, color: T.ink, borderLeft: `4px solid ${T.navy}` }}>
              {t("You entered a project cost of {cost} and a family income of {income}, which is below ₹5 lakh. Based on {state}'s demo scheme parameters, the {scheme} category is currently the closest match: it finances projects between {min} and {max} at {rate}% per year with a {tenure}-year tenure. Nothing here is final — the channel partner confirms eligibility when you apply.", lang,
                { cost: inr(rec.cost), income: inr(rec.income), state, scheme: s.name,
                  min: inr(d?.project_cost_min ?? 0), max: inr(d?.project_cost_max ?? s.maxLoan),
                  rate: s.rate, tenure: s.tenure })}
              {rec.total > 1 && (
                <div style={{ marginTop: 8, color: T.slate }}>
                  {t("The server ranked {n} matching schemes; this one scored highest.", lang, { n: rec.total })}
                </div>
              )}
            </div>
          )}

          <div style={{ borderTop: `1px solid ${T.border}`, margin: "18px 0 14px" }} />
          <div style={{ fontWeight: 800, marginBottom: 10 }}>{t("Estimated financing", lang)}</div>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
            {[["Project cost", inr(rec.cost), "#F6F8FC"],
              ["Estimated maximum financing", inr(s.maxLoan), T.greenBg],
              ["Interest rate", s.rate + "%*", "#F6F8FC"],
              ["Tenure", s.tenure + " " + t("years*", lang), "#F6F8FC"],
              ["Moratorium", s.moratoriumMonths + " " + t("months*", lang), T.amberBg]].map(([k, v, bg]) => (
              <div key={k} style={{ background: bg, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 12.5, color: T.slate }}>{t(k, lang)}</div>
                <div style={{ fontSize: k.includes("financing") ? 24 : 19, fontWeight: 800, color: k.includes("financing") ? T.green : T.ink, fontVariantNumeric: "tabular-nums" }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 10, fontSize: 13.5, color: T.slate, flexWrap: "wrap" }}>
            <span>{t("Indicative quarterly instalment", lang)}: <b style={{ color: T.ink }}>{inr(s.quarterly)}</b></span>
            <span>{t("Covers", lang)} {s.coverage}% {t("of project cost", lang)}</span>
          </div>
          <div style={{ fontSize: 12.5, color: T.slate, marginTop: 8 }}>{t("*Demo / state / partner-dependent values.", lang)}</div>

          {rec.alternatives?.length > 0 && (
            <>
              <div style={{ borderTop: `1px solid ${T.border}`, margin: "16px 0 12px" }} />
              <div style={{ fontWeight: 800, marginBottom: 8 }}>{t("Other schemes you may qualify for", lang)}</div>
              <div style={{ display: "grid", gap: 8 }}>
                {rec.alternatives.map((a) => (
                  <div key={a.code} style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap", fontSize: 14 }}>
                    <Badge tone="info">{a.code}</Badge>
                    <b style={{ color: T.ink }}>{a.name}</b>
                    <span style={{ color: T.slate }}>{inr(a.maxLoan)} · {a.rate}% · {a.tenure}y</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ borderTop: `1px solid ${T.border}`, margin: "16px 0 14px" }} />
          <div style={{ fontWeight: 800, marginBottom: 6 }}>{t("Basic eligibility", lang)}</div>
          <div style={{ fontSize: 14, color: T.slate, lineHeight: 1.6 }}>{t("Scheduled Caste applicant · family income up to ₹5,00,000/yr · project cost within scheme range · age 18–55 (demo rule).", lang)}</div>
          <div style={{ fontWeight: 800, margin: "14px 0 6px" }}>{t("Documents you will need", lang)}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {docs.map((doc) => <Badge key={doc} tone="info">{t(doc, lang)}</Badge>)}
          </div>
          <div style={{ fontWeight: 800, margin: "14px 0 6px" }}>{t("Next step", lang)}</div>
          <div style={{ fontSize: 14, color: T.slate }}>
            {t("Apply through:", lang)}{" "}
            <b style={{ color: T.ink }}>{d?.channels?.join(", ") || t("Any eligible channel partner in your district", lang)}</b>
          </div>
          <DemoNote lang={lang} />
        </div>
      </Card>
      <StickyBar>
        <Btn kind="secondary" onClick={() => go("rec5")}>{t("Back", lang)}</Btn>
        <div style={{ flex: 1 }} />
        <Btn kind="secondary" onClick={() => { setCalc({ scheme: s.name, code: s.code, amount: Math.round(s.maxLoan), rate: s.rate, tenure: s.tenure, mor: s.moratorium }); go("calc"); }}>{t("View repayment", lang)}</Btn>
        <Btn kind="success" onClick={() => go("partners")}>{t("Find eligible partner", lang)}</Btn>
      </StickyBar>
    </Page>
  );
};

const Calculator = ({ go, state, calc, setCalc, rec, lang, catalogue }) => {
  // Scheme picker is driven by the live catalogue: national schemes plus any
  // state schemes for the selected state.
  const pool = useMemo(() => {
    const cat = catalogue?.data?.schemes;
    if (!cat) return [];
    // NOTE: we deliberately do NOT drop schemes with a null maxAmount.
    // GET /api/schemes reports maxAmount/tenureYears as undefined for ELS
    // (it maps max_loan_amount / tenure_years, but the ELS record stores
    // max_loan_amount_india / tenure_years_not_started) and for 7 state
    // schemes with no unit_cost_max. Filtering on it silently hid ELS from
    // the calculator. See the API-contract notes in the summary.
    return [
      ...(cat.national ?? []),
      ...(cat.state ?? []).filter((x) => !state || x.state === state),
    ];
  }, [catalogue, state]);

  const c = calc || { scheme: "", amount: 720000, rate: 8, tenure: 5, mor: 2 };
  const setC = setCalc;
  const valid = +c.amount > 0 && +c.rate >= 0 && +c.tenure > 0;

  // POST /api/emi — the server owns the amortisation maths. Our field is in
  // QUARTERS; emiQuarters() converts to the moratoriumMonths the API expects.
  const emi = useAsync(
    () => emiQuarters({ amount: +c.amount, rate: +c.rate, tenureYears: +c.tenure, moratoriumQuarters: +c.mor || 0 }),
    [c.amount, c.rate, c.tenure, c.mor],
    { skip: !valid }
  );
  const sc = emi.data ?? { eqi: 0, quarters: 0, totalInterest: 0, totalPaid: 0, rows: [] };

  const SCHEDULE_PREVIEW = 8;
  const [showAllRows, setShowAllRows] = useState(false);
  const visibleRows = showAllRows ? sc.rows : sc.rows.slice(0, SCHEDULE_PREVIEW);
  const principalPct = sc.totalPaid > 0
    ? Math.round(((+c.amount || 0) / sc.totalPaid) * 100)
    : 100;
  return (
    <Page wide>
      <JourneyRail step={3} lang={lang} go={go} reachable={(i) => i !== 3 && (i !== 2 || (rec && rec.ok))} />
      <h2 style={{ fontSize: 25, margin: "0 0 2px", fontWeight: 800 }}>{t("Plan your repayment", lang)}</h2>
      <p style={{ color: T.slate, marginTop: 0, lineHeight: 1.5 }}>{t("Repayments under these schemes are", lang)} <b style={{ color: T.ink }}>{t("quarterly", lang)}</b> {t("— one instalment every 3 months, not every month.", lang)}</p>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", alignItems: "start" }}>
        <Card>
          <Field label={t("Scheme", lang)}>
            <select style={inputStyle} value={c.code ?? ""} onChange={(e) => {
              const s = pool.find((x) => x.code === e.target.value);
              if (!s) return;
              setC({
                scheme: s.name, code: s.code,
                // maxAmount can be null for ELS / some state schemes — keep
                // whatever the user already typed rather than clamping to NaN.
                amount: s.maxAmount ? Math.min(+c.amount || s.maxAmount, s.maxAmount) : (+c.amount || 0),
                rate: s.rate ?? (+c.rate || 8),
                tenure: s.tenureYears ?? (+c.tenure || 5),
                mor: c.mor ?? 2,
              });
            }}>
              <option value="">{t("Select a scheme", lang)}</option>
              {pool.map((s) => <option key={s.code} value={s.code}>{s.name}{s.state ? ` · ${s.state}` : ""}</option>)}
            </select>
          </Field>
          <Field label={t("Loan amount", lang)} hint={t("How much you plan to borrow.", lang)}>
            <MoneyInput value={c.amount} onChange={(v) => setC({ ...c, amount: v })} />
          </Field>
          <Field label={t("Interest rate (% per year)", lang)}><input style={inputStyle} inputMode="decimal" value={c.rate} onChange={(e) => setC({ ...c, rate: e.target.value })} /></Field>
          <Field label={t("Tenure (years)", lang)}><input style={inputStyle} inputMode="numeric" value={c.tenure} onChange={(e) => setC({ ...c, tenure: e.target.value.replace(/[^\d]/g, "") })} /></Field>
          <Field label={t("Moratorium (quarters)", lang)} hint={t("A rest period at the start. In this demo you pay interest only during moratorium — no principal.", lang)}>
            <input style={inputStyle} inputMode="numeric" value={c.mor} onChange={(e) => setC({ ...c, mor: e.target.value.replace(/[^\d]/g, "") })} />
          </Field>
          <DemoNote lang={lang} />
        </Card>

        <div style={{ display: "grid", gap: 16 }}>
          {!valid ? (
            <Card><div style={{ color: T.red, fontSize: 15 }}>{t("Please enter a valid loan amount, interest rate and tenure to see your repayment.", lang)}</div></Card>
          ) : emi.loading ? (
            <Card>{t("Loading…", lang)}</Card>
          ) : emi.error ? (
            <Card><div style={{ color: T.red, fontSize: 15 }}>{t("Could not reach the server. Is the backend running on port 3001?", lang)}</div></Card>
          ) : (
            <>
              <Card pad={0} style={{ overflow: "hidden" }}>
                <div style={{ background: `linear-gradient(135deg, ${T.navyDeep}, ${T.navy})`, color: "#fff", padding: "18px 22px" }}>
                  <div style={{ fontSize: 13, color: "#CFEBD9" }}>{t("Estimated quarterly instalment", lang)}</div>
                  <div style={{ fontSize: 34, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{inr(sc.eqi)}</div>
                  <div style={{ fontSize: 12.5, color: "#CFEBD9" }}>{t("every 3 months × {n} quarters", lang, { n: sc.quarters })}</div>
                </div>

                {/* What the loan actually costs: principal vs interest, to scale. */}
                <div style={{ padding: "16px 22px 4px" }}>
                  <div style={{ fontSize: 13, color: T.slate, marginBottom: 8 }}>{t("Where your money goes", lang)}</div>
                  <div style={{ display: "flex", height: 14, borderRadius: 999, overflow: "hidden", background: T.border }}>
                    <div title={t("Principal", lang)} style={{ width: `${principalPct}%`, background: T.green }} />
                    <div title={t("Interest", lang)} style={{ width: `${100 - principalPct}%`, background: T.saffron }} />
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12.5, color: T.slate, flexWrap: "wrap" }}>
                    <span><span style={{ display: "inline-block", width: 10, height: 10, background: T.green, borderRadius: 3, marginRight: 5 }} />{t("Principal", lang)} {principalPct}%</span>
                    <span><span style={{ display: "inline-block", width: 10, height: 10, background: T.saffron, borderRadius: 3, marginRight: 5 }} />{t("Interest", lang)} {100 - principalPct}%</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 0, marginTop: 12 }}>
                  <div style={{ padding: "14px 22px", borderTop: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 13, color: T.slate }}>{t("You borrow", lang)}</div>
                    <div style={{ fontSize: 19, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{inr(+c.amount || 0)}</div>
                  </div>
                  <div style={{ padding: "14px 22px", borderTop: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 13, color: T.slate }}>{t("Total interest", lang)}</div>
                    <div style={{ fontSize: 19, fontWeight: 800, color: T.saffron, fontVariantNumeric: "tabular-nums" }}>{inr(sc.totalInterest)}</div>
                  </div>
                  <div style={{ padding: "14px 22px", borderTop: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 13, color: T.slate }}>{t("Total repayment", lang)}</div>
                    <div style={{ fontSize: 19, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{inr(sc.totalPaid)}</div>
                  </div>
                </div>

                {+c.mor > 0 && (
                  <div style={{ margin: "14px 22px 18px", background: T.amberBg, color: T.amber, borderRadius: 10, padding: "10px 14px", fontSize: 13.5, lineHeight: 1.5 }}>
                    {t("During the {q}-quarter moratorium you pay interest only ({amt} per quarter). Principal repayment starts from quarter {start}.", lang, { q: +c.mor, amt: inr((sc.moratoriumInterest ?? 0) / Math.max(1, +c.mor)), start: +c.mor + 1 })}
                  </div>
                )}
              </Card>

              <Card>
                <div style={{ fontWeight: 800, marginBottom: 10 }}>{t("Repayment timeline", lang)}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {sc.rows.map((r) => (
                    <div key={r.q} title={`Q${r.q}: ${inr(r.payment)}`} style={{
                      width: 34, height: 26, borderRadius: 6, display: "grid", placeItems: "center",
                      fontSize: 10.5, fontWeight: 700,
                      background: r.phase === "moratorium" ? T.amberBg : T.greenBg,
                      color: r.phase === "moratorium" ? T.amber : T.green,
                      border: `1px solid ${r.phase === "moratorium" ? "#F0D9B5" : "#CBE8DA"}`,
                    }}>Q{r.q}</div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 12.5, color: T.slate, flexWrap: "wrap" }}>
                  <span><span style={{ display: "inline-block", width: 10, height: 10, background: T.amberBg, border: "1px solid #F0D9B5", borderRadius: 3, marginRight: 5 }} />{t("Moratorium (interest only)", lang)}</span>
                  <span><span style={{ display: "inline-block", width: 10, height: 10, background: T.greenBg, border: "1px solid #CBE8DA", borderRadius: 3, marginRight: 5 }} />{t("Repayment", lang)}</span>
                </div>
              </Card>

              <Card pad={0}>
                <div style={{ fontWeight: 800, padding: "16px 20px 8px" }}>{t("Quarterly repayment schedule", lang)}</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, fontVariantNumeric: "tabular-nums" }}>
                    <thead>
                      <tr style={{ color: T.slate, background: T.mint }}>
                        {["Quarter", "Principal", "Interest", "Payment", "Balance"].map((h, i) => (
                          <th key={h} style={{ padding: "9px 14px", textAlign: i === 0 ? "left" : "right", borderBottom: `1px solid ${T.border}`, fontWeight: 700 }}>{t(h, lang)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((r) => (
                        <tr key={r.q} style={{ background: r.phase === "moratorium" ? "#FFFCF4" : "#fff" }}>
                          <td style={{ padding: "7px 14px", borderBottom: `1px solid ${T.border}` }}>Q{r.q}{r.phase === "moratorium" ? " " + t("· moratorium", lang) : ""}</td>
                          <td style={{ padding: "7px 14px", textAlign: "right", borderBottom: `1px solid ${T.border}` }}>{inr(r.principal)}</td>
                          <td style={{ padding: "7px 14px", textAlign: "right", borderBottom: `1px solid ${T.border}` }}>{inr(r.interest)}</td>
                          <td style={{ padding: "7px 14px", textAlign: "right", borderBottom: `1px solid ${T.border}`, fontWeight: 700 }}>{inr(r.payment)}</td>
                          <td style={{ padding: "7px 14px", textAlign: "right", borderBottom: `1px solid ${T.border}` }}>{inr(r.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* long schedules are collapsed by default — 28 quarters of rows
                    buried the actions below the fold */}
                {sc.rows.length > SCHEDULE_PREVIEW && (
                  <div style={{ padding: "10px 20px 16px" }}>
                    <Btn kind="tertiary" small onClick={() => setShowAllRows(!showAllRows)}>
                      {showAllRows
                        ? t("Show fewer quarters", lang)
                        : t("Show all {n} quarters", lang, { n: sc.rows.length })}
                    </Btn>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
      <StickyBar wide>
        <div style={{ flex: 1 }} />
        <Btn kind="secondary" onClick={() => go(rec && rec.ok ? "result" : "dashboard")}>{t("Back", lang)}</Btn>
        <Btn kind="success" onClick={() => go("partners")}>{t("Find eligible partner", lang)}</Btn>
      </StickyBar>
    </Page>
  );
};

const Partners = ({ go, state, selPartner, setSelPartner, showFiltered, setShowFiltered, lang, rec }) => {
  const hasRec = !!(rec && rec.ok);
  // Ask the browser where we are; fall back to a state anchor (see api.js).
  const [pos, setPos] = useState(undefined); // undefined = still asking
  useEffect(() => { let alive = true; currentPosition().then((p) => alive && setPos(p)); return () => { alive = false; }; }, []);

  const res = useAsync(
    () => partnersForState(state, pos ? { lat: pos.lat, lng: pos.lng } : {}),
    [state, pos],
    { skip: pos === undefined }
  );

  // State-level fund position — GET /api/fund/:state
  const fund = useAsync(() => api.fund(state), [state], { skip: !state });

  const ok = res.data?.eligible ?? [];
  const hidden = res.data?.filtered ?? [];
  const busy = pos === undefined || res.loading;

  return (
    <Page wide>
      <JourneyRail step={4} lang={lang} go={go} reachable={(i) => i !== 4 && (i !== 2 || hasRec)} />
      <h2 style={{ fontSize: 25, margin: "0 0 2px", fontWeight: 800 }}>{t("Nearest eligible partners in {state}", lang, { state })}</h2>
      <p style={{ color: T.slate, marginTop: 0, maxWidth: 640, lineHeight: 1.55 }}>
        {t("We first check which partners can actually take new applications, then rank them by book health and distance. The nearest partner is not always the right one.", lang)}
      </p>
      {res.data?.anchoredInState && res.data.total > 0 && (
        <div style={{ fontSize: 13, color: T.slate, marginBottom: 10, lineHeight: 1.6 }}>
          {t("Distances are measured from within {state}, not from your current location.", lang, { state })}
        </div>
      )}
      {fund.data && fund.data.status && fund.data.status !== "unknown" && (
        <Card pad={14} style={{ marginBottom: 14, background: fund.data.status === "exhausted" ? T.redBg : T.greenBg, borderColor: "transparent" }}>
          <div style={{ fontSize: 14, color: T.ink, lineHeight: 1.6 }}>
            <b>{t("State fund status", lang)}:</b> {fund.data.label ?? fund.data.status}
            {fund.data.allocation_lakh != null && (
              <> · {t("allocated", lang)} ₹{fund.data.allocation_lakh.toLocaleString("en-IN")} {t("lakh", lang)}</>
            )}
          </div>
        </Card>
      )}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", alignItems: "start" }}>
        <div style={{ display: "grid", gap: 12 }}>
          {busy && <Card>{t("Loading…", lang)}</Card>}
          {res.error && (
            <Card><div style={{ fontSize: 15, color: T.red }}>{t("Could not reach the server. Is the backend running on port 3001?", lang)}</div></Card>
          )}
          {!busy && !res.error && ok.length === 0 && (
            <Card><div style={{ fontSize: 15, color: T.slate }}>{t("We couldn't find an eligible partner nearby. Try again later or contact your district SCA office.", lang)}</div></Card>
          )}
          {ok.map((p, i) => (
            <Card key={p.id} lift style={{ borderColor: selPartner && selPartner.id === p.id ? T.navy : T.border, borderWidth: 2 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{i === 0 ? "⭐ " : ""}{p.name}</div>
<Badge tone="info">{p.approxLocation ? "~" : ""}{p.km} {t("km", lang)}</Badge>
                {p.approxLocation && <Badge tone="warn">{t("Approx. location", lang)}</Badge>}
              </div>
              <div style={{ margin: "8px 0" }}>
                {p.npaStatus === "LOW" ? <Badge tone="ok">{t("✓ Accepting applications", lang)}</Badge>
                  : p.npaStatus === "MEDIUM" ? <Badge tone="warn">{t("⚠ Limited availability", lang)}</Badge>
                  : <Badge tone="bad">{t("⚠ Limited availability", lang)}</Badge>}
                {p.health != null && <Badge tone="info">{t("Health", lang)} {p.health}/100</Badge>}
                {p.partnerType && <Badge tone="info">{p.partnerType}</Badge>}
              </div>
              <div style={{ fontSize: 14, color: T.slate }}>{p.addr}</div>
              {p.phone && <div style={{ fontSize: 14, color: T.slate }}>☎ {p.phone}</div>}
              <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <Btn small kind="secondary" onClick={() => setSelPartner(selPartner && selPartner.id === p.id ? null : p)}>{selPartner && selPartner.id === p.id ? t("Hide details", lang) : t("View details", lang)}</Btn>
                <Btn small onClick={() => { setSelPartner(p); go("directions"); }}>{t("Get directions", lang)}</Btn>
              </div>
              {selPartner && selPartner.id === p.id && (
                <div style={{ marginTop: 12, fontSize: 14, color: T.ink, background: "#F6F8FC", borderRadius: 10, padding: "10px 14px", lineHeight: 1.6 }}>
                  {t("Handles concessional loan applications for {state}. Bring the document checklist from your recommendation.", lang, { state })}
                  {p.gnpa != null && <> {t("Modelled GNPA", lang)}: {p.gnpa}% ({p.npaStatus}).{p.npaSimulated ? ` ${t("Simulated — per-branch NPA is not published.", lang)}` : ""}</>}
                  {p.approxLocation && <div style={{ marginTop: 6, color: T.amber }}>{t("Only the state is known for this branch, so the map pin and distance are rough. Confirm the address before travelling.", lang)}</div>}
                </div>
              )}
            </Card>
          ))}
          {hidden.length > 0 && (
            <Card pad={16} style={{ background: "#FBFCFE", borderStyle: "dashed" }}>
              <div style={{ fontSize: 14, color: T.slate, lineHeight: 1.6 }}>
                🚫 {hidden.length} {t(hidden.length > 1 ? "partners near you are" : "partner near you is", lang)} <b style={{ color: T.ink }}>{t("currently unavailable for new applications", lang)}</b>{" "}
                {t("and were removed from this list automatically.", lang)}
                <Btn kind="tertiary" small onClick={() => setShowFiltered(!showFiltered)}>{showFiltered ? t("Hide", lang) : t("Show why (jury demo)", lang)}</Btn>
              </div>
              {showFiltered && hidden.map((p) => (
                <div key={p.id} style={{ marginTop: 10, fontSize: 13.5, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <Badge tone="bad">{t("✕ Filtered", lang)}</Badge>
                  <span style={{ color: T.ink, fontWeight: 700 }}>{p.name}</span>
                  <span style={{ color: T.slate }}>({p.km} {t("km", lang)}) — {t("high overdue/NPA status", lang)} ({p.npaStatus}); {t("full detail in Admin.", lang)}</span>
                </div>
              ))}
            </Card>
          )}
        </div>
        <PartnerMiniMap
          partners={ok}
          anchor={res.data?.anchor}
          selPartner={selPartner}
          setSelPartner={setSelPartner}
          lang={lang}
        />
      </div>
      <DemoNote lang={lang} />
      <StickyBar wide>
        <Btn kind="secondary" onClick={() => go(hasRec ? "result" : "dashboard")}>{t("Back", lang)}</Btn>
        <div style={{ flex: 1 }} />
        <Btn kind="secondary" onClick={() => go("calc")}>{t("View repayment", lang)}</Btn>
      </StickyBar>
    </Page>
  );
};

/* Real Google Map, embedded without an API key.
   The keyless `output=embed` endpoint renders an interactive map, and the
   Maps URL scheme opens turn-by-turn navigation in the user's own maps app.
   Neither needs a billing account or a key in the bundle. */
const GoogleMapEmbed = ({ lat, lng, label, lang }) => {
  const ok = Number.isFinite(lat) && Number.isFinite(lng);
  if (!ok) {
    return (
      <div style={{
        height: 300, borderRadius: 12, border: `1px solid ${T.border}`,
        background: T.mint, display: "grid", placeItems: "center",
        color: T.slate, fontSize: 14, textAlign: "center", padding: 20,
      }}>{t("This partner has no location on file.", lang)}</div>
    );
  }
  const q = `${lat},${lng}`;
  return (
    <iframe
      title={label ?? t("Map", lang)}
      src={`https://www.google.com/maps?q=${encodeURIComponent(q)}&z=15&hl=en&output=embed`}
      style={{ width: "100%", height: 300, border: `1px solid ${T.border}`, borderRadius: 12, display: "block" }}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
    />
  );
};

const Directions = ({ go, selPartner, lang }) => {
  const p = selPartner;
  if (!p) return <Page><Card>{t("No eligible partner selected.", lang)}</Card></Page>;

  const hasCoords = Number.isFinite(p.lat) && Number.isFinite(p.lng);
  const dest = hasCoords ? `${p.lat},${p.lng}` : p.addr;
  // Google's documented cross-platform URL scheme: opens the native maps app
  // on Android/iOS and Google Maps on desktop.
  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
  const pinUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest)}`;

  const rows = [
    [t("Starting location", lang), t("Your current location (demo)", lang)],
    [t("Selected partner", lang), p.name],
    [t("Estimated distance", lang), p.km != null ? p.km + " " + t("km", lang) : "—"],
    [t("Partner type", lang), p.partnerType ?? "—"],
  ];

  return (
    <Page wide>
      <JourneyRail step={4} lang={lang} go={go} />
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", alignItems: "start" }}>
        <Card>
          <Badge tone="ok">{t("Eligibility checked ✓ — routing to a partner that can take your application", lang)}</Badge>
          <h2 style={{ fontSize: 24, margin: "12px 0 14px", fontWeight: 800 }}>{t("Directions", lang)}</h2>
          <div>
            {rows.map(([k, v], i) => (
              <div key={k} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 14, height: 14, borderRadius: 999, background: i === 0 ? T.navy : i === 1 ? T.green : "#C9DCD0", marginTop: 5, boxShadow: i < 2 ? "0 2px 5px rgba(0,0,0,.2)" : "none" }} />
                  {i < rows.length - 1 && <div style={{ width: 3, height: 34, background: T.border, borderRadius: 2 }} />}
                </div>
                <div style={{ paddingBottom: 14 }}>
                  <div style={{ fontSize: 12.5, color: T.slate }}>{k}</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{v}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 14, color: T.slate, marginBottom: 14 }}>
            {p.addr}{p.phone ? <> · ☎ {p.phone}</> : null}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Btn kind="secondary" onClick={() => go("partners")}>{t("Back to partners", lang)}</Btn>
            <a className="hoverBtn" href={navUrl} target="_blank" rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: T.green, color: "#fff", textDecoration: "none",
                fontWeight: 700, borderRadius: 10, padding: "14px 24px",
                minHeight: 48, boxSizing: "border-box", fontSize: 16,
              }}>
              {t("Start navigation", lang)} ↗
            </a>
          </div>
          <div style={{ fontSize: 12.5, color: T.slate, marginTop: 10, lineHeight: 1.55 }}>
            {t("Opens Google Maps in a new tab, or your phone's maps app.", lang)}
          </div>
        </Card>

        <Card pad={0} style={{ overflow: "hidden" }}>
          <GoogleMapEmbed lat={p.lat} lng={p.lng} label={p.name} lang={lang} />
          <div style={{ padding: "12px 16px", fontSize: 13.5, color: T.slate, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ flex: 1, minWidth: 140 }}>
              <b style={{ color: T.ink }}>{p.name}</b>
            </span>
            {hasCoords && (
              <a className="msLink" href={pinUrl} target="_blank" rel="noopener noreferrer"
                style={{ color: T.green, fontWeight: 700, fontSize: 13 }}>
                {t("Open in Google Maps", lang)} ↗
              </a>
            )}
          </div>
          {hasCoords && (
            <div style={{ padding: "0 16px 14px", fontSize: 12, color: T.slate }}>
              {t("Branch coordinates are approximate for some states.", lang)}
            </div>
          )}
        </Card>
      </div>
    </Page>
  );
};

const Admin = ({ go, state, lang, catalogue }) => {
  const states = catalogue?.data?.states ?? [];
  const schemesByState = useMemo(() => {
    const m = {};
    for (const sc of catalogue?.data?.schemes?.state ?? []) (m[sc.state] ||= []).push(sc);
    return m;
  }, [catalogue]);

  /* Per-state fund position (GET /api/fund/:state) plus a live sample of
     branch health (GET /api/partners) — the same enrichment citizens never see. */
  const rows = useAsync(async () => {
    const out = [];
    for (const st of states) {
      const [fund, partners] = await Promise.all([
        api.fund(st).catch(() => null),
        api.partners({ state: st, limit: 5 }).catch(() => ({ branches: [], total: 0 })),
      ]);
      out.push({ state: st, fund, total: partners.total ?? 0, branches: (partners.branches ?? []).map(adaptPartner) });
    }
    return out;
  }, [states.join(",")], { skip: states.length === 0 });

  return (
    <Page wide>
      <h2 style={{ fontSize: 25, margin: "0 0 2px", fontWeight: 800 }}>{t("Admin — partner health & scheme parameters", lang)}</h2>
      <p style={{ color: T.slate, marginTop: 0, lineHeight: 1.5, maxWidth: 680 }}>{t("Internal view. Fund status and NPA levels shown here are never exposed to citizens — filtered partners simply appear as \"currently unavailable\".", lang)}</p>

      {(catalogue?.loading || rows.loading) && <Card>{t("Loading…", lang)}</Card>}
      {(catalogue?.error || rows.error) && (
        <Card><span style={{ color: T.red }}>{t("Could not reach the server. Is the backend running on port 3001?", lang)}</span></Card>
      )}

      {(rows.data ?? []).map((r) => (
        <Card key={r.state} pad={0} style={{ marginBottom: 16, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", background: "#F8FAFD", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, fontSize: 16 }}>{r.state}</span>
            {r.fund?.status && (
              <Badge tone={r.fund.status === "exhausted" ? "bad" : r.fund.status === "low" ? "warn" : "ok"}>
                {t(r.fund.status, lang)}
              </Badge>
            )}
            {r.fund?.allocation_lakh != null && (
              <span style={{ fontSize: 13, color: T.slate }}>
                {t("allocated", lang)} ₹{r.fund.allocation_lakh.toLocaleString("en-IN")} {t("lakh", lang)} ·{" "}
                {t("actuals", lang)} ₹{(r.fund.actuals_lakh ?? 0).toLocaleString("en-IN")} {t("lakh", lang)}
              </span>
            )}
            <span style={{ marginLeft: "auto", fontSize: 13, color: T.slate }}>
              {r.total.toLocaleString("en-IN")} {t("branches", lang)}
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead><tr style={{ color: T.slate, textAlign: "left" }}>
                {["Partner", "Funds", "NPA (simulated)", "Distance", "Visibility to users"].map((h) => <th key={h} style={{ padding: "9px 20px", borderBottom: `1px solid ${T.border}`, fontWeight: 700 }}>{t(h, lang)}</th>)}
              </tr></thead>
              <tbody>
                {r.branches.map((p) => (
                  <tr key={p.id}>
                    <td style={{ padding: "9px 20px", borderBottom: `1px solid ${T.border}`, fontWeight: 700 }}>{p.name}</td>
                    {/* Fund status is per-STATE in this API, not per-branch — see CONTRACT NOTE 2 */}
                    <td style={{ padding: "9px 20px", borderBottom: `1px solid ${T.border}` }}>
                      <Badge tone={r.fund?.status === "exhausted" ? "bad" : r.fund?.status === "low" ? "warn" : "ok"}>{t(r.fund?.status ?? "unknown", lang)}</Badge></td>
                    <td style={{ padding: "9px 20px", borderBottom: `1px solid ${T.border}` }}>
                      <Badge tone={p.npaStatus === "LOW" ? "ok" : p.npaStatus === "MEDIUM" ? "warn" : "bad"}>{p.npaStatus} {p.gnpa != null ? `${p.gnpa}%` : ""}</Badge></td>
                    <td style={{ padding: "9px 20px", borderBottom: `1px solid ${T.border}` }}>{p.km != null ? `${p.km} ${t("km", lang)}` : "—"}</td>
                    <td style={{ padding: "9px 20px", borderBottom: `1px solid ${T.border}` }}>
                      {p.eligible ? <Badge tone="ok">{t("✓ Shown to users", lang)}</Badge> : <Badge tone="bad">{t("✕ Filtered from results", lang)}</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "10px 20px 16px", fontSize: 13, color: T.slate, lineHeight: 1.6 }}>
            {t("Scheme parameters:", lang)}{" "}
            {(schemesByState[r.state] ?? []).map((s) => `${s.name}${s.maxAmount ? ` — ${t("up to", lang)} ${inr(s.maxAmount)}` : ""}${s.rate != null ? ` @ ${s.rate}%` : ""}`).join("  ·  ") || "—"}
          </div>
        </Card>
      ))}
      <Btn kind="secondary" onClick={() => go(state ? "dashboard" : "landing")}>{t("Exit admin", lang)}</Btn>
    </Page>
  );
};

/* ---------------- app root ---------------- */
export default function App() {
  const [page, setPage] = useState("landing");
  const [lang, setLang] = useState(0);
  const [state, setState] = useState(null);
  const [form, setForm] = useState({ support: null, project: "", cost: "", income: "", edu: "Class 10 pass" });
  const [rec, setRec] = useState(null);
  const [calc, setCalc] = useState(null);
  const [selPartner, setSelPartner] = useState(null);
  const [showWhy, setShowWhy] = useState(false);
  const [showFiltered, setShowFiltered] = useState(false);
  const [err, setErr] = useState("");

  /* ref mirrors `state` so a "pick a state, then navigate" click in the same
     event does not hit the guard below with a stale null. */
  const stateRef = useRef(state);
  const chooseState = (s) => {
    stateRef.current = s;
    setState(s);
    setSelPartner(null); setRec(null); setCalc(null);
  };

  const go = (p) => {
    setErr("");
    if (p !== "result") setShowWhy(false);
    if (!stateRef.current && ["dashboard", "rec1", "rec2", "rec3", "rec4", "rec5", "result", "calc", "partners", "directions"].includes(p)) p = "state";
    window.scrollTo(0, 0);
    setPage(p);
  };

  /* One catalogue fetch for the whole app: the state list, the scheme list and
     the health counters all come from the backend rather than a local constant. */
  const catalogue = useAsync(async () => {
    const [states, schemes, health] = await Promise.all([
      api.states(), api.schemes(), api.health(),
    ]);
    return {
      states: states.states ?? [],          // have their own state schemes (11)
      allStates: states.allStates ?? states.states ?? [], // full partner coverage (39)
      schemes,
      health,
    };
  }, []);

  const common = { go, state, lang, catalogue };
  let body;
  if (page === "landing") body = <Landing go={go} lang={lang} setState={chooseState} catalogue={catalogue} />;
  else if (page === "state") body = <StateSelect go={go} setState={chooseState} lang={lang} catalogue={catalogue} />;
  else if (page === "dashboard") body = <Dashboard {...common} setCalc={setCalc} />;
  else if (page.startsWith("rec")) body = <Recommender {...common} step={+page.slice(3)} form={form} setForm={setForm} err={err} setErr={setErr} setRec={setRec} />;
  else if (page === "result") body = <Result {...common} rec={rec} showWhy={showWhy} setShowWhy={setShowWhy} setCalc={setCalc} />;
  else if (page === "calc") body = <Calculator {...common} calc={calc} setCalc={setCalc} rec={rec} />;
  else if (page === "partners") body = <Partners {...common} rec={rec} selPartner={selPartner} setSelPartner={setSelPartner} showFiltered={showFiltered} setShowFiltered={setShowFiltered} />;
  else if (page === "directions") body = <Directions {...common} selPartner={selPartner} />;
  else body = <Admin go={go} state={state} lang={lang} catalogue={catalogue} />;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.ink, fontFamily: "'Segoe UI',system-ui,-apple-system,Roboto,'Noto Sans','Noto Sans Devanagari',sans-serif" }}>
      <style>{CSS}</style>
      <Header lang={lang} setLang={setLang} state={state} go={go} setState={chooseState} catalogue={catalogue} />
      {body}
      <FloatingChrome
        lang={lang}
        /* chat answers can hand their numbers straight to the calculator,
           or jump to the partner list for the state the agent detected */
        onOpenCalculator={(calc, st) => { if (st) chooseState(st); setCalc(calc); go("calc"); }}
        onFindPartners={(st) => { chooseState(st); go("partners"); }}
      />
    </div>
  );
}