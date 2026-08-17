# Remaining roadmap

1. Credential expiry enforcement: expiry dates are stored but no scheduled job warns on or blocks
   expired credentials.
2. Connection setup wizard: implemented for every connector with a runtime adapter, including
   secret-bearing authentication through the credential vault.
3. Wire the MQTT client into the runtime source resolver to clear the BLOCKED state.
4. Deploy DSX Exchange (Common Services Cluster, NATS, JetStream, AsyncAPI schema packages) under
   explicit authorization, then validate topic permissions and schema conformance.
5. Mapping activation flow against a first real signal source.
6. Genuine MCP implementation, deferred until connector APIs, RBAC, audit and approval are stable.
7. Engineer-role and anonymous published-host verification runs.
