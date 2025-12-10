/**
 * Deploy Readiness Checks Component
 * Validates Carbon + Financial engine configuration before deployment
 */

import { useMemo } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Leaf, DollarSign, MapPin, Activity, Zap } from 'lucide-react';
import { DCCard } from '@/components/dc-ui/DCCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CarbonEngine, REGIONAL_CARBON_INTENSITY, type RegionCode } from '@/engines/carbon';
import { FinancialEngine, DEFAULT_FINANCIAL_ASSUMPTIONS } from '@/engines/financial';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

interface ReadinessCheck {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  severity: 'error' | 'warning' | 'info';
  domain: 'carbon' | 'financial' | 'general';
  icon: React.ReactNode;
}

interface DeployReadinessChecksProps {
  facility?: DataCentreFacility;
  onFixIssue?: (checkId: string) => void;
}

export function DeployReadinessChecks({ facility, onFixIssue }: DeployReadinessChecksProps) {
  const checks = useMemo<ReadinessCheck[]>(() => {
    const results: ReadinessCheck[] = [];
    
    // Default values for mock evaluation
    const region = (facility?.region as RegionCode) || 'CA-QC';
    const regionalFeed = REGIONAL_CARBON_INTENSITY[region];
    const pue = facility?.pue || 1.2;
    const powerKwh = facility?.currentPowerDrawKw || 8500;
    const activeGpuCount = facility?.workloadGpu?.kpis?.activeGpuCount || 384;

    // Carbon Model Checks
    // Check 1: Carbon intensity feed available
    results.push({
      id: 'carbon_feed',
      label: 'Carbon Intensity Feed',
      status: regionalFeed ? 'pass' : 'fail',
      message: regionalFeed 
        ? `${region} feed active: ${regionalFeed.carbonIntensityGPerKwh} gCO₂/kWh`
        : 'No regional carbon intensity data configured',
      severity: regionalFeed ? 'info' : 'error',
      domain: 'carbon',
      icon: <MapPin className="h-4 w-4" />,
    });

    // Check 2: Carbon model evaluates correctly
    try {
      const carbonInput = {
        pue,
        powerKwh,
        carbonIntensityGPerKwh: regionalFeed?.carbonIntensityGPerKwh || 50,
        renewableMixPct: regionalFeed?.renewablePercentage || 50,
        activeGpuCount,
      };
      const carbonMetrics = CarbonEngine.evaluate(carbonInput);
      
      results.push({
        id: 'carbon_model',
        label: 'Carbon Model Valid',
        status: carbonMetrics.carbonEfficiencyScore >= 0 ? 'pass' : 'warning',
        message: `Efficiency score: ${carbonMetrics.carbonEfficiencyScore.toFixed(0)}/100`,
        severity: 'info',
        domain: 'carbon',
        icon: <Leaf className="h-4 w-4" />,
      });

      // Check 3: Emissions within acceptable range
      const annualEmissions = carbonMetrics.projectedAnnualEmissionsTons;
      results.push({
        id: 'emissions_threshold',
        label: 'Emissions Threshold',
        status: annualEmissions < 10000 ? 'pass' : annualEmissions < 50000 ? 'warning' : 'fail',
        message: `Projected: ${annualEmissions.toFixed(0)} tons CO₂/year`,
        severity: annualEmissions < 10000 ? 'info' : annualEmissions < 50000 ? 'warning' : 'error',
        domain: 'carbon',
        icon: <Activity className="h-4 w-4" />,
      });
    } catch (e) {
      results.push({
        id: 'carbon_model',
        label: 'Carbon Model Valid',
        status: 'fail',
        message: 'Carbon engine evaluation failed',
        severity: 'error',
        domain: 'carbon',
        icon: <Leaf className="h-4 w-4" />,
      });
    }

    // Financial Model Checks
    // Check 4: Financial assumptions configured
    const hasFinancialConfig = facility?.costPerKwh && facility.costPerKwh > 0;
    results.push({
      id: 'financial_config',
      label: 'Financial Assumptions',
      status: hasFinancialConfig ? 'pass' : 'warning',
      message: hasFinancialConfig 
        ? `Electricity: $${facility.costPerKwh?.toFixed(3)}/kWh`
        : 'Using default financial assumptions',
      severity: hasFinancialConfig ? 'info' : 'warning',
      domain: 'financial',
      icon: <DollarSign className="h-4 w-4" />,
    });

    // Check 5: Financial model evaluates correctly
    try {
      const financialInput = {
        powerKwh,
        pue,
        activeGpuCount,
        gpuHoursPerDay: activeGpuCount * 24 * 0.8,
        hourlyEmissionsKg: 50,
        assumptions: {
          ...DEFAULT_FINANCIAL_ASSUMPTIONS,
          electricityCostPerKwh: facility?.costPerKwh || DEFAULT_FINANCIAL_ASSUMPTIONS.electricityCostPerKwh,
        },
        capexTotal: 500_000_000,
        expectedRevenuePerYear: 150_000_000,
      };
      const financialMetrics = FinancialEngine.evaluate(financialInput);
      
      // Check 6: Cost per GPU-hour threshold
      results.push({
        id: 'cost_per_gpu_hour',
        label: 'Cost per GPU-Hour',
        status: financialMetrics.costPerGpuHour < 3.0 ? 'pass' : financialMetrics.costPerGpuHour < 5.0 ? 'warning' : 'fail',
        message: `$${financialMetrics.costPerGpuHour.toFixed(2)}/GPU-hour`,
        severity: financialMetrics.costPerGpuHour < 3.0 ? 'info' : financialMetrics.costPerGpuHour < 5.0 ? 'warning' : 'error',
        domain: 'financial',
        icon: <Zap className="h-4 w-4" />,
      });

      // Check 7: ROI within acceptable range
      results.push({
        id: 'roi_years',
        label: 'ROI Timeline',
        status: financialMetrics.roiYears <= 5 ? 'pass' : financialMetrics.roiYears <= 8 ? 'warning' : 'fail',
        message: `${financialMetrics.roiYears.toFixed(1)} years to ROI`,
        severity: financialMetrics.roiYears <= 5 ? 'info' : financialMetrics.roiYears <= 8 ? 'warning' : 'error',
        domain: 'financial',
        icon: <Activity className="h-4 w-4" />,
      });

      // Check 8: Financial health score
      results.push({
        id: 'financial_health',
        label: 'Financial Health Score',
        status: financialMetrics.financialHealthScore >= 70 ? 'pass' : financialMetrics.financialHealthScore >= 50 ? 'warning' : 'fail',
        message: `Score: ${financialMetrics.financialHealthScore.toFixed(0)}/100`,
        severity: financialMetrics.financialHealthScore >= 70 ? 'info' : financialMetrics.financialHealthScore >= 50 ? 'warning' : 'error',
        domain: 'financial',
        icon: <DollarSign className="h-4 w-4" />,
      });
    } catch (e) {
      results.push({
        id: 'financial_model',
        label: 'Financial Model Valid',
        status: 'fail',
        message: 'Financial engine evaluation failed',
        severity: 'error',
        domain: 'financial',
        icon: <DollarSign className="h-4 w-4" />,
      });
    }

    return results;
  }, [facility]);

  const passCount = checks.filter(c => c.status === 'pass').length;
  const warningCount = checks.filter(c => c.status === 'warning').length;
  const failCount = checks.filter(c => c.status === 'fail').length;
  const overallStatus = failCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'normal';

  const getStatusIcon = (status: 'pass' | 'fail' | 'warning') => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="h-4 w-4 text-dc-success" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-dc-critical" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-dc-warning" />;
    }
  };

  return (
    <DCCard
      title="Carbon & Financial Readiness"
      subtitle="Pre-deployment validation checks"
      icon={<Activity className="h-4 w-4" />}
      status={overallStatus}
    >
      <div className="space-y-4">
        {/* Summary Badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge className="bg-dc-success/10 text-dc-success border-dc-success/30">
            {passCount} Passed
          </Badge>
          {warningCount > 0 && (
            <Badge className="bg-dc-warning/10 text-dc-warning border-dc-warning/30">
              {warningCount} Warnings
            </Badge>
          )}
          {failCount > 0 && (
            <Badge className="bg-dc-critical/10 text-dc-critical border-dc-critical/30">
              {failCount} Failed
            </Badge>
          )}
        </div>

        {/* Carbon Checks */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Leaf className="h-3 w-3 text-dc-success" />
            Carbon Model
          </h4>
          {checks.filter(c => c.domain === 'carbon').map(check => (
            <div 
              key={check.id}
              className="flex items-center justify-between p-2 rounded-lg bg-dc-surface border border-dc-border"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(check.status)}
                <div>
                  <p className="text-sm font-medium">{check.label}</p>
                  <p className="text-xs text-muted-foreground">{check.message}</p>
                </div>
              </div>
              {check.status === 'fail' && onFixIssue && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onFixIssue(check.id)}
                  className="text-xs"
                >
                  Fix
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Financial Checks */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-3 w-3 text-dc-info" />
            Financial Model
          </h4>
          {checks.filter(c => c.domain === 'financial').map(check => (
            <div 
              key={check.id}
              className="flex items-center justify-between p-2 rounded-lg bg-dc-surface border border-dc-border"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(check.status)}
                <div>
                  <p className="text-sm font-medium">{check.label}</p>
                  <p className="text-xs text-muted-foreground">{check.message}</p>
                </div>
              </div>
              {check.status === 'fail' && onFixIssue && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onFixIssue(check.id)}
                  className="text-xs"
                >
                  Fix
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Overall Status Message */}
        {failCount > 0 && (
          <div className="p-3 rounded-lg bg-dc-critical/10 border border-dc-critical/30">
            <p className="text-sm text-dc-critical font-medium">
              {failCount} issue(s) must be fixed before deployment
            </p>
          </div>
        )}
      </div>
    </DCCard>
  );
}
