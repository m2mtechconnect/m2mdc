# Builder Replacement Summary

## ✅ Completed: Old Builder → New 6-Step Wizard

### What Was Replaced

**Old Builder (Deleted):**
- Multi-step tabs: "Configure Intelligence", "Choose Base", "Connect Business Systems", etc.
- Complex state management with old schema
- Legacy AI model selection cards
- Old MCP-only layout
- Tab-based progress navigation

**New 6-Step Wizard (Active at `/builder`):**

1. **Define the Goal**
   - Simple text input for user intent
   - AI suggestions
   - Optional file/URL upload

2. **Select Industry & Department**
   - Industry dropdown (20 allowed industries)
   - Department pills (12 allowed departments)
   - Auto-preview relevant templates

3. **Choose Type**
   - Agent (task automation)
   - Process Twin (business logic simulation)
   - 3D Twin (spatial/robotics simulation)
   - Large radio cards with descriptions

4. **Load Template**
   - Auto-mapped template based on industry + department + type
   - Template switcher
   - Quick config preview in accordion

5. **Configure Integrations & Workflow**
   - Drag-and-drop workflow builder
   - Event triggers
   - Actions
   - System integrations
   - Output schema
   - HITL approvals toggle

6. **Review & Generate**
   - Validation panel
   - Configuration summary
   - Inline editing
   - Generate CTA

### Route Changes

- **Before:** `/builder` → Old multi-step builder with tabs
- **After:** `/builder` → New 6-step wizard with sidebar

### UI Components Replaced

**Removed:**
- Old intelligence configuration tabs
- Model/RAG/MCP/Policies sections
- Legacy card layouts
- Multi-step tab bars
- Old progress indicators

**Added:**
- `BuilderLayout` - Sidebar + sticky bottom nav
- `Step1Goal` - Goal definition
- `Step2Industry` - Industry/Department selector
- `Step3Type` - Agent/Process Twin/3D Twin chooser
- `Step4Template` - Template loader
- `Step5Workflow` - Workflow builder
- `Step6Review` - Review & validation

### State Management

**New Store:** `wizardBuilderStore`
- Separate from old builder state
- Clean schema matching 6-step flow
- Auto-save on each input
- Persistent via localStorage

### Features

✅ Left sidebar stepper (desktop)
✅ Top horizontal stepper (mobile)
✅ Sticky bottom navigation (Back/Next)
✅ Auto-save after each change
✅ Step validation before proceeding
✅ Progressive disclosure (accordions)
✅ Completed step tracking
✅ Max 880px content width
✅ Mobile responsive
✅ Keyboard accessible

### Validation Results

**Structure:** ✅ PASS
**Layout Rules:** ✅ PASS
**Component Compliance:** ✅ PASS
**Accessibility:** ✅ PASS

**Minor Issues (Non-blocking):**
- Some text blocks exceed 150 chars (can be trimmed)
- Decorative animations present (can be removed)
- Toast notifications instead of inline errors (can be changed)

## Next Steps

1. Test the new builder at `/builder`
2. Remove decorative animations if strict compliance required
3. Trim long text blocks to <150 chars
4. Convert toast to inline errors if needed
5. Integrate with deterministic mapper for template selection
