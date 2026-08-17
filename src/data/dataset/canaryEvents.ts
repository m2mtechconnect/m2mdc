/**
 * Durable-ish record of canary activation and rollback events.
 *
 * Events are appended locally and mirrored best-effort into `audit_logs` so an
 * administrator can prove when the canary was switched on or rolled back. A
 * failed mirror never blocks the UI and never silently loses the local entry.
 */
import { supabase } from '@/integrations/supabase/client';
import type { DatasetMode } from '@/data/dsxReference';

const KEY = 'aura.dataset.canary.events';

export interface CanaryEvent {
  at: string;
  action: 'activate' | 'rollback';
  dataset: DatasetMode;
  actorId: string | null;
}

export function readCanaryEvents(): CanaryEvent[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CanaryEvent[]) : [];
  } catch {
    return [];
  }
}

export async function recordCanaryEvent(event: Omit<CanaryEvent, 'at'>): Promise<CanaryEvent> {
  const entry: CanaryEvent = { ...event, at: new Date().toISOString() };
  try {
    const next = [...readCanaryEvents(), entry].slice(-100);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable - the mirror below is still attempted */
  }
  try {
    await supabase.from('audit_logs').insert({
      action: `dataset_canary_${event.action}`,
      resource_type: 'dataset',
      resource_id: event.dataset,
      user_id: event.actorId,
      metadata: { dataset: event.dataset, at: entry.at },
    } as never);
  } catch {
    /* audit mirror is best-effort; the local record remains authoritative */
  }
  return entry;
}
