# Prioritized remediation backlog

Fields: ID | Severity | Route/Scope | Role | Dataset | Breakpoint | Evidence | Impact | Root cause | Correction | Benefit | Effort | Dependencies | Regression risk | Acceptance test

## Immediate correctness
- UX-001 | P1 | all reference-enabled routes | Admin | nvidia-dsx-reference | all | evidence/summary.json (2/17 labelled) | Reference data can be read as operational | Banner renders only on some shells | Render the "NVIDIA DSX Reference - Read-only" label in every reference route shell and in exports | Removes misrepresentation risk | M | DatasetProvider | low | Sweep 17 sample routes, 17/17 show the label
- UX-002 | P1 | /analytics and chart surfaces | All | nvidia-dsx-reference | all | tables-charts-audit.md | Point-in-time reference values rendered as trends imply measurement | Chart components assume series data | Suppress trend chrome and state "point-in-time reference" under the reference dataset | Honest analytics | M | dataset registry | medium | Reference load of /analytics shows no time axis

## Navigation and architecture
- UX-003 | P2 | /agent-chat, /admin/user-approvals, /twin-datacentre, /omniverse-scene, /deploy | All | any | all | dsx-relevance-matrix.md | Duplicate destinations and an NVIDIA-implying route name | Historic routes kept as aliases | Consolidate to one canonical destination each; rename `omniverse-scene` | Predictable IA, no unsupported claim | M | routeAliases | medium | Alias sweep resolves each legacy path to one canonical page

## Responsive
- UX-004 | P1 | 15 primary routes | All | any | 1024x768 and 390x844 | responsive-results.md | Tablet and mobile are unusable compressed desktops | Fixed-width rails and KPI grids | Reflow control rails, KPI grid and 3D chrome below 1280px | Usable on tablet/mobile | L | design system | medium | Zero horizontal overflow at 1024x768 and 390x844

## Accessibility
- UX-005 | P2 | 81 routes | All | any | all | token-violations.json | Sub-11px text excludes low-vision users | Shared chrome typography | Raise minimum to 12px body / 11px label | Meets project standard | M | tokens | low | Sweep reports 0 sub-11px elements
- UX-006 | P2 | 80 routes | All | any | all | token-violations.json | Controls under 24x24 fail WCAG 2.2 target size | Icon button sizing | Enforce >=24px (>=44px on touch) | AA target size | M | Button variants | low | Sweep reports 0 undersized controls
- UX-007 | P2 | 76 routes | All | any | all | accessibility-results.md | Heading skips break screen-reader structure | Ad-hoc heading levels | Normalise hierarchy per page | Navigable structure | M | none | low | Sweep reports 0 skips
- UX-008 | P2 | 9 routes | All | any | all | forms-controls-audit.md | Disabled actions with no reason | Missing tooltip/description | Add disabled reason to every gated action | Error prevention | S | none | low | Every disabled control exposes a reason

## Visual system cleanup
- UX-009 | P3 | 82 routes | All | any | all | token-violations.json | Theme bypass via hardcoded black/white | Utility drift | Replace with semantic tokens | Consistent theming | M | tokens | medium | No `text-white`/`bg-black` in app components
- UX-010 | P3 | 75 routes | All | any | all | page-findings.md | Em dashes violate the typography rule | Copy drift | Replace with hyphens | Copy consistency | S | none | low | Sweep reports 0 em dashes
- UX-011 | P2 | /onboarding | Anonymous | default | all | system-states-audit.md | Spinner persists after network idle | Unresolved async state | Resolve or show a terminal state | No permanent loading | S | none | low | No spinner after network idle
