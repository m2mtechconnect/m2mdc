import { describe, it, expect } from 'vitest';
import {
  mapToDeterministicTemplate,
  ALLOWED_INDUSTRIES,
  ALLOWED_DEPARTMENTS,
  type DeterministicMappingSuccess,
  type DeterministicMappingError,
} from '@/lib/digitalTwin/deterministicMapper';

/**
 * Unit Tests: Deterministic Mapping System
 * Validates strict industry → department → template mapping
 */

describe('Deterministic Mapper - Valid Mappings', () => {
  it('should map Healthcare + Operations to 3D Twin', () => {
    const result = mapToDeterministicTemplate(
      'Hospital Facility Digital Twin',
      'Healthcare',
      'Operations'
    );

    expect(result).toHaveProperty('validation_status', 'passed');
    if ('validation_status' in result && result.validation_status === 'passed') {
      expect(result.industry).toBe('Healthcare');
      expect(result.department).toBe('Operations');
      expect(result.twin_or_agent_type).toBe('3d_twin');
      expect(result.template_assigned).toBe('Healthcare Facility Twin');
    }
  });

  it('should map Retail + Sales to Agent', () => {
    const result = mapToDeterministicTemplate(
      'Sales Automation Agent',
      'Retail',
      'Sales'
    );

    expect(result).toHaveProperty('validation_status', 'passed');
    if ('validation_status' in result && result.validation_status === 'passed') {
      expect(result.industry).toBe('Retail');
      expect(result.department).toBe('Sales');
      expect(result.twin_or_agent_type).toBe('agent');
      expect(result.template_assigned).toBe('Sales Outreach Agent');
    }
  });

  it('should map Financial Services + Risk & Compliance to Agent', () => {
    const result = mapToDeterministicTemplate(
      'Compliance Monitoring Agent',
      'Financial Services',
      'Risk & Compliance'
    );

    expect(result).toHaveProperty('validation_status', 'passed');
    if ('validation_status' in result && result.validation_status === 'passed') {
      expect(result.industry).toBe('Financial Services');
      expect(result.department).toBe('Risk & Compliance');
      expect(result.twin_or_agent_type).toBe('agent');
      expect(result.template_assigned).toBe('Compliance & Policy Agent');
    }
  });

  it('should map Manufacturing + Operations to 3D Twin', () => {
    const result = mapToDeterministicTemplate(
      'Factory Operations Twin',
      'Manufacturing',
      'Operations'
    );

    expect(result).toHaveProperty('validation_status', 'passed');
    if ('validation_status' in result && result.validation_status === 'passed') {
      expect(result.industry).toBe('Manufacturing');
      expect(result.department).toBe('Operations');
      expect(result.twin_or_agent_type).toBe('3d_twin');
      expect(result.template_assigned).toBe('Manufacturing Operations Twin');
    }
  });

  it('should map Technology & SaaS + Customer Support to Agent', () => {
    const result = mapToDeterministicTemplate(
      'Customer Support Automation',
      'Technology & SaaS',
      'Customer Support'
    );

    expect(result).toHaveProperty('validation_status', 'passed');
    if ('validation_status' in result && result.validation_status === 'passed') {
      expect(result.industry).toBe('Technology & SaaS');
      expect(result.department).toBe('Customer Support');
      expect(result.twin_or_agent_type).toBe('agent');
      expect(result.template_assigned).toBe('Customer Support Agent');
    }
  });
});

describe('Deterministic Mapper - Error Handling', () => {
  it('should return error for invalid industry', () => {
    const result = mapToDeterministicTemplate(
      'Test Recommendation',
      'Invalid Industry',
      'Operations'
    ) as DeterministicMappingError;

    expect(result).toHaveProperty('error', 'INVALID_MAPPING');
    expect(result.missing).toContain('industry');
  });

  it('should return error for invalid department', () => {
    const result = mapToDeterministicTemplate(
      'Test Recommendation',
      'Healthcare',
      'Invalid Department'
    ) as DeterministicMappingError;

    expect(result).toHaveProperty('error', 'INVALID_MAPPING');
    expect(result.missing).toContain('department');
  });

  it('should return error for unmapped industry-department combo', () => {
    // Maritime + HR is not in the mapping table
    const result = mapToDeterministicTemplate(
      'Test Recommendation',
      'Maritime',
      'HR'
    ) as DeterministicMappingError;

    expect(result).toHaveProperty('error', 'INVALID_MAPPING');
    expect(result.reason).toContain('No template mapping found');
  });

  it('should be case-insensitive for industry', () => {
    const result = mapToDeterministicTemplate(
      'Test',
      'healthcare',
      'Operations'
    );

    expect(result).toHaveProperty('validation_status', 'passed');
    if ('validation_status' in result && result.validation_status === 'passed') {
      expect(result.industry).toBe('Healthcare');
    }
  });

  it('should be case-insensitive for department', () => {
    const result = mapToDeterministicTemplate(
      'Test',
      'Healthcare',
      'operations'
    );

    expect(result).toHaveProperty('validation_status', 'passed');
    if ('validation_status' in result && result.validation_status === 'passed') {
      expect(result.department).toBe('Operations');
    }
  });
});

describe('Deterministic Mapper - Output Structure', () => {
  it('should include all required fields for successful mapping', () => {
    const result = mapToDeterministicTemplate(
      'Test Recommendation',
      'Energy',
      'Operations'
    );

    expect(result).toHaveProperty('validation_status', 'passed');
    if ('validation_status' in result && result.validation_status === 'passed') {
      expect(result).toHaveProperty('recommendation');
      expect(result).toHaveProperty('industry');
      expect(result).toHaveProperty('department');
      expect(result).toHaveProperty('twin_or_agent_type');
      expect(result).toHaveProperty('template_assigned');
      expect(result).toHaveProperty('why');
      expect(result).toHaveProperty('integration_requirements');
      expect(result).toHaveProperty('config');
      expect(result.config).toHaveProperty('skills');
      expect(result.config).toHaveProperty('workflows');
      expect(result.config).toHaveProperty('tools');
      expect(result.config).toHaveProperty('data_sources');
      expect(result.config).toHaveProperty('KPIs');
    }
  });

  it('should include integration requirements for agents', () => {
    const result = mapToDeterministicTemplate(
      'Test Agent',
      'Retail',
      'Marketing'
    );

    if ('validation_status' in result && result.validation_status === 'passed') {
      expect(result.integration_requirements).toContain('MCP endpoints for tool execution');
    }
  });

  it('should include HITL for process twins', () => {
    const result = mapToDeterministicTemplate(
      'Test Process Twin',
      'Real Estate',
      'Operations'
    );

    if ('validation_status' in result && result.validation_status === 'passed') {
      expect(result.integration_requirements).toContain('HITL approval steps');
    }
  });

  it('should include 3D simulation for 3D twins', () => {
    const result = mapToDeterministicTemplate(
      'Test 3D Twin',
      'Construction',
      'Operations'
    );

    if ('validation_status' in result && result.validation_status === 'passed') {
      expect(result.integration_requirements).toContain(
        '3D simulation environment (e.g., Nvidia Isaac Sim)'
      );
    }
  });
});

describe('Deterministic Mapper - Allowed Lists', () => {
  it('should have exactly 20 allowed industries', () => {
    expect(ALLOWED_INDUSTRIES).toHaveLength(20);
  });

  it('should have exactly 12 allowed departments', () => {
    expect(ALLOWED_DEPARTMENTS).toHaveLength(12);
  });

  it('should not allow industries outside the list', () => {
    const result = mapToDeterministicTemplate(
      'Test',
      'Fashion',
      'Operations'
    ) as DeterministicMappingError;

    expect(result).toHaveProperty('error', 'INVALID_MAPPING');
  });

  it('should not allow departments outside the list', () => {
    const result = mapToDeterministicTemplate(
      'Test',
      'Healthcare',
      'Strategy'
    ) as DeterministicMappingError;

    expect(result).toHaveProperty('error', 'INVALID_MAPPING');
  });
});
