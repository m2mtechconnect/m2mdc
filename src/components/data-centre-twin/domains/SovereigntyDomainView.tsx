/**
 * Sovereignty & Compliance Domain View
 * Powered by the Sovereignty Engine
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Globe, 
  Shield, 
  MapPin, 
  CheckCircle, 
  FileText, 
  AlertTriangle,
  ArrowRight,
  XCircle,
  Clock,
  Filter,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSovereignty, getJurisdictionDisplayName } from '@/sovereignty';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import { SummaryCard } from '@/components/shared/SummaryCard';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

import { DomainProvenanceHeader } from '@/components/provenance/DomainProvenanceHeader';

interface SovereigntyDomainViewProps {
  facility: DataCentreFacility;
}

type FrameworkStatus = 'all' | 'certified' | 'in_progress' | 'not_applicable';

export function SovereigntyDomainView({ facility }: SovereigntyDomainViewProps) {
  const [frameworkFilter, setFrameworkFilter] = useState<FrameworkStatus>('all');
  const navigate = useNavigate();
  const {
    result,
    frameworks,
    flows,
    sovereigntyScore,
    violationCount,
    crossBorderFlows,
    certifiedFrameworks,
    auditReadinessScore,
    riskLevel,
  } = useSovereignty({ primaryJurisdiction: 'CA-QC' });
  
  const filteredFrameworks = frameworks.filter(f => {
    if (frameworkFilter === 'all') return true;
    return f.status === frameworkFilter;
  });
  
  const frameworkCounts = {
    all: frameworks.length,
    certified: frameworks.filter(f => f.status === 'certified').length,
    in_progress: frameworks.filter(f => f.status === 'in_progress').length,
    not_applicable: frameworks.filter(f => f.status === 'not_applicable').length,
  };
  
  return (
    <div className="space-y-6" data-provenance="unavailable" data-testid="sovereignty-domain-view">
      <DomainProvenanceHeader provenance="unavailable" sourceName="not-assessed" ariaContext="Sovereignty domain data provenance" />
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          title="Sovereignty Score"
          value={`${sovereigntyScore}%`}
          status={sovereigntyScore >= 90 ? 'good' : sovereigntyScore >= 70 ? 'warning' : 'critical'}
          icon={Shield}
        />
        <SummaryCard
          title="Data Residency"
          value={violationCount === 0 ? 'Compliant' : `${violationCount} Issues`}
          status={violationCount === 0 ? 'good' : 'critical'}
          icon={MapPin}
        />
        <SummaryCard
          title="Cross-Border Flows"
          value={`${crossBorderFlows}`}
          status={crossBorderFlows === 0 ? 'good' : 'warning'}
          icon={Globe}
        />
        <SummaryCard
          title="Compliance"
          value={`${certifiedFrameworks} certified`}
          status={certifiedFrameworks >= 3 ? 'good' : 'warning'}
          icon={FileText}
        />
      </div>

      {/* Sovereignty Radar */}
      <CollapsibleSection title="Data Sovereignty Status">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Jurisdiction Info */}
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-3 mb-3">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Primary Jurisdiction</p>
                  <p className="text-sm text-muted-foreground">
                    {getJurisdictionDisplayName('CA-QC')}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Location</span>
                  <span>{facility.location.city}, {facility.location.country}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Legal Entity</span>
                  <span>DataCentre Québec Inc.</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Data Controller</span>
                  <span>On-premises</span>
                </div>
              </div>
            </div>
            
            <div className={`p-4 rounded-lg ${violationCount === 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-destructive/10 border-destructive/20'} border`}>
              <div className="flex items-center gap-2 mb-2">
                {violationCount === 0 ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                )}
                <span className={`font-medium ${violationCount === 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {violationCount === 0 ? 'Fully Sovereign' : 'Violations Detected'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {violationCount === 0 
                  ? 'All data processing and storage occurs within Canadian jurisdiction.'
                  : `${violationCount} data flow violations detected. Review and remediate.`
                }
              </p>
            </div>
          </div>
          
          {/* Data Classification */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Data Classification Distribution</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    Sovereign Data
                  </span>
                  <span>{result.dataClassificationDistribution.sovereign}%</span>
                </div>
                <Progress value={result.dataClassificationDistribution.sovereign} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    Sensitive Data
                  </span>
                  <span>{result.dataClassificationDistribution.sensitive}%</span>
                </div>
                <Progress value={result.dataClassificationDistribution.sensitive} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    Public Data
                  </span>
                  <span>{result.dataClassificationDistribution.public}%</span>
                </div>
                <Progress value={result.dataClassificationDistribution.public} className="h-2" />
              </div>
            </div>
            
            {/* Audit Readiness */}
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Audit Readiness</span>
                <span className="text-sm font-bold">{auditReadinessScore}%</span>
              </div>
              <Progress value={auditReadinessScore} className="h-2" />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Compliance Frameworks */}
      <CollapsibleSection 
        title="Compliance Frameworks" 
        badge={`${result.frameworkSummary.certified} of ${frameworks.length} certified`}
      >
        {/* Filters */}
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Status:</span>
            <div className="flex gap-1 flex-wrap">
              {[
                { key: 'all' as const, label: 'All', color: '' },
                { key: 'certified' as const, label: 'Certified', color: 'border-emerald-500/30 text-emerald-500' },
                { key: 'in_progress' as const, label: 'In Progress', color: 'border-amber-500/30 text-amber-500' },
                { key: 'not_applicable' as const, label: 'N/A', color: '' },
              ].map(({ key, label, color }) => (
                <Button
                  key={key}
                  variant={frameworkFilter === key ? 'default' : 'outline'}
                  size="sm"
                  className={`h-7 text-xs ${frameworkFilter !== key && color ? color : ''}`}
                  onClick={() => setFrameworkFilter(key)}
                >
                  {label}
                  <span className="ml-1 opacity-70">({frameworkCounts[key]})</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        {filteredFrameworks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No frameworks match the current filter
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {filteredFrameworks.map((framework) => (
              <div key={framework.id} className="p-4 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-2 mb-2">
                  {framework.status === 'certified' ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : framework.status === 'in_progress' ? (
                    <Clock className="h-4 w-4 text-amber-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium text-sm">{framework.name}</span>
                </div>
                <Badge 
                  variant={framework.status === 'certified' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {framework.status === 'certified' ? 'Certified' : 
                   framework.status === 'in_progress' ? 'In Progress' : 'N/A'}
                </Badge>
                {framework.auditReadinessScore > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Readiness: {framework.auditReadinessScore}%
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Data Flow Monitoring */}
      <CollapsibleSection 
        title="Data Flow Monitoring"
        headerExtra={
          <Button 
            variant="outline" 
            size="sm"
            onClick={(e) => { e.stopPropagation(); navigate('/compliance'); }}
          >
            View Audit Log
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          {/* Violation Circle */}
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative">
              <div className={`w-28 h-28 rounded-full border-4 ${violationCount === 0 ? 'border-emerald-500' : 'border-destructive'} flex items-center justify-center`}>
                <div className="text-center">
                  <p className={`text-3xl font-bold ${violationCount === 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                    {violationCount}
                  </p>
                  <p className="text-xs text-muted-foreground">violations</p>
                </div>
              </div>
              <div className="absolute -top-2 -right-2">
                <Badge variant="default" className={violationCount === 0 ? 'bg-emerald-500' : 'bg-destructive'}>
                  {violationCount === 0 ? 'Clean' : 'Alert'}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Flow Stats */}
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/30 border">
              <p className="text-xs text-muted-foreground">Monitored Flows</p>
              <p className="text-xl font-bold">{result.monitoredFlowCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border">
              <p className="text-xs text-muted-foreground">Cross-Border</p>
              <p className="text-xl font-bold">{crossBorderFlows}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border">
              <p className="text-xs text-muted-foreground">Blocked</p>
              <p className="text-xl font-bold">{result.blockedFlowCount}</p>
            </div>
          </div>
          
          {/* Recent Flows */}
          <div className="space-y-2">
            <p className="text-sm font-medium mb-3">Recent Data Flows</p>
            {flows.slice(0, 4).map((flow) => (
              <div key={flow.id} className="flex items-center justify-between p-2 rounded bg-muted/30 text-xs">
                <span className="truncate flex-1">{flow.name}</span>
                <Badge 
                  variant={flow.status === 'active' ? 'default' : 'secondary'}
                  className="text-[10px] ml-2"
                >
                  {flow.isCrossBorder ? 'X-Border' : 'Local'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
