/**
 * Financial Assumptions Card
 * Allows customers to edit cost & carbon assumptions used in ROI narrative
 */

import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Leaf, TrendingUp, Calendar, Info, Zap, Store, Truck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function FinancialAssumptionsCard() {
  const { financial, updateFinancial, overview } = useDCTwinBuilderStore();
  
  // Check for retail industry using multiple signals
  const isRetail = 
    overview.industry?.toLowerCase().includes('retail') ||
    overview.industries.some(i => i.toLowerCase().includes('retail')) ||
    overview.industries.some(i => i.toLowerCase().includes('supply chain')) ||
    overview.industries.some(i => i.toLowerCase().includes('logistics'));
  
  // Only show retail fields if we have retail-specific data
  const hasRetailData = isRetail && (
    (financial.annualColdChainEnergyCostUsd !== undefined && financial.annualColdChainEnergyCostUsd > 0) ||
    (financial.multiStoreAggregationCount !== undefined && financial.multiStoreAggregationCount > 0) ||
    (financial.annualEdgeComputeEnergyCostUsd !== undefined && financial.annualEdgeComputeEnergyCostUsd > 0)
  );

  // Format currency for display
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Financial & Carbon Assumptions
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          These values are used to calculate ROI and payback estimates
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Adjust these assumptions to match your actual data centre costs. More accurate inputs lead to better ROI projections.</p>
            </TooltipContent>
          </Tooltip>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Core Financial Inputs */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="annualPowerCost" className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-warning" />
              Annual Power Cost (USD)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="annualPowerCost"
                type="number"
                className="pl-7"
                value={financial.annualPowerCostUsd}
                onChange={(e) => updateFinancial({ annualPowerCostUsd: parseInt(e.target.value) || 0 })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Current: {formatCurrency(financial.annualPowerCostUsd)}/year
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="annualCarbon" className="flex items-center gap-1.5">
              <Leaf className="h-3.5 w-3.5 text-success" />
              Annual Carbon Emissions (tonnes CO₂e)
            </Label>
            <Input
              id="annualCarbon"
              type="number"
              value={financial.annualCarbonTonnes}
              onChange={(e) => updateFinancial({ annualCarbonTonnes: parseInt(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground">
              Current: {financial.annualCarbonTonnes.toLocaleString()} tonnes/year
            </p>
          </div>
        </div>

        {/* Savings Projections */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="upgradeSavings" className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              Expected Cost Savings (%)
            </Label>
            <div className="relative">
              <Input
                id="upgradeSavings"
                type="number"
                min={0}
                max={100}
                value={financial.upgradeSavingsPercent}
                onChange={(e) => updateFinancial({ upgradeSavingsPercent: parseInt(e.target.value) || 0 })}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Projected saving: {formatCurrency(financial.annualPowerCostUsd * (financial.upgradeSavingsPercent / 100))}/year
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="carbonSavings" className="flex items-center gap-1.5">
              <Leaf className="h-3.5 w-3.5 text-success" />
              Expected Carbon Reduction (%)
            </Label>
            <div className="relative">
              <Input
                id="carbonSavings"
                type="number"
                min={0}
                max={100}
                value={financial.carbonSavingsPercent}
                onChange={(e) => updateFinancial({ carbonSavingsPercent: parseInt(e.target.value) || 0 })}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Target reduction: {Math.round(financial.annualCarbonTonnes * (financial.carbonSavingsPercent / 100)).toLocaleString()} tonnes/year
            </p>
          </div>
        </div>

        {/* Payback Period */}
        <div className="space-y-2">
          <Label htmlFor="payback" className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            Estimated Payback Period (years)
          </Label>
          <Input
            id="payback"
            type="number"
            step={0.5}
            min={0.5}
            max={20}
            value={financial.paybackYears}
            onChange={(e) => updateFinancial({ paybackYears: parseFloat(e.target.value) || 1 })}
            className="max-w-xs"
          />
          <p className="text-xs text-muted-foreground">
            Time to recover implementation investment
          </p>
        </div>

        {/* Retail-Specific Fields - Only show when relevant */}
        {hasRetailData && (
          <div className="pt-4 border-t space-y-4">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              <h4 className="font-medium text-sm">Retail & Supply Chain Costs</h4>
              <Badge variant="secondary" className="text-xs">Industry-specific</Badge>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              {financial.annualColdChainEnergyCostUsd !== undefined && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm">
                    Cold Chain Energy Cost (USD/year)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      className="pl-7"
                      value={financial.annualColdChainEnergyCostUsd || 0}
                      onChange={(e) => updateFinancial({ annualColdChainEnergyCostUsd: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              )}
              
              {financial.annualEdgeComputeEnergyCostUsd !== undefined && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm">
                    Edge Compute Energy Cost (USD/year)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      className="pl-7"
                      value={financial.annualEdgeComputeEnergyCostUsd || 0}
                      onChange={(e) => updateFinancial({ annualEdgeComputeEnergyCostUsd: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              )}
              
              {financial.fleetWideCarbonTaxRiskUsd !== undefined && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <Truck className="h-3.5 w-3.5" />
                    Carbon Tax Risk Exposure (USD)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      className="pl-7"
                      value={financial.fleetWideCarbonTaxRiskUsd || 0}
                      onChange={(e) => updateFinancial({ fleetWideCarbonTaxRiskUsd: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              )}
              
              {financial.multiStoreAggregationCount !== undefined && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <Store className="h-3.5 w-3.5" />
                    Store Count (for aggregation)
                  </Label>
                  <Input
                    type="number"
                    value={financial.multiStoreAggregationCount || 0}
                    onChange={(e) => updateFinancial({ multiStoreAggregationCount: parseInt(e.target.value) || 0 })}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Summary Card */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
          <h4 className="font-medium text-sm mb-2">Projected Annual Impact</h4>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Cost Savings</p>
              <p className="text-lg font-semibold text-primary">
                {formatCurrency(financial.annualPowerCostUsd * (financial.upgradeSavingsPercent / 100))}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Carbon Reduction</p>
              <p className="text-lg font-semibold text-success">
                {Math.round(financial.annualCarbonTonnes * (financial.carbonSavingsPercent / 100)).toLocaleString()} t
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ROI Timeline</p>
              <p className="text-lg font-semibold">
                {financial.paybackYears} {financial.paybackYears === 1 ? 'year' : 'years'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
