-- The baseline pg_dump intentionally clears search_path for object creation,
-- and Supabase replays later migrations in the same database session. Restore
-- the canonical application schema before subsequent historical migrations
-- that rely on unqualified public relation names.
--
-- `false` makes this a session setting, matching the baseline migration. This
-- migration creates or alters no schema object and changes no privilege, RLS
-- policy, or data.
SELECT pg_catalog.set_config('search_path', 'public', false);
