/**
 * Auto-Suggested KPIs
 * Recommends KPIs based on industry and blueprint
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Target, TrendingUp, TrendingDown,
  CheckCircle2, Plus, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPI {
  id: string;
  name: string;
  description: string;
  unit: string;
  direction: 'up' | 'down';
  category: string;
  baseline?: number;
  target?: number;
}

interface AutoSuggestedKPIsProps {
  industry: string;
  existingKPIs: KPI[];
  onAddKPIs: (kpis: KPI[]) => void;
}

// Industry-specific KPI recommendations
const industryKPIs: Record<string, KPI[]> = {
  'Banking': [
    { id: 'fraud-detection', name: 'Fraud Detection Rate', description: 'Percentage of fraudulent transactions caught', unit: '%', direction: 'up', category: 'Security', baseline: 85, target: 98 },
    { id: 'false-positives', name: 'False Positive Rate', description: 'Legitimate transactions incorrectly flagged', unit: '%', direction: 'down', category: 'Accuracy', baseline: 15, target: 3 },
    { id: 'alert-latency', name: 'Alert Latency', description: 'Time from transaction to alert', unit: 'ms', direction: 'down', category: 'Performance', baseline: 500, target: 100 },
    { id: 'review-time', name: 'Review Resolution Time', description: 'Average time to resolve flagged transactions', unit: 'min', direction: 'down', category: 'Efficiency', baseline: 45, target: 10 },
  ],
  'Healthcare': [
    { id: 'triage-accuracy', name: 'Triage Accuracy', description: 'Correct priority assignment rate', unit: '%', direction: 'up', category: 'Quality', baseline: 80, target: 95 },
    { id: 'readmission-rate', name: 'Readmission Rate', description: '30-day readmission percentage', unit: '%', direction: 'down', category: 'Outcomes', baseline: 18, target: 8 },
    { id: 'wait-time', name: 'Average Wait Time', description: 'Patient wait time reduction', unit: 'min', direction: 'down', category: 'Efficiency', baseline: 45, target: 15 },
    { id: 'care-gaps', name: 'Care Gaps Identified', description: 'Preventive care opportunities found', unit: 'count', direction: 'up', category: 'Quality', baseline: 50, target: 200 },
  ],
  'Retail': [
    { id: 'forecast-accuracy', name: 'Forecast Accuracy', description: 'Demand prediction accuracy', unit: '%', direction: 'up', category: 'Planning', baseline: 70, target: 92 },
    { id: 'stockout-rate', name: 'Stockout Rate', description: 'Out-of-stock incidents', unit: '%', direction: 'down', category: 'Inventory', baseline: 8, target: 1 },
    { id: 'inventory-turns', name: 'Inventory Turnover', description: 'Annual inventory rotation', unit: 'x', direction: 'up', category: 'Efficiency', baseline: 6, target: 12 },
    { id: 'margin-lift', name: 'Margin Improvement', description: 'Gross margin increase', unit: '%', direction: 'up', category: 'Revenue', baseline: 0, target: 5 },
  ],
  'Manufacturing': [
    { id: 'oee', name: 'Overall Equipment Effectiveness', description: 'Equipment utilization rate', unit: '%', direction: 'up', category: 'Operations', baseline: 65, target: 85 },
    { id: 'downtime', name: 'Unplanned Downtime', description: 'Equipment failure hours', unit: 'hrs/mo', direction: 'down', category: 'Reliability', baseline: 40, target: 8 },
    { id: 'defect-rate', name: 'Defect Rate', description: 'Products failing QC', unit: '%', direction: 'down', category: 'Quality', baseline: 3.5, target: 0.5 },
    { id: 'cycle-time', name: 'Cycle Time', description: 'Production cycle duration', unit: 'min', direction: 'down', category: 'Efficiency', baseline: 120, target: 75 },
  ],
  'default': [
    { id: 'task-completion', name: 'Task Completion Rate', description: 'Successfully completed tasks', unit: '%', direction: 'up', category: 'Performance', baseline: 80, target: 95 },
    { id: 'response-time', name: 'Response Time', description: 'Average processing time', unit: 'ms', direction: 'down', category: 'Speed', baseline: 1000, target: 200 },
    { id: 'error-rate', name: 'Error Rate', description: 'Failed operations percentage', unit: '%', direction: 'down', category: 'Quality', baseline: 5, target: 1 },
    { id: 'throughput', name: 'Throughput', description: 'Operations per hour', unit: 'ops/hr', direction: 'up', category: 'Capacity', baseline: 100, target: 500 },
  ]
};

export function AutoSuggestedKPIs({
  industry,
  existingKPIs,
  onAddKPIs
}: AutoSuggestedKPIsProps) {
  const [selectedKPIs, setSelectedKPIs] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<KPI[]>([]);

  useEffect(() => {
    const recommended = industryKPIs[industry] || industryKPIs['default'];
    // Filter out KPIs that already exist
    const existingIds = new Set(existingKPIs.map(k => k.id));
    const filtered = recommended.filter(k => !existingIds.has(k.id));
    setSuggestions(filtered);
  }, [industry, existingKPIs]);

  const toggleKPI = (id: string) => {
    const newSelected = new Set(selectedKPIs);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedKPIs(newSelected);
  };

  const handleAddSelected = () => {
    const kpisToAdd = suggestions.filter(k => selectedKPIs.has(k.id));
    onAddKPIs(kpisToAdd);
    setSelectedKPIs(new Set());
  };

  const handleAddAll = () => {
    onAddKPIs(suggestions);
    setSelectedKPIs(new Set());
  };

  if (suggestions.length === 0 && existingKPIs.length > 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">KPIs Configured</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span>{existingKPIs.length} KPI(s) already configured for this agent.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Recommended KPIs</CardTitle>
            <Badge variant="secondary">{industry || 'General'}</Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddSelected}
              disabled={selectedKPIs.size === 0}
            >
              Add Selected ({selectedKPIs.size})
            </Button>
            <Button
              size="sm"
              onClick={handleAddAll}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add All Recommended
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {suggestions.map((kpi) => (
            <div
              key={kpi.id}
              onClick={() => toggleKPI(kpi.id)}
              className={cn(
                "p-3 rounded-lg border cursor-pointer transition-all",
                selectedKPIs.has(kpi.id) 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedKPIs.has(kpi.id)}
                  onCheckedChange={() => toggleKPI(kpi.id)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{kpi.name}</span>
                    {kpi.direction === 'up' ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-blue-500" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{kpi.description}</p>
                  <div className="flex items-center gap-3 text-xs">
                    <Badge variant="outline" className="text-xs">{kpi.category}</Badge>
                    <span className="text-muted-foreground">
                      {kpi.baseline} → {kpi.target} {kpi.unit}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
