/**
 * Role-Adaptive Dashboard Sections
 * 
 * Renders role-specific dashboard sections based on the user's role.
 * Each section is a self-contained card that shows relevant data.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp, DollarSign, Shield, Users, Activity, Server,
  Clock, UserCheck, FileCheck, Lock, Globe, AlertTriangle,
  Eye, Gauge, ArrowUpRight, CheckCircle, Cpu, Thermometer,
  Zap, Leaf,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { RoleDashboardSection } from '@/config/roleDashboardConfig';

// ─── EXECUTIVE SECTIONS ──────────────────────────────────────────

function StrategicOverview() {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Strategic Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Quarterly Revenue Impact</p>
            <p className="text-xl font-bold">$2.4M</p>
            <p className="text-xs text-success mt-1">↑ 18% vs last quarter</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Operational Efficiency</p>
            <p className="text-xl font-bold">94.2%</p>
            <p className="text-xs text-success mt-1">↑ 3.1% improvement</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => navigate('/intelligence')}>
          View Full Analytics <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

function FinancialSummary() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Financial Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {[
          { label: 'Energy Cost Reduction', value: '$48K/mo', progress: 72 },
          { label: 'Infrastructure ROI', value: '247%', progress: 85 },
          { label: 'Carbon Credit Value', value: '$12K', progress: 34 },
        ].map((item) => (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium">{item.value}</span>
            </div>
            <Progress value={item.progress} className="h-1.5" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CompliancePosture() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Compliance Posture
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[
            { framework: 'SOC 2 Type II', status: 'Compliant', color: 'bg-success/10 text-success' },
            { framework: 'PIPEDA', status: 'Compliant', color: 'bg-success/10 text-success' },
            { framework: 'ISO 27001', status: 'Review Due', color: 'bg-warning/10 text-warning' },
            { framework: 'Data Sovereignty', status: '98% compliant', color: 'bg-success/10 text-success' },
          ].map((item) => (
            <div key={item.framework} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
              <span className="text-sm font-medium">{item.framework}</span>
              <Badge variant="outline" className={`text-xs ${item.color}`}>{item.status}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TeamPerformance() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Team Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">8</p>
            <p className="text-xs text-muted-foreground">Active Users</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">142</p>
            <p className="text-xs text-muted-foreground">Tasks Completed</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">96%</p>
            <p className="text-xs text-muted-foreground">SLA Met</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── MANAGER SECTIONS ────────────────────────────────────────────

function OperationsOverview() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Operations Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-success/5 border border-success/20">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-3.5 w-3.5 text-success" />
              <span className="text-xs text-muted-foreground">Healthy</span>
            </div>
            <p className="text-xl font-bold">10</p>
          </div>
          <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
              <span className="text-xs text-muted-foreground">Warnings</span>
            </div>
            <p className="text-xl font-bold">2</p>
          </div>
        </div>
        <div className="mt-3 p-3 rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">System Uptime (30d)</p>
          <p className="text-lg font-bold">99.97%</p>
          <Progress value={99.97} className="h-1.5 mt-1" />
        </div>
      </CardContent>
    </Card>
  );
}

function AgentPerformance() {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Server className="h-4 w-4 text-primary" />
          Agent Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {[
          { name: 'Thermal Agent', status: 'Running', successRate: '98%' },
          { name: 'Power Agent', status: 'Running', successRate: '96%' },
          { name: 'Cooling Agent', status: 'Idle', successRate: '94%' },
        ].map((agent) => (
          <div key={agent.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${agent.status === 'Running' ? 'bg-success' : 'bg-muted-foreground'}`} />
              <span className="text-sm font-medium">{agent.name}</span>
            </div>
            <span className="text-xs text-muted-foreground">{agent.successRate} success</span>
          </div>
        ))}
        <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => navigate('/app/agents')}>
          View All Agents <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

function TeamActivity() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Team Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[
            { user: 'Sarah Chen', action: 'Deployed Thermal Agent v2.1', time: '12 min ago' },
            { user: 'James Park', action: 'Updated cooling thresholds', time: '1 hour ago' },
            { user: 'Maria Lopez', action: 'Approved user access request', time: '2 hours ago' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {item.user.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.user}</p>
                <p className="text-xs text-muted-foreground">{item.action}</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ApprovalQueue() {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-primary" />
          Approval Queue
          <Badge variant="destructive" className="ml-auto text-xs">3 pending</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[
            { name: 'Alex Thompson', email: 'alex@example.com', time: '2h ago' },
            { name: 'Diana Ross', email: 'diana@example.com', time: '5h ago' },
            { name: 'Kevin Wu', email: 'kevin@example.com', time: '1d ago' },
          ].map((user, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
              <div>
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <span className="text-xs text-muted-foreground">{user.time}</span>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="w-full mt-3 gap-2" onClick={() => navigate('/admin/signups-dashboard')}>
          Manage Approvals <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── ENGINEER SECTIONS (existing dashboard sections, re-wrapped) ─

function TwinPreview() {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Live Twin Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-32 bg-muted/30 rounded-lg flex items-center justify-center border border-dashed border-border">
          <div className="text-center">
            <Activity className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">3D Twin visualization active</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full mt-3 gap-2" onClick={() => navigate('/data-centre-twin')}>
          Open Full Dashboard <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

function DCKpis() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          Data Centre KPIs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'PUE', value: '1.38', icon: Zap, color: 'text-success' },
            { label: 'GPU Load', value: '23%', icon: Cpu, color: 'text-primary' },
            { label: 'Thermal', value: '94%', icon: Thermometer, color: 'text-info' },
            { label: 'Carbon', value: '-34%', icon: Leaf, color: 'text-success' },
          ].map((kpi) => (
            <div key={kpi.label} className="p-3 rounded-lg bg-muted/30 flex items-center gap-3">
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-sm font-bold">{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AgentWorkspace() {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Server className="h-4 w-4 text-primary" />
          Quick Agent Access
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {['Thermal', 'Power', 'Cooling', 'Network'].map((name) => (
            <Button key={name} variant="outline" size="sm" className="justify-start gap-2" onClick={() => navigate('/app/agents')}>
              <Server className="h-3.5 w-3.5" />
              {name}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SimulationLauncher() {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Simulation Launcher
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          Run what-if scenarios on your data centre twin with 15+ preset scenarios.
        </p>
        <Button size="sm" className="w-full gap-2" onClick={() => navigate('/data-centre-twin/default?view=simulation&demo=true')}>
          <Activity className="h-3.5 w-3.5" />
          Launch Simulation
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── SECURITY ADMIN SECTIONS ─────────────────────────────────────

function SecurityPosture() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Security Posture
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <div className="h-20 w-20 rounded-full border-4 border-success flex items-center justify-center">
            <span className="text-2xl font-bold">94</span>
          </div>
          <div>
            <p className="text-sm font-medium">Overall Score</p>
            <p className="text-xs text-muted-foreground">+2.1% from last assessment</p>
            <Badge variant="outline" className="mt-1 text-xs bg-success/10 text-success">Good</Badge>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { label: 'Network Security', value: 97 },
            { label: 'Data Protection', value: 94 },
            { label: 'Access Control', value: 91 },
            { label: 'Incident Response', value: 89 },
          ].map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">{item.value}%</span>
              </div>
              <Progress value={item.value} className="h-1" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AuditLogs() {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-primary" />
          Recent Audit Logs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[
            { action: 'Role changed', detail: 'User james@co → Manager', severity: 'info', time: '12m ago' },
            { action: 'Failed login attempt', detail: '3 attempts from 192.168.1.x', severity: 'warning', time: '1h ago' },
            { action: 'Policy updated', detail: 'Data retention policy v2.1', severity: 'info', time: '3h ago' },
            { action: 'Access revoked', detail: 'User temp-contractor@co', severity: 'critical', time: '6h ago' },
          ].map((log, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
              <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                log.severity === 'critical' ? 'bg-destructive' : log.severity === 'warning' ? 'bg-warning' : 'bg-info'
              }`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{log.action}</p>
                  <span className="text-xs text-muted-foreground">{log.time}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{log.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="w-full mt-3 gap-2" onClick={() => navigate('/compliance')}>
          View All Logs <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

function AccessControl() {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          Access Control
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-lg font-bold">4</p>
            <p className="text-xs text-muted-foreground">Roles Defined</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-lg font-bold">5</p>
            <p className="text-xs text-muted-foreground">Reviews Due</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => navigate('/teams')}>
          Manage Access <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

function SovereigntyStatus() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Data Sovereignty
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2 rounded-lg bg-success/5 border border-success/20">
            <span className="text-sm">Canadian Data Residency</span>
            <Badge variant="outline" className="bg-success/10 text-success text-xs">98%</Badge>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-success/5 border border-success/20">
            <span className="text-sm">PIPEDA Compliance</span>
            <Badge variant="outline" className="bg-success/10 text-success text-xs">Compliant</Badge>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-warning/5 border border-warning/20">
            <span className="text-sm">Cross-border Transfers</span>
            <Badge variant="outline" className="bg-warning/10 text-warning text-xs">2 flagged</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECTION RENDERER
// ═══════════════════════════════════════════════════════════════════

const sectionComponents: Record<string, React.FC> = {
  // Executive
  StrategicOverview,
  FinancialSummary,
  CompliancePosture,
  TeamPerformance,
  // Manager
  OperationsOverview,
  AgentPerformance,
  TeamActivity,
  ApprovalQueue,
  // Engineer
  TwinPreview,
  DCKpis,
  AgentWorkspace,
  SimulationLauncher,
  // Security Admin
  SecurityPosture,
  AuditLogs,
  AccessControl,
  SovereigntyStatus,
};

interface AdaptiveSectionsProps {
  sections: RoleDashboardSection[];
}

export function AdaptiveDashboardSections({ sections }: AdaptiveSectionsProps) {
  const sortedSections = [...sections].sort((a, b) => a.priority - b.priority);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sortedSections.map((section) => {
        const Component = sectionComponents[section.component];
        if (!Component) return null;
        return <Component key={section.id} />;
      })}
    </div>
  );
}
