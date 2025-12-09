import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface AOCOnboardingTourProps {
  onComplete: () => void;
}

export function AOCOnboardingTour({ onComplete }: AOCOnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to the Agent Operations Center',
      description: 'Your mission control for deployed AI agents. Monitor performance, control execution, and collaborate with your team in real-time.',
      highlight: 'overview',
    },
    {
      title: 'Runtime Controls',
      description: 'Start, pause, stop, or restart your agent anytime. All actions are audited and can be performed via the command palette (⌘K).',
      highlight: 'controls',
    },
    {
      title: 'Live Activity Stream',
      description: 'Watch real-time execution logs as they happen. Filter by status, search for specific actions, and pause the stream when needed.',
      highlight: 'activity',
    },
    {
      title: 'Workflow Visualization',
      description: 'See your agent\'s workflow graph with live execution status. Click nodes to edit, enable/disable, or view detailed logs.',
      highlight: 'workflow',
    },
    {
      title: 'Performance Metrics',
      description: 'Track success rates, latency, throughput, and token usage. Get AI-powered optimization recommendations automatically.',
      highlight: 'metrics',
    },
    {
      title: 'Team Collaboration',
      description: 'See who else is viewing the AOC, track recent changes, and get real-time notifications for important events.',
      highlight: 'collab',
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-6 shadow-xl">
        {/* Progress */}
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className="text-xs">
            {currentStep + 1} of {steps.length}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-accent rounded-full mb-6">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          <div className="flex gap-1">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 w-1.5 rounded-full transition-all ${
                  idx === currentStep
                    ? 'bg-primary w-3'
                    : idx < currentStep
                    ? 'bg-primary/50'
                    : 'bg-accent'
                }`}
              />
            ))}
          </div>

          <Button size="sm" onClick={handleNext}>
            {currentStep === steps.length - 1 ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Get Started
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>

        {/* Skip Link */}
        <div className="text-center mt-4">
          <button
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Skip tour
          </button>
        </div>
      </Card>
    </div>
  );
}
