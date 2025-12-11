# Active Twin Source of Truth - Regression Test Plan

## Summary

This document describes the fix for the "Active Data Centre Twin Source of Truth" issue where the header dropdown twin selector was not correctly controlling the entire studio.

## Root Cause

The mismatch between header (showing "Montreal Sovereign...") and Blueprint title (showing "SAP Sovereign Green...") was caused by:

1. **Builder Store Leakage**: The `useBlueprint` hook was overlaying builder store data onto database twin data, even for real twins loaded from the database.

2. **Priority Confusion**: Multiple sources of truth competed:
   - `ActiveTwinContext` (correct - from header dropdown)
   - `dcTwinBuilderStore` (preview/sandbox only)
   - `recommendationStore` (preview/sandbox only)

## Fixes Applied

### 1. `src/hooks/useBlueprint.ts`
- Builder store data now ONLY applies when `twinId` is 'preview' or 'default'
- Database twins are loaded DIRECTLY without builder overlay
- Added recommendation store support for preview mode

### 2. `src/context/ActiveTwinContext.tsx`
- When switching twins via `setActiveTwin()`, now clears:
  - Recommendation store (`clearRecommendation()`)
  - Builder store (`reset()`)
- This prevents stale data from leaking into real twin views

### 3. `src/pages/DataCentreTwin.tsx`
- Builder session only shows when there's NO active twin from header
- Real twin from `ActiveTwinContext` always takes priority
- Page title uses `twin?.name` first, falls back to builder only when no twin

### 4. `src/context/index.ts`
- Added deprecation notice for `TwinContext`
- Clarified that `ActiveTwinContext` is the single source of truth

## Regression Tests

### Test 1: Twin Selection Consistency
1. Select "Montreal Sovereign DC" in header dropdown
2. Navigate to:
   - `/blueprint/:id` → ✅ Title shows "Montreal Sovereign..."
   - `/data-centre-twin/:id` → ✅ Title shows "Montreal Sovereign..."
   - `/simulation/:id` → ✅ Title shows "Montreal Sovereign..."
3. All pages should show the same twin name as header

### Test 2: Scanner Isolation
1. Run a scan for `sap.com` (or any URL)
2. Click "View Blueprint" (preview mode)
3. ✅ Header twin remains "Montreal Sovereign DC" (unchanged)
4. ✅ No new record created in `data_centre_twins` table
5. Only clicking "Create Data Centre Twin" should create a record

### Test 3: Create from Recommendation
1. From recommendation panel, click "Create Twin from Recommendation"
2. ✅ New twin appears in header dropdown
3. ✅ Header switches to that new twin
4. ✅ Blueprint title matches new twin

### Test 4: Page Refresh Persistence
1. Refresh Blueprint page
2. ✅ Header shows same twin as before refresh
3. ✅ Blueprint title matches header

### Test 5: Twin Switching Clears Preview State
1. Run a scan to get a recommendation (preview mode)
2. Switch to a different twin via header dropdown
3. ✅ Preview state is cleared
4. ✅ New twin data is shown, not recommendation data

## Architecture Notes

```
┌─────────────────────────────────────────────────────────────┐
│                    HEADER DROPDOWN                          │
│                   (DataCentreSelector)                      │
│                          │                                  │
│                          ▼                                  │
│              ActiveTwinContext                              │
│          ┌──────────────────────────┐                       │
│          │  activeTwinId: string    │  ← SINGLE SOURCE     │
│          │  twin: DataCentreTwin    │    OF TRUTH          │
│          │  setActiveTwin()         │                       │
│          └──────────────────────────┘                       │
│                          │                                  │
│          ┌───────────────┼───────────────┐                  │
│          ▼               ▼               ▼                  │
│     Dashboard       Blueprint       Simulation              │
│                                                             │
│  ════════════════════════════════════════════════════════  │
│                                                             │
│  PREVIEW/SANDBOX MODE ONLY (not for real twins):            │
│                                                             │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │ recommendationStore│    │dcTwinBuilderStore│              │
│  │  (from scanner)   │    │  (draft twins)   │              │
│  └──────────────────┘    └──────────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Key Rules

1. **Header dropdown is the only way to switch active twins**
2. **Scanner/recommendations NEVER auto-create or auto-switch twins**
3. **Builder store is ONLY for preview/draft mode**
4. **When switching twins, all preview state is cleared**
5. **Database twin data is never overlaid with builder store data**
