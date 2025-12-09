import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";

const TOUR_STORAGE_KEY = "seenWorkflowTutorial";

const tourSteps = [
  {
    title: "🎯 Start here: drag an Analyze node",
    description: "Click and drag the Analyze node from the palette to the canvas to begin processing data.",
    highlight: "palette",
  },
  {
    title: "🔗 Now connect it to a Classify node",
    description: "Drag a connection from the Analyze node's output to a Classify node to add decision logic.",
    highlight: "canvas",
  },
  {
    title: "⚡ Add an action node",
    description: "Complete your workflow by adding a Notify Teams or MCP Tool Call node to automate actions.",
    highlight: "palette",
  },
  {
    title: "🚀 Click Test Run to simulate",
    description: "Use the Test Run button to validate your workflow and see how it executes.",
    highlight: "toolbar",
  },
];

interface WorkflowOnboardingTourProps {
  onComplete?: () => void;
}

export function WorkflowOnboardingTour({ onComplete }: WorkflowOnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!hasSeenTour) {
      setShowTour(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setShowTour(false);
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setShowTour(false);
  };

  if (!showTour) return null;

  const step = tourSteps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-md mx-4 shadow-lg animate-scale-in">
        <CardContent className="pt-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <div className="text-2xl">{step.title.split(" ")[0]}</div>
              <div className="text-xs text-muted-foreground">
                Step {currentStep + 1} of {tourSteps.length}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <h3 className="text-lg font-semibold mb-2">
            {step.title.substring(step.title.indexOf(" ") + 1)}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">{step.description}</p>

          {/* Progress dots */}
          <div className="flex gap-2 justify-center mb-4">
            {tourSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-primary"
                    : index < currentStep
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSkip} className="flex-1">
              Skip Tour
            </Button>
            <Button onClick={handleNext} className="flex-1">
              {currentStep < tourSteps.length - 1 ? "Next" : "Get Started"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}