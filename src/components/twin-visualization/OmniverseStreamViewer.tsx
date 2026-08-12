/**
 * OmniverseStreamViewer — WebRTC stream from NVIDIA Omniverse Kit 109
 * Connects via NVIDIA AppStreamer to the GPU instance's live RTX viewport.
 * Shows the real 3D data center scene (racks, Carter bot, Franka arm, etc.)
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Monitor, Maximize2, Minimize2 } from 'lucide-react';
import { readKitConfig } from '@/integrations/omniverseKit/config';
import { StreamStatusBanner, type StreamBannerReason } from '@/components/provenance/ProvenanceBadge';
import type { SourceConnectionState } from '@/lib/provenance/types';
import { useOmniverseKit } from '@/hooks/useOmniverseKit';

// AppStreamer is loaded globally via index.html <script> tag
// The NVIDIA AppStreamer library ships without TS types; the `any` here is a
// documented boundary shim. Widening it would require re-declaring the entire
// AppStreamer API which is out of scope for Phase 1A.
declare global {
  interface Window {
    OVWebStreamingLibrary?: {
      AppStreamer: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        connect: (config: any) => Promise<void>;
        disconnect: () => Promise<void>;
      };
    };
  }
}

interface OmniverseStreamViewerProps {
  host?: string;
  className?: string;
  onConnectionChange?: (connected: boolean) => void;
}

export function OmniverseStreamViewer({
  host: hostProp,
  className = '',
  onConnectionChange,
}: OmniverseStreamViewerProps) {
  const cfg = useMemo(() => readKitConfig(), []);
  // Kit REST outcome — banner cause takes precedence over the WebRTC stream
  // state, because a bad REST payload/endpoint is the operationally relevant
  // failure to surface first.
  const kit = useOmniverseKit();
  const initialState: SourceConnectionState =
    !cfg.enabled           ? 'disabled' :
    !cfg.streamEnabled     ? 'disabled' :
                             'demo';
  const [status, setStatus] = useState<SourceConnectionState>(initialState);
  const [expanded, setExpanded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const host = hostProp || cfg.signalingHost || '';
  const canConnect = cfg.enabled && cfg.streamEnabled && Boolean(cfg.signalingHost);

  const connect = useCallback(async () => {
    if (!canConnect) {
      setStatus('unavailable');
      onConnectionChange?.(false);
      return;
    }
    const OV = window.OVWebStreamingLibrary;
    if (!OV) {
      console.error('[OmniverseStream] AppStreamer library not loaded');
      setStatus('unavailable');
      onConnectionChange?.(false);
      return;
    }

    setStatus('connecting');

    try {
      await OV.AppStreamer.connect({
        streamConfig: {
          signalingServer: host,
          signalingPort: cfg.signalingPort,
          mediaServer: host,
          videoElementId: 'omni-stream-video',
          audioElementId: 'omni-stream-audio',
          authenticate: false,
          maxReconnects: 10,
          nativeTouchEvents: true,
          width: 1920,
          height: 1080,
          fps: 60,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onStart: (msg: any) => {
            if (msg.action === 'start' && msg.status === 'success') {
              setStatus('connected');
              onConnectionChange?.(true);
            }
            if (msg.status === 'error') {
              console.error('[OmniverseStream] start error:', msg);
              setStatus('unavailable');
              onConnectionChange?.(false);
            }
          },
          onStop: () => {
            setStatus('demo');
            onConnectionChange?.(false);
          },
        },
        streamSource: 'direct',
      });
    } catch (err) {
      console.error('[OmniverseStream] connect error:', err);
      setStatus('unavailable');
      onConnectionChange?.(false);
    }
  }, [host, onConnectionChange, canConnect, cfg.signalingPort]);

  const disconnect = useCallback(async () => {
    const OV = window.OVWebStreamingLibrary;
    if (!OV) return;
    try {
      await OV.AppStreamer.disconnect();
    } catch (err) {
      console.error('[OmniverseStream] disconnect error:', err);
    }
    setStatus('demo');
    onConnectionChange?.(false);
  }, [onConnectionChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const statusColors: Record<SourceConnectionState, string> = {
    disabled:     'bg-muted text-muted-foreground',
    demo:         'bg-amber-500/10 text-amber-700 border-amber-500/30',
    connecting:   'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
    connected:    'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    degraded:     'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/40',
    unavailable:  'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
  };

  const streamLabel =
    status === 'connected' ? 'Omniverse RTX Viewport' : 'Local demonstration scene';

  const containerClass = expanded
    ? 'fixed inset-4 z-50 bg-background rounded-xl border shadow-2xl'
    : `relative rounded-xl overflow-hidden border bg-black ${className}`;

  return (
    <div className={containerClass}>
      <div className="absolute top-14 left-3 right-3 z-20 pointer-events-none">
        <div className="pointer-events-auto">
          <StreamStatusBanner reason={resolveBannerReason(kit.connectionState, kit.validationIssues.length > 0, status)} />
        </div>
      </div>
      {/* Toolbar — pointer-events-none so mouse goes through to video, buttons re-enable pointer */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-white/70" />
          <span className="text-sm font-medium text-white/90">{streamLabel}</span>
          <Badge variant="outline" className={`text-xs ${statusColors[status]}`}>
            {status === 'connected' && <span className="relative flex h-1.5 w-1.5 mr-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span></span>}
            {status}
          </Badge>
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          {(status === 'demo' || status === 'unavailable') && (
            <Button size="sm" variant="secondary" onClick={connect} className="h-7 gap-1 text-xs" disabled={!canConnect}>
              <Play className="h-3 w-3" /> {canConnect ? 'Connect' : 'Kit not configured'}
            </Button>
          )}
          {status === 'connecting' && (
            <Button size="sm" variant="secondary" disabled className="h-7 gap-1 text-xs">
              <div className="h-3 w-3 border border-t-transparent rounded-full animate-spin" /> Connecting...
            </Button>
          )}
          {status === 'connected' && (
            <Button size="sm" variant="destructive" onClick={disconnect} className="h-7 gap-1 text-xs">
              <Square className="h-3 w-3" /> Disconnect
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
            className="h-7 w-7 p-0 text-white/70 hover:text-white"
            aria-label={expanded ? 'Collapse stream viewer' : 'Expand stream viewer'}
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {/* Video Stream */}
      <video
        id="omni-stream-video"
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain bg-black"
        style={{ minHeight: expanded ? '100%' : '400px' }}
      />
      <audio id="omni-stream-audio" ref={audioRef} autoPlay />

      {/* Placeholder when disconnected — only shows when not streaming */}
      {status !== 'connected' && status !== 'connecting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 pointer-events-auto">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Monitor className="h-8 w-8 text-primary/60" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/80">Local demonstration scene</p>
              <p className="text-xs text-white/50 mt-1">
                {canConnect
                  ? 'Real-time ray-traced Omniverse stream available on connect.'
                  : 'Omniverse stream unavailable in this build. Server-mediated transport is required.'}
              </p>
              {canConnect && host && (
                <p className="text-xs text-white/30 mt-0.5 font-mono">{host}:{cfg.signalingPort}</p>
              )}
            </div>
            <Button size="sm" onClick={connect} className="gap-2" disabled={!canConnect}>
              <Play className="h-4 w-4" /> Connect to Stream
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Prioritise Kit REST cause over stream state so the user learns the true
 * reason for demo fallback. Returns `null` when everything is healthy (Kit
 * connected AND stream connected) so no banner is rendered.
 */
function resolveBannerReason(
  kitState: SourceConnectionState,
  kitInvalid: boolean,
  streamState: SourceConnectionState,
): StreamBannerReason | null {
  if (kitState === 'disabled')    return 'kit-disabled';
  if (kitInvalid)                 return 'kit-invalid';
  if (kitState === 'unavailable') return 'kit-unavailable';
  if (kitState === 'degraded')    return 'stream-degraded';
  // Kit REST healthy: surface the stream state.
  if (streamState === 'connected')  return null;
  if (streamState === 'connecting') return 'stream-connecting';
  if (streamState === 'unavailable') return 'stream-demo';
  return 'stream-demo';
}
