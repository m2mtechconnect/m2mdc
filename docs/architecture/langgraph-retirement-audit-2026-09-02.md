# LangGraph retirement audit — 2026-09-02

Status: **BLOCKED for deletion; quarantine remains authoritative.**

This is a scoped structural audit, not authorization to delete source, undeploy
functions, remove database objects, or change production. The audited commit is
`33ac38e626e8b087026ea9a5700ea60a8295ea36` on
`review/ai-transport-consolidation-20260902`.

## Decision

AURA does not currently have repository evidence that it needs LangGraph. Keep
the five `langgraph-*` Edge Functions quarantined and outside the production
allowlist. Keep the package and source until the declared production project can
be observed and external consumers are excluded. Do not promote, deploy, expose,
or describe LangGraph as an AURA runtime capability.

## Scoped container and trust-boundary view

```text
Unknown external caller? (not excluded)
             |
             v
Supabase Function Gateway (JWT required by default)
             |
             v
langgraph-run / log-run / search-docs / upsert-doc / upsert-memory
  - caller JWT forwarded to an RLS-scoped Supabase client
  - run can reach the server-owned managed-AI transport
             |
             v
public.agent_runs / public.agent_memory / public.rag_documents
  - shared with active non-LangGraph AURA features
  - database authority is Supabase Postgres + RLS
```

The browser has no repository call edge to these functions. The provider
credential remains server-owned. An unknown external API consumer is the
unresolved trust-boundary edge preventing deletion.

## Evidence inventory

| Surface | Observed evidence | Confidence / gap | Disposition |
|---|---|---|---|
| Repository callers | The enforced quarantine scan covers `src/`, `scripts/`, and `tests/`; it finds no call to any of the five functions. | Strong for static repository consumers; external clients, schedules and old deployed code are not excluded. | Keep quarantined. |
| Production perimeter | All five functions are absent from `production_functions` and from the promotion ledger. | Strong for governed deployment; does not prove old manual deployment state. | Do not promote. |
| Quarantine registry | All five functions are listed under `quarantine-in-place-no-promotion`. | Enforced by `edge-function-quarantine-contract.test.ts`. | Keep registered. |
| Package use | `@langchain/langgraph` appears in `package.json` and `bun.lock`; no runtime source import was found. | Strong source evidence; bundle and historical external tooling still require qualification before removal. | Retirement candidate. |
| New linked project | Read-only inventory for `zmewwjizebvublcsmhcz` returned eight active functions; none were `langgraph-*`. | Observed 2026-09-02 with the signed-in account. This project is not the repository-declared production ref. | No undeploy action required there. |
| Declared production project | `supabase/config.toml` and production guards identify `psfvrskpnwcshvajzeix`. Read-only function inventory returned HTTP 403 for the current account. | **Blocked:** deployed function state and invocation telemetry are unavailable. | No source deletion or undeploy. |
| Database objects | The LangGraph handlers use `agent_runs`, `agent_memory`, and `rag_documents`. `agent_runs` and `rag_documents` have active non-LangGraph consumers. | Database rows and retention were not queried. | Keep all tables, policies, types and migrations. |
| Ownership | Most history originates from generated/Lovable commits; no current domain owner is declared for this family. | Owner unassigned. | Assign an AURA agent-runtime owner before retirement approval. |

## Naming and retirement ledger

| Item | Current role | Replacement / authority | Decision |
|---|---|---|---|
| `langgraph-run` | Quarantined orchestration endpoint | Governed `agent-run` / `agent-stream` production paths | Observe, then retire. |
| `langgraph-log-run` | Quarantined run-update helper | Canonical `agent_runs` writers and run lifecycle | Observe, then retire. |
| `langgraph-search-docs` | Quarantined text-search helper | Existing governed RAG/recommendation paths | Observe, then retire. |
| `langgraph-upsert-doc` | Quarantined document writer | Existing governed ingestion/RAG paths | Observe, then retire. |
| `langgraph-upsert-memory` | Quarantined memory writer | Existing agent/Co-Pilot memory contracts | Observe, then retire. |
| `@langchain/langgraph` | Declared dependency with no runtime import found | No replacement needed unless a measured orchestration requirement appears | Remove only with the source-retirement change and clean build evidence. |
| Shared database tables | Active platform data authorities | Same tables and RLS policies | **Keep.** |

## Safe retirement sequence

1. Obtain read-only access to the declared production project and identify every
   deployed `langgraph-*` function, version, last deployment and invocation.
2. Observe a defined window with zero invocations; inventory API clients,
   schedules, webhooks and operational tooling. Assign an owner and document the
   compatibility commitment.
3. In a separate non-main branch, remove only the five function directories and
   the unused package/lock entries. Do not alter historical migrations or shared
   tables. Run clean install, typecheck, lint, build, quarantine/perimeter tests,
   agent journeys, RLS denial tests and exact-head release checks.
4. After source qualification and explicit release authorization, undeploy any
   remaining managed functions. Preserve a rollback tag/source archive and verify
   production routes plus release fingerprint after publishing.

## Stop condition

Deletion remains blocked until production access, external-consumer evidence,
an observation window, an accountable owner, rollback evidence and exact-head
qualification are recorded. Static search and the newer project's empty
LangGraph deployment are not sufficient to override this stop condition.
