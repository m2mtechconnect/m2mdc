import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface CloudProviderCardProps {
  provider: 'aws' | 'azure' | 'gcp';
  data: {
    enabled?: boolean;
    tagline?: string;
    recommended_architecture?: string;
    recommended_services?: string[];
    deployment_pattern?: any;
    deployment_notes?: string;
    learn_more?: string;
  };
}

const providerConfig = {
  aws: {
    name: 'Amazon Web Services (AWS)',
    emoji: '🟧',
    color: 'orange',
    defaultTagline: 'Best for enterprise scale workloads'
  },
  azure: {
    name: 'Microsoft Azure',
    emoji: '🔵',
    color: 'blue',
    defaultTagline: 'Best for Microsoft ecosystem integration'
  },
  gcp: {
    name: 'Google Cloud Platform (GCP)',
    emoji: '🟢',
    color: 'green',
    defaultTagline: 'Best for AI/ML and data analytics workloads'
  }
};

export function CloudProviderCard({ provider, data }: CloudProviderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const config = providerConfig[provider];
  
  if (data.enabled === false) {
    return null;
  }
  
  const handleCopyPattern = () => {
    if (data.deployment_pattern) {
      navigator.clipboard.writeText(JSON.stringify(data.deployment_pattern, null, 2));
      setCopied(true);
      toast.success('Deployment pattern copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const colorClasses = {
    orange: 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900',
    blue: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900',
    green: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
  };
  
  return (
    <Card className={`p-5 ${colorClasses[config.color]}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{config.emoji}</span>
            <div>
              <h3 className="text-lg font-semibold">{config.name}</h3>
              <p className="text-sm text-muted-foreground">
                {data.tagline || config.defaultTagline}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="shrink-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Recommended Architecture */}
        {data.recommended_architecture && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
              Recommended Architecture
            </p>
            <p className="text-sm">{data.recommended_architecture}</p>
          </div>
        )}
        
        {/* Recommended Services */}
        {data.recommended_services && data.recommended_services.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
              Recommended Services
            </p>
            <div className="flex flex-wrap gap-2">
              {data.recommended_services.map((service: string, idx: number) => (
                <Badge key={idx} variant="outline" className="bg-background">
                  {service}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Deployment Pattern Button */}
        {data.deployment_pattern && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyPattern}
            className="w-full"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Deployment Pattern (JSON)
              </>
            )}
          </Button>
        )}
        
        {/* Expandable "Learn More" */}
        {isExpanded && (
          <div className="pt-4 border-t space-y-3 animate-fade-in">
            {data.deployment_notes && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                  Deployment Notes
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {data.deployment_notes}
                </p>
              </div>
            )}
            
            {data.learn_more && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                  Learn More
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {data.learn_more}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
