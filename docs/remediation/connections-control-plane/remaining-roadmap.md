# Remaining roadmap

1. Credential vault: no approved server-side vault exists, so credential submission stays disabled.
2. Connection setup wizard: implemented for connectors with a runtime adapter and vault-free
   authentication; broader connector onboarding depends on the vault.
3. Wire the MQTT client into the runtime source resolver to clear the BLOCKED state.
4. Deploy DSX Exchange (Common Services Cluster, NATS, JetStream, AsyncAPI schema packages) under
   explicit authorization, then validate topic permissions and schema conformance.
5. Mapping activation flow against a first real signal source.
6. Genuine MCP implementation, deferred until connector APIs, RBAC, audit and approval are stable.
7. Engineer-role and anonymous published-host verification runs.
