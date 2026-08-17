# Schema migration

Applied through the managed migration tool:
1. Created the seven control-plane tables listed in `domain-model.md`.
2. `GRANT` statements issued in the same migration for `authenticated` (read) and `service_role`
   (full) on every new public table; RLS enabled and policies added before any data was seeded.
3. Seeded 22 connector definitions and 4 truthful connection instances (application platform,
   DSX ingest gateway, MQTT transport, OpenUSD asset storage).
4. Follow-up migration renamed the platform connector to "Application platform (managed backend)".

No existing table was dropped or repurposed. `dsx_connections` and `integrations` remain intact;
the control plane is additive and does not duplicate their rows into fabricated connected states.
