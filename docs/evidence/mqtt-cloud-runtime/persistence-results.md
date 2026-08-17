# Persistence results

Durable write paths were NOT exercised in this phase.

- The worker writes with a Supabase service-role client; SUPABASE_SERVICE_ROLE_KEY is not available in this environment and is not retrievable on Lovable Cloud.
- Schema conformance of every evidence row shape was re-confirmed against the live column definitions; all eleven required tables exist.
- Preflight row counts: connection_ingest_runs 0, connection_ingest_messages 0, connection_runtime_workers 0, twin_property_values unchanged.
- twin_property_values still uses the read-then-write path in evidence.ts because of the expression-based unique index.

Consequence: no durable-write evidence exists for this phase, which alone holds the verdict below VERIFIED.
