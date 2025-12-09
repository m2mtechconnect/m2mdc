import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRecommendationsStore } from '@/stores/recommendationsStore';

export interface CaptureResult {
  url: string;
  status: 'success' | 'failed' | 'pending' | 'low_content' | 'cached';
  wordCount?: number;
  chunkCount?: number;
  summary?: string;
  error?: string;
}

export interface RecoResponse {
  company: string | null;
  domain: string;
  industryGuess: string | null;
  departmentsCovered: string[];
  items: any[];
  status: 'ok' | 'empty' | 'error';
  message?: string;
  warningMessage?: string;
  totalCount?: number; // Total recommendations before filtering to top N
  captureResults?: CaptureResult[];
  telemetry?: {
    crawl_pages_found?: number;
    force_ingest_pages_found?: number;
    context_chars: number;
    gemini_ok: boolean;
    gemini_error?: string;
    returned_items_count: number;
  };
}

type UiState =
  | { kind: 'idle' }
  | { kind: 'loading'; domain?: string }
  | { kind: 'discovering'; domain: string; message?: string }
  | { kind: 'capturing'; domain: string; captureResults: CaptureResult[]; captured: number; total: number; message?: string }
  | { kind: 'analyzing'; domain: string; captureResults: CaptureResult[]; analyzed: number; total: number; message?: string }
  | { kind: 'ok'; data: RecoResponse }
  | { kind: 'empty'; message?: string; captureResults?: CaptureResult[]; telemetry?: RecoResponse['telemetry'] }
  | { kind: 'error'; message?: string };

const normalizeResponse = (r: Partial<RecoResponse>, domain: string): RecoResponse => ({
  company: r.company ?? null,
  domain: r.domain ?? domain,
  industryGuess: r.industryGuess ?? null,
  departmentsCovered: Array.isArray(r.departmentsCovered) ? r.departmentsCovered : [],
  items: Array.isArray(r.items) ? r.items : [],
  status: r.status ?? 'ok',
  message: r.message,
  warningMessage: r.warningMessage,
  captureResults: r.captureResults,
  telemetry: r.telemetry,
});

export function useRecommendations() {
  const [uiState, setUiState] = useState<UiState>({ kind: 'idle' });
  const requestId = useRef(0);
  const inFlight = useRef<AbortController | null>(null);

  const fetchRecommendations = async (url: string, force = false, forceIngest = false) => {
    const id = ++requestId.current;
    
    // Validate and normalize URL
    const normalizedUrl = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;
    
    let urlObj: URL;
    try {
      urlObj = new URL(normalizedUrl);
    } catch {
      setUiState({ kind: 'error', message: 'Invalid URL format' });
      return;
    }
    
    const domain = urlObj.hostname.replace(/^www\./, '');
    if (!domain || domain.length === 0) {
      setUiState({ kind: 'error', message: 'Invalid domain' });
      return;
    }

    // CRITICAL: Clear cached recommendations before starting new analysis
    // This prevents old recommendations from persisting
    useRecommendationsStore.getState().resetState();

    setUiState({ kind: 'loading', domain });

    // Cancel previous request
    inFlight.current?.abort();
    const ac = new AbortController();
    inFlight.current = ac;

    try {
      // Use SSE for forceIngest mode with turbo-capture
      if (forceIngest) {
        const functionUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!functionUrl) {
          throw new Error('Configuration error: Supabase URL not found. Please refresh the page or contact support.');
        }
        
        console.log('[Turbo] Base URL:', functionUrl);
        console.log('[Turbo] Full URL will be:', `${functionUrl}/functions/v1/url-turbo-capture`);
        
        const sseUrl = `${functionUrl}/functions/v1/url-turbo-capture?url=${encodeURIComponent(normalizedUrl)}&forceScan=${force ? 'true' : 'false'}`;
        console.log('[Turbo] Connecting to SSE:', sseUrl);
        
        let eventSource: EventSource | null = null;
        let connectionTimeout: NodeJS.Timeout | null = null;
        
        try {
          
          // Set a timeout for the initial connection
          connectionTimeout = setTimeout(() => {
            if (eventSource && eventSource.readyState !== EventSource.OPEN) {
              console.error('[Turbo] Connection timeout - EventSource did not open');
              eventSource.close();
              if (id === requestId.current) {
                setUiState({
                  kind: 'error',
                  message: 'Connection timeout. Please check your internet connection and try again.',
                });
              }
            }
          }, 10000); // 10 second connection timeout
          
          try {
            eventSource = new EventSource(sseUrl);
            console.log('[Turbo] EventSource created, readyState:', eventSource.readyState);
            console.log('[Turbo] EventSource URL:', eventSource.url);
          } catch (constructorError) {
            console.error('[Turbo] Failed to create EventSource:', constructorError);
            console.error('[Turbo] URL that failed:', sseUrl);
            console.error('[Turbo] Error details:', {
              name: constructorError instanceof Error ? constructorError.name : 'Unknown',
              message: constructorError instanceof Error ? constructorError.message : String(constructorError),
              stack: constructorError instanceof Error ? constructorError.stack : undefined
            });
            if (connectionTimeout) clearTimeout(connectionTimeout);
            throw new Error(`Cannot connect to scanning service. This may be due to network issues or browser restrictions. Please try again or use a different network.`);
          }

          const captureMap = new Map<string, CaptureResult>();
          let totalPages = 0;
          let capturedCount = 0;
          let analyzedCount = 0;

          // Cleanup function
          const cleanup = () => {
            if (connectionTimeout) {
              clearTimeout(connectionTimeout);
              connectionTimeout = null;
            }
            if (eventSource) {
              eventSource.close();
              eventSource = null;
            }
          };

          // Setup abort cleanup
          ac.signal.addEventListener('abort', cleanup);

          eventSource.addEventListener('phase', (e) => {
            try {
              const data = JSON.parse((e as MessageEvent).data);
              console.log('[Turbo] Phase:', data);
          
          if (data.phase === 'discovering') {
            setUiState({
              kind: 'discovering',
              domain,
              message: data.message,
            });
          } else if (data.phase === 'capturing') {
            setUiState({
              kind: 'capturing',
              domain,
              captureResults: Array.from(captureMap.values()),
              captured: capturedCount,
              total: totalPages,
              message: data.message,
            });
          } else if (data.phase === 'analyzing') {
            setUiState({
              kind: 'analyzing',
              domain,
              captureResults: Array.from(captureMap.values()),
              analyzed: analyzedCount,
              total: capturedCount,
              message: data.message,
            });
          }
            } catch (err) {
              console.error('[Turbo] Failed to parse phase event:', err);
            }
          });

        eventSource.addEventListener('discovered', (e) => {
          const data = JSON.parse((e as MessageEvent).data);
          totalPages = data.totalPages;
          console.log('[Turbo] Discovered:', data);
        });

        eventSource.addEventListener('capture_start', (e) => {
          const data = JSON.parse((e as MessageEvent).data);
          captureMap.set(data.url, { url: data.url, status: 'pending' });
          
          setUiState({
            kind: 'capturing',
            domain,
            captureResults: Array.from(captureMap.values()),
            captured: capturedCount,
            total: totalPages,
          });
        });

        eventSource.addEventListener('capture_success', (e) => {
            try {
              const data = JSON.parse((e as MessageEvent).data);
          captureMap.set(data.url, {
            url: data.url,
            status: 'success',
            wordCount: data.wordCount,
          });
          capturedCount++;
          
          setUiState({
            kind: 'capturing',
            domain,
            captureResults: Array.from(captureMap.values()),
            captured: capturedCount,
            total: totalPages,
          });
            } catch (err) {
              console.error('[Turbo] Failed to parse capture_success event:', err);
            }
          });

        eventSource.addEventListener('capture_cached', (e) => {
            try {
              const data = JSON.parse((e as MessageEvent).data);
              captureMap.set(data.url, {
                url: data.url,
                status: 'cached',
                wordCount: data.result.wordCount,
                summary: data.result.summary,
              });
              capturedCount++;
              
              setUiState({
                kind: 'capturing',
                domain,
                captureResults: Array.from(captureMap.values()),
                captured: capturedCount,
                total: totalPages,
              });
            } catch (err) {
              console.error('[Turbo] Failed to parse capture_cached event:', err);
            }
          });

        eventSource.addEventListener('capture_low_content', (e) => {
            try {
              const data = JSON.parse((e as MessageEvent).data);
          captureMap.set(data.url, {
            url: data.url,
            status: 'low_content',
            wordCount: data.wordCount,
          });
          capturedCount++;
          
          setUiState({
            kind: 'capturing',
            domain,
            captureResults: Array.from(captureMap.values()),
            captured: capturedCount,
            total: totalPages,
          });
            } catch (err) {
              console.error('[Turbo] Failed to parse capture_failed event:', err);
            }
          });

        eventSource.addEventListener('capture_failed', (e) => {
            try {
              const data = JSON.parse((e as MessageEvent).data);
              captureMap.set(data.url, {
                url: data.url,
                status: 'failed',
                error: data.error,
              });
              capturedCount++;
              
              setUiState({
                kind: 'capturing',
                domain,
                captureResults: Array.from(captureMap.values()),
                captured: capturedCount,
                total: totalPages,
              });
            } catch (err) {
              console.error('[Turbo] Failed to parse capture_failed event:', err);
            }
          });

        eventSource.addEventListener('analyze_start', (e) => {
            try {
              const data = JSON.parse((e as MessageEvent).data);
              console.log('[Turbo] Analyzing:', data.url);
            } catch (err) {
              console.error('[Turbo] Failed to parse analyze_start event:', err);
            }
          });

        eventSource.addEventListener('analyze_complete', (e) => {
            try {
              const data = JSON.parse((e as MessageEvent).data);
          const existing = captureMap.get(data.url);
          if (existing) {
            captureMap.set(data.url, {
              ...existing,
              chunkCount: data.chunkCount,
              summary: data.summary,
            });
          }
          analyzedCount++;
          
          setUiState({
            kind: 'analyzing',
            domain,
            captureResults: Array.from(captureMap.values()),
            analyzed: analyzedCount,
            total: capturedCount,
          });
            } catch (err) {
              console.error('[Turbo] Failed to parse analyze_complete event:', err);
            }
          });

        eventSource.addEventListener('complete', (e) => {
            try {
              const data = JSON.parse((e as MessageEvent).data);
              console.log('[Turbo] Complete:', data);
              cleanup(); // Properly cleanup EventSource and timeout
          
          // Check if request is still valid before proceeding
          if (id !== requestId.current) return;

          if (data.status === 'ok' && data.captureResults?.length > 0) {
            // Now call recommendations with the captured data
            // Use the parent abort signal so it respects cancellation
            const timeout = setTimeout(() => ac.abort(), 30000); // 30s timeout
            
            fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/url-recommendations`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({ 
                url: normalizedUrl, 
                topN: 3, 
                force: true,
                forceIngest: true,
              }),
              signal: ac.signal,
            })
              .then(async r => {
                if (id !== requestId.current) {
                  clearTimeout(timeout);
                  return null;
                }
                clearTimeout(timeout);
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
              })
              .then(recoData => {
                if (!recoData || id !== requestId.current) return;
                
                const normalized = normalizeResponse(recoData, domain);
                if (normalized.status === 'ok' && normalized.items.length > 0) {
                  setUiState({ kind: 'ok', data: normalized });
                } else {
                  setUiState({
                    kind: 'empty',
                    message: normalized.message || 'No recommendations generated.',
                    captureResults: data.captureResults,
                    telemetry: normalized.telemetry,
                  });
                }
              })
              .catch(err => {
                if (id !== requestId.current) return;
                if ((err as any)?.name === 'AbortError') return;
                
                console.error('[Turbo] Recommendations error:', err);
                setUiState({
                  kind: 'error',
                  message: 'Failed to generate recommendations from captured content.',
                });
              });
          } else {
            setUiState({
              kind: 'empty',
              message: data.message || 'No content could be captured from this site.',
              captureResults: data.captureResults,
            });
          }
            } catch (err) {
              console.error('[Turbo] Failed to parse complete event:', err);
              if (id !== requestId.current) return;
              cleanup();
              setUiState({ kind: 'error', message: 'Failed to parse results' });
            }
          });

        // Handle SSE error messages from server
        eventSource.addEventListener('error', (e) => {
          try {
            const data = typeof (e as any).data === 'string' ? JSON.parse((e as any).data) : {};
            console.error('[Turbo] Error event:', data);
            cleanup();
            
            if (id === requestId.current) {
              setUiState({
                kind: 'error',
                message: data.message || 'An error occurred during capture.',
              });
            }
          } catch (parseErr) {
            console.error('[Turbo] Error parsing error event:', parseErr);
            cleanup();
            if (id === requestId.current) {
              setUiState({
                kind: 'error',
                message: 'An error occurred during capture.',
              });
            }
          }
        });

        // Handle connection errors
        eventSource.onerror = (err) => {
          console.error('[Turbo] Connection error:', err);
          console.log('[Turbo] EventSource readyState:', eventSource?.readyState);
          
          if (id !== requestId.current) return;
          
          // Only show error if this isn't a normal completion
          // EventSource fires onerror on normal close too
          if (eventSource && eventSource.readyState !== EventSource.CLOSED) {
            cleanup();
            
            setUiState({
              kind: 'error',
              message: 'Failed to connect to scanning service. Please try again.',
            });
          }
        };

        // Log when connection opens successfully
        eventSource.onopen = () => {
          console.log('[Turbo] EventSource connection opened successfully');
          // Clear the connection timeout since we're now connected
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            connectionTimeout = null;
          }
        };

        return;
        } catch (sseError) {
          console.error('[Turbo] SSE setup error:', sseError);
          console.error('[Turbo] Error details:', {
            message: sseError instanceof Error ? sseError.message : 'Unknown error',
            name: sseError instanceof Error ? sseError.name : 'Unknown',
            stack: sseError instanceof Error ? sseError.stack : undefined
          });
          
          if (id === requestId.current) {
            // If SSE fails completely, fall back to regular polling
            console.log('[Turbo] Falling back to regular recommendations endpoint');
            
            try {
              const { data: rawResponse, error } = await supabase.functions.invoke('url-recommendations', {
                body: { url: normalizedUrl, topN: 3, force, forceIngest: true },
              });

              if (id !== requestId.current) return;

              if (error) {
                setUiState({
                  kind: 'error',
                  message: error.message || 'Failed to analyze the website. Please try again.',
                });
                return;
              }

              // Handle REST envelope if present
              let raw = rawResponse;
              if (rawResponse && typeof rawResponse === 'object' && 'success' in rawResponse && 'data' in rawResponse) {
                const envelope = rawResponse as { success: boolean; data: any };
                if (!envelope.success) {
                  throw new Error('API returned error');
                }
                raw = envelope.data;
              }

              const data = normalizeResponse(raw as any, domain);

              if (data.status === 'ok' && data.items.length > 0) {
                setUiState({ kind: 'ok', data });
              } else if (data.status === 'empty' || data.items.length === 0) {
                setUiState({
                  kind: 'empty',
                  message: data.message || 'No recommendations available for this website.',
                  captureResults: data.captureResults,
                  telemetry: data.telemetry,
                });
              } else {
                setUiState({
                  kind: 'error',
                  message: data.message || 'Unable to generate recommendations.',
                });
              }
            } catch (fallbackError) {
              console.error('[Turbo] Fallback also failed:', fallbackError);
              setUiState({
                kind: 'error',
                message: 'Failed to analyze the website. Please check your internet connection and try again.',
              });
            }
          }
          return;
        }
      }

      // Regular JSON request for non-forceIngest
      const { data: rawResponse, error } = await supabase.functions.invoke('url-recommendations', {
        body: { url: normalizedUrl, topN: 3, force, forceIngest: false },
      });

      // Ignore stale responses
      if (id !== requestId.current) return;

      if (error) {
        setUiState({
          kind: 'error',
          message: error.message || 'Network error. Please try again.',
        });
        return;
      }

      // Handle REST envelope if present
      let raw = rawResponse;
      if (rawResponse && typeof rawResponse === 'object' && 'success' in rawResponse && 'data' in rawResponse) {
        const envelope = rawResponse as { success: boolean; data: any; error: any; correlationId: string };
        if (!envelope.success) {
          console.error('[API] Request failed:', envelope.error, 'correlationId:', envelope.correlationId);
          throw new Error(envelope.error?.message || 'Request failed');
        }
        raw = envelope.data;
      }

      const data = normalizeResponse(raw as any, domain);

      if (data.status === 'ok' && data.items.length > 0) {
        setUiState({ kind: 'ok', data });
      } else if (data.status === 'empty' || data.items.length === 0) {
        setUiState({
          kind: 'empty',
          message: data.message || 'No recommendations available.',
          captureResults: data.captureResults,
          telemetry: data.telemetry,
        });
      } else {
        setUiState({
          kind: 'error',
          message: data.message || 'Unable to generate recommendations.',
        });
      }
    } catch (e: any) {
      if (id !== requestId.current) return;
      if (e?.name === 'AbortError') return;

      setUiState({
        kind: 'error',
        message: 'Network error. Please try again.',
      });
    } finally {
      if (id === requestId.current) {
        inFlight.current = null;
      }
    }
  };

  const fetchRecommendationsFromContent = async (params: { url?: string; companyName?: string; content: string; topN?: number }) => {
    const id = ++requestId.current;

    const trimmedContent = params.content?.trim();
    if (!trimmedContent || trimmedContent.length < 100) {
      setUiState({ kind: 'error', message: 'Content is too short. Please provide more detail.' });
      return;
    }

    let domain = 'manual-input';
    if (params.url) {
      try {
        const urlObj = new URL(params.url.trim().startsWith('http') ? params.url.trim() : `https://${params.url.trim()}`);
        domain = urlObj.hostname.replace(/^www\./, '');
      } catch {
        // Keep default manual-input domain
      }
    }

    // Clear any cached recommendations before manual analysis
    useRecommendationsStore.getState().resetState();

    setUiState({ kind: 'loading', domain });

    // Cancel any in-flight URL-based analysis
    inFlight.current?.abort();
    inFlight.current = null;

    try {
      const { data: rawResponse, error } = await supabase.functions.invoke('manual-recommendations', {
        body: {
          url: params.url,
          companyName: params.companyName,
          content: trimmedContent,
          topN: params.topN ?? 3,
        },
      });

      if (id !== requestId.current) return;

      if (error) {
        setUiState({
          kind: 'error',
          message: error.message || 'Network error. Please try again.',
        });
        return;
      }

      // Handle REST envelope if present
      let raw = rawResponse;
      if (rawResponse && typeof rawResponse === 'object' && 'success' in rawResponse && 'data' in rawResponse) {
        const envelope = rawResponse as { success: boolean; data: any };
        if (!envelope.success) {
          throw new Error('API returned error');
        }
        raw = envelope.data;
      }

      const data = normalizeResponse(raw as any, domain);

      if (data.status === 'ok' && data.items.length > 0) {
        setUiState({ kind: 'ok', data });
      } else if (data.status === 'empty' || data.items.length === 0) {
        setUiState({
          kind: 'empty',
          message: data.message || 'No recommendations could be generated from this content.',
          captureResults: data.captureResults,
          telemetry: data.telemetry,
        });
      } else {
        setUiState({
          kind: 'error',
          message: data.message || 'Unable to generate recommendations from this content.',
        });
      }
    } catch (e: any) {
      if (id !== requestId.current) return;
      if (e?.name === 'AbortError') return;

      setUiState({
        kind: 'error',
        message: 'Network error. Please try again.',
      });
    } finally {
      if (id === requestId.current) {
        inFlight.current = null;
      }
    }
  };

  const reset = () => {
    inFlight.current?.abort();
    setUiState({ kind: 'idle' });
  };

  return {
    uiState,
    fetchRecommendations,
    fetchRecommendationsFromContent,
    reset,
    isLoading:
      uiState.kind === 'loading' ||
      uiState.kind === 'discovering' ||
      uiState.kind === 'capturing' ||
      uiState.kind === 'analyzing',
  };
}
