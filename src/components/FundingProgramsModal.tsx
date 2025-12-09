import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, ExternalLink, Calendar, Building2, Target, CheckCircle2 } from "lucide-react";
import { filterFundingPrograms, type FundingProgram } from "@/data/fundingPrograms";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FundingProgramsModalProps {
  isOpen: boolean;
  onClose: () => void;
  department?: string;
  desiredOutcome?: string;
  agentName?: string;
}

export function FundingProgramsModal({ 
  isOpen, 
  onClose, 
  department, 
  desiredOutcome,
  agentName 
}: FundingProgramsModalProps) {
  const programs = filterFundingPrograms(department, desiredOutcome);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] bg-card border-border">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-semibold mb-2">
                Funding Programs
              </DialogTitle>
              <DialogDescription className="text-base text-muted-foreground">
                {agentName ? `Relevant funding opportunities for ${agentName}` : 'Government grants and funding opportunities for your AI system'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Filters Applied */}
        {(department || desiredOutcome) && (
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="text-sm text-muted-foreground">Filtered by:</span>
            {department && (
              <Badge variant="secondary" className="text-sm">
                <Building2 className="h-3 w-3 mr-1" />
                {department}
              </Badge>
            )}
            {desiredOutcome && (
              <Badge variant="secondary" className="text-sm">
                <Target className="h-3 w-3 mr-1" />
                {desiredOutcome}
              </Badge>
            )}
          </div>
        )}

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {programs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No funding programs match your criteria.</p>
                <p className="text-sm mt-1">Try adjusting your filters or check back later for new opportunities.</p>
              </div>
            ) : (
              programs.map((program) => (
                <FundingProgramCard key={program.id} program={program} />
              ))
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Showing {programs.length} matching {programs.length === 1 ? 'program' : 'programs'}
          </p>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FundingProgramCard({ program }: { program: FundingProgram }) {
  return (
    <div className="bg-secondary/5 border border-border rounded-lg p-5 space-y-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-start gap-3 mb-2">
            <h3 className="font-semibold text-lg">{program.name}</h3>
            <Badge variant="outline" className="text-xs">
              {program.matchScore}% match
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-1">{program.provider}</p>
        </div>
        <div className="text-right">
          <div className="font-semibold text-primary text-lg">{program.amount}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Calendar className="h-3 w-3" />
            {program.deadline}
          </div>
        </div>
      </div>

      <p className="text-sm text-foreground">{program.description}</p>

      {/* Eligibility */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Eligibility Requirements
        </h4>
        <div className="flex flex-wrap gap-2">
          {program.eligibility.map((req, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {req}
            </Badge>
          ))}
        </div>
      </div>

      {/* Applicable Areas */}
      <div className="flex flex-wrap gap-2">
        {program.departments.slice(0, 3).map((dept, idx) => (
          <Badge key={idx} variant="secondary" className="text-xs">
            {dept}
          </Badge>
        ))}
        {program.outcomes.slice(0, 2).map((outcome, idx) => (
          <Badge key={`outcome-${idx}`} variant="secondary" className="text-xs">
            {outcome}
          </Badge>
        ))}
      </div>

      <div className="pt-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.open(program.applicationUrl, '_blank')}
          className="w-full sm:w-auto"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          View Application
        </Button>
      </div>
    </div>
  );
}
