/**
 * AURA DSX canonical event contract — compatibility re-export.
 *
 * The canonical implementation lives at
 *   supabase/functions/_shared/dsx-contract.ts
 * so it is reachable from both the Vite/Vitest application build and the
 * Supabase Edge Runtime without duplication.
 *
 * This file preserves the stable application-facing import surface
 * (`@/dsx/contract` / `src/dsx/contract`). Do NOT add schema logic here.
 */
export * from '../../supabase/functions/_shared/dsx-contract';
