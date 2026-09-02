import { useState } from "react";

import Icon from "./Icon";
import Modal from "./Modal";

import { HUES, HUE_KEYS } from "../consts";
import { t } from "../i18n";
/* ------------------------------------------------------------------ */
/* Aisle management                                                    */
/* ------------------------------------------------------------------ */

export default function AisleSheet({ list, onClose, onAdd, onRename, onRecolor, onDelete }) {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");
  const [confirmId, setConfirmId] = useState(null);

  const countIn = (id) => list.items.filter((i) => i.categoryId === id).length;

  const add = () => {
    onAdd(name.trim());
    setName("");
  };

  return (
    <Modal title={t.aisles.title} onClose={onClose}>
      <h2>{t.aisles.title}</h2>
      <p>{t.aisles.blurb}</p>

      <ul className="cabas-cats">
        {list.categories.map((c) => (
          <li key={c.id}>
            {editingId === c.id ? (
              <>
                <input className="cabas-input" value={draft} autoFocus maxLength={28}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && draft.trim()) { onRename(c.id, draft.trim()); setEditingId(null); }
                    if (e.key === "Escape") { setEditingId(null); }
                  }} />
                <button className="cabas-btn" onClick={() => setEditingId(null)}>{t.cancel}</button>
                <button className="cabas-btn cabas-btn-primary" disabled={!draft.trim()}
                  onClick={() => { onRename(c.id, draft.trim()); setEditingId(null); }}>OK</button>
              </>
            ) : (
              <>
                <span className="dot" style={{ background: HUES[c.color] || HUES.slate }} />
                <span className="nm">{c.name}</span>
                <span style={{ fontSize: 13, color: "var(--faint)" }}>{countIn(c.id)}</span>
                <button className="cabas-icon" aria-label={t.aisles.rename(c.name)}
                  onClick={() => { setEditingId(c.id); setDraft(c.name); }}>
                  <Icon name="pencil" />
                </button>
                <button className="cabas-icon danger" aria-label={t.aisles.remove(c.name)}
                  onClick={() => setConfirmId(c.id)}>
                  <Icon name="trash" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      {editingId && (
        <>
          <span className="cabas-label">{t.aisles.colour}</span>
          <div className="cabas-swatches" style={{ marginBottom: 16 }}>
            {HUE_KEYS.map((hue) => {
              const current = list.categories.find((c) => c.id === editingId);
              return (
                <button key={hue} className="cabas-sw"
                  data-on={current && current.color === hue ? "true" : "false"}
                  style={{ background: HUES[hue] }} aria-label={t.aisles.colourNamed(hue)}
                  onClick={() => onRecolor(editingId, hue)} />
              );
            })}
          </div>
        </>
      )}

      <span className="cabas-label">{t.aisles.addLabel}</span>
      <div className="cabas-row">
        <input className="cabas-input" value={name} maxLength={28}
          placeholder={t.aisles.addPlaceholder}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) { add(); } }} />
        <button className="cabas-btn cabas-btn-primary" disabled={!name.trim()} onClick={add}>
          {t.aisles.add}
        </button>
      </div>

      <div className="acts">
        <button className="cabas-btn cabas-btn-block" onClick={onClose}>{t.close}</button>
      </div>

      {confirmId && (
        <Modal title={t.aisles.confirmTitle} onClose={() => setConfirmId(null)}>
          <h2>{t.aisles.confirmTitle}</h2>
          <p>{t.aisles.confirmBody(countIn(confirmId))}</p>
          <div className="acts">
            <button className="cabas-btn cabas-btn-primary" onClick={() => setConfirmId(null)}>
              {t.aisles.keep}
            </button>
            <button className="cabas-btn cabas-btn-danger"
              onClick={() => { onDelete(confirmId); setConfirmId(null); }}>
              {t.aisles.confirmDelete}
            </button>
          </div>
        </Modal>
      )}
    </Modal>
  );
}