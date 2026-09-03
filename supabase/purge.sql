-- =============================================================================
-- Cabas — 7 day purge
-- Run in the SQL Editor, separately from schema.sql.
--
-- If enabling pg_cron fails, turn the extension on from Database → Extensions
-- first, then replay this file. Keeping it separate stops a failure here from
-- rolling back the schema.
--
-- Worth knowing: `get_list` already hides expired lists, so the promise made
-- to the user holds even if the cleanup falls behind. This cron actually
-- removes the rows, which is the only way to keep that promise all the way.
-- =============================================================================

create extension if not exists pg_cron;

select cron.schedule(
  'purge-completed-lists',
  '0 3 * * *',
  $$
    delete from public.lists
    where (doc->>'purgeAt')::bigint < (extract(epoch from now()) * 1000)::bigint;
  $$
);
