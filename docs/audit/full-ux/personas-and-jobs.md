# Phase 2 - personas and jobs (analytical, not user-tested)

| Persona | Start-to-finish journey | Assessment |
| --- | --- | --- |
| Executive | Dashboard -> facility summary -> KPI evidence -> export | Partially supported. Dashboard renders posture and KPI cards, but engineering controls (scenario, geometry, provenance chips) are present on the same surface; no executive-only mode exists. |
| Facility designer | Facilities -> Blueprint -> versions -> Build Twin -> validation | Supported structurally (5-tab Blueprint, Builder route). Editable vs reference vs derived field marking is not visually systematic. |
| Simulation engineer | Configure -> Simulate -> Compare -> Review -> Evidence -> Export | Supported; Compare/Review are contextual steps as designed. Blocked-run explanations exist but are text-only. |
| Operator | Twin -> camera -> rack -> overlay -> evidence | Supported, but control rails, legends and panels compete for canvas at <=1280px. |
| Governance reviewer | Evidence -> record -> provenance -> validation -> export | Supported in evidence-beta workspaces; density is high and provenance chrome often outweighs the claim. |
| Administrator | Admin console -> dataset registry -> asset pipeline -> validation -> rollback | Supported; rollback is explicit (removing `?dataset=`), but discoverability is low. |

No moderated user testing was performed - BLOCKED_UNVERIFIED.
