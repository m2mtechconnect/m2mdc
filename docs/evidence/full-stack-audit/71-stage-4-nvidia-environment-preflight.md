# Stage 4 preflight — NVIDIA vertical-slice environment probe

Date: 2026-08-07. Read-only. No production data, no production Supabase
configuration and no artifact 00-70 was modified. No NVIDIA entitlement was
used, because none exists in this workspace.

## Probe results (verbatim)

| Probe | Command | Result |
|---|---|---|
| GPU device nodes | `ls /dev/nvidia*` | `No such file or directory` |
| GPU driver CLI | `command -v nvidia-smi` | absent |
| Container runtime | `command -v docker` | absent |
| NGC CLI | `command -v ngc` | absent |
| NVIDIA/NGC/Omniverse credentials in environment | `env \| grep -cE 'NGC_\|NVIDIA_\|OMNI'` | `0` |
| OpenUSD Python runtime | `python3 -c "import pxr"` | `ModuleNotFoundError: No module named 'pxr'` |
| OpenUSD validator | `command -v usdchecker` | absent |
| Blueprint catalogue reachability | `curl https://build.nvidia.com/` | HTTP 202 (reachable, unauthenticated; no entitlement) |
| NGC catalogue API | `curl https://api.ngc.nvidia.com/v2/search/catalog/resources` | HTTP 400 (no API key supplied) |

## Consequences

1. **G4-01 (official NVIDIA software deployed)** cannot be attempted. The
   Omniverse DSX Blueprint is distributed through build.nvidia.com and NGC and
   requires an NGC entitlement plus a container runtime. Neither exists here.
2. **G4-02 (GPU execution proven)** cannot be attempted. There is no NVIDIA
   GPU, driver, CUDA runtime or container toolkit in this sandbox.
3. **G4-03 / G4-04 (OpenUSD stage, SimReady-aligned asset)** cannot be
   validated. There is no `pxr` runtime and no `usdchecker`. Authoring a `.usda`
   text file by hand without a validator would produce an unvalidated artifact,
   which the Stage 4 rules forbid presenting as a passed gate.
5. **G4-05 (DSX Exchange operational)** cannot be attempted. NVIDIA DSX
   Exchange is an official NVIDIA layer; the existing
   `infra/dsx-exchange/docker-compose.yml` runs generic Eclipse Mosquitto,
   which the Stage 4 brief explicitly disqualifies. It was not started, and it
   is not offered as a substitute.
6. **G4-06 (schema-conformant telemetry)** cannot be attempted. No official DSX
   Exchange AsyncAPI document is present in the repository and none could be
   retrieved without entitlement. AURA's `supabase/functions/_shared/dsx-contract.ts`
   is an M2M-authored envelope, not an NVIDIA schema.

Gates G4-07 through G4-11 depend on G4-01 through G4-06 and are therefore
blocked transitively, not failed.

## Explicit non-actions

- No mock, stub, hand-rolled USD file or Mosquitto broker was substituted for
  an NVIDIA component in order to mark a gate passed.
- No screenshots, logs or "evidence" were generated for work that did not run.
- No credential was requested, minted, stored or written into this package.
