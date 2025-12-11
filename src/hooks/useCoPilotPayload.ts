/**
 * useCoPilotPayload Hook
 * 
 * Builds the context-aware payload for Co-Pilot based on current mode
 * (blueprint-designer or simulation) using real store data.
 */

import { useMemo } from 'react';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { useBlueprintView } from '@/context/BlueprintViewContext';
import type { 
  CoPilotContextPayload, 
  CoPilotContextMode,
  TwinDomainSummary,
  TwinAgent,
  TwinKPI,
  TwinWorkflow,
  TwinScenario,
  BlueprintValidationReport,
} from '@/types/copilotContext';

// Seeded random for stable mock values
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash % 100) / 100;
}

interface UseCoPilotPayloadOptions {
  mode?: CoPilotContextMode;
  simulationRunId?: string;
  activeScenarioId?: string;
}

export function useCoPilotPayload(options: UseCoPilotPayloadOptions = {}): CoPilotContextPayload | null {
  const store = useDCTwinBuilderStore();
  const blueprintContext = useBlueprintView();
  
  // Determine mode from options or context
  const mode: CoPilotContextMode = options.mode || 
    (blueprintContext?.mode === 'simulationSnapshot' ? 'simulation' : 'blueprint-designer');

  return useMemo(() => {
    if (!store.overview?.twinName) {
      return null;
    }

    const twinId = store.overview.twinSlug || 'default';

    // Build domain summaries
    const domainMap = new Map<string, TwinDomainSummary>();
    const domains = ['thermal', 'power', 'cooling', 'network', 'workload', 'sovereignty', 'financial', 'incidents'];
    
    domains.forEach(domain => {
      const domainAgents = store.agents.filter(a => a.domain === domain);
      const domainKpis = store.kpis.filter(k => k.domain === domain);
      const seed = `${twinId}-${domain}`;
      const healthScore = 75 + Math.floor(seededRandom(seed) * 25);
      
      domainMap.set(domain, {
        domain,
        label: domain.charAt(0).toUpperCase() + domain.slice(1),
        agentCount: domainAgents.filter(a => a.enabled).length,
        kpiCount: domainKpis.filter(k => k.enabled).length,
        healthStatus: healthScore >= 90 ? 'healthy' : healthScore >= 70 ? 'warning' : 'critical',
        healthScore,
      });
    });

    // Transform agents
    const agents: TwinAgent[] = store.agents.map(a => ({
      id: a.id,
      name: a.name,
      domain: a.domain,
      enabled: a.enabled,
      description: a.description,
    }));

    // Transform KPIs with mock current values
    const kpis: TwinKPI[] = store.kpis.map(k => {
      const seed = `${twinId}-${k.id}`;
      const baseValue = k.target || 100;
      const variance = seededRandom(seed) * 0.2 - 0.1; // ±10%
      
      return {
        id: k.id,
        name: k.name,
        domain: k.domain,
        enabled: k.enabled,
        unit: k.unit,
        currentValue: baseValue * (1 + variance),
        targetValue: k.target,
        warningThreshold: k.warningThreshold,
        criticalThreshold: k.criticalThreshold,
      };
    });

    // Transform workflows
    const workflows: TwinWorkflow[] = store.workflows.map(w => ({
      id: w.id,
      name: w.name,
      triggerType: w.trigger?.signal || 'manual',
      enabled: w.enabled,
      agentIds: [w.agentId],
    }));

    // Transform scenarios
    const scenarios: TwinScenario[] = store.scenarios.map(s => ({
      id: s.id,
      name: s.name,
      severity: s.severity,
      category: s.category,
      enabled: s.enabled,
      durationMinutes: Math.round(s.durationSeconds / 60),
    }));

    // Base payload
    const payload: CoPilotContextPayload = {
      twinId,
      mode,
      overview: store.overview,
      domains: Array.from(domainMap.values()),
      agents,
      kpis,
      workflows,
      scenarios,
      financial: store.financial,
    };

    // Add mode-specific context
    if (mode === 'blueprint-designer') {
      // Build validation report
      const issues: BlueprintValidationReport['issues'] = [];
      const missingAgents: string[] = [];
      const missingKPIs: string[] = [];
      
      // Check for disabled critical agents
      const criticalAgents = ['thermal-guardian', 'power-ups-monitor'];
      criticalAgents.forEach(agentId => {
        const agent = store.agents.find(a => a.id === agentId);
        if (!agent?.enabled) {
          issues.push({
            id: `missing-${agentId}`,
            severity: 'warning',
            message: `Critical agent "${agent?.name || agentId}" is disabled`,
            suggestion: 'Enable this agent for production readiness',
          });
          missingAgents.push(agentId);
        }
      });

      // Check for disabled critical KPIs
      const criticalKPIs = ['effective-ai-pue', 'gco2-per-gpu-hour', 'sovereign-compute-ratio'];
      criticalKPIs.forEach(kpiId => {
        const kpi = store.kpis.find(k => k.id === kpiId);
        if (!kpi?.enabled) {
          issues.push({
            id: `missing-kpi-${kpiId}`,
            severity: 'info',
            message: `KPI "${kpi?.name || kpiId}" is not enabled`,
            suggestion: 'Consider enabling for comprehensive monitoring',
          });
          missingKPIs.push(kpiId);
        }
      });

      const readinessScore = store.getReadinessScore();
      
      payload.validationReport = {
        isValid: issues.filter(i => i.severity === 'error').length === 0,
        readinessScore,
        issues,
        missingAgents,
        missingKPIs,
        warnings: issues.filter(i => i.severity === 'warning').map(i => i.message),
      };
      payload.readinessScore = readinessScore;
      
      // Change log would come from a real changelog store
      payload.changeLog = [];
      
    } else if (mode === 'simulation') {
      // Add simulation-specific context
      payload.activeScenarioId = options.activeScenarioId;
      
      if (options.simulationRunId) {
        payload.simulationRun = {
          runId: options.simulationRunId,
          scenarioId: options.activeScenarioId || 'default',
          scenarioName: scenarios.find(s => s.id === options.activeScenarioId)?.name || 'Default Scenario',
          startedAt: new Date().toISOString(),
          duration: 0,
          speed: 1,
          status: 'running',
        };
      }

      // Mock KPI time series (would be real data in production)
      payload.kpiTimeSeries = kpis.slice(0, 4).map(kpi => {
        const points = Array.from({ length: 10 }, (_, i) => ({
          timestamp: new Date(Date.now() - (9 - i) * 60000).toISOString(),
          value: (kpi.currentValue || 0) * (1 + (seededRandom(`${kpi.id}-${i}`) * 0.1 - 0.05)),
        }));
        
        const trend = points[points.length - 1].value > points[0].value ? 'up' : 
                      points[points.length - 1].value < points[0].value ? 'down' : 'stable';
        
        return {
          kpiId: kpi.id,
          kpiName: kpi.name,
          unit: kpi.unit,
          data: points,
          trend,
          anomalyDetected: seededRandom(`${kpi.id}-anomaly`) > 0.8,
        };
      });

      /**
       * Live Recommendations - Industry Reference
       * Based on Uptime Institute operational best practices and ASHRAE TC 9.9 guidelines
       * - Thermal recommendations: Most actionable (immediate cooling adjustments)
       * - Power recommendations: Load balancing and redundancy verification
       * - Capacity recommendations: Proactive scaling based on utilization trends
       * Source: uptimeinstitute.com, ashrae.org/tc99
       */
      payload.liveRecommendations = [
        {
          id: 'rec-thermal-001',
          priority: 'high',
          type: 'warning',
          title: 'GPU Pod B-2 inlet temperature approaching ASHRAE A1 limit',
          description: 'DGX H100 cluster inlet at 26.2°C (ASHRAE A1 max: 27°C). Predicted breach in 18 minutes based on current workload trajectory.',
          suggestedAction: 'Increase CRAH-B2 supply airflow by 15% or reduce GPU clock frequency via NVIDIA DCGM',
          affectedKPIs: ['thermal-stability-index', 'effective-ai-pue', 'gpu-thermal-headroom'],
          affectedAgents: ['thermal-guardian', 'cooling-optimizer'],
          timestamp: new Date().toISOString(),
        },
      ];

      // Add snapshot metadata from context if available
      if (blueprintContext?.snapshotMeta) {
        payload.snapshotVersion = blueprintContext.snapshotMeta.blueprintVersion;
        payload.snapshotCapturedAt = blueprintContext.snapshotMeta.capturedAt;
      }
    }

    return payload;
  }, [store, mode, options.simulationRunId, options.activeScenarioId, blueprintContext]);
}
