/**
 * Custom Scenario Builder Component
 * UI for creating custom simulation scenarios
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, Trash2, Sparkles, Clock, 
  Thermometer, Zap, Wind, Network, Shield, Cpu, Globe, DollarSign
} from 'lucide-react';
import type { CustomScenarioConfig } from '@/simulation/types';
import type { DomainType } from '@/types/dataCenterTwin';
import { cn } from '@/lib/utils';

interface CustomScenarioBuilderProps {
  onSave: (config: CustomScenarioConfig) => void;
  onCancel: () => void;
}

const domains: { id: DomainType; label: string; icon: React.ElementType }[] = [
  { id: 'thermal_hardware', label: 'Thermal', icon: Thermometer },
  { id: 'power_ups', label: 'Power', icon: Zap },
  { id: 'cooling', label: 'Cooling', icon: Wind },
  { id: 'network', label: 'Network', icon: Network },
  { id: 'facility_safety', label: 'Facility', icon: Shield },
  { id: 'workload_gpu', label: 'Workload', icon: Cpu },
  { id: 'sovereignty', label: 'Sovereignty', icon: Globe },
  { id: 'financial_carbon', label: 'Financial', icon: DollarSign },
];

const kpiOptions = [
  { id: 'pue', label: 'PUE', min: -0.5, max: 0.5, step: 0.05 },
  { id: 'gpuUtilization', label: 'GPU Utilization (%)', min: -50, max: 50, step: 5 },
  { id: 'thermalStabilityScore', label: 'Thermal Stability (%)', min: -30, max: 10, step: 5 },
  { id: 'powerReliabilityScore', label: 'Power Reliability (%)', min: -40, max: 10, step: 5 },
  { id: 'sovereignComplianceScore', label: 'Sovereignty (%)', min: -50, max: 10, step: 5 },
  { id: 'emissionsVsTarget', label: 'Emissions vs Target (%)', min: -20, max: 50, step: 5 },
];

interface TimelineStep {
  id: string;
  atPercent: number;
  kpiDeltas: Record<string, number>;
  eventTitle: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export function CustomScenarioBuilder({ onSave, onCancel }: CustomScenarioBuilderProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [selectedDomains, setSelectedDomains] = useState<DomainType[]>(['thermal_hardware']);
  const [initialKpiOffsets, setInitialKpiOffsets] = useState<Record<string, number>>({});
  const [timelineSteps, setTimelineSteps] = useState<TimelineStep[]>([
    { id: '1', atPercent: 10, kpiDeltas: { pue: 0.1 }, eventTitle: 'Initial Impact', severity: 'medium' }
  ]);
  
  const handleDomainToggle = (domain: DomainType) => {
    setSelectedDomains(prev => 
      prev.includes(domain) 
        ? prev.filter(d => d !== domain)
        : [...prev, domain]
    );
  };
  
  const handleAddStep = () => {
    const lastStep = timelineSteps[timelineSteps.length - 1];
    const newPercent = Math.min(100, (lastStep?.atPercent || 0) + 20);
    setTimelineSteps(prev => [...prev, {
      id: Date.now().toString(),
      atPercent: newPercent,
      kpiDeltas: {},
      eventTitle: `Event at ${newPercent}%`,
      severity: 'medium'
    }]);
  };
  
  const handleRemoveStep = (id: string) => {
    setTimelineSteps(prev => prev.filter(s => s.id !== id));
  };
  
  const handleStepChange = (id: string, field: keyof TimelineStep, value: any) => {
    setTimelineSteps(prev => prev.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };
  
  const handleSave = () => {
    const config: CustomScenarioConfig = {
      name: name || 'Custom Scenario',
      description: description || 'User-created scenario',
      durationSeconds: durationMinutes * 60,
      affectedDomains: selectedDomains,
      initialKpiOffsets,
      timelineSteps: timelineSteps.map(step => ({
        atPercent: step.atPercent,
        kpiDeltas: step.kpiDeltas,
        eventTitle: step.eventTitle,
        severity: step.severity,
      })),
    };
    onSave(config);
  };
  
  const isValid = name.trim().length > 0 && selectedDomains.length > 0;
  
  return (
    <Card className="bg-dc-surface border-dc-border max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-dc-primary" />
          Create Custom Scenario
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Scenario Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Custom Cooling Failure"
                  className="bg-dc-background"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this scenario simulates..."
                  className="bg-dc-background resize-none"
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Duration: {durationMinutes} minutes
                </Label>
                <Slider
                  value={[durationMinutes]}
                  onValueChange={([v]) => setDurationMinutes(v)}
                  min={5}
                  max={180}
                  step={5}
                  className="py-2"
                />
              </div>
            </div>
            
            {/* Affected Domains */}
            <div className="space-y-3">
              <Label>Affected Domains</Label>
              <div className="grid grid-cols-4 gap-2">
                {domains.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleDomainToggle(id)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 rounded-lg border transition-all',
                      selectedDomains.includes(id)
                        ? 'bg-dc-primary/20 border-dc-primary text-dc-primary'
                        : 'bg-dc-background border-dc-border hover:border-dc-primary/50'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Initial KPI Offsets */}
            <div className="space-y-3">
              <Label>Initial KPI Offsets</Label>
              <div className="space-y-3">
                {kpiOptions.slice(0, 4).map(kpi => (
                  <div key={kpi.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{kpi.label}</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {(initialKpiOffsets[kpi.id] || 0) >= 0 ? '+' : ''}
                        {initialKpiOffsets[kpi.id] || 0}
                      </Badge>
                    </div>
                    <Slider
                      value={[initialKpiOffsets[kpi.id] || 0]}
                      onValueChange={([v]) => setInitialKpiOffsets(prev => ({ ...prev, [kpi.id]: v }))}
                      min={kpi.min}
                      max={kpi.max}
                      step={kpi.step}
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Timeline Steps */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Timeline Steps</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAddStep}
                  className="gap-1 text-xs"
                  disabled={timelineSteps.length >= 5}
                >
                  <Plus className="h-3 w-3" />
                  Add Step
                </Button>
              </div>
              
              <div className="space-y-3">
                {timelineSteps.map((step, index) => (
                  <Card key={step.id} className="bg-dc-background border-dc-border">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          Step {index + 1} • {step.atPercent}%
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveStep(step.id)}
                          disabled={timelineSteps.length <= 1}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <Input
                          value={step.eventTitle}
                          onChange={(e) => handleStepChange(step.id, 'eventTitle', e.target.value)}
                          placeholder="Event title"
                          className="h-8 text-sm bg-dc-surface"
                        />
                        
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Slider
                              value={[step.atPercent]}
                              onValueChange={([v]) => handleStepChange(step.id, 'atPercent', v)}
                              min={0}
                              max={100}
                              step={5}
                            />
                          </div>
                          <select
                            value={step.severity}
                            onChange={(e) => handleStepChange(step.id, 'severity', e.target.value)}
                            className="text-xs bg-dc-surface border border-dc-border rounded px-2"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="flex justify-end gap-2 border-t border-dc-border pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!isValid} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Create Scenario
        </Button>
      </CardFooter>
    </Card>
  );
}
