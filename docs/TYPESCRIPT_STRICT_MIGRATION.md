# TypeScript Strict Mode Migration Roadmap

## Overview
Enabling TypeScript strict mode revealed **100+ type errors** across the codebase. This document provides a phased migration plan to achieve full strict mode compliance.

## Current Status: Phase 0 (Foundation)
- ✅ Bundle splitting configured in vite.config.ts
- ✅ Security definer views fixed (3 items)
- ✅ RLS policies hardened (3 policies)
- ⏳ TypeScript strict mode: Deferred to phased migration

## Error Categories Identified

### 1. Unused Declarations (~60% of errors)
- Unused imports (lucide-react icons, utilities)
- Unused variables (destructured but not used)
- Unused function parameters

### 2. Null/Undefined Checks (~30% of errors)
- Supabase query results returning `null` types
- Optional chaining missing
- Type assertions needed

### 3. Type Mismatches (~10% of errors)
- Implicit `any` types
- Array type mismatches
- Date/string conversions

---

## Migration Phases

### Phase 1: Enable `noFallthroughCasesInSwitch` ✅
- Already enabled
- No errors

### Phase 2: Clean Unused Imports (Week 1)
**Files to Fix (High Priority):**
```
src/App.tsx
src/components/Layout.tsx
src/components/HeroSearchBar.tsx
src/components/SystemDetailsDrawer.tsx
src/components/agent-chat/*.tsx
src/components/aoc/*.tsx
```

**Automation Option:**
```bash
# Use ESLint auto-fix
npx eslint --fix --rule 'no-unused-vars: error' src/
```

### Phase 3: Enable `noUnusedLocals` (Week 2)
After cleaning unused imports, enable:
```json
{
  "compilerOptions": {
    "noUnusedLocals": true
  }
}
```

### Phase 4: Enable `noUnusedParameters` (Week 3)
Fix unused function parameters:
- Use underscore prefix for intentionally unused: `_event`
- Remove truly unused parameters

```json
{
  "compilerOptions": {
    "noUnusedParameters": true
  }
}
```

### Phase 5: Enable `strictNullChecks` (Week 4-6)
**Largest effort** - requires fixing null handling throughout:

**Pattern 1: Supabase Queries**
```typescript
// Before
const title = conversation.title; // Error: possibly null

// After
const title = conversation.title ?? 'Untitled';
```

**Pattern 2: Date Parsing**
```typescript
// Before
format(parseISO(timestamp), 'PPp'); // Error: null

// After
format(parseISO(timestamp ?? new Date().toISOString()), 'PPp');
```

**Pattern 3: Optional Properties**
```typescript
// Before
agent.name.toUpperCase(); // Error: possibly undefined

// After
agent?.name?.toUpperCase() ?? '';
```

### Phase 6: Enable `noImplicitAny` (Week 7-8)
Replace all implicit `any` types:

**Files with most `any` usage:**
- `src/types/*.ts`
- `src/stores/*.ts`
- `src/hooks/*.ts`
- `src/engines/*.ts`

### Phase 7: Full Strict Mode (Week 9)
Enable all strict options:
```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

---

## Priority Files to Fix First

### Critical Path (Core Functionality)
1. `src/stores/` - All state management
2. `src/engines/` - Calculation engines
3. `src/hooks/` - Shared hooks
4. `src/types/` - Type definitions

### High Traffic (Most Used)
1. `src/pages/Dashboard.tsx`
2. `src/components/Layout.tsx`
3. `src/components/CoPilotDrawer.tsx`
4. `src/pages/Agents.tsx`

### Edge Functions
1. `supabase/functions/_shared/` - Shared utilities
2. All `index.ts` files

---

## Tooling Setup

### ESLint Rules to Add
```javascript
// eslint.config.js
rules: {
  '@typescript-eslint/no-unused-vars': 'error',
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/strict-boolean-expressions': 'warn',
}
```

### Pre-commit Hook
```bash
# .husky/pre-commit
npx tsc --noEmit
```

---

## Success Metrics
- [ ] Zero `any` types in critical path files
- [ ] 100% strict mode compliance
- [ ] No TypeScript errors in build
- [ ] All tests passing with strict mode

---

## Timeline Summary
| Phase | Duration | Target |
|-------|----------|--------|
| 1-2 | Week 1 | Clean imports |
| 3-4 | Week 2-3 | Unused params |
| 5 | Week 4-6 | Null checks |
| 6 | Week 7-8 | No implicit any |
| 7 | Week 9 | Full strict |

**Total: 9 weeks to full strict mode compliance**
