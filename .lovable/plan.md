

## Plan: Implement 3 Recommended Blueprint ↔ Dashboard Sync Points

### 1. Create Shared Domain Registry
**New file:** `src/domain/greenDc/domainRegistry.ts`

Create a single `DOMAIN_REGISTRY` constant that consolidates the duplicated domain definitions from `MasterTemplate.ts` (lines 79-406), `scenarioRegistry.ts` (lines 544-563), and `DataCentreDashboard.tsx` (lines 57-69).

```text
DOMAIN_REGISTRY: Record<DomainType, {
  id: DomainType
  label: string
  shortLabel: string
  icon: string          // Lucide icon name
  color: string         // Tailwind color class
  agentName: string     // From MasterTemplate
  agentDescription: string
  kpiKeys: string[]     // From MasterTemplate
}>
```

Then update the three consumer files to import from the registry instead of maintaining their own copies:
- `DataCentreDashboard.tsx` — replace `domainTabs` array (line 57-69)
- `scenarioRegistry.ts` — replace `DOMAIN_ICONS` and `DOMAIN_LABELS` (lines 544-563)
- `MasterTemplate.ts` — keep as source data but re-export through registry

### 2. Add KPI Cross-Reference in Dashboard KPI Tiles
**Modified file:** `src/components/data-centre-twin/DataCentreDashboard.tsx`

Update the hero `KPITile` component (lines 72-119) to accept an optional `blueprintKpiId` prop. When clicked, open a popover/hover-card showing:
- KPI name and description from `KPI_TOOLTIPS` or `useBlueprintKPIs`
- Target threshold and unit from Blueprint
- Owner role from Blueprint
- "View in Blueprint" link → navigates to `/blueprint/{twinId}` with KPIs tab

Implementation:
- Wrap each hero KPITile with `HoverCard` from `@/components/ui/hover-card`
- Inside hover content, call `useBlueprintKPIs(twinId).getKpiById(kpiId)` to fetch definition
- Show: description, unit, target, warning/critical thresholds, ownerRole
- Add a small `<Button variant="ghost">` linking to Blueprint KPIs tab

### 3. Add Agent Ownership Badges to Dashboard Domain Tab Headers
**Modified files:** Domain view components

Add a small agent badge to the header area of each domain view showing the Blueprint agent that owns that domain. Affects:
- `ThermalDomainView.tsx`
- `PowerDomainView.tsx`
- `CoolingDomainView.tsx`
- `NetworkDomainView.tsx`
- `FacilityDomainView.tsx`
- `WorkloadDomainView.tsx`
- `SovereigntyDomainView.tsx`
- `CarbonDomainView.tsx`
- `FinancialDomainView.tsx`

**New shared component:** `src/components/data-centre-twin/DomainAgentBadge.tsx`

```text
DomainAgentBadge({ domainId: DomainType })
  → looks up DOMAIN_REGISTRY[domainId].agentName
  → also checks useBlueprint().agents for matching domain agent status
  → renders: Badge with Bot icon + agent name + "Active" dot
```

Each domain view adds `<DomainAgentBadge domainId="thermal_hardware" />` to its header area, next to the domain title.

### Files Summary
| Action | File |
|--------|------|
| Create | `src/domain/greenDc/domainRegistry.ts` |
| Create | `src/components/data-centre-twin/DomainAgentBadge.tsx` |
| Modify | `src/domain/greenDc/index.ts` — add registry export |
| Modify | `src/components/data-centre-twin/DataCentreDashboard.tsx` — use registry + KPI hover cards |
| Modify | `src/simulation/scenarioRegistry.ts` — use registry |
| Modify | 9 domain view files — add `DomainAgentBadge` to headers |

