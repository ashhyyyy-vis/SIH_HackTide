import { useState, useRef, useEffect, useCallback } from "react";
import { t } from "../i18n";
import {
  requestOtp, verifyOtp, isValidPhone, isValidOtp,
  normalisePhone, authErrorKey,
} from "../auth";

/* ============================================================
   Mobile + OTP sign-in.

   Two steps in one dialog: enter number -> enter the 6-digit code.
   Talks only to src/auth.js, which wraps the SIH_HackTide backend
   (:5001) through the /auth-api proxy. No URL is built here.

   Styling reuses the app's tokens via `T`, so this adds no second
   design system and no new dependency.
   ============================================================ */

const RESEND_SECONDS = 30;

export default function LoginModal({ T, lang = 0, open, onClose, onSignedIn }) {
  const [step, setStep] = useState("phone");     // "phone" | "otp"
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState(null);    // dev convenience, see auth.js
  const [cooldown, setCooldown] = useState(0);

  const phoneRef = useRef(null);
  const otpRef = useRef(null);

  /* focus whichever field is in play */
  useEffect(() => {
    if (!open) return;
    const el = step === "phone" ? phoneRef.current : otpRef.current;
    el?.focus();
  }, [open, step]);

  /* resend countdown */
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const reset = useCallback(() => {
    setStep("phone"); setPhone(""); setOtp("");
    setError(""); setDevOtp(null); setCooldown(0); setPending(false);
  }, []);

  const close = useCallback(() => { reset(); onClose?.(); }, [reset, onClose]);

  /* close on Escape, and trap the dialog while it is open */
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const sendCode = useCallback(async () => {
    if (pending) return;
    if (!isValidPhone(phone)) {
      setError(t("Enter a 10-digit mobile number.", lang));
      return;
    }
    setPending(true); setError("");
    try {
      const { devOtp: code } = await requestOtp(phone);
      setDevOtp(code);
      setStep("otp");
      setCooldown(RESEND_SECONDS);
    } catch (e) {
      setError(t(authErrorKey(e), lang));
    } finally {
      setPending(false);
    }
  }, [phone, pending, lang]);

  const submitCode = useCallback(async () => {
    if (pending) return;
    if (!isValidOtp(otp)) {
      setError(t("Enter the 6-digit code.", lang));
      return;
    }
    setPending(true); setError("");
    try {
      const user = await verifyOtp(phone, otp);
      reset();
      onSignedIn?.(user);
    } catch (e) {
      setError(t(authErrorKey(e), lang));
      setOtp("");
      otpRef.current?.focus();
    } finally {
      setPending(false);
    }
  }, [phone, otp, pending, lang, reset, onSignedIn]);

  if (!open) return null;

  const label = { fontSize: 14, fontWeight: 700, color: T.ink, display: "block", marginBottom: 6 };
  const field = {
    width: "100%", boxSizing: "border-box", fontSize: 17, padding: "13px 14px",
    borderRadius: 10, border: `1.5px solid #C9DCD0`, color: T.ink,
    background: "#fff", fontFamily: "inherit",
  };

  return (
    <div
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 80,
        background: "rgba(15,31,23,.45)",
        display: "grid", placeItems: "center", padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("Sign in", lang)}
        style={{
          width: "min(420px, 100%)", background: "#fff", borderRadius: 16,
          border: `1px solid ${T.border}`, boxShadow: "0 20px 60px rgba(15,31,23,.28)",
          overflow: "hidden",
        }}
      >
        {/* header */}
        <div style={{ background: T.green, color: "#fff", padding: "14px 18px", display: "flex", alignItems: "center", gap: 10 }}>
          <span aria-hidden="true" style={{ fontSize: 20 }}>&#128274;</span>
          <div style={{ lineHeight: 1.15, flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{t("Sign in", lang)}</div>
            <div style={{ fontSize: 11.5, opacity: 0.9 }}>
              {step === "phone"
                ? t("We will send a one-time code by SMS", lang)
                : t("Enter the code we sent you", lang)}
            </div>
          </div>
          <button
            onClick={close}
            aria-label={t("Close", lang)}
            style={{
              background: "rgba(255,255,255,.18)", color: "#fff", border: "none",
              width: 30, height: 30, borderRadius: 8, fontSize: 17, cursor: "pointer", lineHeight: 1,
            }}
          >&times;</button>
        </div>

        <div style={{ padding: 18 }}>
          {step === "phone" ? (
            <>
              <label style={label} htmlFor="ym-phone">{t("Mobile number", lang)}</label>
              <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                <span style={{
                  ...field, width: 62, flex: "0 0 auto", display: "grid", placeItems: "center",
                  background: T.mint, color: T.slate, fontWeight: 700,
                }}>+91</span>
                <input
                  id="ym-phone"
                  ref={phoneRef}
                  style={field}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={13}
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => { setPhone(normalisePhone(e.target.value)); setError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendCode(); } }}
                />
              </div>
              <div style={{ fontSize: 12.5, color: T.slate, marginTop: 8, lineHeight: 1.55 }}>
                {t("Signing in lets you keep your answers. You can use the portal without it.", lang)}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13.5, color: T.slate, marginBottom: 12 }}>
                {t("Code sent to", lang)} <b style={{ color: T.ink }}>+91 {phone}</b>{" "}
                <button
                  onClick={() => { setStep("phone"); setOtp(""); setError(""); setDevOtp(null); }}
                  style={{ background: "none", border: "none", color: T.green, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, padding: 0, textDecoration: "underline" }}
                >{t("Change", lang)}</button>
              </div>

              <label style={label} htmlFor="ym-otp">{t("6-digit code", lang)}</label>
              <input
                id="ym-otp"
                ref={otpRef}
                style={{ ...field, letterSpacing: "0.35em", fontFamily: "var(--mono)", fontSize: 20 }}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="······"
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitCode(); } }}
              />

              {/* The backend echoes the OTP back only while it runs in
                  development, because there is no SMS gateway wired up.
                  Shown here so the flow can be demonstrated — and labelled,
                  so nobody mistakes it for production behaviour. */}
              {devOtp && (
                <div style={{
                  marginTop: 10, background: T.amberBg, color: T.amber,
                  borderRadius: 10, padding: "9px 12px", fontSize: 13, lineHeight: 1.5,
                }}>
                  {t("Development mode — no SMS is sent. Your code is", lang)}{" "}
                  <b style={{ fontFamily: "var(--mono)", letterSpacing: ".08em" }}>{devOtp}</b>
                  <button
                    onClick={() => { setOtp(devOtp); setError(""); }}
                    style={{ marginLeft: 8, background: "none", border: "none", color: T.amber, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: 13, textDecoration: "underline", padding: 0 }}
                  >{t("Use it", lang)}</button>
                </div>
              )}

              <div style={{ marginTop: 12, fontSize: 13 }}>
                {cooldown > 0 ? (
                  <span style={{ color: T.slate }}>
                    {t("Resend available in {n}s", lang, { n: cooldown })}
                  </span>
                ) : (
                  <button
                    onClick={sendCode}
                    disabled={pending}
                    style={{ background: "none", border: "none", color: T.green, fontWeight: 700, cursor: pending ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 13, padding: 0, textDecoration: "underline" }}
                  >{t("Resend code", lang)}</button>
                )}
              </div>
            </>
          )}

          {error && (
            <div role="alert" style={{
              marginTop: 12, color: T.red, background: T.redBg,
              border: "1px solid #F0CBC7", borderRadius: 10,
              padding: "10px 12px", fontSize: 13.5, lineHeight: 1.5,
            }}>{error}</div>
          )}

          <button
            className="hoverBtn"
            onClick={step === "phone" ? sendCode : submitCode}
            disabled={pending}
            style={{
              marginTop: 16, width: "100%", minHeight: 48,
              background: pending ? "#9CC7AC" : T.green, color: "#fff",
              border: "none", borderRadius: 10, fontSize: 16, fontWeight: 800,
              cursor: pending ? "not-allowed" : "pointer", fontFamily: "inherit",
            }}
          >
            {pending
              ? t("Please wait…", lang)
              : step === "phone" ? t("Send code", lang) : t("Verify and sign in", lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
