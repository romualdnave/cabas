import { useState } from "react";

import { t } from "../i18n";
import { auth } from "../storage";

/* ------------------------------------------------------------------ */
/* Screen: sign in / create an account                                 */
/* ------------------------------------------------------------------ */

/** Supabase's own wording varies; map the few cases worth telling apart. */
function signUpErrorMessage(error) {
  const message = (error && error.message) || "";
  if (/registered/i.test(message)) { return t.auth.emailTaken; }
  if (/password/i.test(message)) { return t.auth.weakPassword; }
  if (/email/i.test(message)) { return t.auth.invalidEmail; }
  return t.auth.signUpFailed;
}

export default function Auth() {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) { return; }
    if (mode === "signup" && !name.trim()) { setError(t.auth.nameRequired); return; }
    setBusy(true);
    setError("");
    try {
      if (mode === "signin") {
        await auth.signIn(email.trim(), password);
      } else {
        await auth.signUp(email.trim(), password, name.trim());
      }
      // Success flips the session; App.jsx's auth listener takes it from here.
    } catch (err) {
      setError(mode === "signin" ? t.auth.invalidCredentials : signUpErrorMessage(err));
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setError("");
  };

  return (
    <div className="cabas-wrap">
      <div className="cabas-hello">
        <h1>{t.auth.title}</h1>
        <p>{t.auth.blurb}</p>
      </div>

      <div className="cabas-panel">
        <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
          {mode === "signup" && (
            <>
              <label className="cabas-label" htmlFor="cabas-name">{t.auth.nameLabel}</label>
              <input id="cabas-name" className="cabas-input" value={name} autoFocus maxLength={24}
                onChange={(e) => setName(e.target.value)} placeholder={t.auth.namePlaceholder}
                style={{ width: "100%", marginBottom: 14 }} />
            </>
          )}

          <label className="cabas-label" htmlFor="cabas-email">{t.auth.emailLabel}</label>
          <input id="cabas-email" className="cabas-input" type="email" value={email}
            autoFocus={mode === "signin"} autoComplete="email"
            onChange={(e) => setEmail(e.target.value)} placeholder={t.auth.emailPlaceholder}
            style={{ width: "100%", marginBottom: 14 }} />

          <label className="cabas-label" htmlFor="cabas-password">{t.auth.passwordLabel}</label>
          <input id="cabas-password" className="cabas-input" type="password" value={password}
            minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", marginBottom: 14 }} />

          {error && (
            <p style={{ color: "var(--danger)", fontSize: 14, margin: "0 0 14px" }}>{error}</p>
          )}

          <button type="submit" className="cabas-btn cabas-btn-primary cabas-btn-block"
            disabled={busy || !email.trim() || !password}>
            {busy ? "…" : mode === "signin" ? t.auth.signIn : t.auth.signUp}
          </button>
        </form>

        <p style={{ fontSize: 13, color: "var(--faint)", marginTop: 14, textAlign: "center" }}>
          <button className="cabas-btn-ghost" style={{ padding: "2px 4px", fontSize: 13, textDecoration: "underline" }}
            onClick={switchMode}>
            {mode === "signin" ? t.auth.switchToSignUp : t.auth.switchToSignIn}
          </button>
        </p>
      </div>
    </div>
  );
}
