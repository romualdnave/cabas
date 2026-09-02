import { useState, useEffect, useRef, useCallback } from "react";

import Onboarding from "./components/Onboarding";
import Home from "./components/Home";
import Misconfigured from "./components/Misconfigured";
import ListScreen from "./components/ListScreen";

import { prefs, readList, writeList, missingConfig } from "./storage";
import { t } from "./i18n";
import { uid } from "./helpers";

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
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const makeSlug = () =>
  `${pick(FIRST_WORDS)}-${pick(SECOND_WORDS)}-${Math.floor(100 + Math.random() * 900)}`;

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
