/**
 * Co-Pilot Streaming Client
 * 
 * Handles token-by-token streaming from backend with structured response parsing.
 */

import { supabase } from '@/integrations/supabase/client';
import type { CoPilotContext } from './contextBuilder';
import { buildDataCentreSystemPrompt, isDataCentreContext } from './dataCentreContext';

interface StreamOptions {
  query: string;
  context: CoPilotContext;
  sessionId: string;
  signal: AbortSignal;
  onToken: (token: string) => void;
  onStructured?: (data: any) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

/**
 * Stream Co-Pilot response with token-by-token updates
 */
export async function streamCoPilotResponse(options: StreamOptions): Promise<void> {
  const { query, context, sessionId, signal, onToken, onStructured, onComplete, onError } = options;

  try {
    console.log('[CoPilot Streaming] Getting session...');
    const { data: { session } } = await supabase.auth.getSession();
    
    // Build headers - auth is optional since copilot-stream is public
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    };
    
    // Add auth header if user is logged in
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/copilot-stream`;
    console.log('[CoPilot Streaming] Calling:', url);
    console.log('[CoPilot Streaming] Payload:', { query, sessionId, contextKeys: Object.keys(context), authenticated: !!session });

    // Build domain-specific system prompt enhancement
    const domainPrompt = buildDataCentreSystemPrompt(context);
    const enhancedContext = {
      ...context,
      domainSystemPrompt: domainPrompt || undefined,
      isDataCentreDomain: isDataCentreContext(context),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        context: enhancedContext,
        sessionId,
      }),
      signal,
    });

    console.log('[CoPilot Streaming] Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[CoPilot Streaming] Error response:', errorData);
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    if (!response.body) {
      console.error('[CoPilot Streaming] No response body');
      throw new Error('No response body');
    }

    console.log('[CoPilot Streaming] Starting to read stream...');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        onComplete();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || line.startsWith(':')) continue;
        if (!line.startsWith('data: ')) continue;

        const data = line.slice(6).trim();
        if (data === '[DONE]') {
          onComplete();
          return;
        }

        try {
          const parsed = JSON.parse(data);
          
          // Handle token streaming
          if (parsed.type === 'token' && parsed.content) {
            onToken(parsed.content);
          }
          
          // Handle structured data
          if (parsed.type === 'structured' && parsed.data && onStructured) {
            console.log('[CoPilot Streaming] Received structured data');
            onStructured(parsed.data);
          }
        } catch (e) {
          console.error('[CoPilot Streaming] Failed to parse SSE data:', e, 'Line:', data);
        }
      }
    }
  } catch (error: any) {
    console.error('[CoPilot Streaming] Catch block error:', error);
    if (error.name === 'AbortError') {
      console.log('[CoPilot Streaming] Stream aborted');
      onComplete();
    } else {
      console.error('[CoPilot Streaming] Passing error to handler:', error.message);
      onError(error);
    }
  }
}
