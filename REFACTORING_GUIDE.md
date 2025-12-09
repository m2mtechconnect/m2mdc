# Agentic Studio - Refactoring Guide

## ✅ Completed: Phase 1 - Foundational Utilities

### Created Files

1. **`src/lib/logger.ts`** - Centralized logging system
   - Replaces all `console.log/error/warn` statements
   - Provides context-aware logging with components and actions
   - Auto-disables debug logs in production

2. **`src/lib/formatters.ts`** - Formatting utilities
   - `formatPercentage()` - Consistent percentage formatting
   - `formatNumber()` - Number formatting with commas
   - `formatCurrency()` - USD currency formatting
   - `formatDate()` - Date formatting (short/long)
   - `formatRelativeTime()` - Relative time (e.g., "2h ago")
   - `formatDuration()` - Duration in ms to readable string
   - `truncateText()` - Text truncation with ellipsis
   - `formatFileSize()` - Bytes to readable size

3. **`src/types/common.ts`** - Common TypeScript types
   - Replaces many `any` types across the codebase
   - Provides: Status, ConnectionStatus, Citation, TestResult, KPI, ROIEstimate, ModelConfig, Integration, MCPServer, AgentTemplate, WorkflowNode, WorkflowEdge, ApiError, etc.
   - Type guards for runtime type checking

4. **`src/lib/errorHandlers.ts`** - Error handling utilities
   - `getErrorMessage()` - Extract user-friendly error messages
   - `handleError()` - Log and toast errors consistently
   - `handleSuccess()` - Log and toast success messages
   - `withErrorHandling()` - Wrap async functions with error handling
   - `normalizeError()` - Convert unknown errors to ApiError format

5. **`src/lib/api/supabaseHelpers.ts`** - Supabase utilities
   - `executeQuery()` - Type-safe query execution with logging
   - `getCurrentUser()` - Get authenticated user
   - `isAuthenticated()` - Check auth status
   - `callEdgeFunction()` - Type-safe edge function calls

6. **`src/lib/validation.ts`** - Validation utilities
   - Email, URL, UUID validation
   - String and number validation
   - Input sanitization
   - JSON validation

---

## 🎯 Phase 2: Apply Utilities Across Codebase

### Priority 1: Replace Console Statements (High Impact, Low Risk)

**Pattern to Replace:**
```typescript
// ❌ OLD
console.log('Sending message:', data);
console.error('Failed:', error);

// ✅ NEW
import { logger } from '@/lib/logger';

logger.debug('Sending message', { 
  component: 'ComponentName',
  action: 'sendMessage',
  metadata: { data }
});
logger.error('Failed to send message', error, {
  component: 'ComponentName',
  action: 'sendMessage'
});
```

**Files to Update (234 console statements across 77 files):**
- `src/components/AgentChatModal.tsx` - 4 statements
- `src/components/CoPilotDrawer.tsx` - 8 statements
- `src/components/builder/*` - ~50 statements
- `src/pages/*` - ~30 statements
- All other component files

**Action Items:**
1. Search for `console.log` and replace with `logger.debug()`
2. Search for `console.error` and replace with `logger.error()`
3. Search for `console.warn` and replace with `logger.warn()`

---

### Priority 2: Replace `any` Types (High Impact, Medium Risk)

**Pattern to Replace:**
```typescript
// ❌ OLD
import { useState } from 'react';

function Component({ data }: { data: any }) {
  const [result, setResult] = useState<any>(null);
  // ...
}

// ✅ NEW
import { useState } from 'react';
import type { TestResult } from '@/types/common';

function Component({ data }: { data: TestResult }) {
  const [result, setResult] = useState<TestResult | null>(null);
  // ...
}
```

**Common `any` Replacements:**

| Old Type | New Type | Use Case |
|----------|----------|----------|
| `any` | `TestResult` | Test responses |
| `any` | `Citation[]` | Citations/sources |
| `any` | `KPI` | KPI metrics |
| `any` | `MCPTool/MCPServer` | MCP-related data |
| `any` | `AgentTemplate` | Template data |
| `any` | `Record<string, unknown>` | Generic objects |
| `any` | `unknown` | Unknown data (then narrow) |

**Files to Update (173 `any` types across 73 files):**
- `src/components/builder/MCPServerManager.tsx` - 17 instances
- `src/components/builder/ModelMarketplace.tsx` - 6 instances
- `src/components/builder/PolicyEditorDrawer.tsx` - 5 instances
- `src/components/marketplace/*` - ~15 instances

**Action Items:**
1. Identify the actual data structure being used
2. Use existing type from `@/types/common` or create new specific type
3. Update function signatures and state types
4. Test thoroughly after each change

---

### Priority 3: Standardize Error Handling (Medium Impact, Low Risk)

**Pattern to Replace:**
```typescript
// ❌ OLD
try {
  const result = await someOperation();
} catch (error) {
  console.error('Operation failed:', error);
  toast.error(error?.message || 'Operation failed');
}

// ✅ NEW
import { handleError } from '@/lib/errorHandlers';

try {
  const result = await someOperation();
} catch (error) {
  handleError(error, {
    component: 'ComponentName',
    action: 'someOperation',
    fallbackMessage: 'Failed to complete operation'
  });
}
```

**Files to Update:**
- All components with try/catch blocks
- All API call error handlers
- All form submission handlers

---

### Priority 4: Use Formatters (Medium Impact, Low Risk)

**Pattern to Replace:**
```typescript
// ❌ OLD
const percentage = `${value.toFixed(1)}%`;
const date = new Date(timestamp).toLocaleDateString();
const currency = `$${amount.toLocaleString()}`;

// ✅ NEW
import { formatPercentage, formatDate, formatCurrency } from '@/lib/formatters';

const percentage = formatPercentage(value, 1);
const date = formatDate(timestamp, 'short');
const currency = formatCurrency(amount);
```

**Files to Update:**
- `src/components/Analytics.tsx` - KPI displays
- `src/components/builder/SystemSummaryCard.tsx` - ROI estimates
- `src/components/dashboard/*` - Metrics displays
- `src/pages/Analytics.tsx` - All metrics

---

## 🔧 Phase 3: Component Refactoring

### Large Components to Split

#### 1. `src/components/CoPilotDrawer.tsx` (970+ lines)

**Split into:**
```
src/components/copilot/
  ├── CoPilotDrawer.tsx (main orchestrator, ~200 lines)
  ├── CoPilotInput.tsx (message input UI)
  ├── CoPilotMessages.tsx (message list display)
  ├── CoPilotHistory.tsx (conversation history)
  ├── CoPilotSettings.tsx (settings panel)
  ├── useCoPilotChat.ts (chat logic hook)
  └── types.ts (copilot-specific types)
```

**Refactoring Steps:**
1. Extract message rendering logic → `CoPilotMessages.tsx`
2. Extract input + send logic → `CoPilotInput.tsx`
3. Extract history sidebar → `CoPilotHistory.tsx`
4. Extract settings panel → `CoPilotSettings.tsx`
5. Move state and API calls to `useCoPilotChat.ts` hook
6. Keep `CoPilotDrawer.tsx` as composition layer

#### 2. `src/components/builder/ModelMarketplace.tsx` (600+ lines)

**Split into:**
```
src/components/builder/model-marketplace/
  ├── ModelMarketplace.tsx (main, ~150 lines)
  ├── ModelCard.tsx (individual model display)
  ├── ModelFilters.tsx (filter controls)
  ├── ModelTestDialog.tsx (test modal)
  ├── useModelMarketplace.ts (data fetching hook)
  └── types.ts
```

#### 3. `src/components/builder/MCPServerManager.tsx` (550+ lines)

**Split into:**
```
src/components/builder/mcp-manager/
  ├── MCPServerManager.tsx (main, ~150 lines)
  ├── ServerList.tsx (server list display)
  ├── ServerRegistration.tsx (registration form)
  ├── ToolsPlayground.tsx (tool testing)
  ├── useMCPServers.ts (server management hook)
  └── types.ts
```

### Extract Reusable Components

**Common Patterns to Extract:**

1. **StatusBadge** - Unified status badge component
```typescript
// src/components/ui/status-badge.tsx
interface StatusBadgeProps {
  status: Status;
  label?: string;
}
```

2. **MetricCard** - Reusable metric display card
```typescript
// src/components/ui/metric-card.tsx
interface MetricCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
}
```

3. **EmptyState** - Consistent empty state component
```typescript
// src/components/ui/empty-state-generic.tsx
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

---

## 🔁 Phase 4: Deduplicate Logic

### Common Duplication Patterns

#### 1. Agent/System Fetching
**Duplicated in:** Builder, Dashboard, AgentsList, Operations, etc.

**Create:** `src/hooks/useAgent.ts`
```typescript
export function useAgent(agentId: string | undefined) {
  return useQuery({
    queryKey: ['agent', agentId],
    queryFn: async () => {
      if (!agentId) return null;
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!agentId,
  });
}
```

#### 2. Success Rate Calculation
**Duplicated in:** Multiple dashboard components

**Create:** `src/lib/metrics.ts` (extend existing)
```typescript
export function calculateSuccessRate(
  successfulRuns: number,
  totalRuns: number
): number {
  if (totalRuns === 0) return 0;
  return (successfulRuns / totalRuns) * 100;
}
```

#### 3. ROI Calculation
**Duplicated in:** Multiple builder and analytics components

**Centralize in:** `src/lib/metrics.ts`

#### 4. Date Range Filtering
**Duplicated in:** Analytics, Operations, Dashboard

**Create:** `src/hooks/useDateRangeFilter.ts`

---

## 📊 Phase 5: Remove Dead Code

### Search Patterns

1. **Unused imports:**
```bash
# Search for imports that are never used in the file
# Manual inspection needed for each file
```

2. **Commented code:**
```bash
# Search for // commented blocks
# Search for /* */ commented blocks
# Remove if not documentation
```

3. **Unused functions:**
```typescript
// Functions defined but never called in the module
// Check with IDE "Find Usages" feature
```

4. **Unused variables:**
```typescript
// Variables declared but never read
// TypeScript will show "unused variable" warnings
```

### Files Likely to Have Dead Code
- Old component versions
- Deprecated utilities
- Test/debug functions left in production code

---

## ✅ Testing Strategy

### Before Each Refactoring Group

1. **Run existing tests:**
```bash
npm run test
npm run test:e2e
```

2. **Document passing tests:**
```bash
npm run test > test-results-before.txt
```

### After Each Refactoring Group

1. **Re-run tests:**
```bash
npm run test
npm run test:e2e
```

2. **Compare results:**
```bash
npm run test > test-results-after.txt
diff test-results-before.txt test-results-after.txt
```

3. **Manual testing checklist:**
   - [ ] Login/Authentication
   - [ ] Builder flow (all 6 steps)
   - [ ] Agent creation and testing
   - [ ] Marketplace browsing
   - [ ] Integration connections
   - [ ] Analytics dashboards
   - [ ] Deployment process

### Adding Tests for Uncovered Behavior

**Priority areas needing tests:**
1. `src/lib/formatters.ts` - Unit tests for all formatters
2. `src/lib/validation.ts` - Unit tests for all validators
3. `src/hooks/useAgent.ts` - Hook tests
4. `src/lib/errorHandlers.ts` - Error handling tests

---

## 📝 Commit Strategy

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types
- `refactor` - Code refactoring (no behavior change)
- `style` - Formatting, missing semicolons, etc.
- `cleanup` - Remove dead code, unused imports
- `types` - TypeScript type improvements
- `test` - Adding or updating tests

### Example Commits

```bash
# Phase 2
git commit -m "cleanup: replace console statements with logger in AgentChatModal"
git commit -m "types: replace 'any' with proper types in MCPServerManager"
git commit -m "refactor: standardize error handling in ModelMarketplace"

# Phase 3
git commit -m "refactor: split CoPilotDrawer into smaller components"
git commit -m "refactor: extract StatusBadge shared component"

# Phase 4
git commit -m "refactor: centralize agent fetching in useAgent hook"
git commit -m "refactor: deduplicate ROI calculation logic"
```

---

## 🚀 Execution Checklist

### Week 1: Utilities Application
- [ ] Replace all console statements with logger (77 files)
- [ ] Add logger import to affected files
- [ ] Test each file after changes

### Week 2: Type Safety
- [ ] Replace `any` with proper types (73 files)
- [ ] Add type imports where needed
- [ ] Fix any TypeScript errors
- [ ] Run type checking: `npm run type-check`

### Week 3: Error Handling & Formatters
- [ ] Standardize error handling patterns
- [ ] Apply formatters to all metric displays
- [ ] Test user-facing error messages

### Week 4: Component Refactoring
- [ ] Split CoPilotDrawer
- [ ] Split ModelMarketplace
- [ ] Split MCPServerManager
- [ ] Extract shared components

### Week 5: Logic Deduplication
- [ ] Create hooks for common operations
- [ ] Centralize calculation logic
- [ ] Update all usages

### Week 6: Testing & Cleanup
- [ ] Remove dead code
- [ ] Remove unused imports
- [ ] Add missing tests
- [ ] Final regression testing

---

## 📈 Success Metrics

### Code Quality Improvements
- ✅ 0 console statements in production code
- ✅ < 10 `any` types in entire codebase
- ✅ All components < 300 lines
- ✅ All hooks < 150 lines
- ✅ 100% consistent error handling
- ✅ 100% test pass rate maintained

### Maintainability Improvements
- ✅ Consistent logging format
- ✅ Centralized type definitions
- ✅ Reusable component library
- ✅ Documented utility functions
- ✅ Clear component hierarchy

---

## 🔍 Next Steps

1. **Start with Priority 1** (Console statements) - safest changes
2. **Document each change** in commit messages
3. **Test after each file** to catch regressions early
4. **Move to Priority 2** (Types) - still low risk
5. **Continue through priorities** systematically
6. **Schedule code reviews** after each phase

