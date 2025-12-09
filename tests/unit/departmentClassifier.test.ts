import { describe, it, expect } from 'vitest';
import { classifyDepartment, type Department } from '@/lib/digitalTwin/departmentClassifier';

/**
 * Unit Tests: Department Classification (Top 12 Departments)
 * Verifies content-based classification into enterprise departments
 */

describe('Department Classifier - Top 12 Departments', () => {
  const testCases: Array<{ content: string; expected: Department }> = [
    {
      content: 'supply chain logistics fleet distribution inventory forecasting',
      expected: 'Supply Chain',
    },
    {
      content: 'procurement sourcing vendor management purchasing supplier contracts',
      expected: 'Procurement',
    },
    {
      content: 'finance accounting accounts payable receivable treasury budget FP&A',
      expected: 'Finance',
    },
    {
      content: 'hr human resources talent workforce scheduling staffing recruiting onboarding',
      expected: 'HR / People / Workforce',
    },
    {
      content: 'operations workflow routing process optimization efficiency throughput',
      expected: 'Operations',
    },
    {
      content: 'engineering IT devops infrastructure platform systems network security',
      expected: 'IT / Engineering',
    },
    {
      content: 'risk compliance audit regulatory governance SOX GDPR validation',
      expected: 'Compliance / Risk',
    },
    {
      content: 'customer service support contact center helpdesk ticket resolution',
      expected: 'Customer Service',
    },
    {
      content: 'sales CRM pipeline deal quota territory account management',
      expected: 'Sales',
    },
    {
      content: 'marketing branding campaign promotion advertising content SEO',
      expected: 'Marketing',
    },
    {
      content: 'factory production line assembly manufacturing plant throughput yield OEE',
      expected: 'Manufacturing / Production',
    },
    {
      content: 'delivery shipping transportation routing last mile freight carrier',
      expected: 'Logistics / Fleet',
    },
  ];

  testCases.forEach(({ content, expected }) => {
    it(`should classify "${content.substring(0, 40)}..." as ${expected}`, () => {
      const result = classifyDepartment(content);
      expect(result).toBe(expected);
    });
  });

  it('should always return exactly one of the 12 valid departments', () => {
    const validDepartments: Department[] = [
      'Supply Chain',
      'Operations',
      'Procurement',
      'Finance',
      'HR / People / Workforce',
      'IT / Engineering',
      'Compliance / Risk',
      'Customer Service',
      'Sales',
      'Marketing',
      'Manufacturing / Production',
      'Logistics / Fleet',
    ];

    testCases.forEach(({ content }) => {
      const result = classifyDepartment(content);
      expect(validDepartments).toContain(result);
    });
  });

  it('should never return undefined or empty string', () => {
    const result = classifyDepartment('some random text without clear department keywords');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('should handle multiple department keywords and choose the most prominent', () => {
    const multiContent = 'supply chain procurement inventory vendor management forecasting';
    const result = classifyDepartment(multiContent);
    // Should prioritize supply chain due to stronger keyword presence
    expect(['Supply Chain', 'Procurement']).toContain(result);
  });
});

describe('Department Classifier - Keyword Weighting', () => {
  it('should prioritize primary keywords over context keywords', () => {
    const content = 'supply chain supply chain supply chain inventory';
    const result = classifyDepartment(content);
    expect(result).toBe('Supply Chain');
  });

  it('should handle domain-specific terminology', () => {
    const content = 'ERP WMS TMS POS inventory replenishment distribution center';
    const result = classifyDepartment(content);
    expect(result).toBe('Supply Chain');
  });

  it('should classify HR-related content correctly', () => {
    const content = 'employee headcount shift scheduling labor workforce management training';
    const result = classifyDepartment(content);
    expect(result).toBe('HR / People / Workforce');
  });

  it('should classify compliance-related content correctly', () => {
    const content = 'GxP SOX GDPR audit regulatory compliance validation certification';
    const result = classifyDepartment(content);
    expect(result).toBe('Compliance / Risk');
  });
});

describe('Department Classifier - Edge Cases', () => {
  it('should handle empty content gracefully', () => {
    const result = classifyDepartment('');
    expect(result).toBeTruthy();
  });

  it('should handle very short content', () => {
    const result = classifyDepartment('ops');
    expect(result).toBe('Operations');
  });

  it('should be case-insensitive', () => {
    const result1 = classifyDepartment('SUPPLY CHAIN LOGISTICS');
    const result2 = classifyDepartment('supply chain logistics');
    const result3 = classifyDepartment('SuPpLy ChAiN LoGiStIcS');
    
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
    expect(result1).toBe('Supply Chain');
  });

  it('should handle special characters and punctuation', () => {
    const content = 'supply-chain, logistics & fleet, inventory/forecasting!';
    const result = classifyDepartment(content);
    expect(result).toBe('Supply Chain');
  });
});

describe('Department Classifier - Multi-Department Scenarios', () => {
  it('should classify top-scoring department when multiple are present', () => {
    const content = 'supply chain and finance operations with procurement';
    const result = classifyDepartment(content);
    // Should pick one based on keyword frequency
    expect(['Supply Chain', 'Finance', 'Operations', 'Procurement']).toContain(result);
  });

  it('should not default to generic for ambiguous content', () => {
    const ambiguous = 'business process optimization digital transformation';
    const result = classifyDepartment(ambiguous);
    expect(result).not.toContain('Generic');
    expect(result).not.toContain('Unknown');
  });
});
