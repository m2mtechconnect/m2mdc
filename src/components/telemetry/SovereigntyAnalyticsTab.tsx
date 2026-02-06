/**
 * Sovereignty Analytics Tab for Telemetry & Analytics page
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Globe, AlertTriangle, CheckCircle, TrendingDown, TrendingUp } from "lucide-react";
import { Line, LineChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell, Pie, PieChart } from 'recharts';
import { useSovereignty } from '@/sovereignty';
import { useNavigate } from 'react-router-dom';
import KpiCard from '@/components/shared/KpiCard';

export function SovereigntyAnalyticsTab() {
  const navigate = useNavigate();
  const {
    sovereigntyScore,
    violationCount,
    crossBorderFlows,
    certifiedFrameworks,
    auditReadinessScore,
    riskLevel,
    result,
  } = useSovereignty();

  // Mock time-series data for sovereignty metrics
  const sovereigntyTrendData = useMemo(() => [
    { date: 'Mon', score: 94, violations: 2, flows: 8 },
    { date: 'Tue', score: 92, violations: 3, flows: 9 },
    { date: 'Wed', score: 95, violations: 1, flows: 7 },
    { date: 'Thu', score: 93, violations: 2, flows: 8 },
    { date: 'Fri', score: sovereigntyScore, violations: violationCount, flows: crossBorderFlows },
    { date: 'Sat', score: 96, violations: 0, flows: 6 },
    { date: 'Sun', score: 97, violations: 0, flows: 5 },
  ], [sovereigntyScore, violationCount, crossBorderFlows]);

  // Violation distribution by severity
  const violationsBySeverity = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    result.violations.forEach(v => {
      counts[v.severity]++;
    });
    return [
      { name: 'Critical', value: counts.critical, color: 'hsl(0, 84%, 60%)' },
      { name: 'High', value: counts.high, color: 'hsl(25, 95%, 53%)' },
      { name: 'Medium', value: counts.medium, color: 'hsl(48, 96%, 53%)' },
      { name: 'Low', value: counts.low, color: 'hsl(142, 76%, 36%)' },
    ].filter(d => d.value > 0);
  }, [result.violations]);

  // Data classification distribution
  const classificationData = useMemo(() => [
    { name: 'Sovereign', value: Math.round(result.dataClassificationDistribution.sovereign), fill: 'hsl(186, 100%, 42%)' },
    { name: 'Sensitive', value: Math.round(result.dataClassificationDistribution.sensitive), fill: 'hsl(48, 96%, 53%)' },
    { name: 'Public', value: Math.round(result.dataClassificationDistribution.public), fill: 'hsl(142, 76%, 36%)' },
  ], [result.dataClassificationDistribution]);

  // Jurisdiction flow data
  const jurisdictionFlowData = useMemo(() => {
    const flows: Record<string, number> = {};
    // Aggregate flows by jurisdiction
    result.violations.forEach(v => {
      if (v.jurisdiction) {
        flows[v.jurisdiction] = (flows[v.jurisdiction] || 0) + 1;
      }
    });
    return Object.entries(flows).map(([jurisdiction, count]) => ({
      jurisdiction,
      violations: count,
    }));
  }, [result.violations]);

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          label="Sovereignty Score"
          value={`${sovereigntyScore}%`}
          change={sovereigntyScore >= 95 ? '+2%' : '-1%'}
          icon={Shield}
          trend={sovereigntyScore >= 95 ? 'up' : 'down'}
          tooltip="Overall data sovereignty compliance score"
          onClick={() => navigate('/data-centre-twin?tab=sovereignty')}
        />
        <KpiCard
          label="Violations"
          value={violationCount.toString()}
          change={violationCount === 0 ? 'None' : `${violationCount} active`}
          icon={AlertTriangle}
          trend={violationCount === 0 ? 'up' : 'down'}
          tooltip="Active sovereignty violations"
        />
        <KpiCard
          label="Cross-Border Flows"
          value={crossBorderFlows.toString()}
          icon={Globe}
          trend="neutral"
          tooltip="Number of cross-jurisdictional data flows"
        />
        <KpiCard
          label="Certified Frameworks"
          value={certifiedFrameworks.toString()}
          change={`of ${result.frameworkSummary.certified + result.frameworkSummary.inProgress + result.frameworkSummary.notApplicable}`}
          icon={CheckCircle}
          trend="up"
          tooltip="Compliance frameworks with active certification"
        />
        <KpiCard
          label="Audit Readiness"
          value={`${auditReadinessScore}%`}
          change={auditReadinessScore >= 90 ? 'Ready' : 'Improving'}
          icon={Shield}
          trend={auditReadinessScore >= 90 ? 'up' : 'neutral'}
          tooltip="Readiness score for compliance audits"
        />
        <KpiCard
          label="Risk Level"
          value={riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
          icon={riskLevel === 'low' ? CheckCircle : AlertTriangle}
          trend={riskLevel === 'low' ? 'up' : riskLevel === 'medium' ? 'neutral' : 'down'}
          tooltip="Current sovereignty risk assessment"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sovereignty Score Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Sovereignty Score Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={sovereigntyTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis domain={[80, 100]} className="text-xs" />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="hsl(186, 100%, 42%)" 
                  strokeWidth={2} 
                  name="Sovereignty Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Violations Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Violations & Cross-Border Flows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sovereigntyTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar dataKey="violations" fill="hsl(0, 84%, 60%)" name="Violations" />
                <Bar dataKey="flows" fill="hsl(200, 90%, 50%)" name="Cross-Border Flows" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Data Classification Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Data Classification Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={classificationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {classificationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {classificationData.map(item => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="font-mono text-sm font-semibold">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Frameworks Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Compliance Frameworks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">Certified</span>
                  <Badge variant="default" className="bg-green-500">{result.frameworkSummary.certified}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">In Progress</span>
                  <Badge variant="secondary">{result.frameworkSummary.inProgress}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">Expired</span>
                  <Badge variant="destructive">{result.frameworkSummary.expired}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">Not Applicable</span>
                  <Badge variant="outline">{result.frameworkSummary.notApplicable}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Row */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Full Sovereignty Analysis</p>
                <p className="text-sm text-muted-foreground">
                  View detailed sovereignty dashboard with data flows and policies
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/compliance')}>
                View Audit Page
              </Button>
              <Button onClick={() => navigate('/data-centre-twin?tab=sovereignty')}>
                Open Sovereignty Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
