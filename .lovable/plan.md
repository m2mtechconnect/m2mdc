

## Plan: Create InfrastructurePage with Route and Navigation

### Overview
Build a single-file, self-contained `InfrastructurePage.tsx` (~900 lines) with 7 sections themed for data centre infrastructure (NVIDIA + DDN hardware), add it as a route at `/infrastructure`, and add a navigation item to the role-based nav config.

### Files to Create

**`src/pages/InfrastructurePage.tsx`** - Single-file component containing:

1. **Hero CTA** - Full-width gradient card with "Physical AI . Data Centre Twin" badge, headline, description about Pod Designer, two CTAs ("Design Your Pod" opens wizard, "Data Flow" scrolls to pipeline)

2. **How It Works Auto-Cycling Strip** - 5 stage cards (Collect/Train/Synthesize/Act/Simulate) in 2-col mobile / 5-col desktop grid. Each card has icon, label, description, and 10-second progress bar. Auto-cycles with timer reset on click. Persistent detail panel below shows full description and spec badges. Connecting chevron arrows between cards on desktop. Stage mapping:
   - Collect (Radio, accent): DDN ingests DCIM telemetry, BMS feeds, sensor streams
   - Train (Cpu, warning): B3100 trains PUE/capacity/failure models
   - Synthesize (Eye, success): RTX PRO 6000 creates living 3D digital twin
   - Act (Bot, info): Jetson edge inference per rack/row
   - Simulate (Layers, primary): Omniverse what-if scenarios

3. **Operational Metrics** - 5 KPI cards: Training GPUs (B3100), Inference GPUs (RTX PRO 6000), Edge Devices (Jetson), DDN Throughput, Twin Freshness. Progress bars for allocated/total.

4. **Operations Section** - 4 Collapsible panels: Cluster Management (table), GPU Pool Allocation (progress bars), Storage Pools DDN (progress bars), System Health (status grid with CheckCircle/AlertTriangle icons). Mock data for dc-train-01, dc-infer-01, edge-fleet clusters.

5. **Deployed Pods Table (CRUD)** - Table with Pod Name, Scenario, Cluster, GPU Type, GPUs, Memory, Status, Created, Actions. Status dots (running=green pulse, queued=amber, stopped=muted, error=red pulse). DropdownMenu per row with Edit/Delete. Edit dialog with form fields. Delete confirmation dialog. "New Pod" button opens wizard. Mock pods: twin-inference, pue-training, cooling-finetune, rack-edge.

6. **Data Flow Pipeline (Collapsible)** - Scroll target for "Data Flow" CTA. 5 stage cards with animated ArrowDown between them. Each has icon with counter (1/5..2/5), badge, title, full description, spec badges. Animated RotateCcw feedback loop indicator at bottom.

7. **Pod Designer Wizard (Dialog)** - Full-screen overlay with stepper header, 2-column layout (content + rack preview sidebar), bottom bar. 6 steps:
   - Step 0 Scenario: 4 scenario cards with GPU/edge/storage requirements
   - Step 1 Infrastructure: Auto-cycling architecture nodes (DDN, B3100, RTX PRO 6000, Jetson)
   - Step 2 Capacity: 4 sliders (GPU Util %, Storage Throughput %, Edge Fleet 1-24, Retention 1-365)
   - Step 3 Storage & Pipeline: DDN product selector + Data Fabric selector
   - Step 4 Throughput: Tier selector + Sync Window selector + pipeline flow viz
   - Step 5 Review: ROI card, 3 infra summary cards, 4 metrics, cost, Deploy button
   - Right sidebar: Rack Preview (color-coded GPU slots), Readiness Score (progress bar), Cost Estimator ($/kW), DDN recommendation
   - Bottom bar: Aggregate stats + Back/Next/Save Draft buttons

All data hardcoded inline. Uses framer-motion, shadcn/ui, lucide-react, cn(). React.memo + useMemo + useCallback throughout.

### Files to Modify

**`src/App.tsx`** (line ~246)
- Add import: `import InfrastructurePage from "./pages/InfrastructurePage";`
- Add route: `<Route path="/infrastructure" element={<InfrastructurePage />} />`

**`src/config/roleDashboardConfig.ts`**
- Import `HardDrive` from lucide-react (already imported set includes `Server`)
- Add Infrastructure nav item to engineer config navigation array:
  ```
  { name: 'Infra', fullName: 'Infrastructure', href: '/infrastructure', icon: HardDrive, group: 'secondary' }
  ```
- Also add to manager and executive configs as secondary nav items so all roles can access it

### Technical Details
- Pattern follows the reference `GlobalInfrastructure.tsx` from AI Factory Accelerate project (operations panels, cluster tables, GPU pool, storage pools, health checks)
- Navigation uses existing role-based top-bar system (not a sidebar - this project uses header nav)
- All semantic color tokens (hsl(var(--primary)), etc.) for dark theme compatibility
- Responsive: 2-col mobile grids, 5-col desktop grids, wizard sidebar hidden on mobile
- No em dashes in content
- No external data files or API calls

