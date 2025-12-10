/**
 * DC Builder Step 1: Summary / Overview
 * Captures basic twin information and facility details
 */

import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Building2, Zap, Thermometer, Server, Shield, Leaf, MapPin } from 'lucide-react';
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
              rows={3}
            />
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
