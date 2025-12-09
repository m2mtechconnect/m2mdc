/**
 * Dynamic Implementation Playbook Types
 * Based on URL scan results + Digital Twin metadata
 */

export interface PlaybookContext {
  // From URL scan
  urlScanData: {
    url: string;
    industry: string;
    businessModel: string;
    painPoints: string[];
    opportunities: string[];
    detectedKeywords: string[];
  };
  
  // From recommendation
  recommendation: {
    id: string;
    title: string;
    problem: string;
    solution: string;
    department?: string;
    tags?: string[];
  };
  
  // From deployed agent/twin (if available)
  agentMetadata?: {
    id: string;
    name: string;
    description: string;
    blueprint: any;
    workflows: any[];
    integrations: string[];
    metrics?: {
      totalRuns: number;
      successRate: number;
      avgDuration: number;
      errorRate: number;
    };
  };
}

export interface SimulationScenario {
  id: string;
  title: string;
  description: string;
  industry: string;
  category: 'high-risk' | 'normal' | 'edge-case';
  expectedOutcome: string;
  testQuery: string;
  expectedDuration: string;
}

export interface PlaybookKPI {
  name: string;
  baseline: string;
  target: string;
  timeframe: string;
  metric: string;
}

export interface PlaybookRisk {
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface PlaybookMilestone {
  phase: string;
  duration: string;
  deliverables: string[];
  dependencies?: string[];
}

export interface PlaybookSection {
  title: string;
  content: string | any;
  order: number;
}

export interface GeneratedPlaybook {
  id: string;
  title: string;
  generatedAt: string;
  context: PlaybookContext;
  
  sections: {
    executiveSummary: string;
    industryContext: string;
    architecture: {
      overview: string;
      components: string[];
      integrations: string[];
    };
    timeline: PlaybookMilestone[];
    team: {
      roles: Array<{
        title: string;
        responsibilities: string[];
        fte: number;
      }>;
      techStack: string[];
    };
    dataSources: Array<{
      name: string;
      type: string;
      purpose: string;
    }>;
    workflows: {
      overview: string;
      key_workflows: Array<{
        name: string;
        trigger: string;
        actions: string[];
      }>;
    };
    simulations: SimulationScenario[];
    kpis: PlaybookKPI[];
    risks: PlaybookRisk[];
    security: {
      requirements: string[];
      compliance: string[];
    };
    funding: Array<{
      program: string;
      eligibility: string;
      amount: string;
    }>;
    roi: {
      projectedSavings: string;
      paybackPeriod: string;
      assumptions: string[];
    };
    roadmap: Array<{
      week: string;
      focus: string;
      tasks: string[];
    }>;
  };
}
