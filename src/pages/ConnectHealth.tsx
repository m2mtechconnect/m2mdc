import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Database, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SectionHeader } from "@/components/ui/section-header";
import { AccordionSection } from "@/components/ui/accordion-section";
import DataHealthKPI from "@/components/connect/DataHealthKPI";
import ZapRunLog from "@/components/connect/ZapRunLog";

const healthMetrics = [
  { source: "Google Drive", health: 98, issues: 0, lastSync: "2 min ago", docs: 3420, status: "healthy" },
  { source: "Zapier: Zendesk", health: 95, issues: 1, lastSync: "8 min ago", docs: 287, status: "healthy" },
  { source: "Website Crawler", health: 88, issues: 3, lastSync: "12 min ago", docs: 1564, status: "warning" },
  { source: "SharePoint", health: 45, issues: 8, lastSync: "2 hours ago", docs: 0, status: "critical" },
  { source: "Zapier: Slack", health: 100, issues: 0, lastSync: "5 min ago", docs: 892, status: "healthy" },
];

export default function ConnectHealth() {
  const navigate = useNavigate();

  const overallHealth = healthMetrics.length > 0 
    ? Math.round(healthMetrics.reduce((sum, m) => sum + m.health, 0) / healthMetrics.length)
    : 0;

  const criticalCount = healthMetrics.filter(m => m.status === "critical").length;
  const warningCount = healthMetrics.filter(m => m.status === "warning").length;

  return (
    <div className="min-h-screen bg-background section-padding-lg">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <SectionHeader
          title="Data Health"
          description="Monitor quality, freshness, and issues across all data sources."
          action={{
            label: "Back to Monitor",
            onClick: () => navigate("/connect/monitor"),
            variant: "outline"
          }}
        />

        {/* Overall Health Card */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-2 border-primary/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">Overall System Health</h2>
              <p className="text-muted-foreground">Aggregate health score across all data sources</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold gradient-text">{overallHealth}%</div>
              <div className="flex items-center gap-1 text-primary text-sm mt-1">
                <TrendingUp className="h-4 w-4" />
                +2.3% from yesterday
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-card rounded-lg">
              <CheckCircle className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{healthMetrics.length - criticalCount - warningCount}</div>
                <div className="text-xs text-muted-foreground">Healthy Sources</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-card rounded-lg">
              <AlertTriangle className="h-8 w-8 text-secondary" />
              <div>
                <div className="text-2xl font-bold">{warningCount}</div>
                <div className="text-xs text-muted-foreground">Warnings</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-card rounded-lg">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div>
                <div className="text-2xl font-bold">{criticalCount}</div>
                <div className="text-xs text-muted-foreground">Critical Issues</div>
              </div>
            </div>
          </div>
        </Card>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DataHealthKPI
            label="Avg Processing Time"
            value="2.1s"
            change="-0.3s"
            trend="up"
          />
          <DataHealthKPI
            label="Success Rate"
            value="96.8%"
            change="+1.2%"
            trend="up"
          />
          <DataHealthKPI
            label="Data Freshness"
            value="94%"
            change="+3%"
            trend="up"
          />
          <DataHealthKPI
            label="Failed Jobs (24h)"
            value="12"
            change="+4"
            trend="down"
          />
        </div>

        {/* Source Health Details */}
        <AccordionSection
          title="Source Health Details"
          subtitle="Detailed metrics for each data source"
          defaultCollapsed={false}
          variant="default"
        >
          <div className="space-y-3">
            {healthMetrics.map((metric) => (
              <Card key={metric.source} className="section-padding">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center card-gap">
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                      metric.source.includes("Zapier") ? "bg-primary/10" : "bg-secondary/10"
                    }`}>
                      {metric.source.includes("Zapier") ? (
                        <Zap className="h-6 w-6 text-primary" />
                      ) : (
                        <Database className="h-6 w-6 text-secondary" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-h3">{metric.source}</h3>
                      <div className="flex gap-2 mt-1">
                        <Badge variant={
                          metric.status === "healthy" ? "outline" :
                          metric.status === "warning" ? "secondary" : "destructive"
                        } className="text-caption">
                          {metric.status}
                        </Badge>
                        <span className="text-caption text-muted-foreground">
                          {metric.docs.toLocaleString()} docs
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-h1 gradient-text mb-1">{metric.health}%</div>
                    <div className="text-caption text-muted-foreground">Health Score</div>
                  </div>
                </div>
                <Progress value={metric.health} className="mb-3" />
                <div className="flex items-center justify-between text-caption">
                  <div className="text-muted-foreground">
                    Last sync: {metric.lastSync}
                  </div>
                  {metric.issues > 0 && (
                    <div className="flex items-center gap-1 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      {metric.issues} issue{metric.issues > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </AccordionSection>

        {/* Zapier Run Log */}
        <ZapRunLog />
      </div>
    </div>
  );
}
