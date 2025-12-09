/**
 * Questionnaire Wizard - Phase 3
 * Guided intake flow that converts user answers → AgentBlueprint
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Building2,
  Target,
  Shield,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { startBuilderFromQuestionnaire } from "@/lib/intake";
import { trackEvent } from "@/lib/telemetry";
import { trackIntakeStep } from "@/lib/analytics/intakeTracking";
import { toast } from "sonner";
import type { QuestionnaireAnswers } from "@/lib/builder/questionnaireToBlueprint";

interface QuestionnaireWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INDUSTRIES = [
  "Healthcare",
  "Finance",
  "Retail",
  "Manufacturing",
  "Technology",
  "Education",
  "Government",
  "Real Estate",
  "Other",
];

const DEPARTMENTS = [
  "Operations",
  "Sales",
  "Marketing",
  "Finance",
  "HR",
  "IT",
  "Engineering",
  "Customer Support",
  "Legal",
  "Product",
];

const COMMON_TOOLS = [
  "Slack",
  "Microsoft Teams",
  "Salesforce",
  "HubSpot",
  "Google Workspace",
  "Microsoft 365",
  "Notion",
  "Asana",
  "Jira",
  "Monday.com",
];

export function QuestionnaireWizard({ open, onOpenChange }: QuestionnaireWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Partial<QuestionnaireAnswers>>({
    currentTools: [],
    complianceNeeds: [],
  });
  
  const navigate = useNavigate();

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const updateAnswer = <K extends keyof QuestionnaireAnswers>(
    key: K,
    value: QuestionnaireAnswers[K]
  ) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      // Track step progression
      trackIntakeStep('questionnaire', `step_${currentStep}`);
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    // Validate required fields
    if (!answers.industry || !answers.department || !answers.primaryGoal || !answers.agentType) {
      return;
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      toast.error("Please sign in to continue");
      return;
    }

    // Track analytics
    trackEvent('agent_intake.questionnaire.completed', {
      industry: answers.industry,
      department: answers.department,
      agentType: answers.agentType,
      teamSize: answers.teamSize,
    });

    // Use unified intake service
    const result = await startBuilderFromQuestionnaire(
      answers as QuestionnaireAnswers,
      user.id
    );

    if (result.success) {
      navigate(result.builderUrl);
      onOpenChange(false);
    } else {
      toast.error(result.error || 'Failed to start builder');
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return answers.industry && answers.department && answers.teamSize;
      case 2:
        return answers.primaryGoal && answers.successMetric;
      case 3:
        return answers.agentType;
      case 4:
        return answers.riskLevel && answers.dataSensitivity;
      default:
        return false;
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setAnswers({ currentTools: [], complianceNeeds: [] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-h3 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Configure Your AI Agent
          </DialogTitle>
          <DialogDescription className="text-body mt-2">
            Answer a few questions to get started with a tailored agent configuration
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="space-y-2 mb-6">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            Step {currentStep} of {totalSteps}
          </p>
        </div>

        {/* Step 1: Business Context */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <h4 className="text-h4 font-semibold">Business Context</h4>
                <p className="text-caption text-muted-foreground">
                  Tell us about your organization
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="industry">Industry *</Label>
                <Select
                  value={answers.industry}
                  onValueChange={(value) => updateAnswer('industry', value)}
                >
                  <SelectTrigger id="industry">
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="department">Department *</Label>
                <Select
                  value={answers.department}
                  onValueChange={(value) => updateAnswer('department', value)}
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select your department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="teamSize">Team Size *</Label>
                <Select
                  value={answers.teamSize}
                  onValueChange={(value) => updateAnswer('teamSize', value)}
                >
                  <SelectTrigger id="teamSize">
                    <SelectValue placeholder="Select team size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10 people</SelectItem>
                    <SelectItem value="11-50">11-50 people</SelectItem>
                    <SelectItem value="51-200">51-200 people</SelectItem>
                    <SelectItem value="201+">201+ people</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Current Tools (optional)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Select tools your team currently uses
                </p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_TOOLS.map((tool) => (
                    <Button
                      key={tool}
                      type="button"
                      variant={answers.currentTools?.includes(tool) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const current = answers.currentTools || [];
                        if (current.includes(tool)) {
                          updateAnswer('currentTools', current.filter(t => t !== tool));
                        } else {
                          updateAnswer('currentTools', [...current, tool]);
                        }
                      }}
                    >
                      {tool}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Primary Goal */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <Target className="h-8 w-8 text-primary" />
              <div>
                <h4 className="text-h4 font-semibold">Primary Goal</h4>
                <p className="text-caption text-muted-foreground">
                  What do you want to achieve?
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="primaryGoal">What's your main objective? *</Label>
                <Input
                  id="primaryGoal"
                  value={answers.primaryGoal || ''}
                  onChange={(e) => updateAnswer('primaryGoal', e.target.value)}
                  placeholder="e.g., Automate customer support responses"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="specificChallenge">Specific Challenge (optional)</Label>
                <Textarea
                  id="specificChallenge"
                  value={answers.specificChallenge || ''}
                  onChange={(e) => updateAnswer('specificChallenge', e.target.value)}
                  placeholder="Describe any specific challenges or pain points..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="successMetric">How will you measure success? *</Label>
                <Input
                  id="successMetric"
                  value={answers.successMetric || ''}
                  onChange={(e) => updateAnswer('successMetric', e.target.value)}
                  placeholder="e.g., Reduce response time by 50%"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Agent Type */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
              <div>
                <h4 className="text-h4 font-semibold">Agent Type</h4>
                <p className="text-caption text-muted-foreground">
                  Choose the type of AI system
                </p>
              </div>
            </div>

            <RadioGroup
              value={answers.agentType}
              onValueChange={(value: any) => updateAnswer('agentType', value)}
              className="space-y-3"
            >
              <Card className="p-4 cursor-pointer hover:border-primary transition-colors">
                <Label htmlFor="agent" className="flex items-start gap-3 cursor-pointer">
                  <RadioGroupItem value="agent" id="agent" className="mt-1" />
                  <div className="flex-1">
                    <div className="font-semibold">AI Agent</div>
                    <p className="text-sm text-muted-foreground">
                      Conversational assistant that interacts with users and performs tasks
                    </p>
                  </div>
                </Label>
              </Card>

              <Card className="p-4 cursor-pointer hover:border-primary transition-colors">
                <Label htmlFor="process_twin" className="flex items-start gap-3 cursor-pointer">
                  <RadioGroupItem value="process_twin" id="process_twin" className="mt-1" />
                  <div className="flex-1">
                    <div className="font-semibold">Process Twin</div>
                    <p className="text-sm text-muted-foreground">
                      Digital replica of a business process with automated workflows
                    </p>
                  </div>
                </Label>
              </Card>

              <Card className="p-4 cursor-pointer hover:border-primary transition-colors">
                <Label htmlFor="3d_twin" className="flex items-start gap-3 cursor-pointer">
                  <RadioGroupItem value="3d_twin" id="3d_twin" className="mt-1" />
                  <div className="flex-1">
                    <div className="font-semibold">3D Digital Twin</div>
                    <p className="text-sm text-muted-foreground">
                      Visual simulation of physical systems or environments
                    </p>
                  </div>
                </Label>
              </Card>
            </RadioGroup>

            {answers.agentType && (
              <div>
                <Label htmlFor="agentRole">Agent Role (optional)</Label>
                <Input
                  id="agentRole"
                  value={answers.agentRole || ''}
                  onChange={(e) => updateAnswer('agentRole', e.target.value)}
                  placeholder="e.g., Customer Success Assistant"
                  className="mt-1"
                />
              </div>
            )}
          </div>
        )}

        {/* Step 4: Risk & Safety */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h4 className="text-h4 font-semibold">Risk & Safety</h4>
                <p className="text-caption text-muted-foreground">
                  Configure security and compliance settings
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Risk Level *</Label>
                <RadioGroup
                  value={answers.riskLevel}
                  onValueChange={(value: any) => updateAnswer('riskLevel', value)}
                  className="space-y-2 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low" id="risk-low" />
                    <Label htmlFor="risk-low" className="cursor-pointer">
                      Low - General information, no sensitive data
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="risk-medium" />
                    <Label htmlFor="risk-medium" className="cursor-pointer">
                      Medium - Internal business data
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high" id="risk-high" />
                    <Label htmlFor="risk-high" className="cursor-pointer">
                      High - Confidential or regulated data
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Data Sensitivity *</Label>
                <Select
                  value={answers.dataSensitivity}
                  onValueChange={(value: any) => updateAnswer('dataSensitivity', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select data sensitivity level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public - Can be shared externally</SelectItem>
                    <SelectItem value="internal">Internal - For company use only</SelectItem>
                    <SelectItem value="confidential">Confidential - Restricted access</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Compliance Requirements (optional)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Select any that apply
                </p>
                <div className="flex flex-wrap gap-2">
                  {['GDPR', 'HIPAA', 'SOC 2', 'ISO 27001', 'PCI DSS'].map((compliance) => (
                    <Button
                      key={compliance}
                      type="button"
                      variant={answers.complianceNeeds?.includes(compliance) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const current = answers.complianceNeeds || [];
                        if (current.includes(compliance)) {
                          updateAnswer('complianceNeeds', current.filter(c => c !== compliance));
                        } else {
                          updateAnswer('complianceNeeds', [...current, compliance]);
                        }
                      }}
                    >
                      {compliance}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between gap-3 pt-6 border-t">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? handleClose : handleBack}
            size="lg"
          >
            {currentStep === 1 ? (
              "Cancel"
            ) : (
              <>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </>
            )}
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="gap-2"
            size="lg"
          >
            {currentStep === totalSteps ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Create Agent
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
