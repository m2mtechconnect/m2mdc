import { ArrowRight, Focus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PERSONA_FAMILIES, type PersonaFamilyId } from '@/config/personaJourneyModel';
import type { PersonaCommandAction, PersonaCurrentWork } from './personaCommandCenter';

interface Props {
  family: PersonaFamilyId;
  scopeLabel: string;
  currentWork: PersonaCurrentWork;
  actions: PersonaCommandAction[];
}

export function PersonaPriorityPanel({ family, scopeLabel, currentWork, actions }: Props) {
  const definition = PERSONA_FAMILIES[family];

  return (
    <section
      aria-labelledby="persona-priority-heading"
      className="v2-panel min-w-0 p-4"
      data-testid="persona-priority-panel"
      data-persona-family={family}
    >
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)] lg:items-center">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]" aria-hidden>
              <Focus className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="v2-label">{definition.label} focus · {scopeLabel}</p>
              <h2 id="persona-priority-heading" className="v2-section-title mt-0.5 break-words">
                {currentWork.title}
              </h2>
            </div>
          </div>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{currentWork.detail}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{definition.primaryOutcome}</p>
        </div>

        <div className="min-w-0">
          <p className="v2-label mb-2">Priority actions</p>
          {actions.length > 0 ? (
            <div className="flex min-w-0 flex-wrap gap-2" data-testid="persona-priority-actions">
              {actions.map((item, index) => (
                <Button
                  key={item.id}
                  asChild
                  variant={index === 0 ? 'default' : 'outline'}
                  className="min-h-10 min-w-0 whitespace-normal text-left text-[14px] max-sm:w-full max-sm:justify-between"
                >
                  <Link to={item.href} data-testid={`persona-action-${item.id}`}>
                    <span>{item.label}</span>
                    <ArrowRight className="ml-2 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  </Link>
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-muted-foreground" data-testid="persona-priority-no-actions">
              No additional actions are available in this scope.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
