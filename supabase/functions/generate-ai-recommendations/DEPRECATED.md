# ⚠️ DEPRECATED - DO NOT USE

This edge function is **DEPRECATED** and should not be used.

## Why Deprecated?

This function generates **generic AI initiatives**, NOT Digital Twin Blueprints.

## Use Instead

Use `url-recommendations` edge function which generates proper Digital Twin Blueprints with:
- Real-world process mirroring
- Data sources and event triggers
- Human-in-the-loop steps
- Operational impact metrics
- Industry-specific filtering

## Migration

If you're calling this function:

```typescript
// ❌ OLD - Generic AI initiatives
await supabase.functions.invoke('generate-ai-recommendations', { ... })

// ✅ NEW - Digital Twin Blueprints
await supabase.functions.invoke('url-recommendations', {
  body: {
    url: domain,
    topN: 3,
    force: false,
    forceIngest: false
  }
})
```

## Timeline

- **Created:** 2025-01-XX
- **Deprecated:** 2025-01-27
- **Planned Removal:** 2025-02-15

**DO NOT ADD NEW CALLERS TO THIS FUNCTION**
