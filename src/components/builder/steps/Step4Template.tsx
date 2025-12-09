import { useState } from 'react';
import { FileText, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { useWizardBuilderStore } from '@/stores/wizardBuilderStore';

export function Step4Template() {
  const { industry, department, type, template, setTemplate, error } = useWizardBuilderStore();
  const [showAlternatives, setShowAlternatives] = useState(false);

  const recommendedTemplate = `${type === 'agent' ? 'Agent' : type === '3d_twin' ? '3D Twin' : 'Process Twin'} for ${department}`;

  const mockConfig = {
    skills: ['API Integration', 'Event Monitoring', 'Data Processing'],
    workflows: ['Trigger → Process → Notify'],
    tools: ['CRM', 'Email', 'Slack', 'Database'],
    kpis: ['Response Time', 'Success Rate', 'Throughput'],
  };

  const handleSelectTemplate = (templateName: string) => {
    setTemplate(templateName, mockConfig);
  };

  return (
    <div className="space-y-8 max-w-[880px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Load Template</h1>
        <p className="text-muted-foreground mt-2">
          Select template based on your choices
        </p>
      </div>

      <Card className="p-6 border-primary bg-primary/5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-1">Recommended Template</h3>
            <p className="text-sm text-muted-foreground mb-3 break-words">{recommendedTemplate}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{industry}</Badge>
              <Badge variant="secondary">{department}</Badge>
              <Badge variant="secondary">{type}</Badge>
            </div>
            {!template && (
              <Button
                onClick={() => handleSelectTemplate(recommendedTemplate)}
                className="mt-4"
              >
                Use This Template
              </Button>
            )}
          </div>
        </div>
      </Card>

      {template && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="config">
            <AccordionTrigger className="text-sm font-medium">
              Template Configuration
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                <div>
                  <h4 className="text-sm font-medium mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {mockConfig.skills.map((skill, idx) => (
                      <Badge key={idx} variant="outline">{skill}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Workflows</h4>
                  <div className="flex flex-wrap gap-2">
                    {mockConfig.workflows.map((workflow, idx) => (
                      <Badge key={idx} variant="outline">{workflow}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Tools</h4>
                  <div className="flex flex-wrap gap-2">
                    {mockConfig.tools.map((tool, idx) => (
                      <Badge key={idx} variant="outline">{tool}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">KPIs</h4>
                  <div className="flex flex-wrap gap-2">
                    {mockConfig.kpis.map((kpi, idx) => (
                      <Badge key={idx} variant="outline">{kpi}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      <Button
        variant="outline"
        onClick={() => setShowAlternatives(!showAlternatives)}
        className="w-full"
      >
        {showAlternatives ? 'Hide' : 'Show'} Alternative Templates
        <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showAlternatives ? 'rotate-180' : ''}`} />
      </Button>

      {showAlternatives && (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <Card
              key={i}
              className="p-4 cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleSelectTemplate(`Alternative Template ${i}`)}
            >
              <h4 className="font-medium text-sm mb-1">Alternative Template {i}</h4>
              <p className="text-xs text-muted-foreground">
                Similar capabilities with different focus
              </p>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 border border-destructive bg-destructive/10 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}