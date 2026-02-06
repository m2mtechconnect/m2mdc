

## Plan: Replace All Marketing Site Images with Clean Imagery

### Problem Identified

The AI-generated images contain garbled, non-English text that looks unprofessional:
- **dashboard-desktop.png**: Shows "Cnaber", "Distarks", "Polvicies", "Gaven trangels", "Pryt Ocheat" 
- **twin3d-desktop.png**: Shows "Reevel Atliza", "ROTANILTONE", "Doades" etc.
- These nonsense labels ruin the professional appearance of the marketing site

### Complete Image Inventory

**Product Screenshots (in `/public/landing/screenshots/`):**
| File | Status | Used In |
|------|--------|---------|
| `dashboard-desktop.png` | Bad AI text | Hero section |
| `twin3d-desktop.png` | Bad AI text | Feature section #1 |
| `simulation-desktop.png` | Real capture | Feature section #2 |
| `sovereignty-desktop.png` | Real capture | Feature section #3 |
| `agents-desktop.png` | Real capture | Feature section #4 |
| `blueprint-desktop.png` | Real capture | Feature section #5 |
| `telemetry-desktop.png` | Real capture | Feature section #6 |
| `recommendation-desktop.png` | Exists but unused | - |

**Background Images (in `/public/landing/`):**
| File | Status | Used In |
|------|--------|---------|
| `hero-datacenter-bg.jpg` | Good quality | Not currently used in code |
| `datacenter-control-room.jpg` | Good quality | Not currently used in code |
| `sustainable-datacenter-campus.jpg` | Good quality | Not currently used in code |

### Recommended Strategy

**Option A: Capture Real Screenshots (Best Practice)**

For `dashboard-desktop.png` and `twin3d-desktop.png`, navigate to the actual Studio routes (`/dashboard` and the 3D twin view) and capture clean screenshots. This ensures 100% accuracy and follows your established "no marketing buzzwords" principle.

**Option B: Generate Clean AI Images (Fallback)**

If real captures aren't ready, regenerate the two problematic images with explicit instructions:
- "NO TEXT, NO LABELS, NO UI ELEMENTS"
- Pure 3D visualization without any overlay panels
- Abstract server room or thermal heatmap renders

**Option C: Hybrid - Abstract + Real (Recommended)**

1. Use **abstract ambient imagery** for the hero (already have good `hero-datacenter-bg.jpg`)
2. Capture **real Studio screenshots** for all 6 feature sections
3. Remove the problematic AI-generated dashboard/twin3d images entirely until real captures are available

### Implementation Steps

1. **Delete the two problematic AI images**:
   - `public/landing/screenshots/dashboard-desktop.png`
   - `public/landing/screenshots/twin3d-desktop.png`

2. **Generate new clean ambient images** (no text/UI):
   - Abstract 3D server visualization for hero
   - Clean thermal heatmap render for 3D Twin feature

3. **Update manifest version** to bust cache

4. **Update "Customer Outcomes" section** (from your earlier screenshot) to either:
   - Change to "Platform Capabilities" (what the platform measures)
   - Add "Target" or "Industry Benchmark" labels instead of "Achieved"
   - This section currently claims real customer results you don't have yet

### Technical Details

**Files to Modify:**
- `public/landing/screenshots/dashboard-desktop.png` - Replace with clean image
- `public/landing/screenshots/twin3d-desktop.png` - Replace with clean image
- `src/data/studioScreenshots.ts` - Bump manifest version
- `src/components/landing/TwinStatsBand.tsx` - Update copy to reflect pre-customer status

**Image Generation Prompts (if using AI fallback):**
```text
Dashboard: "Photorealistic 3D isometric view of a modern data center server room with blue-teal cooling corridors, glass-enclosed server racks with LED status lights, absolutely no text, no labels, no UI overlays, no signage, clean architectural visualization, dark background, 1440x900"

3D Twin: "Thermal heatmap visualization of data center racks in 3D perspective, gradient from blue (cool) to orange-red (hot), no text, no labels, no UI panels, pure scientific visualization style, dark background, 1440x900"
```

