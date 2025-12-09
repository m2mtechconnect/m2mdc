import type { 
  PlaybookContext, 
  GeneratedPlaybook, 
  PlaybookKPI, 
  PlaybookRisk,
  PlaybookMilestone 
} from '@/types/playbook';
import { generateSimulationScenarios } from './scenarioGenerators';

/**
 * Dynamic playbook generator that creates personalized implementation playbooks
 * based on URL scan results and Digital Twin metadata
 */

export function generateDynamicPlaybook(context: PlaybookContext): GeneratedPlaybook {
  const { urlScanData, recommendation, agentMetadata } = context;
  const industry = urlScanData.industry;

  return {
    id: `playbook-${Date.now()}`,
    title: `${recommendation.title} Implementation Playbook`,
    generatedAt: new Date().toISOString(),
    context,
    
    sections: {
      executiveSummary: generateExecutiveSummary(context),
      industryContext: generateIndustryContext(context),
      architecture: generateArchitecture(context),
      timeline: generateTimeline(context),
      team: generateTeam(context),
      dataSources: generateDataSources(context),
      workflows: generateWorkflows(context),
      simulations: generateSimulationScenarios(industry, recommendation.solution),
      kpis: generateKPIs(context),
      risks: generateRisks(context),
      security: generateSecurity(context),
      funding: generateFunding(context),
      roi: generateROI(context),
      roadmap: generateRoadmap(context),
    }
  };
}

function generateExecutiveSummary(context: PlaybookContext): string {
  const { urlScanData, recommendation, agentMetadata } = context;
  
  const metrics = agentMetadata?.metrics;
  const metricsText = metrics 
    ? `The system has processed ${metrics.totalRuns} runs with a ${metrics.successRate}% success rate and average response time of ${metrics.avgDuration}ms.`
    : 'This is a new deployment with expected performance metrics to be established during pilot phase.';
  
  return `
## Executive Summary

**Business Context:** ${urlScanData.businessModel} operating in the ${urlScanData.industry} sector.

**Challenge Identified:** ${recommendation.problem}

**Proposed Solution:** ${recommendation.solution}

**Implementation Status:** ${metricsText}

**Key Opportunities:**
${urlScanData.opportunities.map(opp => `- ${opp}`).join('\n')}

**Pain Points Addressed:**
${urlScanData.painPoints.map(pain => `- ${pain}`).join('\n')}

This playbook provides a comprehensive roadmap for implementing ${recommendation.title}, tailored specifically to ${urlScanData.url}'s operational requirements and industry context.
  `.trim();
}

function generateIndustryContext(context: PlaybookContext): string {
  const { urlScanData, recommendation } = context;
  const industry = urlScanData.industry;
  
  const industryInsights: Record<string, string> = {
    'finance': 'Financial services face increasing regulatory pressures (AML, KYC, GDPR) alongside rising customer expectations for real-time processing. Digital twins enable compliance automation while maintaining customer experience.',
    'retail': 'Retail operations demand real-time inventory visibility, personalized customer experiences, and omnichannel coordination. Digital twins optimize supply chain efficiency and customer engagement.',
    'manufacturing': 'Manufacturing requires predictive maintenance, quality control, and production optimization. Digital twins provide real-time visibility into equipment health and process efficiency.',
    'healthcare': 'Healthcare organizations must balance patient safety, regulatory compliance (HIPAA), and operational efficiency. Digital twins enable proactive care coordination and risk management.',
    'logistics': 'Logistics operations depend on route optimization, real-time tracking, and capacity management. Digital twins improve delivery performance and customer satisfaction.',
    'construction': 'Construction projects require permit management, safety compliance, and schedule optimization. Digital twins provide visibility across complex, multi-stakeholder projects.',
  };
  
  const insight = Object.keys(industryInsights).find(key => 
    industry.toLowerCase().includes(key)
  );
  
  return `
## Industry Context & Opportunity

**Industry:** ${industry}

**Market Context:** ${insight ? industryInsights[insight] : 'This industry faces unique operational and competitive challenges that digital transformation can address.'}

**Detected Keywords:** ${urlScanData.detectedKeywords.join(', ')}

**Competitive Advantage:** Implementing ${recommendation.title} positions ${urlScanData.url} ahead of competitors by:
- Automating manual processes
- Reducing operational risk
- Improving compliance posture
- Enhancing customer experience
- Enabling data-driven decision-making

**Industry Benchmarks:** Organizations implementing similar solutions report 30-50% efficiency gains, 40-60% error reduction, and 6-12 month ROI periods.
  `.trim();
}

function generateArchitecture(context: PlaybookContext): any {
  const { agentMetadata, recommendation } = context;
  
  const integrations = agentMetadata?.integrations || [
    'Slack (notifications)',
    'Salesforce (CRM)',
    'Microsoft Teams (collaboration)',
    'Google Analytics (metrics)'
  ];
  
  const components = agentMetadata?.blueprint?.agents?.map((a: any) => a.name) || [
    'Primary Intelligence Agent',
    'Data Validation Service',
    'Integration Gateway',
    'Monitoring Dashboard'
  ];
  
  return {
    overview: `The ${recommendation.title} architecture follows a microservices pattern with event-driven communication. Core components handle data ingestion, intelligence processing, decision automation, and stakeholder notification.`,
    components,
    integrations
  };
}

function generateTimeline(context: PlaybookContext): PlaybookMilestone[] {
  return [
    {
      phase: 'Phase 1: Foundation',
      duration: '2 weeks',
      deliverables: [
        'Environment setup and configuration',
        'Core integrations established',
        'Initial data pipeline operational',
        'Security controls implemented'
      ]
    },
    {
      phase: 'Phase 2: Intelligence Configuration',
      duration: '3 weeks',
      deliverables: [
        'LLM model selection and tuning',
        'Knowledge base integration',
        'Workflow automation rules',
        'Testing framework established'
      ],
      dependencies: ['Phase 1 completion']
    },
    {
      phase: 'Phase 3: Pilot Deployment',
      duration: '3 weeks',
      deliverables: [
        'Limited production rollout',
        'User training completion',
        'Performance baseline established',
        'Feedback collection system'
      ],
      dependencies: ['Phase 2 completion']
    },
    {
      phase: 'Phase 4: Full Production',
      duration: '2 weeks',
      deliverables: [
        'Complete production deployment',
        'Monitoring dashboards live',
        'Documentation finalized',
        'Handoff to operations team'
      ],
      dependencies: ['Phase 3 completion', 'Stakeholder sign-off']
    }
  ];
}

function generateTeam(context: PlaybookContext): any {
  const { urlScanData } = context;
  
  return {
    roles: [
      {
        title: 'AI Solution Architect',
        responsibilities: [
          'System design and architecture decisions',
          'Integration strategy',
          'Performance optimization'
        ],
        fte: 0.5
      },
      {
        title: 'Data Engineer',
        responsibilities: [
          'Data pipeline development',
          'Integration implementation',
          'Data quality assurance'
        ],
        fte: 1.0
      },
      {
        title: 'ML Engineer / Prompt Engineer',
        responsibilities: [
          'LLM configuration and tuning',
          'Model performance monitoring',
          'Prompt optimization'
        ],
        fte: 0.5
      },
      {
        title: 'DevOps Engineer',
        responsibilities: [
          'Infrastructure setup',
          'CI/CD pipeline',
          'Monitoring and alerting'
        ],
        fte: 0.5
      },
      {
        title: 'Business Analyst',
        responsibilities: [
          'Requirements gathering',
          'User acceptance testing',
          'Training and documentation'
        ],
        fte: 0.3
      }
    ],
    techStack: [
      'AURA Platform (M2M)',
      'Google Gemini / OpenAI GPT',
      'Supabase (database)',
      'Python / TypeScript',
      'Docker / Kubernetes',
      ...context.agentMetadata?.integrations || []
    ]
  };
}

function generateDataSources(context: PlaybookContext): any[] {
  const { urlScanData, agentMetadata } = context;
  
  const sources = agentMetadata?.blueprint?.data_sources || [];
  
  if (sources.length > 0) {
    return sources.map((source: any) => ({
      name: source.name,
      type: source.type,
      purpose: source.description || 'Critical data source for operations'
    }));
  }
  
  // Generate realistic mock data sources based on industry
  const industry = urlScanData.industry.toLowerCase();
  
  if (industry.includes('financ')) {
    return [
      { name: 'Core Banking System', type: 'Database', purpose: 'Transaction and account data' },
      { name: 'CRM Platform', type: 'API', purpose: 'Customer profiles and history' },
      { name: 'Compliance Database', type: 'Database', purpose: 'KYC/AML records' },
      { name: 'Risk Scoring System', type: 'API', purpose: 'Real-time risk assessments' }
    ];
  }
  
  if (industry.includes('retail')) {
    return [
      { name: 'E-commerce Platform', type: 'API', purpose: 'Order and inventory data' },
      { name: 'Customer Analytics', type: 'Data Warehouse', purpose: 'Behavioral insights' },
      { name: 'Supply Chain System', type: 'Database', purpose: 'Inventory and logistics' },
      { name: 'Payment Gateway', type: 'API', purpose: 'Transaction processing' }
    ];
  }
  
  return [
    { name: 'Primary Operations System', type: 'Database', purpose: 'Core business data' },
    { name: 'Customer Platform', type: 'API', purpose: 'Customer interactions' },
    { name: 'Analytics System', type: 'Data Warehouse', purpose: 'Reporting and insights' }
  ];
}

function generateWorkflows(context: PlaybookContext): any {
  const { agentMetadata, recommendation } = context;
  
  const workflows = agentMetadata?.workflows || [];
  
  if (workflows.length > 0) {
    return {
      overview: 'Workflows are configured based on the deployed digital twin blueprint.',
      key_workflows: workflows.slice(0, 5).map((w: any) => ({
        name: w.name,
        trigger: w.trigger_type || 'Event-based',
        actions: ['Process', 'Validate', 'Notify']
      }))
    };
  }
  
  return {
    overview: `${recommendation.title} operates through automated workflows that detect events, apply intelligence, and trigger appropriate actions.`,
    key_workflows: [
      {
        name: 'Event Detection & Ingestion',
        trigger: 'Real-time data stream',
        actions: ['Capture event', 'Validate format', 'Route to processor']
      },
      {
        name: 'Intelligence Processing',
        trigger: 'New event received',
        actions: ['Apply LLM analysis', 'Enrich with context', 'Generate recommendation']
      },
      {
        name: 'Decision Automation',
        trigger: 'Intelligence output',
        actions: ['Evaluate rules', 'Execute action', 'Log decision']
      },
      {
        name: 'Stakeholder Notification',
        trigger: 'Action completed',
        actions: ['Format message', 'Send notification', 'Track acknowledgment']
      }
    ]
  };
}

function generateKPIs(context: PlaybookContext): PlaybookKPI[] {
  const { urlScanData, agentMetadata } = context;
  const industry = urlScanData.industry.toLowerCase();
  
  // Use real metrics if available
  if (agentMetadata?.metrics) {
    const m = agentMetadata.metrics;
    return [
      {
        name: 'System Runs',
        baseline: '0',
        target: `${m.totalRuns * 2}`,
        timeframe: '90 days',
        metric: 'Total executions'
      },
      {
        name: 'Success Rate',
        baseline: '0%',
        target: `${Math.min(m.successRate + 10, 99)}%`,
        timeframe: '90 days',
        metric: 'Successful completions'
      },
      {
        name: 'Response Time',
        baseline: 'N/A',
        target: `<${Math.max(m.avgDuration - 500, 500)}ms`,
        timeframe: '90 days',
        metric: 'Average latency'
      }
    ];
  }
  
  // Industry-specific KPIs
  if (industry.includes('financ')) {
    return [
      { name: 'False Positive Rate', baseline: '25%', target: '<10%', timeframe: '6 months', metric: 'Accuracy' },
      { name: 'Detection Speed', baseline: '4 hours', target: '<30 minutes', timeframe: '3 months', metric: 'Latency' },
      { name: 'Manual Review Time', baseline: '45 min/case', target: '<15 min/case', timeframe: '6 months', metric: 'Efficiency' },
      { name: 'Compliance Coverage', baseline: '70%', target: '95%', timeframe: '6 months', metric: 'Coverage' }
    ];
  }
  
  if (industry.includes('retail')) {
    return [
      { name: 'Inventory Accuracy', baseline: '85%', target: '98%', timeframe: '90 days', metric: 'Accuracy' },
      { name: 'Order Fulfillment Time', baseline: '3 days', target: '<24 hours', timeframe: '6 months', metric: 'Speed' },
      { name: 'Customer Satisfaction', baseline: '3.8/5', target: '4.5/5', timeframe: '6 months', metric: 'CSAT' },
      { name: 'Stockout Rate', baseline: '12%', target: '<3%', timeframe: '90 days', metric: 'Availability' }
    ];
  }
  
  // Generic KPIs
  return [
    { name: 'Processing Time', baseline: 'Manual (hours)', target: '<5 minutes', timeframe: '90 days', metric: 'Speed' },
    { name: 'Error Rate', baseline: '15%', target: '<5%', timeframe: '6 months', metric: 'Accuracy' },
    { name: 'User Adoption', baseline: '0%', target: '80%', timeframe: '6 months', metric: 'Adoption' },
    { name: 'Cost Reduction', baseline: '$0', target: '30% savings', timeframe: '12 months', metric: 'ROI' }
  ];
}

function generateRisks(context: PlaybookContext): PlaybookRisk[] {
  const { urlScanData } = context;
  const industry = urlScanData.industry.toLowerCase();
  
  const commonRisks: PlaybookRisk[] = [
    {
      category: 'Technical',
      description: 'Integration complexity with legacy systems',
      severity: 'medium',
      mitigation: 'Phased integration approach, API gateway implementation, thorough testing'
    },
    {
      category: 'Operational',
      description: 'User adoption and change management',
      severity: 'medium',
      mitigation: 'Comprehensive training program, pilot user group, feedback loops'
    },
    {
      category: 'Data',
      description: 'Data quality and completeness issues',
      severity: 'high',
      mitigation: 'Data validation layer, cleansing procedures, quality metrics'
    }
  ];
  
  if (industry.includes('financ') || industry.includes('health')) {
    commonRisks.push({
      category: 'Compliance',
      description: 'Regulatory requirements and audit trails',
      severity: 'high',
      mitigation: 'Built-in compliance controls, comprehensive logging, regular audits'
    });
  }
  
  return commonRisks;
}

function generateSecurity(context: PlaybookContext): any {
  return {
    requirements: [
      'End-to-end encryption for data in transit and at rest',
      'Role-based access control (RBAC)',
      'Multi-factor authentication (MFA)',
      'Comprehensive audit logging',
      'Regular security assessments',
      'Incident response procedures'
    ],
    compliance: [
      'SOC 2 Type II compliance',
      'GDPR data protection',
      'Industry-specific regulations',
      'Data residency requirements',
      'Regular compliance audits'
    ]
  };
}

function generateFunding(context: PlaybookContext): any[] {
  // Canadian funding programs relevant to AI/digital twin implementation
  return [
    {
      program: 'Scale AI - AI Applications Stream',
      eligibility: 'Canadian companies implementing AI solutions',
      amount: 'Up to $1M matching contribution'
    },
    {
      program: 'NRC IRAP - AI Program',
      eligibility: 'SMEs developing or adopting AI technologies',
      amount: 'Up to $10M in advisory services and funding'
    },
    {
      program: 'CDAP - Boost Your Business Technology',
      eligibility: 'SMEs investing in digital transformation',
      amount: 'Up to $15K grant for digital adoption'
    },
    {
      program: 'Strategic Innovation Fund (SIF)',
      eligibility: 'Large-scale transformative projects',
      amount: 'Variable, up to hundreds of millions'
    }
  ];
}

function generateROI(context: PlaybookContext): any {
  const { urlScanData, recommendation } = context;
  const industry = urlScanData.industry.toLowerCase();
  
  let projectedSavings = '$250K-500K annually';
  let paybackPeriod = '6-12 months';
  
  if (industry.includes('financ')) {
    projectedSavings = '$400K-800K annually';
    paybackPeriod = '4-8 months';
  } else if (industry.includes('manufacturing')) {
    projectedSavings = '$300K-600K annually';
    paybackPeriod = '6-10 months';
  }
  
  return {
    projectedSavings,
    paybackPeriod,
    assumptions: [
      'Time savings from automation: 40-60%',
      'Error reduction: 50-70%',
      'Improved compliance reducing penalties',
      'Enhanced decision-making speed',
      'Reduced manual overhead costs'
    ]
  };
}

function generateRoadmap(context: PlaybookContext): any[] {
  return [
    {
      week: 'Week 1-2',
      focus: 'Foundation & Planning',
      tasks: [
        'Finalize requirements with stakeholders',
        'Set up development environment',
        'Configure initial integrations',
        'Establish success metrics'
      ]
    },
    {
      week: 'Week 3-5',
      focus: 'Core Development',
      tasks: [
        'Implement data pipelines',
        'Configure intelligence layer',
        'Build automation workflows',
        'Develop monitoring dashboards'
      ]
    },
    {
      week: 'Week 6-8',
      focus: 'Testing & Refinement',
      tasks: [
        'Execute test scenarios',
        'Tune performance parameters',
        'Conduct user acceptance testing',
        'Refine based on feedback'
      ]
    },
    {
      week: 'Week 9-10',
      focus: 'Pilot Deployment',
      tasks: [
        'Deploy to pilot user group',
        'Monitor real-world performance',
        'Gather user feedback',
        'Document learnings'
      ]
    },
    {
      week: 'Week 11-12',
      focus: 'Production Launch',
      tasks: [
        'Full production deployment',
        'Complete user training',
        'Activate monitoring systems',
        'Transition to operations team'
      ]
    }
  ];
}
