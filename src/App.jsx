import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { prefs, readList, writeList, deleteList, watchList, missingConfig } from "./storage";
import { t } from "./i18n";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const PURGE_DELAY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Realtime does the real work; this refresh is only a safety net in case a
// broadcast message is lost.
const REFRESH_MS = 20000;

// Hues borrowed from the market stall: tomato, carrot, mustard, pea, mint,
// blueberry, aubergine, slate.
const HUES = {
  tomato: "#C0392B",
  carrot: "#D4711F",
  mustard: "#B98A0B",
  pea: "#5E8C31",
  mint: "#2E8B70",
  blueberry: "#3D62A8",
  aubergine: "#7A4B8C",
  slate: "#6B7A70",
};
const HUE_KEYS = Object.keys(HUES);

// Aisle names come from the locale, colours do not.
const DEFAULT_AISLE_COLORS = [
  "pea",
  "mustard",
  "tomato",
  "blueberry",
  "carrot",
  "mint",
  "aubergine",
  "slate",
];

// Slug vocabulary. Kept deliberately plain so it survives being read out over
// the phone, which is how most people will share a list.
const FIRST_WORDS = ["apple", "basil", "lemon", "olive", "saffron", "cumin", "cherry", "hazel", "mint", "tomato", "apricot", "rosemary"];
const SECOND_WORDS = ["butterfly", "comet", "lantern", "cabin", "wave", "cloud", "hummingbird", "syrup", "shelter", "garden", "fanfare", "compass"];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const uid = () => Math.random().toString(36).slice(2, 10);

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const makeSlug = () =>
  `${pick(FIRST_WORDS)}-${pick(SECOND_WORDS)}-${Math.floor(100 + Math.random() * 900)}`;

/** Accepts a raw code, a hash route or a full URL, and returns the slug. */
const normalizeSlug = (input) =>
  input
    .trim()
    .toLowerCase()
    .replace(/^.*\/l\//, "")
    .replace(/^#\/?l\//, "")
    .replace(/[^a-z0-9-]/g, "");

const daysLeft = (timestamp) => Math.max(0, Math.ceil((timestamp - Date.now()) / 86400000));

const formatDate = (timestamp) =>
  new Date(timestamp).toLocaleDateString(t.dateLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

function newList(name, author) {
  const now = Date.now();
  return {
    slug: makeSlug(),
    name: name || t.defaultListName,
    createdAt: now,
    updatedAt: now,
    rev: 1,
    completedAt: null,
    purgeAt: null,
    members: [{ id: author.id, name: author.name, joinedAt: now }],
    categories: t.defaultAisles.map((name, i) => ({
      id: uid(),
      name,
      color: DEFAULT_AISLE_COLORS[i % DEFAULT_AISLE_COLORS.length],
    })),
    items: [],
  };
}

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function Check() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10.5 L8.2 14.5 L16 5.5" />
    </svg>
  );
}

function Icon({ name }) {
  const path = {
    pencil: "M4 16.2V20h3.8L18.3 9.5l-3.8-3.8L4 16.2Z M13.1 7.1l3.8 3.8",
    trash: "M4 7h16 M9 7V4.8h6V7 M6.5 7l1 13h9l1-13 M10 10.5v6 M14 10.5v6",
    back: "M15 5l-7 7 7 7",
    share: "M8 12h9 M13.5 8l4 4-4 4 M6 5v14",
    tag: "M4 4h7l9 9-7 7-9-9V4Z M8 8h.01",
    plus: "M12 5v14 M5 12h14",
  }[name];
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {path.split(" M").map((segment, i) => <path key={i} d={(i ? "M" : "") + segment} />)}
    </svg>
  );
}

function Modal({ title, children, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="cabas-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cabas-modal" role="dialog" aria-modal="true" aria-label={title}>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Screen: who are you                                                 */
/* ------------------------------------------------------------------ */

function Onboarding({ onDone }) {
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

/* ------------------------------------------------------------------ */
/* Screen: home                                                        */
/* ------------------------------------------------------------------ */

function Home({ me, recent, onOpen, onCreate, onChangeName }) {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const join = async () => {
    const slug = normalizeSlug(code);
    if (!slug) return;
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

/* ------------------------------------------------------------------ */
/* One item row                                                        */
/* ------------------------------------------------------------------ */

function ItemRow({ item, categories, locked, onToggle, onSave, onDelete }) {
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
    return (
      <li className="cabas-edit">
        <input className="cabas-input" value={name} autoFocus maxLength={60}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) commit();
            if (e.key === "Escape") setEditing(false);
          }} />
        <div className="two">
          <select className="cabas-select" value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">{t.noAisle}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="cabas-input" value={qty} maxLength={16} placeholder={t.item.quantity}
            onChange={(e) => setQty(e.target.value)} />
        </div>
        <div className="acts">
          <button className="cabas-btn cabas-btn-danger" onClick={() => onDelete()}>{t.remove}</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="cabas-btn" onClick={() => setEditing(false)}>{t.cancel}</button>
            <button className="cabas-btn cabas-btn-primary" disabled={!name.trim()} onClick={commit}>
              {t.save}
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
        aria-label={item.checked ? t.item.uncheck(item.name) : t.item.check(item.name)}>
        <Check />
      </button>
      <div className="body">
        <div className="nm">{item.name}</div>
        {(item.qty || (item.checked && item.checkedBy)) && (
          <div className="qt">
            {item.qty}
            {item.qty && item.checked && item.checkedBy ? " · " : ""}
            {item.checked && item.checkedBy ? t.item.takenBy(item.checkedBy) : ""}
          </div>
        )}
      </div>
      {!locked && (
        <div className="cabas-item-actions">
          <button className="cabas-icon" onClick={() => setEditing(true)}
            aria-label={t.item.edit(item.name)}>
            <Icon name="pencil" />
          </button>
          <button className="cabas-icon danger" onClick={onDelete}
            aria-label={t.item.remove(item.name)}>
            <Icon name="trash" />
          </button>
        </div>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Aisle management                                                    */
/* ------------------------------------------------------------------ */

function AisleSheet({ list, onClose, onAdd, onRename, onRecolor, onDelete }) {
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
                    if (e.key === "Escape") setEditingId(null);
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
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) add(); }} />
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

/* ------------------------------------------------------------------ */
/* Screen: one list                                                    */
/* ------------------------------------------------------------------ */

function ListScreen({ slug, me, onBack, onTouch }) {
  const [list, setList] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | missing | purged | offline
  const [sync, setSync] = useState("");
  const listRef = useRef(null);
  const writingRef = useRef(false);
  const declinedRef = useRef(false);
  const channelRef = useRef(null);

  const [showDone, setShowDone] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showAisles, setShowAisles] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [copied, setCopied] = useState("");

  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");

  /** Take a remote version if it is more recent than ours. */
  const adopt = useCallback((remote) => {
    const local = listRef.current;
    if (!remote || !local || remote.slug !== local.slug) return;
    const newer =
      (remote.rev || 0) > (local.rev || 0) ||
      ((remote.rev || 0) === (local.rev || 0) && (remote.updatedAt || 0) > (local.updatedAt || 0));
    if (!newer) return;
    listRef.current = remote;
    setList(remote);
    if (remote.items.length && remote.items.some((i) => !i.checked)) declinedRef.current = false;
  }, []);

  const commit = useCallback(async (next) => {
    listRef.current = next;
    setList(next);
    writingRef.current = true;
    setSync(t.list.saving);
    try {
      const saved = await writeList(next);
      setSync("");
      // The database refused our revision, so its own is authoritative.
      if (saved && saved.rev !== next.rev) adopt(saved);
      else if (channelRef.current) channelRef.current.push(next);
    } catch {
      setSync(t.list.saveFailed);
    } finally {
      writingRef.current = false;
    }
  }, [adopt]);

  const mutate = useCallback((change) => {
    const base = listRef.current;
    if (!base) return;
    const draft = change(structuredClone(base));
    if (!draft) return;
    draft.rev = (base.rev || 0) + 1;
    draft.updatedAt = Date.now();
    commit(draft);
    return draft;
  }, [commit]);

  /* load, and purge on the way in ------------------------------------ */
  useEffect(() => {
    let alive = true;
    (async () => {
      let loaded;
      try {
        loaded = await readList(slug);
      } catch {
        if (alive) setStatus("offline");
        return;
      }
      if (!alive) return;
      if (!loaded) { setStatus("missing"); return; }
      if (loaded.purgeAt && Date.now() > loaded.purgeAt) {
        try { await deleteList(slug); } catch { /* the nightly job will get it */ }
        setStatus("purged");
        return;
      }
      // Join as a member, with the same rights as whoever created the list.
      let next = loaded;
      if (!loaded.members.some((m) => m.id === me.id)) {
        next = {
          ...loaded,
          members: [...loaded.members, { id: me.id, name: me.name, joinedAt: Date.now() }],
          rev: (loaded.rev || 0) + 1,
          updatedAt: Date.now(),
        };
        writeList(next).catch(() => {});
      }
      listRef.current = next;
      setList(next);
      setNewCategoryId(next.categories[0] ? next.categories[0].id : "");
      setStatus("ok");
      onTouch(next);
    })();
    return () => { alive = false; };
  }, [slug, me.id, me.name, onTouch]);

  /* realtime ---------------------------------------------------------- */
  useEffect(() => {
    if (status !== "ok") return;
    const channel = watchList(slug, adopt);
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      channel.close();
    };
  }, [slug, status, adopt]);

  /* safety net: periodic re-read, and one when the tab comes back ------ */
  useEffect(() => {
    if (status !== "ok") return;
    const refresh = async () => {
      if (writingRef.current || document.hidden) return;
      try {
        adopt(await readList(slug));
      } catch {
        /* network down: we will try again later */
      }
    };
    const timer = setInterval(refresh, REFRESH_MS);
    const onVisible = () => !document.hidden && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [slug, status, adopt]);

  /* actions ----------------------------------------------------------- */
  const locked = !!(list && list.completedAt);

  const addItem = () => {
    const name = newName.trim();
    if (!name || locked) return;
    mutate((draft) => {
      draft.items.push({
        id: uid(),
        name,
        qty: newQty.trim(),
        categoryId: newCategoryId || null,
        checked: false,
        checkedBy: null,
        addedBy: me.name,
        addedAt: Date.now(),
      });
      return draft;
    });
    declinedRef.current = false;
    setNewName("");
    setNewQty("");
  };

  const toggle = (id) => {
    const before = listRef.current;
    const wasAllChecked = before.items.length > 0 && before.items.every((i) => i.checked);
    const next = mutate((draft) => {
      const item = draft.items.find((i) => i.id === id);
      if (!item) return null;
      item.checked = !item.checked;
      item.checkedBy = item.checked ? me.name : null;
      return draft;
    });
    if (!next) return;
    const allChecked = next.items.length > 0 && next.items.every((i) => i.checked);
    // Only the person who ticked the last box is asked, and only on the
    // transition. Declining suppresses the prompt until the state breaks.
    if (!allChecked) declinedRef.current = false;
    if (allChecked && !wasAllChecked && !declinedRef.current) setShowDone(true);
  };

  const complete = () => {
    const now = Date.now();
    mutate((draft) => {
      draft.completedAt = now;
      draft.purgeAt = now + PURGE_DELAY_MS;
      return draft;
    });
    setShowDone(false);
  };

  const reopen = () => mutate((draft) => {
    draft.completedAt = null;
    draft.purgeAt = null;
    return draft;
  });

  const destroyNow = async () => {
    try {
      await deleteList(slug);
    } catch {
      setSync(t.list.deleteFailed);
      return;
    }
    setConfirmDelete(false);
    onBack(slug);
  };

  const shareLink = () => {
    const base = window.location.origin && window.location.origin !== "null"
      ? window.location.origin + window.location.pathname
      : "";
    return `${base}#/l/${slug}`;
  };

  const share = async () => {
    const link = shareLink();
    try {
      if (navigator.share) {
        await navigator.share({ title: list.name, text: t.share.text(slug), url: link });
      } else {
        await navigator.clipboard.writeText(link);
        setCopied("link");
        setTimeout(() => setCopied(""), 2000);
      }
    } catch {
      setShowShare(true);
    }
  };

  const copy = async (text, tag) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(tag);
      setTimeout(() => setCopied(""), 2000);
    } catch { /* clipboard unavailable */ }
  };

  /* grouping ---------------------------------------------------------- */
  const groups = useMemo(() => {
    if (!list) return [];
    const known = list.categories.map((category) => ({ category, items: [] }));
    const loose = { category: { id: null, name: t.noAisle, color: "slate" }, items: [] };
    const byId = new Map(known.map((group) => [group.category.id, group]));
    for (const item of list.items) {
      const group = item.categoryId && byId.has(item.categoryId) ? byId.get(item.categoryId) : loose;
      group.items.push(item);
    }
    return [...known, loose].filter((group) => group.items.length > 0);
  }, [list]);

  /* render ------------------------------------------------------------ */
  if (status === "loading") {
    return (
      <div className="cabas-wrap">
        <p style={{ color: "var(--muted)" }}>{t.loading}</p>
      </div>
    );
  }

  if (status === "offline" || status === "missing" || status === "purged") {
    const message = {
      offline: [t.errors.unreachableTitle, t.errors.unreachableBody],
      purged: [t.errors.purgedTitle, t.errors.purgedBody],
      missing: [t.errors.missingTitle, t.errors.missingBody],
    }[status];
    return (
      <div className="cabas-wrap">
        <button className="cabas-btn-ghost" onClick={() => onBack()}>
          <Icon name="back" /> {t.back}
        </button>
        <div className="cabas-empty">
          <div className="display">{message[0]}</div>
          <p>{message[1]}</p>
        </div>
      </div>
    );
  }

  const total = list.items.length;
  const done = list.items.filter((i) => i.checked).length;
  const percent = total ? (done / total) * 100 : 0;

  return (
    <>
      <div className="cabas-wrap">
        <div className="cabas-top">
          <button className="cabas-btn-ghost" onClick={() => onBack()} aria-label={t.list.backToHome}>
            <Icon name="back" /> {t.list.backToLists}
          </button>
          <div style={{ display: "flex", gap: 2 }}>
            <button className="cabas-icon" onClick={() => setShowAisles(true)}
              aria-label={t.list.manageAisles}><Icon name="tag" /></button>
            <button className="cabas-icon" onClick={() => setShowShare(true)}
              aria-label={t.list.shareList}><Icon name="share" /></button>
          </div>
        </div>

        <div className="cabas-title-row">
          {editingTitle ? (
            <input className="cabas-title-input" value={titleDraft} autoFocus maxLength={40}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => {
                if (titleDraft.trim()) mutate((draft) => { draft.name = titleDraft.trim(); return draft; });
                setEditingTitle(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") setEditingTitle(false);
              }} />
          ) : (
            <h1 className="cabas-title">{list.name}</h1>
          )}
          {!editingTitle && !locked && (
            <button className="cabas-icon" style={{ marginTop: 4 }} aria-label={t.list.renameList}
              onClick={() => { setTitleDraft(list.name); setEditingTitle(true); }}>
              <Icon name="pencil" />
            </button>
          )}
        </div>

        <div className="cabas-progress">
          <div className="cabas-count">
            <span className="big">{total - done}</span>
            <span className="lbl">
              {t.list.itemsLeft(total - done)}
              {total ? t.list.checkedCount(done, total) : ""}
            </span>
          </div>
          <div className="cabas-bar"><i style={{ width: `${percent}%` }} /></div>
        </div>

        <div className="cabas-meta">
          <span className="cabas-members">
            {list.members.slice(0, 3).map((m) => (
              <span className="cabas-av" key={m.id} title={m.name}>
                {m.name.slice(0, 1).toUpperCase()}
              </span>
            ))}
          </span>
          <span>{t.list.members(list.members.length)}</span>
          <button className="cabas-chip code" onClick={() => copy(slug, "code")}>
            {copied === "code" ? t.copied : slug}
          </button>
          {sync && <span className="cabas-sync">{sync}</span>}
        </div>

        {locked && (
          <div className="cabas-banner done">
            <h2>{t.list.completedTitle}</h2>
            <p>
              {t.list.completedBody(
                formatDate(list.completedAt),
                formatDate(list.purgeAt),
                daysLeft(list.purgeAt)
              )}
            </p>
            <div className="acts">
              <button className="cabas-btn" onClick={reopen}>{t.list.reopen}</button>
              <button className="cabas-btn cabas-btn-danger" onClick={() => setConfirmDelete(true)}>
                {t.list.deleteNow}
              </button>
            </div>
          </div>
        )}

        {total === 0 ? (
          <div className="cabas-empty">
            <div className="display">{t.list.emptyTitle}</div>
            <p>{t.list.emptyBlurb}</p>
          </div>
        ) : (
          groups.map((group) => (
            <section className="cabas-aisle" key={group.category.id || "none"}>
              <div className="cabas-aisle-head">
                <span className="rule"
                  style={{ background: HUES[group.category.color] || HUES.slate }} />
                <span className="nm">{group.category.name}</span>
                <span className="ct">
                  {group.items.filter((i) => i.checked).length}/{group.items.length}
                </span>
              </div>
              <ul className="cabas-items">
                {group.items.map((item) => (
                  <ItemRow
                    key={item.id} item={item} categories={list.categories} locked={locked}
                    onToggle={() => toggle(item.id)}
                    onSave={(patch) => mutate((draft) => {
                      const target = draft.items.find((i) => i.id === item.id);
                      if (target) Object.assign(target, patch);
                      return draft;
                    })}
                    onDelete={() => mutate((draft) => {
                      draft.items = draft.items.filter((i) => i.id !== item.id);
                      return draft;
                    })}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      {!locked && (
        <div className="cabas-add">
          <div className="cabas-add-inner">
            <div className="line">
              <input className="cabas-input" value={newName} maxLength={60}
                placeholder={t.item.addPlaceholder}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()} />
              <button className="cabas-btn cabas-btn-primary" disabled={!newName.trim()}
                onClick={addItem} aria-label={t.item.add}>
                <Icon name="plus" />
              </button>
            </div>
            <div className="sub">
              <select className="cabas-select" value={newCategoryId}
                onChange={(e) => setNewCategoryId(e.target.value)} aria-label={t.item.aisle}>
                <option value="">{t.noAisle}</option>
                {list.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input className="cabas-input" value={newQty} maxLength={16}
                placeholder={t.item.quantity} aria-label={t.item.quantity}
                onChange={(e) => setNewQty(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()} />
            </div>
          </div>
        </div>
      )}

      {showDone && (
        <Modal title={t.done.modalTitle}
          onClose={() => { declinedRef.current = true; setShowDone(false); }}>
          <h2>{t.done.title}</h2>
          <p>{t.done.body(slug, formatDate(Date.now() + PURGE_DELAY_MS))}</p>
          <div className="acts">
            <button className="cabas-btn cabas-btn-primary" onClick={complete}>
              {t.done.confirm}
            </button>
            <button className="cabas-btn"
              onClick={() => { declinedRef.current = true; setShowDone(false); }}>
              {t.done.keepEditing}
            </button>
          </div>
        </Modal>
      )}

      {showShare && (
        <Modal title={t.share.modalTitle} onClose={() => setShowShare(false)}>
          <h2>{t.share.title}</h2>
          <p>{t.share.blurb}</p>

          <span className="cabas-label">{t.share.link}</span>
          <div className="cabas-row" style={{ marginBottom: 14 }}>
            <input className="cabas-input" readOnly value={shareLink()}
              onFocus={(e) => e.target.select()} />
            <button className="cabas-btn" onClick={() => copy(shareLink(), "link")}>
              {copied === "link" ? t.copied : t.copy}
            </button>
          </div>

          <span className="cabas-label">{t.share.orCode}</span>
          <div className="cabas-row">
            <input className="cabas-input" readOnly value={slug} onFocus={(e) => e.target.select()}
              style={{ fontFamily: "ui-monospace, Menlo, monospace" }} />
            <button className="cabas-btn" onClick={() => copy(slug, "shareCode")}>
              {copied === "shareCode" ? t.copied : t.copy}
            </button>
          </div>

          <div className="acts">
            {navigator.share && (
              <button className="cabas-btn cabas-btn-primary" onClick={share}>{t.share.send}</button>
            )}
            <button className="cabas-btn" onClick={() => setShowShare(false)}>{t.close}</button>
          </div>
        </Modal>
      )}

      {showAisles && (
        <AisleSheet
          list={list}
          onClose={() => setShowAisles(false)}
          onAdd={(name) => mutate((draft) => {
            draft.categories.push({
              id: uid(),
              name,
              color: HUE_KEYS[draft.categories.length % HUE_KEYS.length],
            });
            return draft;
          })}
          onRename={(id, name) => mutate((draft) => {
            const category = draft.categories.find((c) => c.id === id);
            if (category) category.name = name;
            return draft;
          })}
          onRecolor={(id, color) => mutate((draft) => {
            const category = draft.categories.find((c) => c.id === id);
            if (category) category.color = color;
            return draft;
          })}
          onDelete={(id) => mutate((draft) => {
            draft.categories = draft.categories.filter((c) => c.id !== id);
            draft.items = draft.items.map((item) =>
              item.categoryId === id ? { ...item, categoryId: null } : item);
            return draft;
          })}
        />
      )}

      {confirmDelete && (
        <Modal title={t.destroy.modalTitle} onClose={() => setConfirmDelete(false)}>
          <h2>{t.destroy.title}</h2>
          <p>{t.destroy.body(slug)}</p>
          <div className="acts">
            <button className="cabas-btn" onClick={() => setConfirmDelete(false)}>{t.cancel}</button>
            <button className="cabas-btn cabas-btn-danger" onClick={destroyNow}>
              {t.destroy.confirm}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Screen: configuration is incomplete                                 */
/* ------------------------------------------------------------------ */

function Misconfigured({ names }) {
  return (
    <div className="cabas-wrap">
      <div className="cabas-hello">
        <h1>{t.config.title}</h1>
        <p>{t.config.blurb(names.length)}</p>
      </div>
      <div className="cabas-panel">
        <ul style={{ margin: 0, paddingLeft: 20, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 14 }}>
          {names.map((name) => <li key={name}>{name}</li>)}
        </ul>
      </div>
      <div className="cabas-panel">
        <h2>{t.config.devTitle}</h2>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 15 }}>{t.config.devBody}</p>
      </div>
      <div className="cabas-panel">
        <h2>{t.config.prodTitle}</h2>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 15 }}>{t.config.prodBody}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Root                                                                */
/* ------------------------------------------------------------------ */

export default function App() {
  const [me, setMe] = useState(null);
  const [ready, setReady] = useState(false);
  const [slug, setSlug] = useState(null);
  const [recent, setRecent] = useState([]);
  const idRef = useRef(null);

  /* startup: identity, recent lists, and the #/l/slug route ---------- */
  useEffect(() => {
    (async () => {
      const savedMe = await prefs.get("me");
      if (savedMe && savedMe.id) {
        idRef.current = savedMe.id;
        setMe(savedMe);
      }
      const savedRecent = await prefs.get("mylists");
      if (Array.isArray(savedRecent)) setRecent(savedRecent);
      const route = window.location.hash.match(/#\/l\/([a-z0-9-]+)/i);
      if (route) setSlug(route[1].toLowerCase());
      setReady(true);
    })();
  }, []);

  const remember = useCallback((list) => {
    setRecent((previous) => {
      const next = [
        { slug: list.slug, name: list.name },
        ...previous.filter((entry) => entry.slug !== list.slug),
      ].slice(0, 8);
      prefs.set("mylists", next).catch(() => {});
      return next;
    });
  }, []);

  const openList = useCallback((next) => {
    setSlug(next);
    window.location.hash = `#/l/${next}`;
  }, []);

  const backHome = useCallback((removedSlug) => {
    if (removedSlug) {
      setRecent((previous) => {
        const next = previous.filter((entry) => entry.slug !== removedSlug);
        prefs.set("mylists", next).catch(() => {});
        return next;
      });
    }
    setSlug(null);
    window.location.hash = "";
  }, []);

  const createList = useCallback(async (name) => {
    let list = newList(name, me);
    // Slugs are random, so a collision is unlikely but not impossible.
    for (let attempt = 0; attempt < 5; attempt++) {
      let clash = null;
      try { clash = await readList(list.slug); } catch { break; }
      if (!clash) break;
      list = { ...list, slug: makeSlug() };
    }
    await writeList(list);
    remember(list);
    openList(list.slug);
  }, [me, remember, openList]);

  const saveMe = (name) => {
    if (!idRef.current) idRef.current = uid();
    const person = { id: idRef.current, name };
    setMe(person);
    prefs.set("me", person).catch(() => {});
  };

  if (missingConfig.length) {
    return (
      <div className="cabas">
        <Misconfigured names={missingConfig} />
      </div>
    );
  }

  return (
    <div className="cabas">
      {!ready ? null : !me ? (
        <Onboarding onDone={saveMe} />
      ) : slug ? (
        <ListScreen slug={slug} me={me} onBack={backHome} onTouch={remember} />
      ) : (
        <Home me={me} recent={recent} onOpen={openList} onCreate={createList}
          onChangeName={() => setMe(null)} />
      )}
    </div>
  );
}
