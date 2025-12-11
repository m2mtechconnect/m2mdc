/**
 * Carbon & Financial Configuration Section for Builder Step 2
 * Allows users to configure carbon and financial assumptions
 */

import { useState } from 'react';
import { Leaf, DollarSign, Zap, Factory } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DCCard } from '@/components/dc-ui/DCCard';
import { Badge } from '@/components/ui/badge';
import { REGIONAL_CARBON_INTENSITY, type RegionCode } from '@/engines/carbon';
import { DEFAULT_FINANCIAL_ASSUMPTIONS, type FinancialAssumptions } from '@/engines/financial';

export interface CarbonFinancialConfig {
  region: RegionCode;
  electricityRatePerKwh: number;
  carbonPricePerTon: number;
  renewableMixPct: number;
  coolingCostPct: number;
  gpuCostPerHour: number;
  amortizationYears: number;
  interestRatePct: number;
}

interface CarbonFinancialConfigSectionProps {
  onConfigChange?: (config: CarbonFinancialConfig) => void;
}

export function CarbonFinancialConfigSection({ onConfigChange }: CarbonFinancialConfigSectionProps) {
  const [region, setRegion] = useState<RegionCode>('CA-QC');
  const [electricityRate, setElectricityRate] = useState([DEFAULT_FINANCIAL_ASSUMPTIONS.electricityCostPerKwh]);
  const [carbonPrice, setCarbonPrice] = useState([DEFAULT_FINANCIAL_ASSUMPTIONS.carbonPricePerTon]);
  const [renewableMix, setRenewableMix] = useState([REGIONAL_CARBON_INTENSITY['CA-QC'].renewablePercentage]);
  const [coolingCostPct, setCoolingCostPct] = useState([DEFAULT_FINANCIAL_ASSUMPTIONS.coolingCostPct * 100]);
  const [gpuCostPerHour, setGpuCostPerHour] = useState([DEFAULT_FINANCIAL_ASSUMPTIONS.gpuCostPerHour]);
  const [amortizationYears, setAmortizationYears] = useState([DEFAULT_FINANCIAL_ASSUMPTIONS.amortizationYears]);
  const [interestRate, setInterestRate] = useState([DEFAULT_FINANCIAL_ASSUMPTIONS.interestRatePct * 100]);

  const regionalData = REGIONAL_CARBON_INTENSITY[region];

  const handleChange = () => {
    onConfigChange?.({
      region,
      electricityRatePerKwh: electricityRate[0],
      carbonPricePerTon: carbonPrice[0],
      renewableMixPct: renewableMix[0],
      coolingCostPct: coolingCostPct[0] / 100,
      gpuCostPerHour: gpuCostPerHour[0],
      amortizationYears: amortizationYears[0],
      interestRatePct: interestRate[0] / 100,
    });
  };

  const handleRegionChange = (newRegion: RegionCode) => {
    setRegion(newRegion);
    const newRegionalData = REGIONAL_CARBON_INTENSITY[newRegion];
    setRenewableMix([newRegionalData.renewablePercentage]);
    handleChange();
  };

  return (
    <div className="space-y-4">
      {/* Carbon Model Configuration */}
      <DCCard
        title="Carbon Model Configuration"
        subtitle="Configure regional carbon intensity and renewable energy mix"
        icon={<Leaf className="h-4 w-4" />}
        className="border-l-success"
      >
        <div className="space-y-6">
          {/* Region Selection */}
          <div className="space-y-2">
            <Label>Grid Region</Label>
            <Select value={region} onValueChange={(val) => handleRegionChange(val as RegionCode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CA-QC">Quebec (CA-QC) - Hydro-dominant</SelectItem>
                <SelectItem value="CA-ON">Ontario (CA-ON) - Nuclear/Hydro Mix</SelectItem>
                <SelectItem value="CA-AB">Alberta (CA-AB) - Natural Gas</SelectItem>
                <SelectItem value="CA-BC">British Columbia (CA-BC) - Hydro</SelectItem>
                <SelectItem value="US-WEST">US West - Mixed</SelectItem>
                <SelectItem value="US-EAST">US East - Mixed</SelectItem>
                <SelectItem value="EU-WEST">EU West - Renewable Mix</SelectItem>
                <SelectItem value="NORDIC">Nordic - Hydro/Wind</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Regional Stats */}
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                {regionalData.carbonIntensityGPerKwh} gCO₂/kWh
              </Badge>
              <Badge variant="outline" className="bg-info/10 text-info border-info/30">
                {regionalData.renewablePercentage}% Renewable
              </Badge>
              <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                {regionalData.gridType}
              </Badge>
            </div>
          </div>

          {/* Renewable Mix Override */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Renewable Energy Mix (%)</Label>
              <span className="text-sm font-mono text-success">{renewableMix[0]}%</span>
            </div>
            <Slider
              value={renewableMix}
              onValueChange={(val) => { setRenewableMix(val); handleChange(); }}
              max={100}
              min={0}
              step={5}
            />
            <p className="text-xs text-muted-foreground">
              Override regional default with your facility's actual renewable mix
            </p>
          </div>

          {/* Carbon Price */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Carbon Price ($/ton CO₂)</Label>
              <span className="text-sm font-mono text-warning">${carbonPrice[0]}</span>
            </div>
            <Slider
              value={carbonPrice}
              onValueChange={(val) => { setCarbonPrice(val); handleChange(); }}
              max={200}
              min={10}
              step={5}
            />
            <p className="text-xs text-muted-foreground">
              Carbon tax/credit price for emissions cost calculations
            </p>
          </div>
        </div>
      </DCCard>

      {/* Financial Model Configuration */}
      <DCCard
        title="Financial Model Configuration"
        subtitle="Configure electricity rates, cooling costs, and depreciation assumptions"
        icon={<DollarSign className="h-4 w-4" />}
        className="border-l-info"
      >
        <div className="space-y-6">
          {/* Electricity Rate */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Electricity Rate ($/kWh)</Label>
              <span className="text-sm font-mono text-warning">${electricityRate[0].toFixed(3)}</span>
            </div>
            <Slider
              value={electricityRate}
              onValueChange={(val) => { setElectricityRate(val); handleChange(); }}
              max={0.20}
              min={0.02}
              step={0.005}
            />
          </div>

          {/* Cooling Cost % */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Cooling Cost (% of electricity)</Label>
              <span className="text-sm font-mono text-info">{coolingCostPct[0]}%</span>
            </div>
            <Slider
              value={coolingCostPct}
              onValueChange={(val) => { setCoolingCostPct(val); handleChange(); }}
              max={50}
              min={10}
              step={5}
            />
          </div>

          {/* GPU Cost Per Hour */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>GPU Cost ($/hour)</Label>
              <span className="text-sm font-mono text-accent">${gpuCostPerHour[0].toFixed(2)}</span>
            </div>
            <Slider
              value={gpuCostPerHour}
              onValueChange={(val) => { setGpuCostPerHour(val); handleChange(); }}
              max={5.0}
              min={0.5}
              step={0.1}
            />
          </div>

          {/* Amortization Years */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Asset Amortization (years)</Label>
              <span className="text-sm font-mono">{amortizationYears[0]} yrs</span>
            </div>
            <Slider
              value={amortizationYears}
              onValueChange={(val) => { setAmortizationYears(val); handleChange(); }}
              max={10}
              min={3}
              step={1}
            />
          </div>

          {/* Interest Rate */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Discount/Interest Rate (%)</Label>
              <span className="text-sm font-mono">{interestRate[0]}%</span>
            </div>
            <Slider
              value={interestRate}
              onValueChange={(val) => { setInterestRate(val); handleChange(); }}
              max={15}
              min={2}
              step={0.5}
            />
            <p className="text-xs text-muted-foreground">
              Used for NPV and IRR calculations
            </p>
          </div>
        </div>
      </DCCard>
    </div>
  );
}
