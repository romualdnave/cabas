import { useState, useEffect } from "react";

import Check from "./Check";
import Icon from "./Icon";

import { translations } from "../i18n";
import { HUES } from "../consts";

/* ------------------------------------------------------------------ */
/* One item row                                                        */
/* ------------------------------------------------------------------ */

export default function ItemRow({ item, categories, locked, onToggle, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(item.qty || "");
  const [categoryId, setCategoryId] = useState(item.categoryId || "");

  // While the row is being edited we ignore incoming versions, otherwise a
  // remote change would wipe what is being typed.
  useEffect(() => {
    if (!editing) {
      setName(item.name);
      setQty(item.qty || "");
      setCategoryId(item.categoryId || "");
    }
  }, [item, editing]);

  const commit = () => {
    onSave({ name: name.trim(), qty: qty.trim(), categoryId: categoryId || null });
    setEditing(false);
  };

  if (editing) {
    const currentCategory = categories.find((c) => c.id === categoryId);
    return (
      <li className="cabas-edit">
        <input className="cabas-input" value={name} autoFocus maxLength={60}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) { commit(); }
            if (e.key === "Escape") { setEditing(false); }
          }} />
        <div className="two">
          <div className="cabas-select-wrap">
            <span className="dot" style={{ background: currentCategory ? HUES[currentCategory.color] || HUES.slate : HUES.slate }} />
            <select className="cabas-select" value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}>
              <option value="" style={{ color: HUES.slate }}>{translations.noAisle}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} style={{ color: HUES[c.color] || HUES.slate }}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <input className="cabas-input" value={qty} maxLength={16} placeholder={translations.item.quantity}
            onChange={(e) => setQty(e.target.value)} />
        </div>
        <div className="acts">
          <button className="cabas-btn cabas-btn-danger" onClick={() => onDelete()}>{translations.remove}</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="cabas-btn" onClick={() => setEditing(false)}>{translations.cancel}</button>
            <button className="cabas-btn cabas-btn-primary" disabled={!name.trim()} onClick={commit}>
              {translations.save}
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className={"cabas-item" + (item.checked ? " done" : "")}>
      <button className="cabas-check" data-on={item.checked ? "true" : "false"} disabled={locked}
        onClick={onToggle}
        aria-pressed={item.checked}
        aria-label={item.checked ? translations.item.uncheck(item.name) : translations.item.check(item.name)}>
        <Check />
      </button>
      <div className="body">
        <div className="nm">{item.name}</div>
        {(item.qty || (item.checked && item.checkedBy)) && (
          <div className="qt">
            {item.qty}
            {item.qty && item.checked && item.checkedBy ? " · " : ""}
            {item.checked && item.checkedBy ? translations.item.takenBy(item.checkedBy) : ""}
          </div>
        )}
      </div>
      {!locked && (
        <div className="cabas-item-actions">
          <button className="cabas-icon" onClick={() => setEditing(true)}
            aria-label={translations.item.edit(item.name)}>
            <Icon name="pencil" />
          </button>
          <button className="cabas-icon danger" onClick={onDelete}
            aria-label={translations.item.remove(item.name)}>
            <Icon name="trash" />
          </button>
        </div>
      )}
    </li>
  );
}