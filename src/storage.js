import { createClient } from "@supabase/supabase-js";

/**
 * Two clearly separate spaces:
 *
 *  - `prefs`  : local to the browser (first name, recently opened lists).
 *               Never shared, never sent to Supabase.
 *  - lists    : shared between the people who hold the slug. Everything goes
 *               through three SQL functions (see supabase/schema.sql); the
 *               table itself is not reachable with the anon key, which is
 *               public since it ships inside the bundle.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Variables missing from the build. We deliberately do not throw here: that
 * would stop the module before React mounts, leaving the user with a blank
 * page. The interface shows a configuration screen instead.
 */
export const missingConfig = [
  url ? null : "VITE_SUPABASE_URL",
  key ? null : "VITE_SUPABASE_ANON_KEY",
].filter(Boolean);

const supabase = missingConfig.length ? null : createClient(url, key);

function client() {
  if (!supabase) { throw new Error(`Missing configuration: ${missingConfig.join(", ")}`); }
  return supabase;
}

/* ---------- accounts --------------------------------------------------
 *
 * Supabase Auth gives each person a stable id (auth.uid()), independent of
 * how many windows or devices they have open. That id, not a locally
 * generated one, is what `App.jsx` uses as `me.id` — the fix for the bug
 * where opening two windows under the same display name produced two
 * distinct members on a list.
 * ----------------------------------------------------------------------- */

/** Turns a Supabase auth user into the shape the rest of the app expects. */
export function toPerson(user) {
  return user ? { id: user.id, name: user.user_metadata?.name || "" } : null;
}

export const auth = {
  async getSession() {
    const { data } = await client().auth.getSession();
    return data.session;
  },
  /** Fires once immediately, then on every sign-in/sign-out/token refresh. */
  onChange(callback) {
    return client().auth.onAuthStateChange((_event, session) => callback(session));
  },
  async signUp(email, password, name) {
    const { error } = await client().auth.signUp({ email, password, options: { data: { name } } });
    if (error) { throw error; }
  },
  async signIn(email, password) {
    const { error } = await client().auth.signInWithPassword({ email, password });
    if (error) { throw error; }
  },
  async signOut() {
    await client().auth.signOut();
  },
};

/* ---------- local preferences --------------------------------------- */

export const prefs = {
  async get(name) {
    try {
      const raw = localStorage.getItem(`cabas:${name}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  async set(name, value) {
    try {
      localStorage.setItem(`cabas:${name}`, JSON.stringify(value));
    } catch {
      /* private browsing or full quota: carry on without persisting */
    }
  },
};

/* ---------- lists ---------------------------------------------------- */

export async function readList(slug) {
  const { data, error } = await client().rpc("get_list", { p_slug: slug });
  if (error) { throw error; }
  return data ?? null;
}

/** Returns the authoritative document: ours, or the stored one if it is newer. */
export async function writeList(list) {
  const { data, error } = await client().rpc("save_list", { p_slug: list.slug, p_doc: list });
  if (error) { throw error; }
  return data ?? list;
}

export async function deleteList(slug) {
  const { error } = await client().rpc("delete_list", { p_slug: slug });
  if (error) { throw error; }
}

/**
 * Realtime channel for one list. Each device broadcasts the document right
 * after saving it, and the other receives it within a second without querying
 * the database. The channel name is the slug, which is already the list's
 * only secret.
 */
export function watchList(slug, onDocument) {
  const channel = client()
    .channel(`list:${slug}`)
    .on("broadcast", { event: "doc" }, ({ payload }) => onDocument(payload))
    .subscribe();

  return {
    push(doc) {
      channel.send({ type: "broadcast", event: "doc", payload: doc }).catch(() => {
        /* channel not ready yet: the periodic refresh will catch up */
      });
    },
    close() {
      client().removeChannel(channel);
    },
  };
}
