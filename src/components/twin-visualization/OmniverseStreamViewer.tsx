/**
 * OmniverseStreamViewer — WebRTC stream from NVIDIA Omniverse Kit 109
 * Connects via NVIDIA AppStreamer to the GPU instance's live RTX viewport.
 * Shows the real 3D data center scene (racks, Carter bot, Franka arm, etc.)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Monitor, Maximize2, Minimize2 } from 'lucide-react';

// AppStreamer is loaded globally via index.html <script> tag
declare global {
  interface Window {
    OVWebStreamingLibrary?: {
      AppStreamer: {
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
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [expanded, setExpanded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Get host from env or prop
  const kitUrl = import.meta.env.VITE_OMNIVERSE_KIT_URL || 'http://54.70.43.198:8011';
  const host = hostProp || new URL(kitUrl).hostname;

  const connect = useCallback(async () => {
    const OV = window.OVWebStreamingLibrary;
    if (!OV) {
      console.error('[OmniverseStream] AppStreamer library not loaded');
      return;
    }

    setStatus('connecting');

    try {
      await OV.AppStreamer.connect({
        streamConfig: {
          signalingServer: host,
          signalingPort: 49100,
          mediaServer: host,
          videoElementId: 'omni-stream-video',
          audioElementId: 'omni-stream-audio',
          authenticate: false,
          maxReconnects: 10,
          nativeTouchEvents: true,
          width: 1920,
          height: 1080,
          fps: 60,
          onStart: (msg: any) => {
            if (msg.action === 'start' && msg.status === 'success') {
              setStatus('connected');
              onConnectionChange?.(true);
            }
            if (msg.status === 'error') {
              console.error('[OmniverseStream] start error:', msg);
              setStatus('disconnected');
              onConnectionChange?.(false);
            }
          },
          onStop: () => {
            setStatus('disconnected');
            onConnectionChange?.(false);
          },
        },
        streamSource: 'direct',
      });
    } catch (err) {
      console.error('[OmniverseStream] connect error:', err);
      setStatus('disconnected');
      onConnectionChange?.(false);
    }
  }, [host, onConnectionChange]);

  const disconnect = useCallback(async () => {
    const OV = window.OVWebStreamingLibrary;
    if (!OV) return;
    try {
      await OV.AppStreamer.disconnect();
    } catch (err) {
      console.error('[OmniverseStream] disconnect error:', err);
    }
    setStatus('disconnected');
    onConnectionChange?.(false);
  }, [onConnectionChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const statusColors = {
    disconnected: 'bg-muted text-muted-foreground',
    connecting: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
    connected: 'bg-green-500/10 text-green-500 border-green-500/30',
  };

  const containerClass = expanded
    ? 'fixed inset-4 z-50 bg-background rounded-xl border shadow-2xl'
    : `relative rounded-xl overflow-hidden border bg-black ${className}`;

  return (
    <div className={containerClass}>
      {/* Toolbar — pointer-events-none so mouse goes through to video, buttons re-enable pointer */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-white/70" />
          <span className="text-sm font-medium text-white/90">Omniverse RTX Viewport</span>
          <Badge variant="outline" className={`text-xs ${statusColors[status]}`}>
            {status === 'connected' && <span className="relative flex h-1.5 w-1.5 mr-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span></span>}
            {status}
          </Badge>
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          {status === 'disconnected' && (
            <Button size="sm" variant="secondary" onClick={connect} className="h-7 gap-1 text-xs">
              <Play className="h-3 w-3" /> Connect
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
          <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)} className="h-7 w-7 p-0 text-white/70 hover:text-white">
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
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
      {status === 'disconnected' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 pointer-events-auto">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Monitor className="h-8 w-8 text-primary/60" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/80">NVIDIA Omniverse RTX Stream</p>
              <p className="text-xs text-white/50 mt-1">Real-time ray-traced 3D data center visualization</p>
              <p className="text-xs text-white/30 mt-0.5 font-mono">{host}:49100</p>
            </div>
            <Button size="sm" onClick={connect} className="gap-2">
              <Play className="h-4 w-4" /> Connect to Stream
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
