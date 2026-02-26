

## Diagnosis

### RLS Error
The `workflow_nodes` INSERT policy requires a `workflow_id` that maps to a `workflows` row where `created_by = auth.uid()`. The save flow correctly creates a workflow first, but the issue is likely:
1. The `systemId` passed is a builder ID (not a real UUID), causing the workflow creation to fail silently
2. The delete-then-reinsert pattern may hit timing issues
3. The user may not be authenticated when saving

The fix: Guard the save with an auth check, skip DB persistence entirely when no real workflow exists (use local-only mode), and catch/surface errors properly. The auto-save triggers saves even when there's no valid workflow, causing repeated RLS failures.

### Missing Features
The current editor has no visual edge connections between nodes (n8n's core UX). Need to add:
- Port circles on nodes (input left, output right)
- Click-drag from output port to input port to create edge
- Visual Bezier/step lines between connected nodes
- Edge deletion
- Edges persist and re-render on load

## Plan

### 1. Fix RLS / Save Errors
**File:** `src/components/workflow/WorkflowEditor.tsx`

- Disable auto-save entirely (remove the auto-save `useEffect`). Only save on explicit "Save Draft" click.
- In `handleSave`, check `auth.getUser()` first. If not authenticated, show "Please log in to save" toast and return.
- Guard the delete operations: wrap `workflow_nodes.delete()` and `workflow_edges.delete()` in try/catch so failures don't block the flow.
- When creating a new workflow, validate that `systemId` is a valid UUID before inserting.

### 2. Add Visual Edge Connections (n8n-inspired)
**File:** `src/components/workflow/WorkflowEditor.tsx`

- Add input/output port circles to each node Group (small circles at left-center and right-center of the rect).
- Track a `connectingFrom` state: when user mousedown on an output port, start drawing a temporary line.
- On mouseup over an input port, create an edge. On mouseup elsewhere, cancel.
- Render edges as curved `Path` objects (quadratic bezier) between the output port of source node and input port of target node.
- On `object:moving`, update all connected edge line positions.
- Add edge context: click an edge line to select it, press Delete to remove.
- Store `fromPort: 'output'` and `toPort: 'input'` in the edge data.

### 3. Edge Re-rendering on Node Move
**File:** `src/components/workflow/WorkflowEditor.tsx`

- Create a `redrawEdges()` function that recalculates all edge line positions based on current node positions.
- Call `redrawEdges()` inside the `object:moving` handler and after adding/removing nodes.

### 4. Update Node Creation with Ports
**File:** `src/components/workflow/WorkflowEditor.tsx`

- Modify `createNodeObject` to add two small circles (radius 6) to the Group:
  - Input port: left-center of the rect, tagged `portType: 'input'`
  - Output port: right-center of the rect, tagged `portType: 'output'`
- These circles are non-selectable but evented (for mousedown/mouseup connection handling).

### 5. Connection Drawing Mode
**File:** `src/components/workflow/WorkflowEditor.tsx`

- Add state: `connectingFrom: { nodeId, port, x, y } | null` and a temp `Line` ref.
- On canvas `mouse:down`, check if target is a port circle. If output port, start connection mode.
- On canvas `mouse:move` during connection mode, update the temp line endpoint.
- On canvas `mouse:up`, check if target is an input port on a different node. If yes, create edge + render permanent bezier line. If no, remove temp line.
- Prevent self-connections and duplicate edges.

### 6. Visual Polish
**File:** `src/components/workflow/WorkflowEditor.tsx`

- Edge lines: white/accent color with slight opacity, animated dash on hover.
- Port circles: glow on hover during connection mode.
- When an edge is selected, highlight it with a brighter color.

### 7. Workflow Feature Flow Diagram
Present an end-to-end flow diagram showing how the workflow feature works from user interaction to data persistence.

### Files to Modify
1. `src/components/workflow/WorkflowEditor.tsx` — All changes (RLS fix, edge connections, ports, connection mode, edge rendering)

