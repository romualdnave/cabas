import { useState } from "react";

import { t } from "../i18n";
/* ------------------------------------------------------------------ */
/* Screen: who are you                                                 */
/* ------------------------------------------------------------------ */

export default function Onboarding({ onDone }) {
  const [name, setName] = useState("");
  return (
    <div className="cabas-wrap">
      <div className="cabas-hello">
        <h1>{t.onboarding.title}</h1>
        <p>{t.onboarding.blurb}</p>
      </div>
      <div className="cabas-panel">
        <label className="cabas-label" htmlFor="cabas-name">{t.onboarding.label}</label>
        <div className="cabas-row">
          <input
            id="cabas-name" className="cabas-input" value={name} autoFocus maxLength={24}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && onDone(name.trim())}
            placeholder={t.onboarding.placeholder}
          />
          <button className="cabas-btn cabas-btn-primary" disabled={!name.trim()}
            onClick={() => onDone(name.trim())}>
            {t.onboarding.submit}
          </button>
        </div>
      </div>
    </div>
  );
}