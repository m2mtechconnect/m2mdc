# AURA LLM Configuration - Gemini 3.x Enforcement

## Overview

All Co-Pilot interactions in AURA now **EXCLUSIVELY** use Google Gemini 3.x models. Legacy models (Gemini 2.x, 1.x) are blocked.

## Model Resolver

The `modelResolver.ts` service ensures:

- ✅ Primary model: `google/gemini-3-pro-preview`
- ✅ Fallback model: `google/gemini-3.0-pro`
- ❌ No Gemini 2.x or older models
- ❌ No other LLM providers

## Usage

### Frontend

```typescript
import { getAIClient } from '@/lib/llm/client';
import { resolveLatestGeminiModel } from '@/lib/llm/modelResolver';

// Option 1: Use client helper (automatically resolves to Gemini 3.x)
const client = getAIClient({ model: 'pro' });

// Option 2: Manually resolve model
const model = resolveLatestGeminiModel(); // Returns 'google/gemini-3-pro-preview'
```

### Backend

```typescript
import { getAIClient } from '../_shared/ai-client.ts';

const client = getAIClient({ model: 'primary' });
// Always returns Gemini 3.x configuration
```

## Model Options

| Option | Model | Use Case |
|--------|-------|----------|
| `'pro'` / `'primary'` | gemini-3-pro-preview | Default for all Co-Pilot interactions |
| `'fallback'` | gemini-3.0-pro | If preview model unavailable |

## Enforcement

The system BLOCKS usage of non-Gemini 3.x models:

```typescript
import { enforceGemini3x } from '@/lib/llm/modelResolver';

enforceGemini3x('google/gemini-2.5-flash'); // ❌ Throws error
enforceGemini3x('google/gemini-3-pro-preview'); // ✅ Passes
```

## UI Indicator

Co-Pilot panel displays:
> "Powered by Gemini 3.0 Pro (v3.0)"

This updates automatically when the model resolver switches versions.

## Future Upgrades

When Gemini 4.x is released:

1. Update `GEMINI_3X_CONFIG` in `modelResolver.ts`
2. Change `primary` to `google/gemini-4-pro-preview`
3. Change `fallback` to `google/gemini-3.0-pro`
4. All systems auto-upgrade with zero code changes

## Testing

Run model enforcement tests:

```bash
npm test tests/copilot/modelEnforcement.test.ts
```

Ensures:
- ✅ No legacy model references
- ✅ Correct model resolution
- ✅ Fallback logic works
- ✅ Enforcement blocks old models
