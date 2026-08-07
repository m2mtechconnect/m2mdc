# Stage 4A - NVIDIA DSX Infrastructure Manifest (2026-08-07)

Provisioning attempt only. **No NVIDIA package was downloaded, no registry was
authenticated against, and zero requests were issued to production project
`psfvrskpnwcshvajzeix`.** Artifacts 00-74 are unmodified.

## 1. Runner fingerprint (observed, non-credential)

| Property | Observed value |
|---|---|
| Kernel | `Linux 4.19.0-gvisor x86_64` (gVisor sandbox, not a bare-metal or VM host) |
| vCPU | 64 |
| Memory | 251 GiB total |
| Root filesystem | sparse overlay, 1.2 GiB used |
| GPU device nodes (`/dev/nvidia*`) | **absent** |
| `nvidia-smi` | **absent** |
| NVIDIA kernel driver | **absent** (no device nodes, no `/proc/driver/nvidia`) |
| Container runtime (`docker`/`podman`) | **absent** |
| NVIDIA Container Toolkit (`nvidia-ctk`) | **absent** |
| NGC CLI (`ngc`) | **absent** |
| OpenUSD tooling (`usdchecker`, `pxr` Python module) | **absent** |
| NVIDIA / NGC / Omniverse credentials in environment | **0 present** (name-only scan; no value read) |

The runner is a gVisor application sandbox. GPU passthrough, kernel-module
loading and nested container runtimes are structurally unavailable here; this
is not a missing package that can be installed, it is a missing host class.

## 2. Requested infrastructure (section 1 of the Stage 4A brief)

| Requirement | Status | Responsible owner |
|---|---|---|
| Isolated Linux runner with supported NVIDIA GPU | not provided | infrastructure administrator |
| Compatible NVIDIA driver | not provided | infrastructure administrator |
| NVIDIA Container Toolkit | not installable without a GPU host | infrastructure administrator |
| Docker or supported container runtime | not available in gVisor sandbox | infrastructure administrator |
| NGC CLI | installable, but pointless without an entitled credential | infrastructure administrator |
| Authorized outbound access to NVIDIA registries | unproven; egress exists but no entitlement | NVIDIA account owner |

## 3. Official NVIDIA access (section 2 of the brief)

No NGC credential was configured through a secret manager, therefore **no
authorized package metadata was retrieved**. Per the brief, an HTTP response
from `build.nvidia.com` or an unauthenticated NGC error does **not** prove
entitlement, so no such probe was repeated from Stage 4 and no result from
Stage 4 is being re-used as evidence of access. Artifact 76 records the
register with every row in `not_retrieved` status.

No substitute was accepted: Mosquitto, the in-repo `src/dsx/exchange`
abstraction, any copied or hand-authored AsyncAPI document, and any generic
MQTT pipeline are explicitly **rejected** as stand-ins for the official DSX
Exchange distribution.

## 4. Disposable backend (section 3 of the brief)

The environment guard `scripts/aura-test-env-guard.mjs` was executed **before**
any backend request and returned **BLOCKED**:

- `AURA_DC_TEST_ENV` absent (required exactly `aura-dc-security-test`)
- `SUPABASE_PROJECT_ID` resolves to the production reference (forbidden)
- `VITE_SUPABASE_URL` resolves to a denylisted production hostname
- `AURA_DC_TEST_DISPOSABLE` not `true`
- `AURA_DC_TEST_CLEANUP_AUTHORIZED` not `true`

Consequently zero backend requests were issued. The disposable project
specified in artifact 51 has not been provisioned; this workspace is bound to
the production project only and cannot create a second one.

## 5. Credential hygiene

Only presence flags and non-secret identifiers appear in artifacts 75-77. No
password, API key, JWT, connection string, service-role credential or reusable
token is recorded anywhere in this stage's evidence.
