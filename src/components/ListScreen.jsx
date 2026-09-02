import { useState, useEffect, useRef, useMemo, useCallback } from "react";

import Icon from "./Icon";
import Modal from "./Modal";
import ItemRow from "./ItemRow";
import AisleSheet from "./AisleSheet";

import { readList, deleteList, watchList, writeList } from "../storage";
import { t } from "../i18n";
import { HUES, HUE_KEYS } from "../consts";
import { uid } from "../helpers";

const PURGE_DELAY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Realtime does the real work; this refresh is only a safety net in case a
// broadcast message is lost.
const REFRESH_MS = 20000;

const daysLeft = (timestamp) => Math.max(0, Math.ceil((timestamp - Date.now()) / 86400000));
const formatDate = (timestamp) =>
  new Date(timestamp).toLocaleDateString(t.dateLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/* ------------------------------------------------------------------ */
/* Screen: one list                                                    */
/* ------------------------------------------------------------------ */

export default function ListScreen({ slug, me, onBack, onTouch, onGone }) {
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
    if (!remote || !local || remote.slug !== local.slug) { return; }
    const newer =
      (remote.rev || 0) > (local.rev || 0) ||
      ((remote.rev || 0) === (local.rev || 0) && (remote.updatedAt || 0) > (local.updatedAt || 0));
    if (!newer) { return; }
    listRef.current = remote;
    setList(remote);
    if (remote.items.length && remote.items.some((i) => !i.checked)) { declinedRef.current = false; }
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
      if (saved && saved.rev !== next.rev) { adopt(saved); }
      else if (channelRef.current) { channelRef.current.push(next); }
    } catch {
      setSync(t.list.saveFailed);
    } finally {
      writingRef.current = false;
    }
  }, [adopt]);

  const mutate = useCallback((change) => {
    const base = listRef.current;
    if (!base) { return; }
    const draft = change(structuredClone(base));
    if (!draft) { return; }
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
        if (alive) { setStatus("offline"); }
        return;
      }
      if (!alive) { return; }
      // A list can vanish without going through this app: purged by the cron,
      // or deleted straight from the database. Either way, stop offering it.
      if (!loaded) { setStatus("missing"); onGone(slug); return; }
      if (loaded.purgeAt && Date.now() > loaded.purgeAt) {
        try { await deleteList(slug); } catch { /* the nightly job will get it */ }
        setStatus("purged");
        onGone(slug);
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
  }, [slug, me.id, me.name, onTouch, onGone]);

  /* realtime ---------------------------------------------------------- */
  useEffect(() => {
    if (status !== "ok") { return; }
    const channel = watchList(slug, adopt);
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      channel.close();
    };
  }, [slug, status, adopt]);

  /* safety net: periodic re-read, and one when the tab comes back ------ */
  useEffect(() => {
    if (status !== "ok") { return; }
    const refresh = async () => {
      if (writingRef.current || document.hidden) { return; }
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
    if (!name || locked) { return; }
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
      if (!item) { return null; }
      item.checked = !item.checked;
      item.checkedBy = item.checked ? me.name : null;
      return draft;
    });
    if (!next) { return; }
    const allChecked = next.items.length > 0 && next.items.every((i) => i.checked);
    // Only the person who ticked the last box is asked, and only on the
    // transition. Declining suppresses the prompt until the state breaks.
    if (!allChecked) { declinedRef.current = false; }
    if (allChecked && !wasAllChecked && !declinedRef.current) { setShowDone(true); }
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
    if (!list) { return []; }
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
  const newCategory = list.categories.find((c) => c.id === newCategoryId);

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
            {!locked && (
              <button className="cabas-icon danger" onClick={() => setConfirmDelete(true)}
                aria-label={t.list.deleteList}><Icon name="trash" /></button>
            )}
          </div>
        </div>

        <div className="cabas-title-row">
          {editingTitle ? (
            <input className="cabas-title-input" value={titleDraft} autoFocus maxLength={40}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => {
                if (titleDraft.trim()) { mutate((draft) => { draft.name = titleDraft.trim(); return draft; }); }
                setEditingTitle(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.currentTarget.blur(); }
                if (e.key === "Escape") { setEditingTitle(false); }
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
                      if (target) { Object.assign(target, patch); }
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
              <div className="cabas-select-wrap">
                <span className="dot" style={{ background: newCategory ? HUES[newCategory.color] || HUES.slate : HUES.slate }} />
                <select className="cabas-select" value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)} aria-label={t.item.aisle}>
                  <option value="" style={{ color: HUES.slate }}>{t.noAisle}</option>
                  {list.categories.map((c) => (
                    <option key={c.id} value={c.id} style={{ color: HUES[c.color] || HUES.slate }}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
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
            if (category) { category.name = name; }
            return draft;
          })}
          onRecolor={(id, color) => mutate((draft) => {
            const category = draft.categories.find((c) => c.id === id);
            if (category) { category.color = color; }
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