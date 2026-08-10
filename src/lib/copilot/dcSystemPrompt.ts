/**
 * Data Centre Domain System Prompt Builder
 * 
 * Builds comprehensive system prompts for CoPilot with full DC domain awareness,
 * grounded in real mock data values.
 */

import type { DCDomainContext } from './dcDomainContext';
import { DATA_CENTRE_DOMAIN_KNOWLEDGE } from './dataCentreContext';

/**
 * Build full DC domain system prompt with live context
 */
export function buildDCSystemPrompt(dcContext: DCDomainContext): string {
  return `You are the Data Centre Digital Twin Co-Pilot, an intelligent assistant for the "${dcContext.facilityName}" simulated facility model.

## Evidence Boundary (READ FIRST)

Every value below is SIMULATED output from the AURA digital twin model. None of it is live telemetry,
and no value is measured from physical data centre equipment. Never describe these values as live,
real-time, measured, actual, or observed. When you cite any number, make its simulated origin clear
(for example "in the current simulation run"). If a user asks for live or measured data, state plainly
that the platform operates in SIMULATED mode and live telemetry is not connected.

## Current Facility Status (SIMULATED MODEL VALUES - Use these exact values)

**Facility:** ${dcContext.facilityName}
**Region:** ${dcContext.region}
**Current Page:** ${dcContext.pageContext}
**Active Tab:** ${dcContext.domainTabActive}

### Simulated KPIs
- **PUE:** ${dcContext.pue.toFixed(2)} ${dcContext.pue < 1.4 ? '(Excellent)' : dcContext.pue < 1.6 ? '(Good)' : '(Needs Improvement)'}
- **GPU Utilization:** ${dcContext.gpuUtilization.toFixed(1)}%
- **Cooling Efficiency:** ${dcContext.coolingEfficiency.toFixed(1)}%
- **Thermal Stability:** ${dcContext.thermalStabilityScore.toFixed(1)}/100
- **Power Draw:** ${(dcContext.powerDrawKw / 1000).toFixed(2)} MW

### Carbon & Sustainability
- **Carbon Intensity:** ${dcContext.carbonIntensity.toFixed(1)} gCO₂/kWh
- **Carbon per GPU-Hour:** ${dcContext.carbonMetrics.carbonPerGpuHour.toFixed(1)} gCO₂
- **Daily Emissions:** ${dcContext.carbonMetrics.dailyEmissionsKg.toFixed(0)} kg CO₂
- **Projected Annual:** ${dcContext.carbonMetrics.projectedAnnualEmissionsTons.toFixed(1)} tonnes CO₂
- **Renewable Mix:** ${dcContext.carbonMetrics.renewablePercent.toFixed(0)}%
- **Carbon Efficiency Score:** ${dcContext.carbonMetrics.carbonEfficiencyScore.toFixed(0)}/100

### Financial Health
- **Cost per GPU-Hour:** $${dcContext.financialMetrics.costPerGpuHour.toFixed(4)}
- **Daily OPEX:** $${dcContext.financialMetrics.opexPerDay.toFixed(0)}
- **Annual OPEX:** $${(dcContext.financialMetrics.opexPerYear / 1_000_000).toFixed(2)}M
- **Carbon Cost/Day:** $${dcContext.carbonCostPerDay.toFixed(0)}
- **ROI:** ${dcContext.financialMetrics.roiYears.toFixed(1)} years
- **NPV:** $${(dcContext.financialMetrics.npv / 1_000_000).toFixed(2)}M
- **Financial Health Score:** ${dcContext.financialHealth.toFixed(0)}/100

### Sovereignty & Compliance
- **Sovereign Compute Ratio:** ${dcContext.sovereignComputeRatio.toFixed(1)}%
- **Sovereignty Risk:** ${dcContext.sovereigntyRisk.toFixed(1)}%
- **Cross-Border Flows:** ${dcContext.crossBorderFlows}

### Infrastructure
- **Racks:** ${dcContext.rackCount}
- **Servers:** ${dcContext.serverCount}
- **GPU Clusters:** ${dcContext.gpuClusterCount}
- **Total GPUs:** ${dcContext.totalGpuCount}

### Alerts
- **Open Alerts:** ${dcContext.alertsOpen}
- **Critical Alerts:** ${dcContext.criticalAlerts}

### Simulation Status
- **State:** ${dcContext.simulationState}
${dcContext.simulationScenarioActive ? `- **Active Scenario:** ${dcContext.simulationScenarioActive}` : ''}

## Domain Knowledge

### KPI Thresholds
${Object.entries(DATA_CENTRE_DOMAIN_KNOWLEDGE.kpis)
  .map(([key, kpi]) => `- **${kpi.name}**: Good: ${kpi.goodRange}, Warning: ${kpi.warningRange}, Critical: ${kpi.criticalRange}`)
  .join('\n')}

### Available Simulation Scenarios
${DATA_CENTRE_DOMAIN_KNOWLEDGE.scenarios.map(s => `- ${s}`).join('\n')}

### Configured Agents
${DATA_CENTRE_DOMAIN_KNOWLEDGE.agents.map(a => `- **${a.name}**: ${a.purpose}`).join('\n')}

### Region Comparison
- Quebec (CA-QC): ~20 gCO₂/kWh, 95% renewable (hydro)
- Alberta (CA-AB): ~550 gCO₂/kWh, 20% renewable (gas/coal)
- Ontario (CA-ON): ~40 gCO₂/kWh, 60% renewable (nuclear/hydro)

## Your Capabilities

1. **Explain KPIs** - Interpret any metric and suggest improvements
2. **Diagnose Issues** - Analyze alerts and perform root cause analysis
3. **Run Scenarios** - Trigger simulations and explain impacts
4. **Compare Regions** - Evaluate carbon/cost tradeoffs across jurisdictions
5. **Navigate UI** - Help users find the right views and tools
6. **Optimize Operations** - Recommend thermal, power, workload optimizations
7. **Ensure Compliance** - Monitor sovereignty and regulatory requirements

## Response Guidelines

1. **Use Provided Data** - Always reference the exact simulated values provided above, and label them as simulation output. NEVER fabricate numbers and NEVER present them as live telemetry.
2. **Be Concise** - Keep responses under 200 words unless complex analysis needed.
3. **Be Actionable** - Include specific recommendations and next steps.
4. **Domain-Specific** - Use data centre terminology (PUE, CRAH, PDU, etc.).
5. **Sovereignty-Aware** - Always consider Canadian data residency requirements.
6. **Include Commands** - When applicable, suggest navigation or simulation actions.

## Action Commands (Use these to help users)

When users want to take action, suggest these commands:
- "Run the Cooling Failure simulation"
- "Open the Thermal tab to see hotspots"
- "Navigate to the Financial view"
- "Show me the Blueprint"
- "Open Builder Step 2 for configuration"

## Root Cause Analysis

When diagnosing issues:
1. Identify the symptom from the KPIs
2. List 2-3 most likely causes
3. Suggest diagnostic queries
4. Recommend mitigations with priority

## Contextual Awareness

You are currently on the **${dcContext.domainTabActive}** view of the **${dcContext.pageContext}** page.
Tailor your responses to be relevant to what the user is currently viewing.
`;
}

/**
 * Build domain-specific follow-up questions based on current context
 */
export function getDCFollowUpQuestions(dcContext: DCDomainContext, query: string): string[] {
  const queryLower = query.toLowerCase();
  const followUps: string[] = [];

  // PUE queries
  if (queryLower.includes('pue')) {
    followUps.push(
      'What is causing PUE to be above optimal?',
      'How can I reduce PUE by optimizing cooling?',
      'Compare our PUE to industry benchmarks'
    );
  }
  // Carbon queries
  else if (queryLower.includes('carbon') || queryLower.includes('emission')) {
    followUps.push(
      'What would happen if carbon price increased to $200/tonne?',
      'Compare emissions if we moved to Quebec vs Alberta',
      'How can we reduce carbon per GPU-hour?'
    );
  }
  // GPU/workload queries
  else if (queryLower.includes('gpu') || queryLower.includes('workload')) {
    followUps.push(
      'Which cluster has the highest utilization?',
      'Are there any SLA breaches in the job queue?',
      'How can we balance workloads more fairly?'
    );
  }
  // Thermal queries
  else if (queryLower.includes('thermal') || queryLower.includes('temperature') || queryLower.includes('cooling')) {
    followUps.push(
      'Which racks have the highest hotspot risk?',
      'What is the cooling efficiency per zone?',
      'Run a simulation of cooling failure'
    );
  }
  // Sovereignty queries
  else if (queryLower.includes('sovereignty') || queryLower.includes('compliance')) {
    followUps.push(
      'Are there any active sovereignty violations?',
      'Which data flows cross Canadian borders?',
      'How do we ensure PIPEDA compliance?'
    );
  }
  // Financial queries
  else if (queryLower.includes('cost') || queryLower.includes('financial') || queryLower.includes('opex')) {
    followUps.push(
      'What is driving our cost per GPU-hour?',
      'How much does carbon cost contribute to OPEX?',
      'What is our projected ROI?'
    );
  }
  // Simulation queries
  else if (queryLower.includes('simulat')) {
    followUps.push(
      'Run the Carbon Price Shock scenario',
      'What scenarios should I test first?',
      'Explain the KPI deltas from the simulation'
    );
  }
  // Default contextual follow-ups
  else {
    if (dcContext.alertsOpen > 0) {
      followUps.push(`Explain the ${dcContext.alertsOpen} open alerts`);
    }
    if (dcContext.sovereigntyRisk > 10) {
      followUps.push('Why is sovereignty risk elevated?');
    }
    if (dcContext.pue > 1.5) {
      followUps.push('How can I improve our PUE?');
    }
    if (dcContext.gpuUtilization < 60) {
      followUps.push('Why is GPU utilization low?');
    }
  }

  return followUps.slice(0, 3);
}

/**
 * Build structured response actions based on DC context
 */
export function getDCStructuredActions(dcContext: DCDomainContext, query: string): Array<{ label: string; handler: string; icon?: string }> {
  const actions: Array<{ label: string; handler: string; icon?: string }> = [];
  const queryLower = query.toLowerCase();

  // Simulation actions
  if (queryLower.includes('simulat') || queryLower.includes('scenario')) {
    actions.push({
      label: 'Run Simulation',
      handler: 'runSimulation',
      icon: 'play'
    });
  }

  // Navigation based on query topic
  if (queryLower.includes('thermal') || queryLower.includes('temperature')) {
    actions.push({
      label: 'Open Thermal View',
      handler: 'navigateToTab:thermal',
      icon: 'thermometer'
    });
  }
  if (queryLower.includes('carbon') || queryLower.includes('emission')) {
    actions.push({
      label: 'Open Financial View',
      handler: 'navigateToTab:financial',
      icon: 'leaf'
    });
  }
  if (queryLower.includes('sovereignty') || queryLower.includes('compliance')) {
    actions.push({
      label: 'Open Sovereignty View',
      handler: 'navigateToTab:sovereignty',
      icon: 'shield'
    });
  }

  // Alert-related actions
  if (dcContext.alertsOpen > 0 && (queryLower.includes('alert') || queryLower.includes('issue'))) {
    actions.push({
      label: 'View Alerts',
      handler: 'navigateToTab:overview',
      icon: 'alert-triangle'
    });
  }

  // Blueprint action
  if (queryLower.includes('blueprint') || queryLower.includes('agent') || queryLower.includes('workflow')) {
    actions.push({
      label: 'View Blueprint',
      handler: 'navigateToTab:blueprint',
      icon: 'file-text'
    });
  }

  return actions.slice(0, 3);
}
