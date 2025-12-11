/**
 * DC Builder ChangeLog Middleware
 * Automatically logs changes from DCTwinBuilderStore to ChangeLogStore
 */

import { useDCTwinBuilderStore } from './dcTwinBuilderStore';
import { useChangeLogStore, createChangeEntry, type ChangeType } from './changeLogStore';

type BuilderState = ReturnType<typeof useDCTwinBuilderStore.getState>;

// Track previous state for comparison
let previousState: Partial<BuilderState> | null = null;

/**
 * Initialize the changelog middleware
 * Call this once at app startup
 */
export function initChangeLogMiddleware() {
  // Subscribe to store changes
  useDCTwinBuilderStore.subscribe((state, prevState) => {
    const addEntry = useChangeLogStore.getState().addEntry;
    
    // Compare and log overview changes
    if (state.overview !== prevState.overview) {
      logOverviewChanges(prevState.overview, state.overview, addEntry);
    }
    
    // Compare and log agent changes
    if (state.agents !== prevState.agents) {
      logAgentChanges(prevState.agents, state.agents, addEntry);
    }
    
    // Compare and log KPI changes
    if (state.kpis !== prevState.kpis) {
      logKPIChanges(prevState.kpis, state.kpis, addEntry);
    }
    
    // Compare and log workflow changes
    if (state.workflows !== prevState.workflows) {
      logWorkflowChanges(prevState.workflows, state.workflows, addEntry);
    }
    
    // Compare and log scenario changes
    if (state.scenarios !== prevState.scenarios) {
      logScenarioChanges(prevState.scenarios, state.scenarios, addEntry);
    }
    
    // Compare and log financial changes
    if (state.financial !== prevState.financial) {
      logFinancialChanges(prevState.financial, state.financial, addEntry);
    }
  });
  
  console.log('[ChangeLogMiddleware] Initialized');
}

function logOverviewChanges(
  prev: BuilderState['overview'],
  next: BuilderState['overview'],
  addEntry: ReturnType<typeof useChangeLogStore.getState>['addEntry']
) {
  // Customer name change
  if (prev.customerName !== next.customerName) {
    addEntry(createChangeEntry(
      'config_change',
      'Customer Name Updated',
      'overview.customerName',
      prev.customerName,
      next.customerName
    ));
  }
  
  // Twin name change
  if (prev.twinName !== next.twinName) {
    addEntry(createChangeEntry(
      'config_change',
      'Twin Name Updated',
      'overview.twinName',
      prev.twinName,
      next.twinName
    ));
  }
  
  // Capacity change
  if (prev.capacityKw !== next.capacityKw) {
    addEntry(createChangeEntry(
      'config_change',
      'Capacity Updated',
      'overview.capacityKw',
      prev.capacityKw,
      next.capacityKw,
      'power'
    ));
  }
  
  // Renewable percentage change
  if (prev.renewablePercent !== next.renewablePercent) {
    addEntry(createChangeEntry(
      'kpi_shift',
      'Renewable Target Updated',
      'overview.renewablePercent',
      prev.renewablePercent,
      next.renewablePercent,
      'sustainability',
      'higher_is_better'
    ));
  }
  
  // Sovereignty compliance change
  if (prev.sovereignCompliance !== next.sovereignCompliance) {
    addEntry(createChangeEntry(
      'config_change',
      next.sovereignCompliance ? 'Sovereignty Enabled' : 'Sovereignty Disabled',
      'overview.sovereignCompliance',
      prev.sovereignCompliance,
      next.sovereignCompliance,
      'sovereignty'
    ));
  }
  
  // Tier change
  if (prev.tier !== next.tier) {
    addEntry(createChangeEntry(
      'config_change',
      'Facility Tier Updated',
      'overview.tier',
      prev.tier,
      next.tier,
      'infrastructure'
    ));
  }
}

function logAgentChanges(
  prev: BuilderState['agents'],
  next: BuilderState['agents'],
  addEntry: ReturnType<typeof useChangeLogStore.getState>['addEntry']
) {
  // Check for agent enable/disable changes
  next.forEach(agent => {
    const prevAgent = prev.find(a => a.id === agent.id);
    if (prevAgent && prevAgent.enabled !== agent.enabled) {
      addEntry(createChangeEntry(
        'agent_update',
        agent.enabled ? `${agent.name} Enabled` : `${agent.name} Disabled`,
        `agents.${agent.id}.enabled`,
        prevAgent.enabled,
        agent.enabled,
        agent.domain
      ));
    }
  });
}

function logKPIChanges(
  prev: BuilderState['kpis'],
  next: BuilderState['kpis'],
  addEntry: ReturnType<typeof useChangeLogStore.getState>['addEntry']
) {
  next.forEach(kpi => {
    const prevKPI = prev.find(k => k.id === kpi.id);
    if (!prevKPI) return;
    
    // Enable/disable change
    if (prevKPI.enabled !== kpi.enabled) {
      addEntry(createChangeEntry(
        'kpi_shift',
        kpi.enabled ? `${kpi.name} Enabled` : `${kpi.name} Disabled`,
        `kpis.${kpi.id}.enabled`,
        prevKPI.enabled,
        kpi.enabled,
        kpi.domain
      ));
    }
    
    // Target change
    if (prevKPI.target !== kpi.target) {
      addEntry(createChangeEntry(
        'kpi_shift',
        `${kpi.name} Target Updated`,
        `kpis.${kpi.id}.target`,
        prevKPI.target,
        kpi.target,
        kpi.domain,
        kpi.direction
      ));
    }
    
    // Warning threshold change
    if (prevKPI.warningThreshold !== kpi.warningThreshold) {
      addEntry(createChangeEntry(
        'kpi_shift',
        `${kpi.name} Warning Threshold Updated`,
        `kpis.${kpi.id}.warningThreshold`,
        prevKPI.warningThreshold,
        kpi.warningThreshold,
        kpi.domain
      ));
    }
    
    // Critical threshold change
    if (prevKPI.criticalThreshold !== kpi.criticalThreshold) {
      addEntry(createChangeEntry(
        'kpi_shift',
        `${kpi.name} Critical Threshold Updated`,
        `kpis.${kpi.id}.criticalThreshold`,
        prevKPI.criticalThreshold,
        kpi.criticalThreshold,
        kpi.domain
      ));
    }
  });
}

function logWorkflowChanges(
  prev: BuilderState['workflows'],
  next: BuilderState['workflows'],
  addEntry: ReturnType<typeof useChangeLogStore.getState>['addEntry']
) {
  next.forEach(workflow => {
    const prevWorkflow = prev.find(w => w.id === workflow.id);
    if (!prevWorkflow) return;
    
    // Enable/disable change
    if (prevWorkflow.enabled !== workflow.enabled) {
      addEntry(createChangeEntry(
        'workflow_change',
        workflow.enabled ? `${workflow.name} Enabled` : `${workflow.name} Disabled`,
        `workflows.${workflow.id}.enabled`,
        prevWorkflow.enabled,
        workflow.enabled,
        'workflows'
      ));
    }
    
    // Trigger condition change
    if (prevWorkflow.trigger?.condition !== workflow.trigger?.condition) {
      addEntry(createChangeEntry(
        'workflow_change',
        `${workflow.name} Trigger Updated`,
        `workflows.${workflow.id}.trigger.condition`,
        prevWorkflow.trigger?.condition,
        workflow.trigger?.condition,
        'workflows'
      ));
    }
    
    // Mitigation change
    if (prevWorkflow.recommendedMitigation !== workflow.recommendedMitigation) {
      addEntry(createChangeEntry(
        'workflow_change',
        `${workflow.name} Mitigation Updated`,
        `workflows.${workflow.id}.recommendedMitigation`,
        prevWorkflow.recommendedMitigation,
        workflow.recommendedMitigation,
        'workflows'
      ));
    }
  });
}

function logScenarioChanges(
  prev: BuilderState['scenarios'],
  next: BuilderState['scenarios'],
  addEntry: ReturnType<typeof useChangeLogStore.getState>['addEntry']
) {
  next.forEach(scenario => {
    const prevScenario = prev.find(s => s.id === scenario.id);
    if (!prevScenario) return;
    
    // Enable/disable change
    if (prevScenario.enabled !== scenario.enabled) {
      addEntry(createChangeEntry(
        'scenario_change',
        scenario.enabled ? `${scenario.name} Enabled` : `${scenario.name} Disabled`,
        `scenarios.${scenario.id}.enabled`,
        prevScenario.enabled,
        scenario.enabled,
        scenario.category
      ));
    }
    
    // Duration change
    if (prevScenario.durationSeconds !== scenario.durationSeconds) {
      addEntry(createChangeEntry(
        'scenario_change',
        `${scenario.name} Duration Updated`,
        `scenarios.${scenario.id}.durationSeconds`,
        prevScenario.durationSeconds,
        scenario.durationSeconds,
        scenario.category
      ));
    }
    
    // Severity change
    if (prevScenario.severity !== scenario.severity) {
      addEntry(createChangeEntry(
        'scenario_change',
        `${scenario.name} Severity Updated`,
        `scenarios.${scenario.id}.severity`,
        prevScenario.severity,
        scenario.severity,
        scenario.category
      ));
    }
    
    // Category change
    if (prevScenario.category !== scenario.category) {
      addEntry(createChangeEntry(
        'scenario_change',
        `${scenario.name} Category Updated`,
        `scenarios.${scenario.id}.category`,
        prevScenario.category,
        scenario.category,
        scenario.category
      ));
    }
  });
}

function logFinancialChanges(
  prev: BuilderState['financial'],
  next: BuilderState['financial'],
  addEntry: ReturnType<typeof useChangeLogStore.getState>['addEntry']
) {
  if (!prev || !next) return;
  
  // Annual power cost change
  if (prev.annualPowerCostUsd !== next.annualPowerCostUsd) {
    addEntry(createChangeEntry(
      'config_change',
      'Annual Power Cost Updated',
      'financial.annualPowerCostUsd',
      prev.annualPowerCostUsd,
      next.annualPowerCostUsd,
      'financial'
    ));
  }
  
  // Carbon tonnes change
  if (prev.annualCarbonTonnes !== next.annualCarbonTonnes) {
    addEntry(createChangeEntry(
      'config_change',
      'Annual Carbon Emissions Updated',
      'financial.annualCarbonTonnes',
      prev.annualCarbonTonnes,
      next.annualCarbonTonnes,
      'financial',
      'lower_is_better'
    ));
  }
  
  // Savings percentage change
  if (prev.upgradeSavingsPercent !== next.upgradeSavingsPercent) {
    addEntry(createChangeEntry(
      'config_change',
      'Savings Projection Updated',
      'financial.upgradeSavingsPercent',
      prev.upgradeSavingsPercent,
      next.upgradeSavingsPercent,
      'financial',
      'higher_is_better'
    ));
  }
}
