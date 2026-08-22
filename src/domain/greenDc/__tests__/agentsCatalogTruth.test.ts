import { describe, expect, it } from 'vitest';
import {
  AGENT_CATALOG,
  AgentId,
  getDefaultEnabledAgents,
} from '../agentsCatalog';

const CORE_DEFAULT_IDS = new Set([
  AgentId.THERMAL_GUARDIAN,
  AgentId.POWER_UPS_MONITOR,
  AgentId.COOLING_OPTIMIZER,
  AgentId.NETWORK_FABRIC,
  AgentId.FACILITY_SAFETY,
  AgentId.WORKLOAD_ORCHESTRATOR,
  AgentId.SOVEREIGNTY_SENTINEL,
  AgentId.CARBON_COST,
  AgentId.INCIDENT_RESPONSE,
]);

const NEW_AI_FACTORY_IDS = [
  AgentId.STORAGE_DATA_FABRIC,
  AgentId.ASSET_RELIABILITY,
  AgentId.CYBERSECURITY_IDENTITY,
  AgentId.TWIN_INTEGRITY_DATA_QUALITY,
] as const;

const CLOSED_LOOP_OUTPUT_PATTERNS = [
  /\bfailover commands?\b/i,
  /\bcoordination commands?\b/i,
  /\bevacuation triggers?\b/i,
  /\broute blocking\b/i,
  /\bscheduling decisions?\b/i,
  /\bsetpoint adjustments?\b/i,
  /\bcooling adjustments?\b/i,
  /\bdefrost scheduling\b/i,
];

describe('AURA agent catalog truth', () => {
  it('keeps exactly nine default-enabled core data-centre agents', () => {
    const enabled = getDefaultEnabledAgents();
    expect(enabled).toHaveLength(9);
    expect(new Set(enabled.map((agent) => agent.id))).toEqual(CORE_DEFAULT_IDS);
  });

  it('contains 16 roles total: 9 core + 4 opt-in AI-factory gaps + 3 retail roles', () => {
    expect(Object.values(AGENT_CATALOG)).toHaveLength(16);
  });

  it('keeps every catalog role human-approved and non-actuating', () => {
    for (const agent of Object.values(AGENT_CATALOG)) {
      expect(agent.decisionAuthority, agent.id).toBe('human-approved');
      expect(agent.actuatesInfrastructure, agent.id).toBe(false);
      for (const action of agent.outputActions) {
        for (const pattern of CLOSED_LOOP_OUTPUT_PATTERNS) {
          expect(action, `${agent.id}: ${action}`).not.toMatch(pattern);
        }
      }
    }
  });

  it('keeps the four newly identified AI-factory coverage roles opt-in', () => {
    for (const id of NEW_AI_FACTORY_IDS) {
      expect(AGENT_CATALOG[id].defaultEnabled, id).toBe(false);
      expect(AGENT_CATALOG[id].relevantIndustries).toContain('*');
    }
  });

  it('covers storage, reliability, cyber and twin/data-quality gaps explicitly', () => {
    expect(AGENT_CATALOG[AgentId.STORAGE_DATA_FABRIC].domain).toBe('storage');
    expect(AGENT_CATALOG[AgentId.ASSET_RELIABILITY].domain).toBe('reliability');
    expect(AGENT_CATALOG[AgentId.CYBERSECURITY_IDENTITY].domain).toBe('cybersecurity');
    expect(AGENT_CATALOG[AgentId.TWIN_INTEGRITY_DATA_QUALITY].domain).toBe('data-quality');
  });
});
