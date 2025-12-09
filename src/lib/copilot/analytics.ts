/**
 * Co-Pilot Analytics
 * 
 * Logs Co-Pilot interactions to copilot_events table for analytics.
 */

import { supabase } from '@/integrations/supabase/client';
import type { CoPilotContext } from './contextBuilder';

interface CoPilotEvent {
  sessionId: string;
  context: CoPilotContext;
  prompt: string;
  responseSummary: string;
  actionClicked?: string;
  latencyMs: number;
}

/**
 * Log a Co-Pilot interaction event
 */
export async function logCoPilotEvent(event: CoPilotEvent): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('copilot_events').insert({
      user_id: user.id,
      agent_id: event.context.agentId || null,
      session_id: event.sessionId,
      context: event.context as any,
      prompt: event.prompt,
      response_summary: event.responseSummary,
      action_clicked: event.actionClicked || null,
      latency_ms: event.latencyMs,
      model: 'google/gemini-3-pro-preview',
    });
  } catch (error) {
    console.error('Failed to log Co-Pilot event:', error);
  }
}

/**
 * Get Co-Pilot usage statistics for current user
 */
export async function getCoPilotStats(timeframe: 'day' | 'week' | 'month' = 'week') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const since = new Date();
  if (timeframe === 'day') since.setDate(since.getDate() - 1);
  else if (timeframe === 'week') since.setDate(since.getDate() - 7);
  else if (timeframe === 'month') since.setMonth(since.getMonth() - 1);

  const { data, error } = await supabase
    .from('copilot_events')
    .select('*')
    .eq('user_id', user.id)
    .gte('created_at', since.toISOString());

  if (error) {
    console.error('Failed to fetch Co-Pilot stats:', error);
    return null;
  }

  return {
    totalQueries: data.length,
    avgLatencyMs: data.reduce((sum, e) => sum + (e.latency_ms || 0), 0) / data.length,
    actionsClicked: data.filter(e => e.action_clicked).length,
    uniqueSessions: new Set(data.map(e => e.session_id)).size,
  };
}
