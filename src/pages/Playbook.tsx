import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, BookOpen, Download, CheckCircle2, Clock, Users, DollarSign, Target, Shield, TrendingUp, Calendar } from "lucide-react";
import { usePlaybookGeneration } from "@/hooks/usePlaybookGeneration";
import { CoPilotInput } from "@/components/copilot/CoPilotInput";
import { useCoPilotContext } from "@/contexts/CoPilotContext";
import ReactMarkdown from 'react-markdown';

export default function Playbook() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateContext } = useCoPilotContext();
  const initiativeTitle = searchParams.get('initiative') || 'AI Initiative';
  const initiativeId = searchParams.get('id') || '';
  const url = searchParams.get('url') || undefined;
  
  // Generate dynamic playbook content
  const playbook = usePlaybookGeneration({ initiativeTitle, initiativeId, url });
  
  // Update Co-Pilot context with playbook info
  useEffect(() => {
    updateContext({
      activePage: 'playbook',
      industry: playbook.context?.urlScanData?.industry,
    });
  }, [updateContext, playbook.context]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button 
          variant="ghost" 
          onClick={() => {
            // Navigate back to the main AI Workspace where recommendations are displayed
            // The Zustand store will restore the recommendations state and scroll position
            navigate('/dashboard');
          }}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Recommendations
        </Button>

        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-6 w-6 text-primary" />
                  <Badge variant="outline">Implementation Playbook</Badge>
                </div>
                <h1 className="text-3xl font-semibold leading-none tracking-tight mb-2">
                  {initiativeTitle}
                </h1>
                <CardDescription>
                  Comprehensive implementation guide and best practices
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Executive Summary */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Executive Summary
              </h2>
              <div className="prose prose-sm max-w-none text-muted-foreground">
                <ReactMarkdown>{playbook.sections.executiveSummary}</ReactMarkdown>
              </div>
            </section>

            <Separator />

            {/* Industry Context */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Industry Context & Opportunity
              </h2>
              <div className="prose prose-sm max-w-none text-muted-foreground">
                <ReactMarkdown>{playbook.sections.industryContext}</ReactMarkdown>
              </div>
            </section>

            <Separator />

            {/* Timeline */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Implementation Timeline
              </h2>
              <div className="space-y-4">
                {playbook.sections.timeline.map((milestone, idx) => (
                  <Card key={idx} className="bg-muted/50">
                    <CardHeader>
                      <CardTitle className="text-lg">{milestone.phase}</CardTitle>
                      <CardDescription>{milestone.duration}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {milestone.deliverables.map((deliverable, didx) => (
                          <li key={didx}>{deliverable}</li>
                        ))}
                      </ul>
                      {milestone.dependencies && milestone.dependencies.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          Dependencies: {milestone.dependencies.join(', ')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <Separator />

            {/* Resources */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Required Resources
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Team Composition</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {playbook.sections.team.roles.map((role, idx) => (
                        <li key={idx}>
                          • {role.title} ({role.fte} FTE)
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Technical Stack</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {playbook.sections.team.techStack.map((tech, idx) => (
                        <li key={idx}>• {tech}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </section>

            <Separator />

            {/* Simulation Scenarios */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Simulation Scenarios
              </h2>
              <p className="text-muted-foreground mb-4">
                Industry-specific test scenarios to validate the digital twin before production deployment:
              </p>
              <div className="grid gap-3">
                {playbook.sections.simulations.slice(0, 8).map((scenario, idx) => (
                  <Card key={idx} className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-sm">{scenario.title}</h3>
                        <Badge variant={scenario.category === 'high-risk' ? 'destructive' : scenario.category === 'normal' ? 'default' : 'secondary'} className="text-xs">
                          {scenario.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{scenario.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Expected: {scenario.expectedDuration}</span>
                        <span className="text-primary font-mono">{scenario.testQuery}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3 italic">
                Showing 8 of {playbook.sections.simulations.length} simulation scenarios
              </p>
            </section>

            <Separator />

            {/* ROI & Funding */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                ROI & Funding Opportunities
              </h2>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Expected ROI</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Projected Savings:</span>
                        <span className="font-semibold">{playbook.sections.roi.projectedSavings}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payback Period:</span>
                        <span className="font-semibold">{playbook.sections.roi.paybackPeriod}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Key Assumptions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {playbook.sections.roi.assumptions.map((assumption, idx) => (
                        <li key={idx}>• {assumption}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
              
              <h3 className="text-lg font-semibold mb-3">Canadian Funding Programs</h3>
              <div className="grid gap-3">
                {playbook.sections.funding.map((program, idx) => (
                  <Card key={idx} className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-sm">{program.program}</h4>
                        <Badge variant="outline" className="text-xs">{program.amount}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{program.eligibility}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <Separator />

            {/* KPIs */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Key Performance Indicators
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {playbook.sections.kpis.map((kpi, idx) => (
                  <Card key={idx}>
                    <CardHeader>
                      <CardTitle className="text-sm">{kpi.name}</CardTitle>
                      <CardDescription className="text-xs">{kpi.metric}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Baseline:</span>
                          <span>{kpi.baseline}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Target:</span>
                          <span className="font-semibold text-primary">{kpi.target}</span>
                        </div>
                        <div className="text-muted-foreground text-[10px] mt-1">{kpi.timeframe}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <Separator />

            {/* 90-Day Roadmap */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                90-Day Execution Plan
              </h2>
              <div className="space-y-3">
                {playbook.sections.roadmap.map((week, idx) => (
                  <Card key={idx} className="bg-muted/30">
                    <CardHeader>
                      <CardTitle className="text-base">{week.week}: {week.focus}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {week.tasks.map((task, tidx) => (
                          <li key={tidx}>{task}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <Separator />

            {/* Risks & Controls */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Risks & Mitigation Controls
              </h2>
              <div className="space-y-3">
                {playbook.sections.risks.map((risk, idx) => (
                  <Card key={idx} className={
                    risk.severity === 'high' ? 'border-destructive/50' :
                    risk.severity === 'medium' ? 'border-yellow-500/50' :
                    'border-muted'
                  }>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-sm">{risk.category}</h3>
                          <p className="text-xs text-muted-foreground mt-1">{risk.description}</p>
                        </div>
                        <Badge 
                          variant={risk.severity === 'high' ? 'destructive' : risk.severity === 'medium' ? 'outline' : 'secondary'}
                          className="text-xs ml-2"
                        >
                          {risk.severity}
                        </Badge>
                      </div>
                      <div className="mt-3 p-3 bg-muted/50 rounded-md">
                        <p className="text-xs"><strong>Mitigation:</strong> {risk.mitigation}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <Separator />

            {/* Security & Compliance */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Security & Governance
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Security Requirements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      {playbook.sections.security.requirements.map((req, idx) => (
                        <li key={idx}>• {req}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Compliance Standards</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      {playbook.sections.security.compliance.map((comp, idx) => (
                        <li key={idx}>• {comp}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Ask AURA Assistant About This Playbook */}
            <section className="bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5 rounded-lg p-6 border border-border/50">
              <h3 className="text-lg font-semibold mb-3">Questions About This Implementation?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ask AURA Assistant for clarification, additional recommendations, or specific guidance for your use case.
              </p>
              <CoPilotInput placeholder="Ask about implementation details, ROI, risks, or next steps..." />
            </section>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              <Button size="lg" className="flex-1" onClick={() => navigate(`/pilot?initiative=${encodeURIComponent(initiativeTitle)}&id=${initiativeId}`)}>
                Start Pilot Program
              </Button>
              <Button size="lg" variant="outline" className="flex-1" onClick={() => navigate(-1)}>
                Back to Recommendations
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
