import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Database, Zap, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AccordionSection } from "@/components/ui/accordion-section";
import DataHealthKPI from "@/components/connect/DataHealthKPI";
import ZapRunLog from "@/components/connect/ZapRunLog";
import { DCCard, DCSectionHeader } from "@/components/dc-ui/DCCard";
import { DCKPITile } from "@/components/dc-ui/DCKPITile";

const healthMetrics = [
  { source: "Google Drive", health: 98, issues: 0, lastSync: "2 min ago", docs: 3420, status: "healthy" },
  { source: "Zapier: Zendesk", health: 95, issues: 1, lastSync: "8 min ago", docs: 287, status: "healthy" },
  { source: "Website Crawler", health: 88, issues: 3, lastSync: "12 min ago", docs: 1564, status: "warning" },
  { source: "SharePoint", health: 45, issues: 8, lastSync: "2 hours ago", docs: 0, status: "critical" },
  { source: "Zapier: Slack", health: 100, issues: 0, lastSync: "5 min ago", docs: 892, status: "healthy" },
];

export default function ConnectHealth() {
  const { t } = useTranslation();
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
        <div className="flex items-center justify-between">
          <DCSectionHeader
            as="h1"
            title={t("connectHealth.title")}
            subtitle={t("connectHealth.subtitle")}
            icon={<Activity className="h-6 w-6" />}
          />
          <Button variant="outline" onClick={() => navigate("/connect/monitor")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Monitor
          </Button>
        </div>

        {/* Overall Health Card */}
        <DCCard
          title={t("connectHealth.overallHealth")}
          subtitle="Aggregate health score across all data sources"
          icon={<CheckCircle className="h-5 w-5" />}
          status={overallHealth >= 90 ? "operational" : overallHealth >= 70 ? "warning" : "critical"}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="text-right">
              <div className="text-5xl font-bold text-primary">{overallHealth}%</div>
              <div className="flex items-center gap-1 text-success text-sm mt-1">
                <TrendingUp className="h-4 w-4" />
                +2.3% from yesterday
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <DCKPITile
              label="Healthy Sources"
              value={(healthMetrics.length - criticalCount - warningCount).toString()}
              status="normal"
              icon={<CheckCircle className="h-4 w-4" />}
            />
            <DCKPITile
              label="Warnings"
              value={warningCount.toString()}
              status={warningCount > 0 ? "warning" : "normal"}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
            <DCKPITile
              label="Critical Issues"
              value={criticalCount.toString()}
              status={criticalCount > 0 ? "critical" : "normal"}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
          </div>
        </DCCard>

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
              <DCCard 
                key={metric.source} 
                title={metric.source}
                icon={metric.source.includes("Zapier") ? <Zap className="h-5 w-5" /> : <Database className="h-5 w-5" />}
                status={metric.status === "healthy" ? "operational" : metric.status === "warning" ? "warning" : "critical"}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex gap-2">
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
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary mb-1">{metric.health}%</div>
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
              </DCCard>
            ))}
          </div>
        </AccordionSection>

        {/* Zapier Run Log */}
        <ZapRunLog />
      </div>
    </div>
  );
}
