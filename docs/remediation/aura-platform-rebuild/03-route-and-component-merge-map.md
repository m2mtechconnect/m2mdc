# Route and component duplication inventory (measured at ad0ff04)

105 `path=` declarations: 28 in `src/App.tsx`, 77 in `src/AuthenticatedShell.tsx`.

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
| `workspace/dashboard/FacilityCanvas.tsx` | dashboard canvas | delete after adapter proves parity |
| `components/data-centre-twin/overview/MiniTwinPreview.tsx` | thumbnail | size variant of canonical |
| `pages/TwinPreview.tsx` | standalone page | route wrapper only |

Target viewport interface: one component with explicit `kit-stream` and `browser-fallback`
adapters (`src/renderer/rendererModes.ts` already models the modes and is the seed for it).

## Canonical lifecycle target
`/dashboard` -> `/blueprint/:id` -> `/simulation` -> `/operations` -> `/evidence` ->
`/assets` -> `/manage/integrations` -> `/deployments` -> `/admin/*`.
Everything else redirects; no retained legacy URL keeps its own page implementation.
