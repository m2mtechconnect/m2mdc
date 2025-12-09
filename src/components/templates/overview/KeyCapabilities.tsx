import { Card } from '@/components/ui/card';
import { 
  Zap, Shield, TrendingUp, Users, Clock, Target,
  Bell, BarChart, Settings, CheckCircle
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface KeyCapabilitiesProps {
  capabilities: string[];
}

// Auto-assign icons based on capability content
function getCapabilityIcon(capability: string): LucideIcon {
  const lowerCap = capability.toLowerCase();
  
  if (lowerCap.includes('monitor') || lowerCap.includes('track')) {
    return BarChart;
  } else if (lowerCap.includes('alert') || lowerCap.includes('notify')) {
    return Bell;
  } else if (lowerCap.includes('simulate') || lowerCap.includes('predict')) {
    return TrendingUp;
  } else if (lowerCap.includes('optimize') || lowerCap.includes('improve')) {
    return Target;
  } else if (lowerCap.includes('automate') || lowerCap.includes('workflow')) {
    return Zap;
  } else if (lowerCap.includes('security') || lowerCap.includes('compliance')) {
    return Shield;
  } else if (lowerCap.includes('time') || lowerCap.includes('schedule')) {
    return Clock;
  } else if (lowerCap.includes('team') || lowerCap.includes('collaboration')) {
    return Users;
  } else if (lowerCap.includes('configure') || lowerCap.includes('settings')) {
    return Settings;
  } else {
    return CheckCircle;
  }
}

export function KeyCapabilities({ capabilities }: KeyCapabilitiesProps) {
  if (!capabilities || capabilities.length === 0) {
    return null;
  }
  
  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold mb-4">Key Capabilities</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {capabilities.map((capability: string, idx: number) => {
          const Icon = getCapabilityIcon(capability);
          return (
            <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm leading-relaxed flex-1">{capability}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
