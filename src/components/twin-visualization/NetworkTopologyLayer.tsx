/**
 * NetworkTopologyLayer Component
 * 2D network topology overlay
 */

import { useMemo } from 'react';
import type { NetworkNodeVisual, NetworkLinkVisual } from './types';

interface NetworkTopologyLayerProps {
  nodes: NetworkNodeVisual[];
  links: NetworkLinkVisual[];
  visible: boolean;
  compact?: boolean;
}

const NODE_COLORS: Record<NetworkNodeVisual['type'], string> = {
  'core-switch': 'hsl(var(--primary))',
  'tor-switch': 'hsl(var(--accent))',
  'firewall': 'hsl(var(--destructive))',
  'router': 'hsl(var(--warning))',
  'server-group': 'hsl(var(--secondary))'
};

const NODE_ICONS: Record<NetworkNodeVisual['type'], string> = {
  'core-switch': '⬡',
  'tor-switch': '⬢',
  'firewall': '🛡',
  'router': '◈',
  'server-group': '▣'
};

export function NetworkTopologyLayer({ nodes, links, visible, compact = false }: NetworkTopologyLayerProps) {
  const scale = compact ? 0.6 : 1;
  const offsetX = compact ? 20 : 50;
  const offsetY = compact ? 20 : 60;

  // Calculate positions for SVG
  const nodeMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    nodes.forEach(node => {
      map.set(node.id, {
        x: offsetX + node.position[0] * 30 * scale,
        y: offsetY + node.position[1] * 25 * scale
      });
    });
    return map;
  }, [nodes, scale, offsetX, offsetY]);

  const width = compact ? 200 : 400;
  const height = compact ? 150 : 300;

  if (!visible) return null;

  return (
    <div className={`absolute ${compact ? 'bottom-2 right-2' : 'top-4 right-4'} bg-background/90 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg`}>
      <div className="text-xs font-medium text-foreground mb-1 px-1">Network Topology</div>
      <svg width={width} height={height} className="overflow-visible">
        {/* Draw links */}
        {links.map(link => {
          const from = nodeMap.get(link.from);
          const to = nodeMap.get(link.to);
          if (!from || !to) return null;

          const utilColor = link.utilizationPercent > 80 
            ? 'hsl(var(--destructive))' 
            : link.utilizationPercent > 50 
              ? 'hsl(var(--warning))' 
              : 'hsl(var(--success))';

          return (
            <g key={link.id}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={link.degraded ? 'hsl(var(--muted-foreground))' : utilColor}
                strokeWidth={Math.max(1, link.bandwidthGbps / 25) * scale}
                strokeDasharray={link.degraded ? '4 2' : undefined}
                opacity={0.7}
              />
              {/* Bandwidth label */}
              <text
                x={(from.x + to.x) / 2}
                y={(from.y + to.y) / 2 - 5}
                fontSize={8 * scale}
                fill="hsl(var(--muted-foreground))"
                textAnchor="middle"
              >
                {link.bandwidthGbps}G
              </text>
            </g>
          );
        })}

        {/* Draw nodes */}
        {nodes.map(node => {
          const pos = nodeMap.get(node.id);
          if (!pos) return null;

          const size = (node.type === 'core-switch' ? 20 : node.type === 'firewall' ? 18 : 14) * scale;

          return (
            <g key={node.id} className="cursor-pointer hover:opacity-80 transition-opacity">
              <circle
                cx={pos.x}
                cy={pos.y}
                r={size / 2}
                fill={NODE_COLORS[node.type]}
                stroke={node.critical ? 'hsl(var(--destructive))' : 'hsl(var(--border))'}
                strokeWidth={node.critical ? 2 : 1}
              />
              <text
                x={pos.x}
                y={pos.y + 3}
                fontSize={size * 0.6}
                fill="white"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {NODE_ICONS[node.type]}
              </text>
              <text
                x={pos.x}
                y={pos.y + size / 2 + 10}
                fontSize={9 * scale}
                fill="hsl(var(--foreground))"
                textAnchor="middle"
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-2 px-1 text-[10px] text-muted-foreground">
        {Object.entries(NODE_ICONS).slice(0, 4).map(([type, icon]) => (
          <div key={type} className="flex items-center gap-1">
            <span>{icon}</span>
            <span className="capitalize">{type.replace('-', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
