import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, DollarSign, Clock, Target } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useBuilderStore } from "@/stores/builderStore";

interface ROIMetrics {
  roi: number;
  timeSavedPerWeek: number;
  annualSavings: number;
  accuracyImprovement: number;
}

interface ROICalculatorProps {
  onChange?: (metrics: ROIMetrics) => void;
}

export function ROICalculator({ onChange }: ROICalculatorProps) {
  const { state, setState } = useBuilderStore();
  
  const [timeSavedPerRunMin, setTimeSavedPerRunMin] = useState(state.roiAssumptions.timeSavedMin);
  const [runsPerWeek, setRunsPerWeek] = useState(state.roiAssumptions.runsPerWeek);
  const [loadedCostPerHour, setLoadedCostPerHour] = useState(state.roiAssumptions.costPerHour);
  const [accuracyGain, setAccuracyGain] = useState(state.roiAssumptions.accuracyPct / 100);
  const [errorCost, setErrorCost] = useState(state.roiAssumptions.costPerError);

  const [metrics, setMetrics] = useState<ROIMetrics>({
    roi: 0,
    timeSavedPerWeek: 0,
    annualSavings: 0,
    accuracyImprovement: 0
  });

  useEffect(() => {
    // Update builder store with current assumptions
    setState({
      roiAssumptions: {
        timeSavedMin: timeSavedPerRunMin,
        runsPerWeek: runsPerWeek,
        costPerHour: loadedCostPerHour,
        accuracyPct: accuracyGain * 100,
        costPerError: errorCost,
      }
    });
    
    // Calculate metrics
    const timeSavedHoursPerWeek = (timeSavedPerRunMin * runsPerWeek) / 60;
    const annualTimeSavings = timeSavedHoursPerWeek * 52 * loadedCostPerHour;
    const annualErrorSavings = accuracyGain * errorCost * runsPerWeek * 52;
    const totalAnnualSavings = annualTimeSavings + annualErrorSavings;
    
    // Assume annual cost is roughly 20% of savings (platform fees, maintenance)
    const annualCost = totalAnnualSavings * 0.2;
    const roiPercentage = annualCost > 0 ? ((totalAnnualSavings - annualCost) / annualCost) * 100 : 0;

    const newMetrics = {
      roi: Math.round(roiPercentage),
      timeSavedPerWeek: Math.round(timeSavedHoursPerWeek * 10) / 10,
      annualSavings: Math.round(totalAnnualSavings),
      accuracyImprovement: Math.round(accuracyGain * 100)
    };

    setMetrics(newMetrics);
    onChange?.(newMetrics);
  }, [timeSavedPerRunMin, runsPerWeek, loadedCostPerHour, accuracyGain, errorCost, onChange, setState]);

  return (
    <Card className="glass-panel section-padding">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="text-h3">ROI Projection</h3>
      </div>

      {/* Key Metrics Display */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <DollarSign className="h-4 w-4 text-primary" />
            <p className="text-caption text-muted-foreground">Expected ROI</p>
          </div>
          <p className="text-h2 font-mono text-primary">{metrics.roi}%</p>
        </div>
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Clock className="h-4 w-4 text-secondary" />
            <p className="text-caption text-muted-foreground">Time Saved/Week</p>
          </div>
          <p className="text-h2 font-mono text-secondary">{metrics.timeSavedPerWeek}h</p>
        </div>
        <div className="col-span-2">
          <p className="text-caption text-muted-foreground mb-1">Annual Savings</p>
          <p className="text-h2 font-mono text-primary">
            {formatCurrency(metrics.annualSavings)}
          </p>
        </div>
      </div>

      {/* Input Parameters */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div>
          <Label htmlFor="timePerRun" className="text-caption mb-2 block">
            Time Saved Per Run (minutes)
          </Label>
          <Input
            id="timePerRun"
            type="number"
            value={timeSavedPerRunMin}
            onChange={(e) => setTimeSavedPerRunMin(Number(e.target.value))}
            min={1}
            max={240}
          />
        </div>

        <div>
          <Label htmlFor="runsPerWeek" className="text-caption mb-2 block">
            Runs Per Week
          </Label>
          <Input
            id="runsPerWeek"
            type="number"
            value={runsPerWeek}
            onChange={(e) => setRunsPerWeek(Number(e.target.value))}
            min={1}
            max={1000}
          />
        </div>

        <div>
          <Label htmlFor="costPerHour" className="text-caption mb-2 block">
            Loaded Cost Per Hour ($)
          </Label>
          <Input
            id="costPerHour"
            type="number"
            value={loadedCostPerHour}
            onChange={(e) => setLoadedCostPerHour(Number(e.target.value))}
            min={1}
            max={500}
          />
        </div>

        <div>
          <Label htmlFor="accuracyGain" className="text-caption mb-2 block">
            Accuracy Improvement (%)
          </Label>
          <Input
            id="accuracyGain"
            type="number"
            value={Math.round(accuracyGain * 100)}
            onChange={(e) => setAccuracyGain(Number(e.target.value) / 100)}
            min={0}
            max={100}
          />
        </div>

        <div>
          <Label htmlFor="errorCost" className="text-caption mb-2 block">
            Cost Per Error ($)
          </Label>
          <Input
            id="errorCost"
            type="number"
            value={errorCost}
            onChange={(e) => setErrorCost(Number(e.target.value))}
            min={0}
            max={10000}
          />
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="mt-6 pt-4 border-t border-border space-y-2 text-caption">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Accuracy Improvement</span>
          <span className="font-semibold text-secondary">+{metrics.accuracyImprovement}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Annual Time Saved</span>
          <span className="font-semibold">{Math.round(metrics.timeSavedPerWeek * 52)}h</span>
        </div>
      </div>
    </Card>
  );
}
