// ─── BiometricLoginModal — WebAuthn Passkey / Fingerprint login ───────────────
//
//  Uses @simplewebauthn/browser (client-side WebAuthn helper).
//  Calls /api-server/api/auth/webauthn/* endpoints.

import { useEffect, useState, useCallback } from "react";
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";

// ── API base — Replit proxy path ──────────────────────────────────────────────
function getApiBase(): string {
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.host}/api/auth`;
  }
  return "http://localhost:3001/api/auth";
}

const API = "/webauthn";
const fetchApi = (path: string, body?: unknown) =>
  fetch(`${getApiBase()}${API}${path}`, {
    method: body !== undefined ? "POST" : "GET",
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

// ── Types ─────────────────────────────────────────────────────────────────────
type Mode   = "idle" | "register" | "login";
type Status = "idle" | "loading" | "success" | "error";

interface Props {
  open:     boolean;
  onClose:  () => void;
  onLogin:  (username: string) => void;
}

// ── Fingerprint SVG icon ──────────────────────────────────────────────────────
function FingerprintIcon({ active }: { active?: boolean }) {
  const c = active ? "#ff7a1a" : "#00d4ff";
  return (
    <svg viewBox="0 0 64 64" width="48" height="48" fill="none">
      <path d="M32 6C18 6 7 17 7 31c0 7 3 13 8 17" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M57 31c0-13.8-11.2-25-25-25" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 16c-8.3 0-15 6.7-15 15 0 5 2.5 9.4 6.2 12" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 16c8.3 0 15 6.7 15 15 0 5-2.5 9.4-6.2 12" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 26c-2.8 0-5 2.2-5 5 0 6 3 11.5 7.5 14.8" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M37 31c0-2.8-2.2-5-5-5" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 37c0 8 2.8 13.8 7 18" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
      {active && (
        <circle cx="32" cy="31" r="3" fill={c} opacity="0.8">
          <animate attributeName="r" values="3;6;3" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0;0.8" dur="1.6s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function BiometricLoginModal({ open, onClose, onLogin }: Props) {
  const [mode,     setMode]     = useState<Mode>("idle");
  const [status,   setStatus]   = useState<Status>("idle");
  const [username, setUsername] = useState("");
  const [errMsg,   setErrMsg]   = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [loggedUser, setLoggedUser] = useState("");

  const webAuthnSupported = browserSupportsWebAuthn();

  // ── Lock scroll + ESC ───────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      // Check existing session
      fetchApi("/me")
        .then(r => r.json())
        .then((data: { loggedIn: boolean; username?: string }) => {
          if (data.loggedIn && data.username) {
            setLoggedIn(true);
            setLoggedUser(data.username);
            onLogin(data.username);
          }
        })
        .catch(() => {});
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open, onLogin]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  const reset = () => { setStatus("idle"); setErrMsg(""); setMode("idle"); };

  // ── Register passkey ────────────────────────────────────────────────────────
  const handleRegister = useCallback(async () => {
    if (!username.trim()) { setErrMsg("Enter a username first"); return; }
    setStatus("loading"); setErrMsg("");
    try {
      const optsRes = await fetchApi("/register-options", { username: username.trim() });
      if (!optsRes.ok) {
        const err = await optsRes.json();
        throw new Error(err.error ?? "Options request failed");
      }
      const opts = await optsRes.json();

      const regResp = await startRegistration({ optionsJSON: opts });

      const verifyRes = await fetchApi("/register-verify", regResp);
      const result = await verifyRes.json();

      if (!verifyRes.ok || !result.verified) {
        throw new Error(result.error ?? "Registration verification failed");
      }

      setLoggedIn(true);
      setLoggedUser(result.username as string);
      setStatus("success");
      onLogin(result.username as string);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Registration failed";
      setErrMsg(msg.includes("User cancelled") || msg.includes("abort") ? "Fingerprint cancelled — try again" : msg);
      setStatus("error");
    }
  }, [username, onLogin]);

  // ── Login with passkey ──────────────────────────────────────────────────────
  const handleLogin = useCallback(async () => {
    setStatus("loading"); setErrMsg("");
    try {
      const optsRes = await fetchApi("/login-options", { username: username.trim() || undefined });
      if (!optsRes.ok) {
        const err = await optsRes.json();
        throw new Error(err.error ?? "Options request failed");
      }
      const opts = await optsRes.json();

      const authResp = await startAuthentication({ optionsJSON: opts });

      const verifyRes = await fetchApi("/login-verify", authResp);
      const result = await verifyRes.json();

      if (!verifyRes.ok || !result.verified) {
        throw new Error(result.error ?? "Authentication failed");
      }

      setLoggedIn(true);
      setLoggedUser(result.username as string);
      setStatus("success");
      onLogin(result.username as string);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Login failed";
      setErrMsg(msg.includes("User cancelled") || msg.includes("abort") ? "Fingerprint cancelled — try again" : msg);
      setStatus("error");
    }
  }, [username, onLogin]);

  // ── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    await fetchApi("/logout", {});
    setLoggedIn(false); setLoggedUser(""); reset();
    onLogin("");
  }, [onLogin]);

  if (!open) return null;

  const isLoading = status === "loading";

  return (
    <div className="dlm-overlay" onClick={onClose}>
      <div className="bam-card" onClick={e => e.stopPropagation()}>
        <button className="dlm-close" onClick={onClose} aria-label="Close">✕</button>

        {/* ── Header ── */}
        <div className="bam-head">
          <div className="bam-icon">
            <FingerprintIcon active={isLoading} />
          </div>
          <div>
            <h2 className="bam-title">
              {loggedIn ? `Welcome back, ${loggedUser}` : "Passkey Login"}
            </h2>
            <p className="bam-sub">
              {loggedIn
                ? "Your ZeroLag account is active"
                : "Register or sign in with your device fingerprint · Face ID · PIN"}
            </p>
          </div>
        </div>

        {/* ── Logged in view ── */}
        {loggedIn ? (
          <div className="bam-loggedin">
            <div className="bam-session">
              <span className="bam-session-dot" />
              <span className="bam-session-user">{loggedUser}</span>
              <span className="bam-session-lbl">SESSION ACTIVE</span>
            </div>
            <p className="bam-loggedin-note">
              Your plan and preferences are tied to this passkey. No password needed — ever.
            </p>
            <button className="bam-btn-logout" onClick={handleLogout}>
              Log out
            </button>
          </div>
        ) : (
          <>
            {/* ── WebAuthn not supported ── */}
            {!webAuthnSupported && (
              <div className="bam-unsupported">
                <div className="bam-unsupported-icon">⚠</div>
                <div className="bam-unsupported-title">Passkeys not supported</div>
                <div className="bam-unsupported-note">
                  Your browser does not support WebAuthn. Use Chrome 108+, Safari 16+, Firefox 119+, or Edge 108+.<br />
                  HTTPS is required in production.
                </div>
              </div>
            )}

            {/* ── Form ── */}
            {webAuthnSupported && mode === "idle" && (
              <div className="bam-actions">
                <div className="bam-modes">
                  <button className="bam-mode-btn" onClick={() => setMode("login")}>
                    <span className="bam-mode-icon">🔓</span>
                    <span className="bam-mode-title">Login with passkey</span>
                    <span className="bam-mode-desc">Use existing fingerprint / Face ID</span>
                  </button>
                  <button className="bam-mode-btn bam-mode-secondary" onClick={() => setMode("register")}>
                    <span className="bam-mode-icon">➕</span>
                    <span className="bam-mode-title">Register new passkey</span>
                    <span className="bam-mode-desc">First time? Create your passkey here</span>
                  </button>
                </div>
                
                <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: '#888' }}>
                  <div style={{ marginBottom: '12px', borderBottom: '1px solid #333', paddingBottom: '12px' }}>OR CONTINUE WITH</div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button 
                      style={{ background: '#333', border: '1px solid #444', color: 'white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                      onClick={() => window.location.href = `${getApiBase()}/sign-in/social?provider=google`}
                    >
                      <span>G</span> Google
                    </button>
                    <button 
                      style={{ background: '#333', border: '1px solid #444', color: 'white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                      onClick={() => window.location.href = `${getApiBase()}/sign-in/social?provider=microsoft`}
                    >
                      <span>M</span> Microsoft
                    </button>
                    <button 
                      style={{ background: '#333', border: '1px solid #444', color: 'white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                      onClick={() => window.location.href = `${getApiBase()}/sign-in/social?provider=github`}
                    >
                      <span>🐙</span> GitHub
                    </button>
                  </div>
                </div>
              </div>
            )}

            {webAuthnSupported && mode !== "idle" && (
              <div className="bam-form">
                <button className="bam-back" onClick={reset}>← Back</button>

                <div className="bam-form-title">
                  {mode === "register" ? "Create your passkey" : "Sign in with passkey"}
                </div>

                {mode === "register" && (
                  <div className="bam-field">
                    <label className="bam-label">USERNAME</label>
                    <input
                      className="bam-input"
                      type="text"
                      placeholder="e.g. player_one"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleRegister(); }}
                      autoFocus
                      autoComplete="username"
                    />
                  </div>
                )}

                {mode === "login" && (
                  <div className="bam-field">
                    <label className="bam-label">USERNAME (optional)</label>
                    <input
                      className="bam-input"
                      type="text"
                      placeholder="Leave blank to use resident key"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleLogin(); }}
                      autoComplete="username webauthn"
                    />
                  </div>
                )}

                {errMsg && (
                  <div className="bam-err">{errMsg}</div>
                )}

                {status === "success" && (
                  <div className="bam-ok">
                    <span className="bam-ok-check">✓</span>
                    {mode === "register" ? " Passkey registered!" : " Signed in!"}
                  </div>
                )}

                <button
                  className={`bam-btn${mode === "register" ? " bam-btn-register" : " bam-btn-login"}`}
                  onClick={mode === "register" ? handleRegister : handleLogin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="bam-spinner" />
                  ) : mode === "register" ? (
                    "☝ Register Fingerprint →"
                  ) : (
                    "☝ Touch to Sign In →"
                  )}
                </button>

                <div className="bam-hint">
                  Your browser will show a system prompt for fingerprint, Face ID, or PIN. No data leaves your device.
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Footer ── */}
        <div className="bam-footer">
          <span>Secured by</span>
          <strong style={{ color: "#00d4ff" }}>WebAuthn / FIDO2</strong>
          <span>·</span>
          <strong style={{ color: "#ff7a1a" }}>@simplewebauthn</strong>
          <span>· No password · No server storage of secrets</span>
        </div>
      </div>
    </div>
  );
}
