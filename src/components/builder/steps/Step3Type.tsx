import { Bot, GitBranch, Boxes } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useWizardBuilderStore } from '@/stores/wizardBuilderStore';

const TYPES = [
  {
    id: 'agent' as const,
    icon: Bot,
    title: 'Agent',
    description: 'Task automation and event-driven workflows',
  },
  {
    id: 'process_twin' as const,
    icon: GitBranch,
    title: 'Process Twin',
    description: 'Business logic simulation and approvals',
  },
  {
    id: '3d_twin' as const,
    icon: Boxes,
    title: '3D Twin',
    description: 'Spatial simulation and asset monitoring',
  },
];

export function Step3Type() {
  const { type, setType, error } = useWizardBuilderStore();

  return (
    <div className="space-y-8 max-w-[880px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Choose Type</h1>
        <p className="text-muted-foreground mt-2">
          Select the type of system to build
        </p>
      </div>

      <div className="grid gap-4">
        {TYPES.map((item) => {
          const Icon = item.icon;
          const isSelected = type === item.id;

          return (
            <Card
              key={item.id}
              className={cn(
                'p-6 cursor-pointer transition-colors hover:border-primary',
                isSelected && 'border-primary bg-primary/5'
              )}
              onClick={() => setType(item.id)}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setType(item.id);
                }
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'w-12 h-12 rounded-lg flex items-center justify-center border-2',
                    isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-muted-foreground/20'
                  )}
                >
                  <Icon className="w-6 h-6" />
                </div>

                <div className="flex-1 space-y-1">
                  <h3 className="font-semibold text-lg">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {error && (
        <div className="p-4 border border-destructive bg-destructive/10 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}