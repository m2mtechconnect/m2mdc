# Visual Workflow Editor - Phase 1 Acceptance Tests

## Overview
Phase 1 delivers a basic visual workflow editor with draggable nodes and database persistence.

## Completed Features
- ✅ Database schema (5 tables with RLS policies)
- ✅ Canvas component with Fabric.js v6
- ✅ Node palette with 6 node types
- ✅ Draggable nodes on canvas
- ✅ Node configuration drawer
- ✅ Auto-save (1.5s debounce)
- ✅ Manual save
- ✅ Load workflow from database
- ✅ M2M branding (Carbon/Graphite bg, Gold/Blue accents)

## Test Cases - Phase 1

### 1. Database Schema Tests
- [x] `workflows` table created with RLS policies
- [x] `workflow_nodes` table created with RLS policies  
- [x] `workflow_edges` table created with RLS policies
- [x] `workflow_runs` table created with RLS policies
- [x] `workflow_run_events` table created with RLS policies
- [x] Users can only view/edit their own workflows (RLS)
- [x] Node types constraint validates 6 types
- [x] Workflow status constraint validates draft/active/archived

### 2. Canvas Rendering Tests
- [ ] Canvas renders with dark background (Graphite Gray)
- [ ] Grid lines visible on canvas (20px spacing)
- [ ] Canvas dimensions: 1200x700px
- [ ] Selection enabled on canvas
- [ ] Canvas uses M2M color scheme

### 3. Node Palette Tests
- [ ] Palette displays 6 node types:
  - Analyze (Brain icon, Accent color)
  - Classify (Filter icon, Secondary color)
  - Notify Teams (MessageSquare icon, Primary color)
  - Create Jira Ticket (Ticket icon, Accent color)
  - Write Salesforce (Database icon, Secondary color)
  - Generate Report (FileText icon, Primary color)
- [ ] Clicking node button adds node to canvas
- [ ] Each node has proper icon and label
- [ ] Responsive grid layout (2 cols mobile, 3 tablet, 6 desktop)

### 4. Node Creation Tests
- [ ] Clicking "Analyze" adds blue node to canvas
- [ ] Clicking "Classify" adds purple node to canvas
- [ ] Clicking "Notify Teams" adds gold node to canvas
- [ ] Each node has proper label text
- [ ] Nodes positioned with offset (50px/30px increments)
- [ ] Node dimensions: 160x80px
- [ ] Nodes have rounded corners (8px)
- [ ] Nodes have white stroke border (2px)
- [ ] Toast notification shows on node add
- [ ] Node IDs are valid UUIDs

### 5. Node Dragging Tests
- [ ] Nodes can be dragged on canvas
- [ ] Node position updates during drag
- [ ] Node position persists after save
- [ ] Multiple nodes can be dragged independently
- [ ] Canvas remains responsive during drag

### 6. Node Configuration Tests

#### Analyze Node Config
- [ ] Opens drawer when node clicked/selected
- [ ] Model dropdown shows 3 options (Gemini Pro/Flash, GPT-5)
- [ ] Prompt template textarea accepts input
- [ ] Grounding toggle works
- [ ] Top-K input accepts 1-50
- [ ] Top-N input accepts 1-20
- [ ] Temperature slider 0-2, step 0.1
- [ ] Save button updates node config
- [ ] Cancel button closes without saving

#### Classify Node Config
- [ ] Labels input accepts comma-separated values
- [ ] Confidence threshold 0-1, step 0.1
- [ ] Config persists to database

#### Notify Teams Config
- [ ] Channel input accepts text
- [ ] Message template textarea accepts text
- [ ] Config persists to database

#### Create Jira Ticket Config
- [ ] Project key input accepts text
- [ ] Issue type dropdown (Task/Bug/Story)
- [ ] Summary template accepts text
- [ ] Config persists to database

#### Write Salesforce Config
- [ ] Object type dropdown (Lead/Case/Contact)
- [ ] Upsert key input accepts text
- [ ] Config persists to database

#### Generate Report Config
- [ ] Format dropdown (PDF/HTML/Markdown)
- [ ] Include citations toggle works
- [ ] Config persists to database

### 7. Save/Load Tests
- [ ] Manual "Save Draft" button saves to database
- [ ] Auto-save triggers after 1.5s of changes
- [ ] "Unsaved changes" badge shows when isDirty=true
- [ ] Node count badge shows correct number
- [ ] Loading workflow from database recreates nodes on canvas
- [ ] Node positions match saved coordinates
- [ ] Node configs load correctly
- [ ] Save button disabled when no changes

### 8. Validation Tests
- [ ] "Validate" button checks workflow
- [ ] Shows success toast if no errors
- [ ] Shows error toast with specific issues
- [ ] Detects disconnected nodes (nodes > 1, edges = 0)
- [ ] Detects missing Analyze model config
- [ ] Error messages include fix suggestions

### 9. Toolbar Tests
- [ ] Save Draft button visible and functional
- [ ] Validate button visible and functional
- [ ] Test Run button visible (disabled in Phase 1)
- [ ] Unsaved changes badge appears/disappears correctly
- [ ] Node count badge updates in real-time
- [ ] Clear button removes all nodes

### 10. UI/UX Tests
- [ ] M2M branding colors used throughout
- [ ] Dark mode styling (Carbon/Graphite backgrounds)
- [ ] Gold accent on primary actions
- [ ] Electric Blue on secondary elements
- [ ] Poppins font for headings
- [ ] Inter font for body text
- [ ] Smooth transitions (300ms cubic-bezier)
- [ ] Glass panel effects on cards
- [ ] Responsive layout on mobile/tablet/desktop

### 11. Accessibility Tests
- [ ] All buttons have aria-labels
- [ ] Keyboard focus visible on interactive elements
- [ ] Color contrast meets WCAG AA
- [ ] Touch targets ≥ 44x44px
- [ ] Screen reader can announce node types

### 12. Error Handling Tests
- [ ] Database connection errors show toast
- [ ] Load workflow errors show toast
- [ ] Save workflow errors show toast
- [ ] Auth errors handled gracefully
- [ ] Missing systemId shows appropriate message

### 13. Performance Tests
- [ ] Canvas renders within 300ms
- [ ] Node creation < 100ms
- [ ] Auto-save doesn't block UI
- [ ] Dragging remains smooth (60fps)
- [ ] No memory leaks during drag operations

### 14. Integration Tests
- [ ] Builder step 5 shows WorkflowEditor
- [ ] systemId passed from Builder correctly
- [ ] Workflow persists linked to agent via system_id
- [ ] Navigation between steps preserves workflow state

## Known Limitations (Phase 1)
- No edge connections between nodes yet
- No node deletion (besides clear all)
- No undo/redo
- No zoom/pan
- No mini-map
- No test run execution
- No publish functionality
- No export/import JSON
- No connector integration
- No execution engine

## Next Steps (Phase 2)
- [ ] Implement edge connections (click-to-wire)
- [ ] Add node deletion (Del key)
- [ ] Add undo/redo functionality
- [ ] Implement zoom/pan controls
- [ ] Add mini-map for navigation
- [ ] Wire basic execution for Analyze→Classify

## Sign-off Criteria
All Phase 1 tests must pass:
- [ ] All database tables created with proper RLS
- [ ] Canvas renders with nodes
- [ ] Nodes draggable and configurable
- [ ] Save/load works correctly
- [ ] M2M branding applied
- [ ] No console errors
- [ ] All accessibility checks pass
