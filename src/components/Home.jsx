import { useState } from "react";

import { t } from "../i18n";
import { readList } from "../storage";

/* ------------------------------------------------------------------ */
/* Screen: home                                                        */
/* ------------------------------------------------------------------ */

/** Accepts a raw code, a hash route or a full URL, and returns the slug. */
const normalizeSlug = (input) =>
  input
    .trim()
    .toLowerCase()
    .replace(/^.*\/l\//, "")
    .replace(/^#\/?l\//, "")
    .replace(/[^a-z0-9-]/g, "");

export default function Home({ me, recent, onOpen, onCreate, onChangeName }) {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const join = async () => {
    const slug = normalizeSlug(code);
    if (!slug) { return; }
    setBusy(true);
    setError("");
    let found = null;
    try {
      found = await readList(slug);
    } catch {
      setBusy(false);
      setError(t.home.unreachable);
      return;
    }
    setBusy(false);
    if (!found) {
      setError(t.home.notFound);
      return;
    }
    onOpen(slug);
  };

  const create = () => onCreate(title.trim() || t.defaultListName);

  return (
    <div className="cabas-wrap">
      <div className="cabas-hello">
        <h1>{t.home.greeting(me.name)}</h1>
        <p>{t.home.blurb}</p>
      </div>

      <div className="cabas-panel">
        <h2>{t.home.newList}</h2>
        <div className="cabas-row">
          <input
            className="cabas-input" value={title} maxLength={40}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder={t.home.newListPlaceholder}
          />
          <button className="cabas-btn cabas-btn-primary" onClick={create}>
            {t.home.create}
          </button>
        </div>
      </div>

      <div className="cabas-panel">
        <h2>{t.home.joinList}</h2>
        <div className="cabas-row">
          <input
            className="cabas-input" value={code}
            onChange={(e) => { setCode(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && join()}
            placeholder="lemon-cabin-204"
            autoCapitalize="none" autoCorrect="off" spellCheck="false"
          />
          <button className="cabas-btn" onClick={join} disabled={busy || !code.trim()}>
            {busy ? "…" : t.home.open}
          </button>
        </div>
        {error && (
          <p style={{ color: "var(--danger)", fontSize: 14, margin: "10px 0 0" }}>{error}</p>
        )}
      </div>

      {recent.length > 0 && (
        <div className="cabas-panel">
          <h2>{t.home.yourLists}</h2>
          <ul className="cabas-recent">
            {recent.map((entry) => (
              <li key={entry.slug}>
                <button onClick={() => onOpen(entry.slug)}>
                  <span className="n">{entry.name}</span>
                  <span className="s">{entry.slug}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p style={{ fontSize: 13, color: "var(--faint)", marginTop: 18, textAlign: "center" }}>
        {t.home.signedInAs(me.name)}{" "}
        <button className="cabas-btn-ghost"
          style={{ padding: "2px 4px", fontSize: 13, textDecoration: "underline" }}
          onClick={onChangeName}>
          {t.home.changeName}
        </button>
      </p>
    </div>
  );
}