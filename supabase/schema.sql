-- =============================================================================
-- Cabas — Supabase schema
-- Paste into the project's SQL Editor and run in one go.
-- =============================================================================

-- One row per list. The whole document lives in `doc`, exactly as the frontend
-- manipulates it: no mapping, and no migration every time a field is added.
create table if not exists public.lists (
  slug        text primary key,
  doc         jsonb not null,
  updated_at  timestamptz not null default now()
);

-- RLS on, and *no* policy: the table is therefore unreachable with the anon
-- key, which is public since it ships inside the bundle. Without this, anyone
-- could read every list belonging to everyone.
-- The three functions below are the only way in, and each one requires the
-- caller to already know the slug.
alter table public.lists enable row level security;

-- -----------------------------------------------------------------------------
-- Read. A list whose purge date has passed no longer exists, even if the
-- nightly cleanup has not run yet.
-- -----------------------------------------------------------------------------
create or replace function public.get_list(p_slug text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select doc
  from public.lists
  where slug = p_slug
    and coalesce((doc->>'purgeAt')::bigint, 9223372036854775807)
        > (extract(epoch from now()) * 1000)::bigint;
$$;

-- -----------------------------------------------------------------------------
-- Write. Last-write-wins, with one guard rail: a revision older than the one
-- already stored is ignored, and the function returns whichever document is
-- authoritative.
-- -----------------------------------------------------------------------------
create or replace function public.save_list(p_slug text, p_doc jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current jsonb;
begin
  if p_slug !~ '^[a-z0-9-]{3,64}$' or p_doc->>'slug' is distinct from p_slug then
    raise exception 'invalid slug';
  end if;

  if jsonb_typeof(p_doc->'items') is distinct from 'array'
     or jsonb_array_length(p_doc->'items') > 500 then
    raise exception 'invalid document';
  end if;

  select doc into v_current from public.lists where slug = p_slug;

  if v_current is not null
     and (v_current->>'rev')::bigint > (p_doc->>'rev')::bigint then
    return v_current;
  end if;

  insert into public.lists (slug, doc)
  values (p_slug, p_doc)
  on conflict (slug) do update
    set doc = excluded.doc, updated_at = now();

  return p_doc;
end;
$$;

-- -----------------------------------------------------------------------------
-- Immediate deletion, triggered from the interface.
-- -----------------------------------------------------------------------------
create or replace function public.delete_list(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.lists where slug = p_slug;
$$;

grant execute on function public.get_list(text)            to anon;
grant execute on function public.save_list(text, jsonb)    to anon;
grant execute on function public.delete_list(text)         to anon;
