/**
 * Sovereignty Configuration Section for Builder Step 2
 */

import { useState } from 'react';
import { Shield, Globe, Plus, X, ChevronRight } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DCCard } from '@/components/dc-ui';
import type { JurisdictionCode, ComplianceFrameworkId } from '@/sovereignty';

interface SovereigntyConfigSectionProps {
  onConfigChange?: (config: SovereigntyConfig) => void;
}

export interface SovereigntyConfig {
  primaryJurisdiction: JurisdictionCode;
  enabledFrameworks: ComplianceFrameworkId[];
  enforceDataResidency: boolean;
  allowedCrossBorderRoutes: Array<{ from: JurisdictionCode; to: JurisdictionCode }>;
}

const JURISDICTIONS: { code: JurisdictionCode; label: string }[] = [
  { code: 'CA-QC', label: 'Canada - Quebec' },
  { code: 'CA-ON', label: 'Canada - Ontario' },
  { code: 'CA-BC', label: 'Canada - British Columbia' },
  { code: 'CA-AB', label: 'Canada - Alberta' },
  { code: 'US-EAST', label: 'United States - East' },
  { code: 'US-WEST', label: 'United States - West' },
  { code: 'EU-WEST', label: 'EU - West' },
  { code: 'EU-CENTRAL', label: 'EU - Central' },
  { code: 'UK', label: 'United Kingdom' },
  { code: 'APAC-SING', label: 'APAC - Singapore' },
];

const FRAMEWORKS: { id: ComplianceFrameworkId; name: string; description: string }[] = [
  { id: 'SOC2_TYPE_II', name: 'SOC 2 Type II', description: 'Security, availability, processing integrity' },
  { id: 'ISO_27001', name: 'ISO 27001', description: 'Information security management' },
  { id: 'PIPEDA', name: 'PIPEDA', description: 'Canadian privacy law compliance' },
  { id: 'GDPR_ADEQUATE', name: 'GDPR Adequate', description: 'EU data protection regulation' },
  { id: 'CCPA', name: 'CCPA', description: 'California Consumer Privacy Act' },
  { id: 'HIPAA', name: 'HIPAA', description: 'Health information privacy (US)' },
];

export function SovereigntyConfigSection({ onConfigChange }: SovereigntyConfigSectionProps) {
  const [primaryJurisdiction, setPrimaryJurisdiction] = useState<JurisdictionCode>('CA-QC');
  const [enabledFrameworks, setEnabledFrameworks] = useState<ComplianceFrameworkId[]>(['PIPEDA', 'SOC2_TYPE_II']);
  const [enforceDataResidency, setEnforceDataResidency] = useState(true);
  const [crossBorderRoutes, setCrossBorderRoutes] = useState<Array<{ from: JurisdictionCode; to: JurisdictionCode }>>([
    { from: 'CA-QC', to: 'CA-ON' },
  ]);
  
  const [newRouteFrom, setNewRouteFrom] = useState<JurisdictionCode>('CA-QC');
  const [newRouteTo, setNewRouteTo] = useState<JurisdictionCode>('CA-ON');

  const handleFrameworkToggle = (frameworkId: ComplianceFrameworkId) => {
    setEnabledFrameworks(prev => {
      const newFrameworks = prev.includes(frameworkId)
        ? prev.filter(f => f !== frameworkId)
        : [...prev, frameworkId];
      
      onConfigChange?.({
        primaryJurisdiction,
        enabledFrameworks: newFrameworks,
        enforceDataResidency,
        allowedCrossBorderRoutes: crossBorderRoutes,
      });
      
      return newFrameworks;
    });
  };

  const handleAddRoute = () => {
    const routeExists = crossBorderRoutes.some(r => r.from === newRouteFrom && r.to === newRouteTo);
    if (!routeExists && newRouteFrom !== newRouteTo) {
      const newRoutes = [...crossBorderRoutes, { from: newRouteFrom, to: newRouteTo }];
      setCrossBorderRoutes(newRoutes);
      onConfigChange?.({
        primaryJurisdiction,
        enabledFrameworks,
        enforceDataResidency,
        allowedCrossBorderRoutes: newRoutes,
      });
    }
  };

  const handleRemoveRoute = (index: number) => {
    const newRoutes = crossBorderRoutes.filter((_, i) => i !== index);
    setCrossBorderRoutes(newRoutes);
    onConfigChange?.({
      primaryJurisdiction,
      enabledFrameworks,
      enforceDataResidency,
      allowedCrossBorderRoutes: newRoutes,
    });
  };

  return (
    <DCCard
      title="Data Sovereignty & Compliance"
      subtitle="Configure data residency rules and compliance frameworks"
      icon={<Shield className="h-4 w-4" />}
      className="border-dc-sovereignty/30"
    >
      <div className="space-y-6">
        {/* Primary Jurisdiction */}
        <div className="space-y-2">
          <Label>Primary Jurisdiction</Label>
          <Select
            value={primaryJurisdiction}
            onValueChange={(val: JurisdictionCode) => {
              setPrimaryJurisdiction(val);
              onConfigChange?.({
                primaryJurisdiction: val,
                enabledFrameworks,
                enforceDataResidency,
                allowedCrossBorderRoutes: crossBorderRoutes,
              });
            }}
          >
            <SelectTrigger className="bg-dc-surface border-dc-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JURISDICTIONS.map(j => (
                <SelectItem key={j.code} value={j.code}>
                  <div className="flex items-center gap-2">
                    <Globe className="h-3 w-3" />
                    {j.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The primary legal jurisdiction for this data centre twin
          </p>
        </div>

        {/* Data Residency Enforcement */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-dc-surface border border-dc-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-dc-sovereignty/10 flex items-center justify-center">
              <Shield className="h-4 w-4 text-dc-sovereignty" />
            </div>
            <div>
              <p className="font-medium text-sm">Enforce Data Residency</p>
              <p className="text-xs text-muted-foreground">Sovereign data must never leave primary jurisdiction</p>
            </div>
          </div>
          <Switch
            checked={enforceDataResidency}
            onCheckedChange={(checked) => {
              setEnforceDataResidency(checked);
              onConfigChange?.({
                primaryJurisdiction,
                enabledFrameworks,
                enforceDataResidency: checked,
                allowedCrossBorderRoutes: crossBorderRoutes,
              });
            }}
          />
        </div>

        {/* Compliance Frameworks */}
        <div className="space-y-3">
          <Label>Enabled Compliance Frameworks</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {FRAMEWORKS.map(framework => {
              const isEnabled = enabledFrameworks.includes(framework.id);
              return (
                <div
                  key={framework.id}
                  onClick={() => handleFrameworkToggle(framework.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isEnabled
                      ? 'bg-dc-sovereignty/10 border-dc-sovereignty/30'
                      : 'bg-dc-surface border-dc-border hover:border-dc-sovereignty/30'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    isEnabled ? 'border-dc-sovereignty bg-dc-sovereignty' : 'border-muted-foreground'
                  }`}>
                    {isEnabled && <span className="text-white text-xs">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{framework.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{framework.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cross-Border Routes */}
        <div className="space-y-3">
          <Label>Allowed Cross-Border Routes</Label>
          <p className="text-xs text-muted-foreground">
            Define which jurisdictional boundaries data is allowed to cross
          </p>
          
          {/* Existing Routes */}
          <div className="space-y-2">
            {crossBorderRoutes.map((route, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 rounded-lg bg-dc-surface border border-dc-border"
              >
                <Badge variant="outline" className="text-xs">
                  {JURISDICTIONS.find(j => j.code === route.from)?.label || route.from}
                </Badge>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <Badge variant="outline" className="text-xs">
                  {JURISDICTIONS.find(j => j.code === route.to)?.label || route.to}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-6 w-6 p-0"
                  onClick={() => handleRemoveRoute(idx)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add Route */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={newRouteFrom} onValueChange={(val: JurisdictionCode) => setNewRouteFrom(val)}>
              <SelectTrigger className="w-[160px] bg-dc-surface border-dc-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JURISDICTIONS.map(j => (
                  <SelectItem key={j.code} value={j.code}>{j.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Select value={newRouteTo} onValueChange={(val: JurisdictionCode) => setNewRouteTo(val)}>
              <SelectTrigger className="w-[160px] bg-dc-surface border-dc-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JURISDICTIONS.map(j => (
                  <SelectItem key={j.code} value={j.code}>{j.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleAddRoute}>
              <Plus className="h-3 w-3 mr-1" />
              Add Route
            </Button>
          </div>
        </div>
      </div>
    </DCCard>
  );
}
