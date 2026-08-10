import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
import { formatKpi, type FacilityDefinition, type KpiValues } from '../facilityModel';
import { useActiveRun } from '../workspaceStore';

interface Props {
  facility: FacilityDefinition;
  kpis: KpiValues;
}

export function AssistPanel({ facility, kpis }: Props) {
  const { openWithQuestion } = useCoPilotContext();
  const run = useActiveRun();

  const prompts = [
    `Explain how the modelled PUE of ${formatKpi('pue', kpis.pue)} is derived for ${facility.name}.`,
    `Which modelled subsystem constrains capacity headroom at ${facility.name}?`,
    run
      ? `Summarise simulated run ${run.id} (${run.scenarioLabel}) and its recommendations.`
      : `What scenario should I run first for a ${facility.tier} facility at ${facility.capacityKw} kW?`,
    `What would lowering the cooling setpoint do to modelled thermal stability here?`,
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        The assistant answers from the modelled facility and recorded simulation runs. It has no live facility feed.
      </p>
      <ul className="space-y-1.5">
        {prompts.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              onClick={() => openWithQuestion(prompt)}
              className="w-full rounded-md border border-border px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              {prompt}
            </button>
          </li>
        ))}
      </ul>
      <Button size="sm" variant="outline" className="w-full" onClick={() => openWithQuestion(`Give me an engineering brief for ${facility.name}.`)}>
        <MessageSquare className="mr-2 h-4 w-4" aria-hidden />
        Open assistant
      </Button>
    </div>
  );
}