import { Card } from '@/components/ui/card';
import { Database, Workflow, TrendingUp, ArrowRight } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      icon: Database,
      title: 'Connect Data Sources',
      description: 'Integrate with queues, flights, baggage, weather, and operational systems'
    },
    {
      icon: Workflow,
      title: 'Run Agentic Workflows',
      description: 'Execute alerts, predictions, simulations, and automated responses'
    },
    {
      icon: TrendingUp,
      title: 'Drive Operational Decisions',
      description: 'Access dashboards, track ROI, and optimize operations in real-time'
    }
  ];
  
  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold mb-6">How It Works</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div key={idx} className="flex flex-col items-center text-center space-y-3">
              <div className="relative">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                {idx < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-14 transform -translate-y-1/2">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="font-semibold">{step.title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
