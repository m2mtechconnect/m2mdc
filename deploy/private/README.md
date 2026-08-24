# AURA Private packaging scaffold

> **STATUS: SCAFFOLD - NOT RELEASE-QUALIFIED**
>
> This package proves a portable deployment shape for the **AURA web shell only**. It does not make AURA Private, AURA Sovereign, or air-gapped deployment generally available.

## What this phase packages

- the Vite/React AURA web application as a static container;
- an unprivileged web server with SPA routing;
- `/healthz` and `/readyz` endpoints for the **web container only**;
- a Helm chart for deploying the web shell into Kubernetes;
- a configuration contract pointing the bundle at an **externally supplied compatible backend**.

## What this phase does not package

This scaffold does **not** provide or qualify:

- a private Supabase/Postgres/Auth/Storage/Realtime runtime;
- the existing Supabase Edge Functions as customer-hosted services;
- database migration orchestration, backup/restore, HA or disaster recovery;
- an internal container registry or offline image bundle;
- SAML/OIDC infrastructure for a customer environment;
- AURA Edge Gateway enrollment or certificate issuance;
- SNMP, BACnet, Modbus, Redfish or OPC UA production adapters;
- Terraform for AWS, Azure or Google Cloud;
- a sovereign or air-gapped update/support process.

The commercial deployment catalogue must therefore continue to report `private_cloud` and `sovereign_air_gapped` as **PLANNED**.

## Backend contract

The web bundle expects the same public client contract the application uses today:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

These are public browser configuration values, not privileged secrets. **Never** provide `SUPABASE_SERVICE_ROLE_KEY`, database passwords, provider API secrets, signing keys, or customer credentials to the web-image build.

### Current limitation: build-time public configuration

Vite replaces the `VITE_*` values during `bun run build`. The initial private image is therefore built for one target backend configuration:

```bash
docker build \
  -f deploy/private/Dockerfile.web \
  --build-arg VITE_SUPABASE_URL=https://backend.customer.example \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY='<public-anon-key>' \
  --build-arg VITE_SUPABASE_PROJECT_ID='<project-id>' \
  -t registry.example/aura-web:<version> \
  .
```

A later portability phase should add signed/runtime configuration so one immutable image can move between environments without rebuilding. Until then, the image digest is environment-specific.

## Helm usage

The chart deploys only the web image:

```bash
helm upgrade --install aura-web deploy/private/helm/aura-web \
  --namespace aura \
  --create-namespace \
  --set image.repository=registry.example/aura-web \
  --set image.tag=<version> \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host=aura.customer.example
```

The chart does not deploy a database, Supabase services, Edge Functions, object storage, AI providers, or an Edge Gateway.

## Health semantics

- `/healthz` proves the static web process is serving HTTP.
- `/readyz` proves the static web process is ready to receive browser traffic.

Neither endpoint proves that authentication, storage, database, Edge Functions, AI, integrations, or customer infrastructure are healthy. End-to-end readiness requires a separately qualified backend and an authenticated AURA smoke test.

## Release gate before `AURA Private` can become AVAILABLE

At minimum:

1. Package and qualify the backend dependency set.
2. Apply the complete database migration chain in a clean private environment.
3. Establish secret management and key rotation.
4. Establish tenant storage, backup, restore and disaster-recovery procedures.
5. Qualify identity/SSO and outbound network policy.
6. Deploy this chart plus the backend to a fresh Kubernetes cluster.
7. Run the AURA Golden User Journey against that deployment.
8. Record image/chart digests and evidence.
9. Demonstrate upgrade and rollback.
10. Pass security and tenant-isolation acceptance.

Until those gates are complete, this directory is a portability engineering scaffold, not evidence of a production private-cloud offering.