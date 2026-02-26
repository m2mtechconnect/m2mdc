

## Builder Multi-Fix Plan

### 1. Agent Modes — Visual UI Feedback on Toggle

**Current state:** Supervisor and Deep Research toggles save state to store/blueprint but the UI card appearance doesn't change visually when enabled.

**Fix:** When a mode is toggled ON, update the card styling (highlight border, colored background, active badge) so users get immediate visual feedback. Add a "Active" badge and transition the icon container color.

**Files:** `src/components/builder/steps/Step2Intelligence.tsx` (lines 177-202)

---

### 2. Recommended Tools Settings Button — Replace with Info Tooltip

**Current state:** The Settings (gear) icon button on each tool card calls `onConfigureIntegration` which just fires a generic toast saying "Configure X in the Integrations section" — no panel opens.

**Fix:** Replace the Settings button with an Info icon button that opens a `Tooltip` or `Popover` showing the tool's description, required integrations, and domain. This provides useful context without a dead-end click.

**Files:** `src/components/dc-tools/BuilderToolsPanel.tsx` (lines 79-86)

---

### 3. Workflow Editor — Inline Collapsible (No Separate Page)

**Current state:** Step4Workflow has a "Open Visual Workflow Editor" button that toggles `showEditor` state, rendering the full `WorkflowEditor` component inside the same page. However, it replaces the DC Node Types and Configured Actions sections entirely.

**Fix:** Change the workflow editor to render as a collapsible section using `Collapsible` from Radix UI, so it expands/collapses inline below the Configured Actions section. Both the node list and editor remain visible together. Remove the full-page takeover behavior.

**Files:** `src/components/builder/steps/Step4Workflow.tsx`

---

### 4. Workflow Editor — Fix Node Drag-and-Drop

**Current state:** `createNodeObject` creates a bare `FabricObject` (line 197) which is essentially empty — it creates a `Rect` and `Text` but never adds them as children. The node is not interactive because the base `FabricObject` has no visual content or proper group setup.

**Fix:** Use Fabric.js `Group` instead of bare `FabricObject` to properly compose the rect + text. Ensure `selectable: true`, `hasControls: true`, and `hasBorders: true`. Add `object:moving` event listener on the canvas to update node x/y positions in state when dragged. Also wire up `selection:created` to open the NodeConfigDrawer.

**Files:** `src/components/workflow/WorkflowEditor.tsx` (lines 178-227, 60-121)

---

### 5. Workflow Test Run — Template-Based Simulation

**Current state:** Test run calls `workflow-run` edge function which may not exist. The `workflow-simulate` edge function exists and does mock simulation per node type, but isn't wired to the UI.

**Fix:** Wire the Test Run button to call the existing `workflow-simulate` edge function instead of `workflow-run`. Pass the `system_id` and display the execution trace results in a collapsible results panel below the canvas, showing each node's status, duration, and output — aligned with the Configured Actions section in Step4.

**Files:** `src/components/workflow/WorkflowEditor.tsx` (lines 413-465)

---

### 6. Builder Sections — Audit Selection/Removal Feedback

Across all builder steps, verify and fix that toggling items (subsystems, tools, integrations, scenarios) provides:
- Visual state change on the card (highlight/unhighlight)
- Toast confirmation on toggle
- Badge count updates

**Current state:** Most sections already have this pattern. The Monitored Subsystems section (Step2, lines 211-228) has hardcoded `enabled` values with no toggle handler.

**Fix:** Make Monitored Subsystems interactive with toggle state and persistence. Add click handlers that toggle the subsystem and show toast feedback.

**Files:** `src/components/builder/steps/Step2Intelligence.tsx` (lines 146-228)

---

### Summary of Files to Modify
1. `src/components/builder/steps/Step2Intelligence.tsx` — Agent mode visual feedback + subsystem toggle interactivity
2. `src/components/dc-tools/BuilderToolsPanel.tsx` — Replace Settings button with Info popover
3. `src/components/builder/steps/Step4Workflow.tsx` — Inline collapsible workflow editor
4. `src/components/workflow/WorkflowEditor.tsx` — Fix Fabric.js Group for drag-and-drop + wire test run to simulate function

