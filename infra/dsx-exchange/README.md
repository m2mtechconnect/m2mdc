# DSX Exchange local broker (Docker Compose)

Provides the same broker contract as the Nix-provisioned mosquitto used for the
Phase 7 runtime verification, for environments where Docker is available.

## Safety
- Port is published on `127.0.0.1:1883` only. Nothing is reachable off-host.
- No NVIDIA endpoint, no production backend, no remote credentials are involved.
- Anonymous access is enabled because the broker is loopback-only and disposable.

## Usage

```bash
# start
docker compose -f infra/dsx-exchange/docker-compose.yml up -d

# confirm health
docker compose -f infra/dsx-exchange/docker-compose.yml ps

# run Phase 7 runtime verification against the broker
DSX_EXCHANGE_URL=mqtt://127.0.0.1:1883 npx tsx scripts/dsx-exchange-runtime-verify.ts

# reachability-only check
DSX_EXCHANGE_URL=mqtt://127.0.0.1:1883 node scripts/dsx-exchange-local-harness.mjs

# stop and discard state
docker compose -f infra/dsx-exchange/docker-compose.yml down -v
```

If Docker is unavailable, provision mosquitto directly (for example via Nix) on
`127.0.0.1:1883`; the verification scripts are transport-identical.
