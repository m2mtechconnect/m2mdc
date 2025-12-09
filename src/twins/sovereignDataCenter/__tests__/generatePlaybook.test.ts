import { describe, it, expect } from 'vitest';
import { generatePlaybook, playbookToMarkdown } from '../generatePlaybook';
import { telusSovereignFacility, getDemoSimulationRuns } from '../mockData';
import { sovereignDataCenterTemplateConfig } from '../templateDefinition';
import type { SovereignKpis } from '@/types/sovereignDataCenterTwin';

describe('Sovereign DC Playbook Generator', () => {
  const enabledModels = sovereignDataCenterTemplateConfig.enabledModels;
  const recentSimulations = getDemoSimulationRuns(telusSovereignFacility.id);
  const targetKpis: Partial<SovereignKpis> = {
    sovereignComputeRatioPct: 98,
    effectiveAiPue: 1.15,
    gco2PerGpuHour: 20
  };

  describe('generatePlaybook', () => {
    it('generates a complete playbook structure', () => {
      const playbook = generatePlaybook({
        facility: telusSovereignFacility,
        enabledModels,
        recentSimulations,
        targetKpis
      });

      expect(playbook.id).toBeDefined();
      expect(playbook.facilityName).toBe(telusSovereignFacility.name);
      expect(playbook.generatedAt).toBeDefined();
      expect(playbook.executiveSummary).toBeTruthy();
    });

    it('includes implementation phases', () => {
      const playbook = generatePlaybook({
        facility: telusSovereignFacility,
        enabledModels,
        recentSimulations,
        targetKpis
      });

      expect(playbook.implementationPhases).toBeDefined();
      expect(playbook.implementationPhases.length).toBeGreaterThan(0);
      
      playbook.implementationPhases.forEach(phase => {
        expect(phase.title).toBeTruthy();
        expect(phase.content).toBeTruthy();
      });
    });

    it('includes resource needs section', () => {
      const playbook = generatePlaybook({
        facility: telusSovereignFacility,
        enabledModels,
        recentSimulations,
        targetKpis
      });

      expect(playbook.resourceNeeds).toBeDefined();
      expect(playbook.resourceNeeds.title).toBeTruthy();
      expect(playbook.resourceNeeds.content).toBeTruthy();
    });

    it('includes KPI targets based on facility data', () => {
      const playbook = generatePlaybook({
        facility: telusSovereignFacility,
        enabledModels,
        recentSimulations,
        targetKpis
      });

      expect(playbook.kpiTargets).toBeDefined();
      expect(playbook.kpiTargets.length).toBeGreaterThan(0);
      
      playbook.kpiTargets.forEach(target => {
        expect(target.kpi).toBeTruthy();
        expect(typeof target.current).toBe('number');
        expect(typeof target.target).toBe('number');
        expect(target.unit).toBeDefined(); // Unit can be empty string for unitless metrics like PUE
      });
    });

    it('includes risk mitigation section', () => {
      const playbook = generatePlaybook({
        facility: telusSovereignFacility,
        enabledModels,
        recentSimulations,
        targetKpis
      });

      expect(playbook.riskMitigation).toBeDefined();
      expect(playbook.riskMitigation.title).toBeTruthy();
      expect(playbook.riskMitigation.content).toBeTruthy();
    });

    it('includes compliance checklist', () => {
      const playbook = generatePlaybook({
        facility: telusSovereignFacility,
        enabledModels,
        recentSimulations,
        targetKpis
      });

      expect(playbook.complianceChecklist).toBeDefined();
      expect(playbook.complianceChecklist.length).toBeGreaterThan(0);
      
      playbook.complianceChecklist.forEach(item => {
        expect(item.item).toBeTruthy();
        expect(['required', 'recommended', 'optional']).toContain(item.status);
      });
    });
  });

  describe('playbookToMarkdown', () => {
    it('converts playbook to markdown format', () => {
      const playbook = generatePlaybook({
        facility: telusSovereignFacility,
        enabledModels,
        recentSimulations,
        targetKpis
      });

      const markdown = playbookToMarkdown(playbook);

      expect(markdown).toContain('# Implementation Playbook');
      expect(markdown).toContain(telusSovereignFacility.name);
      expect(markdown).toContain('## Executive Summary');
      expect(markdown).toContain('## Implementation Phases');
      expect(markdown).toContain('## KPI Targets');
      expect(markdown).toContain('## Compliance Checklist');
    });

    it('includes KPI table in markdown', () => {
      const playbook = generatePlaybook({
        facility: telusSovereignFacility,
        enabledModels,
        recentSimulations,
        targetKpis
      });

      const markdown = playbookToMarkdown(playbook);

      expect(markdown).toContain('| KPI |');
      expect(markdown).toContain('| Current |');
      expect(markdown).toContain('| Target |');
    });
  });
});
