# Cabas

A shopping list shared by two people, with no account to create. Each list is
identified by a readable slug (`lemon-cabin-204`); whoever holds the link holds
the list.

React and Vite on one side, Supabase on the other. No server to maintain.

## What it does

- Create a list and share it through a link containing the slug generated in the app.
- Add, edit and delete items, each with a quantity and an aisle.
- Group items by aisle; add, rename, recolour and delete aisles.
- Check an item off: it stays on screen, struck through and dimmed, showing who picked it up.
- When the last item is checked, the person who just checked it is asked whether the
  list is done. Decline and nothing changes, so editing continues. Confirm and the
  list is locked, then its slug and all of its data are destroyed 7 days later.
- No notion of an owner. Anyone who has joined a list has exactly the same rights,
  including finishing it or deleting it.
- Both devices stay in sync in real time, with no reloading.

## Language

The interface follows the browser locale, in English or French. Everything else —
code, comments, commit messages, this file — is English. `src/i18n.js` holds the two
dictionaries and is the only place user-facing strings live.

Default aisle names are data rather than interface: they are copied into the list
document when it is created, so a list created in French keeps its French aisle names
for whoever opens it. That is deliberate. Both people are looking at the same shelves.

## Setup

1. Create a project on [supabase.com](https://supabase.com); the free plan is plenty.
2. Open the **SQL Editor** and run `supabase/schema.sql`, then `supabase/purge.sql`.
   They are separate files so that a failure to enable `pg_cron` cannot roll back
   the schema.
3. Copy the project URL and the `anon` key from **Project Settings → API**.

```bash
npm install
cp .env.example .env   # then paste in the URL and the key
npm run dev
```

The app listens on `http://localhost:5173`.

## How it works

One table, `lists`, holding one row per list: the slug as primary key and the whole
document as `jsonb`. The frontend manipulates that document as-is, so adding a field
requires no migration.

The table has RLS enabled and **no policy**, which makes it unreachable directly.
That is deliberate: the `anon` key is public because it ships in the bundle, and an
open read policy would let anyone drain every list belonging to every user. The three
`security definer` functions — `get_list`, `save_list`, `delete_list` — are the only
way in, and each requires the slug.

`save_list` is last-write-wins with a guard rail: a revision older than the stored one
is ignored, and the function returns whichever document is authoritative. The client
then adopts it in place of its own.

Synchronisation runs on Realtime *broadcast*: after each write, the device broadcasts
the document on the `list:{slug}` channel and the other receives it within a second.
A re-read every 20 seconds, plus one when the tab regains focus, covers a lost message.

The 7 day purge is a daily `cron.schedule`. `get_list` hides expired lists anyway, so
the promise made to the user holds even if the cleanup falls behind.

## Deploying

`npm run build` produces `dist/`, servable from any static host (Netlify, Vercel,
Cloudflare Pages, GitHub Pages). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
at build time — they are read then, not at startup.

## Known limits

- **Concurrency.** Two edits within the same second: one of them wins. For two people
  in a shop that is painless. A real fix needs a compare-and-swap on `rev` with client
  replay, or a CRDT.
- **Privacy.** The slug is the only secret and it travels in the clear inside the URL.
  Fine for a shopping list, not for sensitive data.
- **Unauthenticated broadcast.** Anyone who knows the slug can publish on the Realtime
  channel. Same trust model as the rest: the link is the credential.
- **No tests.** First gap to close if the project is going to live.

## Licence

MIT.
