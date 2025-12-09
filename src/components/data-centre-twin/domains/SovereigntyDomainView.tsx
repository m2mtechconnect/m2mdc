/**
 * Sovereignty & Compliance Domain View
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Globe, Shield, MapPin, CheckCircle, FileText } from 'lucide-react';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

interface SovereigntyDomainViewProps {
  facility: DataCentreFacility;
}

export function SovereigntyDomainView({ facility }: SovereigntyDomainViewProps) {
  const sovereigntyTwin = facility.sovereignty;
  const riskScore = sovereigntyTwin.kpis.sovereigntyRiskScore;
  
  const sovereigntyData = {
    primaryJurisdiction: facility.location.country,
    dataResidency: sovereigntyTwin.kpis.dataFlowViolations === 0 ? 'Compliant' : 'Violations Detected',
    crossBorderFlows: sovereigntyTwin.kpis.crossBorderTransfers,
    complianceFrameworks: ['SOC 2 Type II', 'ISO 27001', 'PIPEDA', 'GDPR-adequate'],
    riskScore,
    dataClassifications: {
      sovereign: Math.round(sovereigntyTwin.kpis.sovereignComputeRatioPct),
      sensitive: Math.round((100 - sovereigntyTwin.kpis.sovereignComputeRatioPct) * 0.7),
      public: Math.round((100 - sovereigntyTwin.kpis.sovereignComputeRatioPct) * 0.3),
    },
  };
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Sovereignty Score"
          value={`${(100 - riskScore).toFixed(0)}%`}
          status={riskScore < 10 ? 'good' : riskScore < 25 ? 'warning' : 'critical'}
          icon={Shield}
        />
        <MetricCard
          title="Data Residency"
          value={sovereigntyData.dataResidency}
          status={sovereigntyTwin.kpis.dataFlowViolations === 0 ? 'good' : 'critical'}
          icon={MapPin}
        />
        <MetricCard
          title="Cross-Border Flows"
          value={`${sovereigntyData.crossBorderFlows}`}
          status={sovereigntyData.crossBorderFlows === 0 ? 'good' : 'warning'}
          icon={Globe}
        />
        <MetricCard
          title="Compliance"
          value={`${sovereigntyData.complianceFrameworks.length} frameworks`}
          status="good"
          icon={FileText}
        />
      </div>

      {/* Sovereignty Radar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Sovereignty Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Jurisdiction Info */}
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-3 mb-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Primary Jurisdiction</p>
                    <p className="text-sm text-muted-foreground">{sovereigntyData.primaryJurisdiction}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Location</span>
                    <span>{facility.location.city}, {facility.location.country}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Legal Entity</span>
                    <span>Canadian Corp</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Data Controller</span>
                    <span>On-premises</span>
                  </div>
                </div>
              </div>
              
              <div className={`p-4 rounded-lg ${sovereigntyTwin.kpis.dataFlowViolations === 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-destructive/10 border-destructive/20'} border`}>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className={`h-5 w-5 ${sovereigntyTwin.kpis.dataFlowViolations === 0 ? 'text-green-500' : 'text-destructive'}`} />
                  <span className={`font-medium ${sovereigntyTwin.kpis.dataFlowViolations === 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {sovereigntyTwin.kpis.dataFlowViolations === 0 ? 'Fully Sovereign' : 'Violations Detected'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {sovereigntyTwin.kpis.dataFlowViolations === 0 
                    ? `All data processing and storage occurs within ${sovereigntyData.primaryJurisdiction} jurisdiction.`
                    : `${sovereigntyTwin.kpis.dataFlowViolations} data flow violations detected.`
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
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      Sovereign Data
                    </span>
                    <span>{sovereigntyData.dataClassifications.sovereign}%</span>
                  </div>
                  <Progress value={sovereigntyData.dataClassifications.sovereign} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      Sensitive Data
                    </span>
                    <span>{sovereigntyData.dataClassifications.sensitive}%</span>
                  </div>
                  <Progress value={sovereigntyData.dataClassifications.sensitive} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      Public Data
                    </span>
                    <span>{sovereigntyData.dataClassifications.public}%</span>
                  </div>
                  <Progress value={sovereigntyData.dataClassifications.public} className="h-2" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Frameworks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compliance Frameworks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {sovereigntyData.complianceFrameworks.map((framework) => (
              <div key={framework} className="p-4 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-sm">{framework}</span>
                </div>
                <Badge variant="default" className="text-xs">Certified</Badge>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Audit Readiness Score: {sovereigntyTwin.kpis.auditReadinessScore.toFixed(0)}%
          </p>
        </CardContent>
      </Card>

      {/* Data Flow Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Flow Monitoring</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative">
              <div className={`w-32 h-32 rounded-full border-4 ${sovereigntyTwin.kpis.dataFlowViolations === 0 ? 'border-green-500' : 'border-destructive'} flex items-center justify-center`}>
                <div className="text-center">
                  <p className={`text-3xl font-bold ${sovereigntyTwin.kpis.dataFlowViolations === 0 ? 'text-green-500' : 'text-destructive'}`}>
                    {sovereigntyTwin.kpis.dataFlowViolations}
                  </p>
                  <p className="text-xs text-muted-foreground">violations</p>
                </div>
              </div>
              <div className="absolute -top-2 -right-2">
                <Badge variant="default" className={sovereigntyTwin.kpis.dataFlowViolations === 0 ? 'bg-green-500' : 'bg-destructive'}>
                  {sovereigntyTwin.kpis.dataFlowViolations === 0 ? 'Clean' : 'Alert'}
                </Badge>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground text-center max-w-md">
              {sovereigntyTwin.dataFlows.length} data flows monitored. 
              {sovereigntyTwin.kpis.dataFlowViolations === 0 
                ? ' All flows comply with configured sovereignty policies.'
                : ' Review and remediate detected violations.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  status: 'good' | 'warning' | 'critical';
  icon: React.ElementType;
}

function MetricCard({ title, value, status, icon: Icon }: MetricCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'good': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-destructive';
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-muted ${getStatusColor()}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={`text-xl font-bold ${getStatusColor()}`}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
