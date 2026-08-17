# Console and network findings

Evidence: `evidence/published-build/auth/route-sweep.json`, `.../anon/route-sweep.json` (83 routes each).

| Route | Observation | Class |
| --- | --- | --- |
| /studio/systems/does-not-exist/manage | 3x `400` on `agents?id=eq.does-not-exist` then a spinner that never resolves | PERMANENT_LOADING, P2 |
| /app/agents/does-not-exist/detail | 3x `406` on `agent_definitions?slug=eq....` then a spinner that never resolves | PERMANENT_LOADING, P2 |
| /blueprint/%%%bad-id | edge returns `400 Bad Request` HTML, the SPA never mounts | BROKEN, P3 |
| /teams | aborted prefetch of `/data-centre-twin?geometry=nvidia-reference&harness=1` | WIRED_WITH_LIMITATIONS, P3 |
| /blueprint/default, /simulation, /simulation/preview | `copilot_memory` and `data_centre_locations` requests end `net::ERR_ABORTED` when navigating away | expected in-flight cancellation |
| /this-route-does-not-exist | deliberate 404 log | expected |
| all routes | `*.clarity.ms/collect` failures | third-party, blocked by the sandbox network |

No console errors were observed on the remaining 76 authenticated routes. That does not generalize to untested interaction paths.
