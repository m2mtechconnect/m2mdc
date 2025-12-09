import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, ArrowRight, BookOpen, DollarSign, MessageSquare, Sparkles, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FundingProgramsModal } from "./FundingProgramsModal";
import { AgentChatModal } from "./AgentChatModal";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AgentSuggestion {
  title: string;
  one_liner: string;
  department: string;
  starter_workflow: string;
  recommended_model: string;
  relevance_score: number;
  success_metric: string;
  desired_outcome: string;
}

interface AgentPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestion: AgentSuggestion | null;
}

export function AgentPlanModal({ isOpen, onClose, suggestion }: AgentPlanModalProps) {
  const navigate = useNavigate();
  const [isFundingModalOpen, setIsFundingModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  if (!suggestion) return null;

  const handleCreateAgent = async () => {
    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to create an agent');
        setIsCreating(false);
        return;
      }

      const { data: draft, error } = await supabase
        .from('agent_drafts')
        .insert({
          owner_id: user.id,
          goal: { 
            text: suggestion.one_liner,
            title: suggestion.title 
          },
          meta: {
            source: 'dashboard',
            department: suggestion.department,
            desired_outcome: suggestion.desired_outcome,
            success_metric: suggestion.success_metric,
            recommended_model: suggestion.recommended_model,
            starter_workflow: suggestion.starter_workflow
          },
          step_completed: 1,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      onClose();
      navigate(`/builder?draft=${draft.id}&step=2`);
    } catch (error) {
      console.error('Error creating draft:', error);
      toast.error('Failed to create agent draft');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <div className="flex items-start gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-primary/10 flex-shrink-0">
              <Lightbulb className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold mb-1">
                {suggestion.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {suggestion.one_liner}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-xs">
              {suggestion.department}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {suggestion.desired_outcome}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {Math.round(suggestion.relevance_score || 75)}% match
            </Badge>
          </div>

          {/* Recommended Configuration */}
          <div className="bg-muted/50 rounded-lg p-2.5 space-y-1.5">
            <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
              Configuration
            </h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground mb-0.5">Department</div>
                <div className="font-medium text-xs">{suggestion.department}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-0.5">Outcome</div>
                <div className="font-medium text-xs">{suggestion.desired_outcome}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-0.5">Metric</div>
                <div className="font-medium text-xs">{suggestion.success_metric}</div>
              </div>
            </div>
          </div>

          {/* Key Capabilities */}
          <div className="bg-secondary/5 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              <h3 className="font-semibold text-xs">Capabilities</h3>
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li className="flex items-start gap-1.5">
                <span className="text-primary mt-0.5 text-[10px]">•</span>
                <span>Automated {suggestion.starter_workflow.toLowerCase()} workflow</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-primary mt-0.5 text-[10px]">•</span>
                <span>Optimized for {suggestion.department}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-primary mt-0.5 text-[10px]">•</span>
                <span>Tracks {suggestion.success_metric}</span>
              </li>
            </ul>
          </div>

          {/* Starter Workflow */}
          <div className="bg-muted/30 rounded-lg p-2.5">
            <h3 className="font-semibold text-xs mb-1 flex items-center gap-1.5">
              <BookOpen className="h-3 w-3" />
              Workflow
            </h3>
            <p className="text-[11px] text-muted-foreground leading-tight">
              <span className="font-medium text-foreground">{suggestion.starter_workflow}</span> with {suggestion.recommended_model}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <Button 
              onClick={handleCreateAgent}
              disabled={isCreating}
              className="w-full bg-gradient-to-r from-[#FFD700] to-[#3AB6FF] hover:from-[#3AB6FF] hover:to-[#FFD700] text-black font-semibold h-9 text-sm"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
                  Create Agent
                </>
              )}
            </Button>
            
            <div className="grid grid-cols-3 gap-1.5">
              <Button 
                variant="outline" 
                onClick={() => setIsChatModalOpen(true)}
                size="sm"
                className="h-8 text-xs"
              >
                <MessageSquare className="mr-1 h-3 w-3" />
                Chat
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  console.log('View Playbook for:', suggestion.title);
                }}
                size="sm"
                className="h-8 text-xs"
              >
                <BookOpen className="mr-1 h-3 w-3" />
                Playbook
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsFundingModalOpen(true)}
                size="sm"
                className="h-8 text-xs"
              >
                <DollarSign className="mr-1 h-3 w-3" />
                Funding
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      <FundingProgramsModal
        isOpen={isFundingModalOpen}
        onClose={() => setIsFundingModalOpen(false)}
        department={suggestion.department}
        desiredOutcome={suggestion.desired_outcome}
        agentName={suggestion.title}
      />

      <AgentChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        agentName={suggestion.title}
        agentDescription={suggestion.one_liner}
        department={suggestion.department}
        desiredOutcome={suggestion.desired_outcome}
        successMetric={suggestion.success_metric}
        workflow={suggestion.starter_workflow}
        model={suggestion.recommended_model}
      />
    </Dialog>
  );
}
