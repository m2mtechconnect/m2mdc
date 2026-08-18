# Route and component duplication inventory (measured at 66d2c2a)

101 `path=` declarations: 25 in `src/App.tsx`, 76 in `src/AuthenticatedShell.tsx`.
8 literals are declared more than once.

## Duplicate path literals
| Path | Count | Note |
|---|---|---|
| `/sign-out` | 6 | one canonical handler required |
| `*` / `/*` | 6 | multiple catch-alls |
| `/twin-preview`, `/pilot/*`, `/onboarding`, `/login`, `/data-centre-twin`, `/dev-overlays` | 2 each | declared in both shells |

## Overlapping twin/simulation experiences
| Route | Implementation | Proposed disposition |
|---|---|---|
| `/simulation` | workspace simulation | **canonical Simulate** |
| `/simulation/preview` | preview session bridge | merge into `/simulation` preview mode |
| Builder Step 5 preview | `BuilderPreviewEngine` (own engine, 8 `Math.random()`) | consume canonical provider + viewport |
| `/data-centre-twin`, `/data-centre-twin/:id` | DataCentreDashboard | merge into `/blueprint/:id` + `/operations`; redirect |
| `/twin-preview` | `src/pages/TwinPreview.tsx` (public) | demo-marked or authenticated (Phase 1) |
| `/blueprint/preview` | blueprint preview | merge into `/blueprint/:id` |
| `/omniverse-scene` | legacy alias | redirect only |
| `/infrastructure` | InfrastructurePage | merge into `/operations` |
| `/dsx/evidence-beta` | evidence-beta workspaces | merge into `/evidence` |
| `/digital-twins-demo/funding-intake` | fixture demo | explicit demo namespace or delete |
| `/twin-debug`, `/twin-datacentre`, `/deploy` vs `/deployments` | legacy | redirect to canonical |

## Viewport implementations (5)
| File | Role today | Target |
|---|---|---|
| `components/twin-visualization/DataCenter3DScene.tsx` | main 3D scene | **canonical viewport core** |
| `workspace/FacilityCanvas.tsx` | workspace canvas | adapter over canonical |
| `workspace/dashboard/FacilityPlanCard.tsx` | dashboard canvas | **superseded by Phase 3**: an SVG floor-plan card, not a duplicate viewport; retained and renamed |
| `components/data-centre-twin/overview/MiniTwinPreview.tsx` | thumbnail | size variant of canonical |
| `pages/TwinPreview.tsx` | standalone page | route wrapper only |

Target viewport interface: one component with explicit `kit-stream` and `browser-fallback`
adapters (`src/renderer/rendererModes.ts` already models the modes and is the seed for it).

**Phase 3 revision:** these surfaces already share `DataCenter3DScene` (3D) and
`FacilityFloorPlan` (2D); what differs is chrome, so they were not merged. What
they now share instead is the provenance claim, enforced by
`src/workspace/viewportRegistry.ts`. See `08-phase-3-viewport-consolidation.md`.

## Canonical lifecycle target
`/dashboard` -> `/blueprint/:id` -> `/simulation` -> `/operations` -> `/evidence` ->
`/assets` -> `/manage/integrations` -> `/deployments` -> `/admin/*`.
Everything else redirects; no retained legacy URL keeps its own page implementation.
