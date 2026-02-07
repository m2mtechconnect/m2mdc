/**
 * KPI Tooltip Component
 * Provides contextual information for KPI tiles
 */

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiTooltipProps {
  children: React.ReactNode;
  title: string;
  description: string;
  unit?: string;
  target?: string | number;
  className?: string;
}

export function KpiTooltip({
  children,
  title,
  description,
  unit,
  target,
  className,
}: KpiTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("cursor-help", className)}>
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent 
        side="top" 
        className="max-w-xs p-3"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">{title}</span>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
          {(unit || target) && (
            <div className="flex gap-4 text-xs pt-1 border-t">
              {unit && (
                <div>
                  <span className="text-muted-foreground">Unit: </span>
                  <span className="text-foreground">{unit}</span>
                </div>
              )}
              {target && (
                <div>
                  <span className="text-muted-foreground">Target: </span>
                  <span className="text-foreground">{target}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// Preset tooltips for common KPIs
export const KPI_TOOLTIPS = {
  pue: {
    title: "Power Usage Effectiveness (PUE)",
    description: "Measures total facility energy divided by IT equipment energy. Lower values indicate better efficiency. Industry average is 1.58; best-in-class is below 1.2.",
    unit: "Ratio",
    target: "< 1.3",
  },
  carbonIntensity: {
    title: "Carbon Intensity",
    description: "Grams of CO₂ equivalent emitted per kilowatt-hour of energy consumed. Depends on grid mix and renewable penetration.",
    unit: "gCO₂/kWh",
    target: "< 100",
  },
  renewableShare: {
    title: "Renewable Energy Share",
    description: "Percentage of energy sourced from renewable generation (solar, wind, hydro). Higher values reduce carbon footprint.",
    unit: "%",
    target: "> 80%",
  },
  sovereignty: {
    title: "Sovereign Compute Ratio",
    description: "Percentage of workloads processed within compliant jurisdictional boundaries. Critical for regulatory compliance.",
    unit: "%",
    target: "> 95%",
  },
  uptime: {
    title: "System Uptime",
    description: "Percentage of time systems are operational and available. Tier IV facilities target 99.995% uptime.",
    unit: "%",
    target: "99.99%",
  },
  gpuUtilization: {
    title: "GPU Fleet Utilization",
    description: "Percentage of GPU compute capacity actively in use. Higher utilization indicates efficient resource allocation.",
    unit: "%",
    target: "> 85%",
  },
  thermalStability: {
    title: "Thermal Stability Index",
    description: "Composite score measuring temperature consistency across racks. Higher values indicate stable thermal conditions.",
    unit: "Index",
    target: "> 90",
  },
  coolingEfficiency: {
    title: "Cooling Efficiency",
    description: "Ratio of cooling capacity to heat load removed. Higher values indicate more efficient cooling systems.",
    unit: "kW/kW",
    target: "> 0.8",
  },
  powerRedundancy: {
    title: "Power Redundancy Level",
    description: "Indicates failover capacity (N+1, 2N, etc.). Higher redundancy ensures continuous operation during failures.",
    unit: "N+",
    target: "2N",
  },
  carbonCostExposure: {
    title: "Carbon Cost Exposure",
    description: "Estimated annual financial liability from carbon pricing, taxes, and credits. Lower values indicate reduced regulatory risk.",
    unit: "USD",
    target: "< $100K",
  },
};

/**
 * Get tooltip props for a KPI by ID
 */
export function getKpiTooltipProps(kpiId: string) {
  const tooltipMap: Record<string, keyof typeof KPI_TOOLTIPS> = {
    'effective-ai-pue': 'pue',
    'pue': 'pue',
    'gco2-per-gpu-hour': 'carbonIntensity',
    'carbon-intensity': 'carbonIntensity',
    'renewable-share': 'renewableShare',
    'sovereign-compute-ratio': 'sovereignty',
    'sovereignty': 'sovereignty',
    'uptime': 'uptime',
    'gpu-utilization': 'gpuUtilization',
    'thermal-stability': 'thermalStability',
    'cooling-efficiency': 'coolingEfficiency',
    'power-redundancy': 'powerRedundancy',
    'carbon-cost-exposure': 'carbonCostExposure',
  };

  const key = tooltipMap[kpiId];
  return key ? KPI_TOOLTIPS[key] : null;
}
