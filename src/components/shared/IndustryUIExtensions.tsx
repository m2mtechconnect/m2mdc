/**
 * Industry UI Extensions
 * Industry-specific UI tiles, badges, and components
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Shield, FileCheck, Building2, Thermometer, Zap, 
  Leaf, Globe, DollarSign, Clock, Server, Network,
  HeartPulse, Factory, Landmark, ShoppingCart, Radio
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

// ============================================================================
// COMPLIANCE BADGES
// ============================================================================

interface ComplianceBadgeProps {
  standard: string;
  status?: "compliant" | "pending" | "non-compliant";
  className?: string;
}

export function ComplianceBadge({ 
  standard, 
  status = "compliant",
  className 
}: ComplianceBadgeProps) {
  const statusStyles = {
    compliant: "bg-success/15 text-success border-success/30",
    pending: "bg-warning/15 text-warning border-warning/30",
    "non-compliant": "bg-destructive/15 text-destructive border-destructive/30",
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(statusStyles[status], className)}
    >
      <Shield className="h-3 w-3 mr-1" />
      {standard}
    </Badge>
  );
}

// Preset compliance badges by industry
export function OSFIBadge() {
  return <ComplianceBadge standard="OSFI B-10" />;
}

export function HIPAABadge() {
  return <ComplianceBadge standard="HIPAA" />;
}

export function PHIPABadge() {
  return <ComplianceBadge standard="PHIPA" />;
}

export function ProtectedBBadge() {
  return <ComplianceBadge standard="Protected B" />;
}

export function ProtectedCBadge() {
  return <ComplianceBadge standard="Protected C" />;
}

export function SOC2Badge() {
  return <ComplianceBadge standard="SOC 2" />;
}

export function ISO27001Badge() {
  return <ComplianceBadge standard="ISO 27001" />;
}

export function PCIDSSBadge() {
  return <ComplianceBadge standard="PCI-DSS" />;
}

// ============================================================================
// INDUSTRY-SPECIFIC KPI TILES
// ============================================================================

interface KpiTileProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  status?: "normal" | "warning" | "critical";
  tooltip?: string;
  className?: string;
}

export function KpiTile({
  title,
  value,
  unit,
  icon: Icon = Zap,
  trend,
  trendValue,
  status = "normal",
  className,
}: KpiTileProps) {
  const statusColors = {
    normal: "text-foreground",
    warning: "text-warning",
    critical: "text-destructive",
  };

  const trendColors = {
    up: "text-success",
    down: "text-destructive",
    stable: "text-muted-foreground",
  };

  return (
    <div className={cn("p-4 rounded-lg bg-muted/50 border", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-xs text-muted-foreground font-medium">{title}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-2xl font-bold", statusColors[status])}>
          {value}
        </span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {trend && trendValue && (
        <div className={cn("text-xs mt-1", trendColors[trend])}>
          {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FINANCE INDUSTRY EXTENSIONS
// ============================================================================

export function FinanceKpiTiles() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KpiTile
        title="Trade Latency"
        value="0.8"
        unit="ms"
        icon={Clock}
        status="normal"
        trend="down"
        trendValue="12% improvement"
      />
      <KpiTile
        title="Sovereignty Score"
        value="98"
        unit="%"
        icon={Shield}
        status="normal"
      />
      <KpiTile
        title="Uptime SLA"
        value="99.999"
        unit="%"
        icon={Server}
        status="normal"
      />
      <KpiTile
        title="OSFI Compliance"
        value="100"
        unit="%"
        icon={FileCheck}
        status="normal"
      />
    </div>
  );
}

// ============================================================================
// HEALTHCARE INDUSTRY EXTENSIONS
// ============================================================================

export function HealthcareKpiTiles() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KpiTile
        title="PHI Ingestion"
        value="2.4"
        unit="TB/day"
        icon={HeartPulse}
        status="normal"
      />
      <KpiTile
        title="HIPAA Compliance"
        value="100"
        unit="%"
        icon={Shield}
        status="normal"
      />
      <KpiTile
        title="Data Residency"
        value="100"
        unit="%"
        icon={Globe}
        status="normal"
      />
      <KpiTile
        title="Uptime"
        value="99.99"
        unit="%"
        icon={Server}
        status="normal"
      />
    </div>
  );
}

// ============================================================================
// GOVERNMENT INDUSTRY EXTENSIONS
// ============================================================================

export function GovernmentKpiTiles() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KpiTile
        title="Protected B/C"
        value="100"
        unit="%"
        icon={Shield}
        status="normal"
      />
      <KpiTile
        title="Canadian Data"
        value="100"
        unit="%"
        icon={Globe}
        status="normal"
      />
      <KpiTile
        title="Security Tier"
        value="IV"
        icon={Building2}
        status="normal"
      />
      <KpiTile
        title="Audit Score"
        value="98"
        unit="%"
        icon={FileCheck}
        status="normal"
      />
    </div>
  );
}

// ============================================================================
// MANUFACTURING INDUSTRY EXTENSIONS
// ============================================================================

export function ManufacturingKpiTiles() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KpiTile
        title="Uptime"
        value="99.95"
        unit="%"
        icon={Factory}
        status="normal"
      />
      <KpiTile
        title="Thermal Load"
        value="78"
        unit="%"
        icon={Thermometer}
        status="normal"
      />
      <KpiTile
        title="Carbon Intensity"
        value="45"
        unit="gCO₂/kWh"
        icon={Leaf}
        status="normal"
      />
      <KpiTile
        title="Power Efficiency"
        value="1.28"
        unit="PUE"
        icon={Zap}
        status="normal"
      />
    </div>
  );
}

// ============================================================================
// RETAIL INDUSTRY EXTENSIONS
// ============================================================================

export function RetailKpiTiles() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KpiTile
        title="Edge Uptime"
        value="99.9"
        unit="%"
        icon={Network}
        status="normal"
      />
      <KpiTile
        title="Cold Chain"
        value="92"
        unit="%"
        icon={Thermometer}
        status="normal"
      />
      <KpiTile
        title="GPU Fleet"
        value="87"
        unit="%"
        icon={Server}
        status="normal"
      />
      <KpiTile
        title="Latency"
        value="12"
        unit="ms"
        icon={Clock}
        status="normal"
      />
    </div>
  );
}

// ============================================================================
// TELECOM INDUSTRY EXTENSIONS
// ============================================================================

export function TelecomKpiTiles() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KpiTile
        title="Network Uptime"
        value="99.999"
        unit="%"
        icon={Radio}
        status="normal"
      />
      <KpiTile
        title="Edge Latency"
        value="5"
        unit="ms"
        icon={Clock}
        status="normal"
      />
      <KpiTile
        title="Throughput"
        value="400"
        unit="Gbps"
        icon={Network}
        status="normal"
      />
      <KpiTile
        title="PUE"
        value="1.35"
        icon={Zap}
        status="normal"
      />
    </div>
  );
}

// ============================================================================
// INDUSTRY SELECTOR
// ============================================================================

const industryComponents: Record<string, React.FC> = {
  finance: FinanceKpiTiles,
  financial_services: FinanceKpiTiles,
  healthcare: HealthcareKpiTiles,
  government: GovernmentKpiTiles,
  public_sector: GovernmentKpiTiles,
  manufacturing: ManufacturingKpiTiles,
  retail: RetailKpiTiles,
  telecom: TelecomKpiTiles,
};

export function IndustryKpiTiles({ industry }: { industry: string }) {
  const Component = industryComponents[industry];
  if (!Component) return null;
  return <Component />;
}

// ============================================================================
// INDUSTRY COMPLIANCE SECTION
// ============================================================================

export function IndustryComplianceBadges({ industry }: { industry: string }) {
  const badgeMap: Record<string, React.ReactNode[]> = {
    finance: [<OSFIBadge key="osfi" />, <SOC2Badge key="soc2" />, <PCIDSSBadge key="pci" />],
    financial_services: [<OSFIBadge key="osfi" />, <SOC2Badge key="soc2" />],
    healthcare: [<HIPAABadge key="hipaa" />, <PHIPABadge key="phipa" />, <SOC2Badge key="soc2" />],
    government: [<ProtectedBBadge key="b" />, <ProtectedCBadge key="c" />, <ISO27001Badge key="iso" />],
    public_sector: [<ProtectedBBadge key="b" />, <ISO27001Badge key="iso" />],
  };

  const badges = badgeMap[industry];
  if (!badges) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {badges}
    </div>
  );
}

// ============================================================================
// SOVEREIGNTY & GREEN BADGES
// ============================================================================

interface SovereigntyBadgeProps {
  level: "Protected A" | "Protected B" | "Protected C" | "Unclassified";
  className?: string;
}

export function SovereigntyBadge({ level, className }: SovereigntyBadgeProps) {
  const levelColors: Record<string, string> = {
    "Protected C": "bg-destructive/15 text-destructive border-destructive/30",
    "Protected B": "bg-warning/15 text-warning border-warning/30",
    "Protected A": "bg-info/15 text-info border-info/30",
    "Unclassified": "bg-muted text-muted-foreground border-muted-foreground/30",
  };

  return (
    <Badge variant="outline" className={cn(levelColors[level] || levelColors["Unclassified"], className)}>
      <Shield className="h-3 w-3 mr-1" />
      {level}
    </Badge>
  );
}

interface GreenBadgeProps {
  renewablePercent: number;
  className?: string;
}

export function GreenBadge({ renewablePercent, className }: GreenBadgeProps) {
  const status = renewablePercent >= 90 ? "excellent" : renewablePercent >= 50 ? "good" : "low";
  const statusColors = {
    excellent: "bg-success/15 text-success border-success/30",
    good: "bg-info/15 text-info border-info/30",
    low: "bg-muted text-muted-foreground border-muted-foreground/30",
  };

  return (
    <Badge variant="outline" className={cn(statusColors[status], className)}>
      <Leaf className="h-3 w-3 mr-1" />
      {renewablePercent}% Renewable
    </Badge>
  );
}

interface TierBadgeProps {
  tier: string;
  className?: string;
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  const tierColors: Record<string, string> = {
    "Tier IV": "bg-primary/15 text-primary border-primary/30",
    "Tier III": "bg-info/15 text-info border-info/30",
    "Tier II": "bg-muted text-muted-foreground border-muted-foreground/30",
  };

  return (
    <Badge variant="outline" className={cn(tierColors[tier] || tierColors["Tier II"], className)}>
      <Building2 className="h-3 w-3 mr-1" />
      {tier}
    </Badge>
  );
}
