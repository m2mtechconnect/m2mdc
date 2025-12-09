/**
 * Sovereign Data Center Dynamic Playbook Generator
 * Generates implementation playbooks based on twin configuration
 */

import type {
  SovereignDCFacility,
  SovereignKpis,
  SimulationRun,
  SovereignDCTemplateConfig,
  SovereignDCPlaybook,
  SovereignDCPlaybookSection,
} from '@/types/sovereignDataCenterTwin';

interface PlaybookInput {
  facility: SovereignDCFacility;
  enabledModels: SovereignDCTemplateConfig['enabledModels'];
  recentSimulations: SimulationRun[];
  targetKpis?: Partial<SovereignKpis>;
}

/**
 * Generate a dynamic implementation playbook
 */
export function generatePlaybook(input: PlaybookInput): SovereignDCPlaybook {
  const { facility, enabledModels, recentSimulations, targetKpis } = input;
  
  const generatedAt = new Date().toISOString();
  
  // Generate executive summary
  const executiveSummary = generateExecutiveSummary(facility, enabledModels, recentSimulations);
  
  // Generate implementation phases
  const implementationPhases = generateImplementationPhases(facility, enabledModels);
  
  // Generate resource needs
  const resourceNeeds = generateResourceNeeds(enabledModels);
  
  // Generate KPI targets
  const kpiTargets = generateKpiTargets(facility.baseKpis, targetKpis);
  
  // Generate risk mitigation
  const riskMitigation = generateRiskMitigation(facility, recentSimulations);
  
  // Generate compliance checklist
  const complianceChecklist = generateComplianceChecklist(enabledModels);

  return {
    id: `playbook-${facility.id}-${Date.now()}`,
    facilityName: facility.name,
    generatedAt,
    executiveSummary,
    implementationPhases,
    resourceNeeds,
    kpiTargets,
    riskMitigation,
    complianceChecklist,
  };
}

function generateExecutiveSummary(
  facility: SovereignDCFacility,
  enabledModels: SovereignDCTemplateConfig['enabledModels'],
  simulations: SimulationRun[]
): string {
  const enabledCount = Object.values(enabledModels).filter(Boolean).length;
  const renewablePct = Math.round((facility.energyMix.renewable || 0) * 100);
  const sovereignPct = facility.baseKpis.sovereignComputeRatioPct;
  
  const lastSimulation = simulations[0];
  const simulationInsight = lastSimulation
    ? `Recent simulations indicate ${lastSimulation.resultsSummary.split('.')[0]}.`
    : 'No simulation data available yet.';

  return `
## Executive Summary

**Facility**: ${facility.name} (${facility.region})

This implementation playbook outlines the deployment and optimization strategy for the ${facility.name} Sovereign AI Data Centre Digital Twin. The twin enables real-time monitoring and predictive simulation across ${enabledCount} operational domains.

### Key Metrics at Baseline
- **Sovereign Compute Ratio**: ${sovereignPct}%
- **Renewable Energy Mix**: ${renewablePct}%
- **Effective AI PUE**: ${facility.baseKpis.effectiveAiPue.toFixed(2)}
- **Carbon Intensity**: ${facility.baseKpis.gco2PerGpuHour}g CO2/GPU-hr

### Simulation Insights
${simulationInsight}

### Strategic Value
This digital twin provides enterprise-grade visibility into energy consumption, data sovereignty compliance, and financial performance. It enables proactive scenario modeling to optimize capital allocation between green and conventional infrastructure investments.
`.trim();
}

function generateImplementationPhases(
  facility: SovereignDCFacility,
  enabledModels: SovereignDCTemplateConfig['enabledModels']
): SovereignDCPlaybookSection[] {
  const phases: SovereignDCPlaybookSection[] = [
    {
      title: 'Phase 1: Discovery & Assessment (Week 1-2)',
      content: `
- Audit existing DCIM and telemetry systems
- Map data sources for ${Object.entries(enabledModels).filter(([_, v]) => v).map(([k]) => k.replace(/([A-Z])/g, ' $1').trim()).join(', ')}
- Identify integration endpoints (Kubernetes, power monitoring, cooling systems)
- Document current KPI baselines and data residency requirements
- Stakeholder alignment workshop
      `.trim(),
      subsections: [
        {
          title: 'Technical Prerequisites',
          content: `
- API access to facility management systems
- Read access to power and cooling telemetry
- GPU cluster monitoring endpoints
- Data classification inventory
          `.trim(),
        },
      ],
    },
    {
      title: 'Phase 2: Design & Architecture (Week 3-4)',
      content: `
- Design data ingestion pipelines
- Define KPI calculation logic and thresholds
- Configure simulation scenario library
- Design alert and escalation workflows
- Security and compliance review
      `.trim(),
    },
    {
      title: 'Phase 3: Build & Integration (Week 5-8)',
      content: `
- Deploy data connectors
- Configure real-time dashboards
- Implement simulation engine integrations
- Build alert routing rules
- Develop custom reports for ${facility.name}
      `.trim(),
      subsections: enabledModels.energyEmissions ? [
        {
          title: 'Energy & Emissions Module',
          content: `
- Connect to grid metering APIs
- Integrate renewable energy certificate tracking
- Configure carbon accounting calculations
- Set up emissions reporting workflows
          `.trim(),
        },
      ] : [],
    },
    {
      title: 'Phase 4: Deployment & Validation (Week 9-10)',
      content: `
- UAT with operations team
- Run baseline simulation scenarios
- Validate KPI accuracy against manual calculations
- Performance and load testing
- Documentation and training materials
      `.trim(),
    },
    {
      title: 'Phase 5: Optimization & Continuous Improvement',
      content: `
- Quarterly KPI target review
- Simulation scenario expansion
- Machine learning model tuning
- Capacity planning updates
- Regulatory compliance audits
      `.trim(),
    },
  ];

  return phases;
}

function generateResourceNeeds(
  enabledModels: SovereignDCTemplateConfig['enabledModels']
): SovereignDCPlaybookSection {
  const resources: string[] = [
    '**Core Team**: Project Manager, Data Engineer, Platform Engineer',
  ];

  if (enabledModels.energyEmissions) {
    resources.push('**Energy & Emissions**: Sustainability Analyst, Grid Integration Specialist');
  }
  if (enabledModels.gpuCapacity) {
    resources.push('**GPU & Compute**: ML Infrastructure Engineer, Capacity Planner');
  }
  if (enabledModels.sovereigntyDataResidency) {
    resources.push('**Sovereignty**: Compliance Officer, Data Governance Lead');
  }
  if (enabledModels.financialPolicy) {
    resources.push('**Financial**: FinOps Analyst, Procurement Lead');
  }
  if (enabledModels.incidentEmergency) {
    resources.push('**Incident Response**: SRE Lead, Security Operations');
  }

  resources.push(`
### Infrastructure Requirements
- Compute: 4 vCPUs, 16GB RAM for twin runtime
- Storage: 100GB for historical data (12 months)
- Network: Low-latency connection to facility telemetry
- Backup: DR site with 4-hour RTO
  `.trim());

  return {
    title: 'Resource Requirements',
    content: resources.join('\n\n'),
  };
}

function generateKpiTargets(
  baseKpis: SovereignKpis,
  targetKpis?: Partial<SovereignKpis>
): SovereignDCPlaybook['kpiTargets'] {
  return [
    {
      kpi: 'Sovereign Compute Ratio',
      current: baseKpis.sovereignComputeRatioPct,
      target: targetKpis?.sovereignComputeRatioPct || Math.min(baseKpis.sovereignComputeRatioPct + 3, 100),
      unit: '%',
    },
    {
      kpi: 'Effective AI PUE',
      current: baseKpis.effectiveAiPue,
      target: targetKpis?.effectiveAiPue || Math.max(baseKpis.effectiveAiPue - 0.05, 1.1),
      unit: '',
    },
    {
      kpi: 'Carbon Intensity',
      current: baseKpis.gco2PerGpuHour,
      target: targetKpis?.gco2PerGpuHour || Math.max(baseKpis.gco2PerGpuHour * 0.85, 15),
      unit: 'g CO2/GPU-hr',
    },
    {
      kpi: 'Sovereign Risk Score',
      current: baseKpis.sovereignRiskScore,
      target: targetKpis?.sovereignRiskScore || Math.max(baseKpis.sovereignRiskScore - 10, 5),
      unit: 'pts (lower better)',
    },
    {
      kpi: 'Economic Efficiency',
      current: baseKpis.economicEfficiencyScore,
      target: targetKpis?.economicEfficiencyScore || Math.min(baseKpis.economicEfficiencyScore + 8, 95),
      unit: 'pts',
    },
  ];
}

function generateRiskMitigation(
  facility: SovereignDCFacility,
  simulations: SimulationRun[]
): SovereignDCPlaybookSection {
  const risks: string[] = [];
  
  // Analyze simulations for risks
  const coolingFailures = simulations.filter(s => s.type === 'cooling_failure');
  const carbonShocks = simulations.filter(s => s.type === 'carbon_price_shock');
  
  if (facility.energyMix.naturalGas > 0.3) {
    risks.push(`
### Carbon Price Exposure
**Risk Level**: High
**Mitigation**: 
- Accelerate PPA negotiations with renewable suppliers
- Budget for carbon offset purchases
- Model scenario at $200/t carbon price quarterly
    `.trim());
  }

  if (coolingFailures.length > 0) {
    risks.push(`
### Cooling System Reliability
**Risk Level**: Medium
**Mitigation**:
- Implement N+1 cooling redundancy
- Monthly thermal stress testing
- Real-time PUE monitoring with 1.5 threshold alerts
    `.trim());
  }

  if (facility.baseKpis.sovereignRiskScore > 20) {
    risks.push(`
### Data Sovereignty Compliance
**Risk Level**: Medium-High
**Mitigation**:
- Quarterly data flow audits
- Automated jurisdiction tagging for all workloads
- Compliance dashboard with real-time alerts
    `.trim());
  }

  risks.push(`
### Operational Continuity
**Risk Level**: Standard
**Mitigation**:
- 99.99% uptime SLA with financial penalties
- Automated failover testing monthly
- Incident playbook review quarterly
  `.trim());

  return {
    title: 'Risk Mitigation Strategy',
    content: risks.join('\n\n'),
  };
}

function generateComplianceChecklist(
  enabledModels: SovereignDCTemplateConfig['enabledModels']
): SovereignDCPlaybook['complianceChecklist'] {
  const checklist: SovereignDCPlaybook['complianceChecklist'] = [
    { item: 'PIPEDA data residency documentation', status: 'required' },
    { item: 'Provincial data protection compliance', status: 'required' },
    { item: 'SOC 2 Type II audit', status: 'required' },
    { item: 'ISO 27001 certification', status: 'recommended' },
  ];

  if (enabledModels.energyEmissions) {
    checklist.push(
      { item: 'Carbon reporting (CSA/GRI standards)', status: 'required' },
      { item: 'Renewable energy certificate tracking', status: 'recommended' },
      { item: 'Net-zero pathway documentation', status: 'optional' }
    );
  }

  if (enabledModels.financialPolicy) {
    checklist.push(
      { item: 'FinOps maturity assessment', status: 'recommended' },
      { item: 'TCO model documentation', status: 'recommended' }
    );
  }

  if (enabledModels.sovereigntyDataResidency) {
    checklist.push(
      { item: 'Data classification inventory', status: 'required' },
      { item: 'Cross-border data flow agreements', status: 'required' },
      { item: 'Government workload isolation documentation', status: 'optional' }
    );
  }

  return checklist;
}

/**
 * Convert playbook to Markdown for export
 */
export function playbookToMarkdown(playbook: SovereignDCPlaybook): string {
  const lines: string[] = [
    `# Implementation Playbook: ${playbook.facilityName}`,
    `_Generated: ${new Date(playbook.generatedAt).toLocaleDateString()}_`,
    '',
    playbook.executiveSummary,
    '',
    '---',
    '',
    '## Implementation Phases',
    '',
  ];

  for (const phase of playbook.implementationPhases) {
    lines.push(`### ${phase.title}`);
    lines.push(phase.content);
    lines.push('');
    
    for (const sub of phase.subsections || []) {
      lines.push(`#### ${sub.title}`);
      lines.push(sub.content);
      lines.push('');
    }
  }

  lines.push('---', '', `## ${playbook.resourceNeeds.title}`, playbook.resourceNeeds.content, '');

  lines.push('---', '', '## KPI Targets', '', '| KPI | Current | Target | Unit |', '|-----|---------|--------|------|');
  for (const kpi of playbook.kpiTargets) {
    lines.push(`| ${kpi.kpi} | ${kpi.current.toFixed(1)} | ${kpi.target.toFixed(1)} | ${kpi.unit} |`);
  }
  lines.push('');

  lines.push('---', '', `## ${playbook.riskMitigation.title}`, playbook.riskMitigation.content, '');

  lines.push('---', '', '## Compliance Checklist', '');
  for (const item of playbook.complianceChecklist) {
    const icon = item.status === 'required' ? '🔴' : item.status === 'recommended' ? '🟡' : '⚪';
    lines.push(`- ${icon} **${item.status.toUpperCase()}**: ${item.item}`);
  }

  return lines.join('\n');
}
