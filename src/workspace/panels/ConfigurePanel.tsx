import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { DEFAULT_OVERRIDES, deriveKpis, formatKpi, type ConfigOverrides, type FacilityDefinition } from '../facilityModel';
import { useWorkspaceStore } from '../workspaceStore';

interface Props {
  facility: FacilityDefinition;
  overrides: ConfigOverrides;
}

const CONTROLS: Array<{
  key: keyof ConfigOverrides;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  help: string;
}> = [
  { key: 'coolingSetpointC', label: 'Cooling setpoint', min: 16, max: 34, step: 1, unit: ' C', help: 'Supply air / coolant setpoint used by the thermal model.' },
  { key: 'workloadDensityPct', label: 'Workload density', min: 5, max: 100, step: 1, unit: '%', help: 'Share of design capacity assumed to be under load.' },
  { key: 'gpuPowerCapPct', label: 'GPU power cap', min: 40, max: 110, step: 1, unit: '%', help: 'Applied accelerator power cap relative to nameplate.' },
  { key: 'renewableMixPct', label: 'Renewable mix', min: 0, max: 100, step: 1, unit: '%', help: 'Modelled renewable share of supplied energy.' },
];

export function ConfigurePanel({ facility, overrides }: Props) {
  const setOverride = useWorkspaceStore((s) => s.setOverride);
  const resetOverrides = useWorkspaceStore((s) => s.resetOverrides);
  const setTool = useWorkspaceStore((s) => s.setTool);

  const projected = deriveKpis(facility, overrides);
  const design = deriveKpis(facility, DEFAULT_OVERRIDES);
  const dirty = (Object.keys(DEFAULT_OVERRIDES) as Array<keyof ConfigOverrides>).some(
    (k) => overrides[k] !== DEFAULT_OVERRIDES[k],
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Changes update the modelled facility immediately. Nothing is written to a physical facility.
      </p>

      {CONTROLS.map((control) => (
        <div key={control.key} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor={`cfg-${control.key}`} className="text-xs font-medium text-foreground">
              {control.label}
            </label>
            <span className="text-xs tabular-nums text-muted-foreground">
              {overrides[control.key]}
              {control.unit}
            </span>
          </div>
          <Slider
            id={`cfg-${control.key}`}
            aria-label={control.label}
            min={control.min}
            max={control.max}
            step={control.step}
            value={[overrides[control.key]]}
            onValueChange={([v]) => setOverride(control.key, v)}
          />
          <p className="text-[11px] text-muted-foreground">{control.help}</p>
        </div>
      ))}

      <div className="rounded-md border border-border bg-muted/40 p-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Projected against design point
        </p>
        <dl className="space-y-1">
          {(['pue', 'thermalStability', 'carbonIntensity'] as const).map((key) => (
            <div key={key} className="flex items-center justify-between text-xs">
              <dt className="text-muted-foreground">{key === 'pue' ? 'PUE' : key === 'thermalStability' ? 'Thermal stability' : 'Carbon intensity'}</dt>
              <dd className="tabular-nums text-foreground">
                {formatKpi(key, design[key])} → <span className="font-semibold">{formatKpi(key, projected[key])}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={() => setTool('simulate')} className="flex-1">
          Continue to simulate
        </Button>
        <Button size="sm" variant="outline" onClick={resetOverrides} disabled={!dirty}>
          Reset
        </Button>
      </div>
    </div>
  );
}