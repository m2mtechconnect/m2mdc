import { useMemo } from 'react';
import { generateDynamicPlaybook } from '@/lib/playbook/playbookGenerator';
import type { PlaybookContext, GeneratedPlaybook } from '@/types/playbook';

interface UsePlaybookGenerationProps {
  initiativeTitle: string;
  initiativeId: string;
  url?: string;
}

/**
 * Hook to generate dynamic playbook content based on initiative context
 */
export function usePlaybookGeneration({ 
  initiativeTitle, 
  initiativeId,
  url = 'example-company.com' 
}: UsePlaybookGenerationProps): GeneratedPlaybook {
  
  return useMemo(() => {
    // Extract industry from initiative title or ID
    const detectIndustry = (): string => {
      const title = initiativeTitle.toLowerCase();
      const id = initiativeId.toLowerCase();
      
      if (title.includes('bank') || title.includes('financ') || id.includes('finance')) return 'Finance';
      if (title.includes('retail') || title.includes('ecommerce')) return 'Retail';
      if (title.includes('manufact') || title.includes('production')) return 'Manufacturing';
      if (title.includes('health') || title.includes('medical')) return 'Healthcare';
      if (title.includes('logistic') || title.includes('supply')) return 'Logistics';
      if (title.includes('construction') || title.includes('building')) return 'Construction';
      
      return 'Technology';
    };
    
    // Extract department from initiative
    const detectDepartment = (): string => {
      const title = initiativeTitle.toLowerCase();
      
      if (title.includes('risk') || title.includes('compliance')) return 'Risk & Compliance';
      if (title.includes('operation')) return 'Operations';
      if (title.includes('marketing') || title.includes('sales')) return 'Sales & Marketing';
      if (title.includes('hr') || title.includes('people')) return 'Human Resources';
      if (title.includes('finance') || title.includes('accounting')) return 'Finance';
      
      return 'Operations';
    };
    
    // Build context from URL parameters
    const context: PlaybookContext = {
      urlScanData: {
        url,
        industry: detectIndustry(),
        businessModel: 'B2B Enterprise SaaS',
        painPoints: [
          'Manual processes causing delays',
          'Lack of real-time insights',
          'Compliance overhead',
          'Inefficient resource allocation'
        ],
        opportunities: [
          'Automation of repetitive tasks',
          'Enhanced decision-making with AI',
          'Improved regulatory compliance',
          'Cost reduction through efficiency gains'
        ],
        detectedKeywords: initiativeTitle.toLowerCase().split(' ').filter(w => w.length > 4)
      },
      recommendation: {
        id: initiativeId,
        title: initiativeTitle,
        problem: `Current ${detectDepartment()} processes are manual, time-consuming, and prone to errors, creating bottlenecks and compliance risks.`,
        solution: `Implement an AI-powered digital twin to automate workflows, provide real-time insights, and ensure consistent compliance with regulatory requirements.`,
        department: detectDepartment(),
        tags: ['AI', 'Automation', 'Digital Twin', detectIndustry()]
      },
      // Agent metadata can be populated from real data if available
      agentMetadata: undefined
    };
    
    return generateDynamicPlaybook(context);
  }, [initiativeTitle, initiativeId, url]);
}
