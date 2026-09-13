/* ============================================================
   Session handling for mobile + OTP login.

   The backend that owns this is SIH_HackTide/backend (:5001):
     POST /api/auth/send-otp    { phone_number }        -> { message, otp? }
     POST /api/auth/verify-otp  { phone_number, otp }   -> { token, user }
     GET  /api/auth/me          Bearer <token>          -> user

   Only the JWT is stored, in localStorage, so a refresh does not log the
   user out. No OTP and no phone number is persisted. The token is sent as
   a Bearer header by authApi.me(); nothing here reads or writes cookies.
   ============================================================ */

import { authApi } from "./api";

const TOKEN_KEY = "ym.token";

/* localStorage throws in some contexts (private windows, blocked site data),
   so every access is guarded — a failure just means "not logged in". */
export function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

function writeToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // session simply will not survive a refresh; not fatal
  }
}

/** 10-digit Indian mobile, first digit 6-9. Accepts spaces/dashes/+91. */
export function normalisePhone(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  const local = digits.length > 10 && digits.startsWith("91") ? digits.slice(-10) : digits;
  return local;
}

export function isValidPhone(raw) {
  const p = normalisePhone(raw);
  return /^[6-9]\d{9}$/.test(p);
}

export const isValidOtp = (raw) => /^\d{6}$/.test(String(raw ?? "").trim());

/* ---------------- actions ---------------- */

/** Ask for an OTP. Returns { devOtp } — the backend echoes the code back
    only while NODE_ENV=development, which is what makes demoing possible
    without an SMS gateway. Never rely on it in production. */
export async function requestOtp(phone) {
  const r = await authApi.sendOtp(normalisePhone(phone));
  return { devOtp: r?.otp ?? null };
}

/** Verify the code. On success the token is stored and the user returned. */
export async function verifyOtp(phone, otp) {
  const r = await authApi.verifyOtp(normalisePhone(phone), String(otp).trim());
  if (!r?.token) throw new Error("No token returned");
  writeToken(r.token);
  return r.user;
}

export function signOut() {
  writeToken(null);
}

/** Re-establish a session on page load. Resolves null if the token is gone
    or no longer accepted, clearing it so the UI does not show a stale user. */
export async function restoreSession() {
  const token = readToken();
  if (!token) return null;
  try {
    return await authApi.me(token);
  } catch {
    writeToken(null);
    return null;
  }
}

/** Friendly text for the errors this flow actually produces. */
export function authErrorKey(e) {
  const msg = String(e?.message ?? "");
  if (e?.status === 408) return "That took too long. Please try again.";
  if (/Invalid OTP/i.test(msg) || e?.status === 400) {
    if (/expired/i.test(msg)) return "That code has expired. Please request a new one.";
    return "That code is not correct. Please check and try again.";
  }
  if (!e?.status) return "Could not reach the server. Is the backend running?";
  return "Something went wrong. Please try again.";
}
