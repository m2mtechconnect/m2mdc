/**
 * DC Builder Step 1: Summary / Overview
 * Captures basic twin information and facility details
 * All fields editable and synced to Overview tab via store
 */

import { useState } from 'react';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Zap, Thermometer, Leaf, MapPin, Target, Users, TrendingUp, Clock, List, Plus, X, FileText } from 'lucide-react';
import type { DCTier } from '@/types/dcScan';

const TIER_OPTIONS: { value: DCTier; label: string }[] = [
  { value: 'Tier II', label: 'Tier II - Redundant Components' },
  { value: 'Tier III', label: 'Tier III - Concurrently Maintainable' },
  { value: 'Tier IV', label: 'Tier IV - Fault Tolerant' },
];

const COOLING_OPTIONS: { value: 'air' | 'liquid' | 'hybrid' | 'chilled_water'; label: string }[] = [
  { value: 'air', label: 'Air Cooling' },
  { value: 'liquid', label: 'Liquid Cooling' },
  { value: 'hybrid', label: 'Hybrid (Air + Liquid)' },
  { value: 'chilled_water', label: 'Chilled Water' },
];

const POWER_TOPOLOGY_OPTIONS: { value: 'N' | 'N+1' | '2N' | '2N+1'; label: string }[] = [
  { value: 'N', label: 'N (No Redundancy)' },
  { value: 'N+1', label: 'N+1 Redundancy' },
  { value: '2N', label: '2N Redundancy' },
  { value: '2N+1', label: '2N+1 Redundancy' },
];

export function DCStep1Summary() {
  const { overview, updateOverview } = useDCTwinBuilderStore();
  
  // Local state for new item inputs
  const [newUseCase, setNewUseCase] = useState('');
  const [newBenefit, setNewBenefit] = useState('');
  const [newAudience, setNewAudience] = useState('');

  // Array field helpers
  const addUseCase = () => {
    if (newUseCase.trim()) {
      updateOverview({ primaryUseCases: [...overview.primaryUseCases, newUseCase.trim()] });
      setNewUseCase('');
    }
  };

  const removeUseCase = (index: number) => {
    updateOverview({ primaryUseCases: overview.primaryUseCases.filter((_, i) => i !== index) });
  };

  const addBenefit = () => {
    if (newBenefit.trim()) {
      updateOverview({ keyBenefits: [...overview.keyBenefits, newBenefit.trim()] });
      setNewBenefit('');
    }
  };

  const removeBenefit = (index: number) => {
    updateOverview({ keyBenefits: overview.keyBenefits.filter((_, i) => i !== index) });
  };

  const addAudience = () => {
    if (newAudience.trim()) {
      updateOverview({ targetAudience: [...overview.targetAudience, newAudience.trim()] });
      setNewAudience('');
    }
  };

  const removeAudience = (index: number) => {
    updateOverview({ targetAudience: overview.targetAudience.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Twin Information
          </CardTitle>
          <CardDescription>
            Define the basic details of your Sovereign Green AI Data Centre Twin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="twinName">Twin Name</Label>
              <Input
                id="twinName"
                value={overview.twinName}
                onChange={(e) => updateOverview({ twinName: e.target.value })}
                placeholder="e.g., Montreal Sovereign AI DC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facilityLocation">Facility Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="facilityLocation"
                  className="pl-10"
                  value={overview.facilityLocation}
                  onChange={(e) => updateOverview({ facilityLocation: e.target.value })}
                  placeholder="e.g., Montreal, QC"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={overview.description}
              onChange={(e) => updateOverview({ description: e.target.value })}
              placeholder="Describe the purpose and goals of this data centre twin..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="twinSummary">Twin Summary</Label>
            <Textarea
              id="twinSummary"
              value={overview.twinSummary}
              onChange={(e) => updateOverview({ twinSummary: e.target.value })}
              placeholder="Provide a detailed summary of this digital twin's purpose and capabilities..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">This summary appears in the Overview tab header</p>
          </div>

          {overview.industries.length > 0 && (
            <div className="space-y-2">
              <Label>Industries</Label>
              <div className="flex flex-wrap gap-2">
                {overview.industries.map((industry) => (
                  <Badge key={industry} variant="secondary">
                    {industry}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business Impact & ROI */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Business Impact & ROI
          </CardTitle>
          <CardDescription>
            Define the expected business value and impact metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="displayRoi">Display ROI</Label>
              <Input
                id="displayRoi"
                value={overview.displayRoi}
                onChange={(e) => updateOverview({ displayRoi: e.target.value })}
                placeholder="e.g., 35-50%"
              />
              <p className="text-xs text-muted-foreground">Shown in Overview ROI badge</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayTimeSaved">Time Saved</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="displayTimeSaved"
                  className="pl-10"
                  value={overview.displayTimeSaved}
                  onChange={(e) => updateOverview({ displayTimeSaved: e.target.value })}
                  placeholder="e.g., 20+ hrs/week"
                />
              </div>
              <p className="text-xs text-muted-foreground">Shown in Overview time saved badge</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessImpactSummary">Business Impact Summary</Label>
            <Textarea
              id="businessImpactSummary"
              value={overview.businessImpactSummary}
              onChange={(e) => updateOverview({ businessImpactSummary: e.target.value })}
              placeholder="Describe the overall business impact, e.g., 'Reduce energy costs, minimize carbon footprint, ensure data sovereignty...'"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">Displayed in Overview "Business Impact & ROI" section</p>
          </div>
        </CardContent>
      </Card>

      {/* Primary Use Cases */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Primary Use Cases
          </CardTitle>
          <CardDescription>
            Define the main use cases this twin addresses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {overview.primaryUseCases.map((useCase, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1 py-1 px-2">
                {useCase}
                <button onClick={() => removeUseCase(index)} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newUseCase}
              onChange={(e) => setNewUseCase(e.target.value)}
              placeholder="Add a use case..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addUseCase())}
            />
            <Button type="button" variant="outline" size="icon" onClick={addUseCase}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5 text-primary" />
            Key Benefits
          </CardTitle>
          <CardDescription>
            List the main benefits users will gain from this twin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {overview.keyBenefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="flex-1 text-sm">{benefit}</span>
              <Button variant="ghost" size="icon" onClick={() => removeBenefit(index)}>
                <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newBenefit}
              onChange={(e) => setNewBenefit(e.target.value)}
              placeholder="Add a benefit..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
            />
            <Button type="button" variant="outline" size="icon" onClick={addBenefit}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Target Audience */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Who Is This For?
          </CardTitle>
          <CardDescription>
            Define the target audience for this digital twin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {overview.targetAudience.map((audience, index) => (
            <div key={index} className="flex items-center gap-2">
              <Badge variant="outline" className="flex-1 justify-start py-1.5">
                {audience}
              </Badge>
              <Button variant="ghost" size="icon" onClick={() => removeAudience(index)}>
                <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newAudience}
              onChange={(e) => setNewAudience(e.target.value)}
              placeholder="Add target audience..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAudience())}
            />
            <Button type="button" variant="outline" size="icon" onClick={addAudience}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Facility Specifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Facility Specifications
          </CardTitle>
          <CardDescription>
            Configure power, tier, and capacity settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="capacityKw">Total IT Load (kW)</Label>
              <Input
                id="capacityKw"
                type="number"
                value={overview.capacityKw}
                onChange={(e) => updateOverview({ capacityKw: parseInt(e.target.value) || 0 })}
                placeholder="e.g., 5000"
              />
            </div>
            <div className="space-y-2">
              <Label>Tier</Label>
              <Select
                value={overview.tier}
                onValueChange={(value: DCTier) => updateOverview({ tier: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  {TIER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Power Topology</Label>
              <Select
                value={overview.powerTopology}
                onValueChange={(value: 'N' | 'N+1' | '2N' | '2N+1') => updateOverview({ powerTopology: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select topology" />
                </SelectTrigger>
                <SelectContent>
                  {POWER_TOPOLOGY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cooling & GPU */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-primary" />
            Cooling & Compute
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Cooling System</Label>
              <Select
                value={overview.coolingType}
                onValueChange={(value: 'air' | 'liquid' | 'hybrid' | 'chilled_water') => updateOverview({ coolingType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cooling type" />
                </SelectTrigger>
                <SelectContent>
                  {COOLING_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gpuFleet">GPU Fleet / Model Types</Label>
              <Input
                id="gpuFleet"
                value={overview.gpuFleet}
                onChange={(e) => updateOverview({ gpuFleet: e.target.value })}
                placeholder="e.g., NVIDIA H100, A100"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sustainability & Sovereignty */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-green-600" />
            Sustainability & Sovereignty
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="renewablePercent">Renewable Energy (%)</Label>
              <Input
                id="renewablePercent"
                type="number"
                min={0}
                max={100}
                value={overview.renewablePercent}
                onChange={(e) => updateOverview({ renewablePercent: parseInt(e.target.value) || 0 })}
                placeholder="e.g., 95"
              />
            </div>
            <div className="space-y-2">
              <Label>Sovereign Compliance</Label>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Switch
                  checked={overview.sovereignCompliance}
                  onCheckedChange={(checked) => updateOverview({ sovereignCompliance: checked })}
                />
                <span className="text-sm">
                  {overview.sovereignCompliance ? 'Sovereign compliant (Canada-only)' : 'Not sovereign compliant'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
