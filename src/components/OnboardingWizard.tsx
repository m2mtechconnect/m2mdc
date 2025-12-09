import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plug, FileText, Rocket, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);
  const navigate = useNavigate();

  const steps = [
    {
      number: 1,
      title: "Connect your data",
      description: "Link your Drive, SharePoint, website, or CRM",
      icon: Plug,
      action: () => navigate("/integrations"),
      cta: "Connect",
    },
    {
      number: 2,
      title: "Describe your goal",
      description: "Tell us what you want the AI to help with",
      icon: FileText,
      action: () => navigate("/builder"),
      cta: "Write Goal",
    },
    {
      number: 3,
      title: "Launch your AI",
      description: "Preview and activate your assistant",
      icon: Rocket,
      action: () => {
        setIsCompleted(true);
        navigate("/builder");
      },
      cta: "Deploy",
    },
  ];

  const progress = (currentStep / steps.length) * 100;

  if (isCompleted) {
    return null; // Hide after completion
  }

  return (
    <Card className="glass-panel p-6 mb-8 relative z-[60]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-display font-bold">Get Started in 3 Steps</h3>
          <p className="text-sm text-muted-foreground">
            Build your first AI assistant in minutes
          </p>
        </div>
        <button
          onClick={() => setIsCompleted(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-smooth"
        >
          Dismiss
        </button>
      </div>

      <Progress value={progress} className="mb-6 h-2" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((step) => (
          <div
            key={step.number}
            className={`relative p-4 rounded-lg border transition-smooth ${
              currentStep === step.number
                ? "border-primary bg-primary/5"
                : currentStep > step.number
                ? "border-secondary/50 bg-secondary/5"
                : "border-border"
            }`}
          >
            {currentStep > step.number && (
              <div className="absolute top-2 right-2">
                <CheckCircle2 className="h-5 w-5 text-secondary" />
              </div>
            )}

            <div className="flex items-start gap-3 mb-3">
              <div
                className={`p-2 rounded-lg ${
                  currentStep === step.number
                    ? "bg-primary"
                    : currentStep > step.number
                    ? "bg-secondary/20"
                    : "bg-muted"
                }`}
              >
                <step.icon
                  className={`h-5 w-5 ${
                    currentStep === step.number || currentStep > step.number
                      ? "text-black"
                      : "text-muted-foreground"
                  }`}
                />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">{step.title}</h4>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>

            <Button
              variant={currentStep === step.number ? "default" : "outline"}
              size="sm"
              className={`w-full ${
                currentStep === step.number ? "glow-yellow" : ""
              }`}
              onClick={() => {
                setCurrentStep(step.number + 1);
                step.action();
              }}
              disabled={currentStep > step.number}
            >
              {currentStep > step.number ? "Completed" : step.cta}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
