# AURA White-Label Integration Architecture

## Purpose

AURA remains the customer-facing product, governance plane and operational truth layer while delegating commodity AI, SaaS connector and automation plumbing to approved managed runtimes where appropriate.

No ordinary customer-facing surface may expose implementation vendors such as Lovable, Zapier, Supabase, MCP protocol names or AI model-provider brands. Provider metadata is administrative implementation detail only.

## Product boundary

Customer-visible product vocabulary:

- AURA Intelligence
- AURA Connections
- AURA Managed Connector
- AURA Native Connector
- AURA Automation
- AURA Edge
- AURA Knowledge
- AURA Tool Gateway
- AURA Managed Runtime
- AURA Sovereign Runtime

The following are prohibited in normal customer UI:

- Lovable / lovable.app / connector-gateway.lovable.dev
- Zapier
- Supabase
- MCP
- provider model brands or provider-specific pricing

Advanced administrator diagnostics may expose implementation-provider metadata only when needed for operations and must not substitute provider availability for runtime verification.

## Runtime layers

### AURA Intelligence

Customer chooses a product profile rather than a model:

- Fast
- Balanced
- Advanced Reasoning
- Research
- Vision
- Voice

`src/config/auraRuntimeCatalog.ts` maps profiles to approved internal runtime models. The mapping is intentionally non-UI metadata and may change without altering the AURA product contract.

### AURA Managed Connectors

Commodity SaaS, productivity, CRM, data-platform and knowledge connectors may use a managed connector runtime. The AURA UI owns:

- connector display name and classification
- tenant / organization scope
- policy and permissions
- connection evidence
- health and audit state
- provenance
- data contracts
- user-facing errors

A managed catalog entry means only that AURA knows an approved integration path exists. It does **not** prove the connector is authenticated, connected, healthy or moving data.

### AURA Native Connectors

Physical infrastructure and industrial integrations remain AURA-owned runtime adapters, including:

- BACnet/IP
- Modbus TCP
- OPC-UA
- SNMP
- DCIM
- Redfish
- NVIDIA DCGM / DSX integration boundaries
- MQTT
- Prometheus / OpenTelemetry / Grafana
- OpenUSD storage
- DDN Infinia

Generic SaaS runtimes must not replace these connectors or weaken their evidence semantics.

### AURA Automation

Business-process automation may delegate to an approved automation runtime such as n8n. Durable internal background execution may delegate to an approved job runtime such as Inngest.

Both are optional. AURA must report `requires configuration` until runtime evidence exists. No UI may claim connected/healthy based solely on catalog availability.

### AURA Custom Connectors

Ordinary Builder users select only approved connectors. Arbitrary endpoint URL, header and secret entry is removed from standard Builder UX.

Custom connector creation is an administrator capability and must preserve:

- server-side credential handling
- tenant scoping
- strict allowlisting
- audited creation/update/delete
- health verification
- data-contract declaration
- safe error messages

## Existing AURA control plane

`/manage/integrations` remains authoritative for customer runtime connections. It retains:

- Connected systems
- Data and tool flows
- Connector catalog
- Health and audit
- Credential metadata
- Runtime verification
- Facility/twin mappings
- Data contracts

The Builder references this control plane rather than maintaining a second independent integration truth source.

## Security invariants

The modernization must not weaken:

- authentication or approval-state enforcement
- RBAC or RLS
- tenant isolation
- CORS allowlists
- service-role isolation
- credential-vault semantics
- migration immutability
- provenance/truth semantics
- release fingerprinting
- accessibility requirements

Provider secrets and OAuth tokens must not be surfaced in browser responses or logs.

## Phased implementation

### Phase 1 — Product/runtime contracts

- Add AURA AI profiles.
- Add managed-capability registry.
- Define customer-facing runtime labels.
- Add tests preventing vendor names from entering profile copy.

### Phase 2 — Builder intelligence simplification

- Replace provider/model picker with AURA Intelligence profiles.
- Retain internal model routing in backend/store state.
- Remove provider pricing/model metadata from ordinary UI.
- Preserve behavior, safety, knowledge and DC-specific controls.

### Phase 3 — Builder connection simplification

- Replace hardcoded business-app catalog with AURA managed capability registry.
- Remove Zapier-specific Builder runtime dependency from ordinary UI.
- Rename MCP tab to Tools/Capabilities and treat protocol details as internal.
- Remove arbitrary raw API connector creation from normal Builder flow.
- Route connector configuration to the AURA Connections control plane.

### Phase 4 — Provider-neutral Connections

- Add runtime classification metadata without changing evidence truth.
- Keep AURA-native OT connectors unchanged.
- Add managed SaaS/data/knowledge capabilities as `available` catalog entries only until configured.
- Show connected/healthy only from server-backed evidence.

### Phase 5 — Approved custom connector administration

- Admin-only custom connector lifecycle.
- Server-side secrets and credential metadata.
- Explicit allowed hosts/methods/auth types.
- Audit and verification before activation.

### Phase 6 — Automation runtime adapters

- Optional n8n adapter for business workflow execution.
- Optional Inngest adapter for durable internal jobs.
- No connection claims without runtime verification.

### Phase 7 — Validation

- Typecheck, unit and integration tests.
- Auth/RBAC/RLS/CORS regression.
- Truth/provenance assertions.
- Accessibility and responsive validation.
- No vendor-string leakage in customer UI.

## Rollback

Each phase is isolated on `refactor/aura-white-label-integrations` and can be reverted independently. The frozen release branch and PR #4 are not modified by this workstream.
