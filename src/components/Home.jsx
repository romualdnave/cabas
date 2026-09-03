import { useState } from "react";

import { t } from "../i18n";
import { readList, writeList } from "../storage";
import Modal from "./Modal";
import Icon from "./Icon";

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

export default function Home({ me, recent, onOpen, onCreate, onChangeName, onLeave }) {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(null);
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [leaveError, setLeaveError] = useState("");

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

  /**
   * Leaving is local-first (the entry always disappears from this phone),
   * but the shared document should stop listing this person as a member so
   * the others don't keep seeing them. Best effort: if the list is
   * unreachable, the local removal still goes through.
   *
   * Exception: if this person is the only member left, leaving would abandon
   * the list with nobody attached to it. That's blocked here — deleting the
   * list (from inside it) is the deliberate way to get rid of it instead.
   */
  const confirmLeave = async () => {
    const entry = leaving;
    if (!entry) { return; }
    setLeaveBusy(true);
    setLeaveError("");
    try {
      const doc = await readList(entry.slug);
      if (doc) {
        const others = doc.members.filter((m) => m.id !== me.id);
        if (others.length === 0) {
          setLeaveBusy(false);
          setLeaveError(t.home.leaveLastMember(entry.name));
          return;
        }
        await writeList({
          ...doc,
          members: others,
          rev: (doc.rev || 0) + 1,
          updatedAt: Date.now(),
        });
      }
    } catch {
      /* offline, or the list is already gone: nothing left to clean up */
    } finally {
      setLeaveBusy(false);
    }
    onLeave(entry.slug);
    setLeaving(null);
  };

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
                <button className="cabas-icon" onClick={() => { setLeaving(entry); setLeaveError(""); }}
                  aria-label={t.home.leaveList(entry.name)}><Icon name="x" /></button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {leaving && (
        <Modal title={t.home.leaveTitle} onClose={() => { setLeaving(null); setLeaveError(""); }}>
          <h2>{t.home.leaveTitle}</h2>
          <p>{t.home.leaveBody(leaving.name)}</p>
          {leaveError && (
            <p style={{ color: "var(--danger)", fontSize: 14, margin: "10px 0 0" }}>{leaveError}</p>
          )}
          <div className="acts">
            <button className="cabas-btn" onClick={() => { setLeaving(null); setLeaveError(""); }}
              disabled={leaveBusy}>
              {t.cancel}
            </button>
            <button className="cabas-btn cabas-btn-danger" onClick={confirmLeave} disabled={leaveBusy}>
              {leaveBusy ? "…" : t.home.leaveConfirm}
            </button>
          </div>
        </Modal>
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