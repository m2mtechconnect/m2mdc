import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";


interface Classification {
  industry: string;
  department: string;
  contentType: string;
  dataSignals: string[];
  piiRisk: string;
  candidateUseCases: string[];
}

interface CTA {
  id: string;
  title: string;
  description: string;
  benefit: string;
  action: string;
  builderStep: number;
  icon: string;
  priority: number;
  payload: any;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { classification, url, title } = await req.json() as {
      classification: Classification;
      url: string;
      title: string;
    };

    console.log('[generate-ctas] Generating CTAs for:', classification);

    const ctas: CTA[] = [];

    // A. Create Knowledge Source & RAG Index (always relevant for docs/KB/policy)
    if (['Policy', 'KB', 'Docs', 'API'].includes(classification.contentType)) {
      ctas.push({
        id: 'knowledge-source',
        title: 'Create Knowledge Source',
        description: 'Index this content for AI-powered search and retrieval',
        benefit: 'Enable instant, grounded answers from this content',
        action: 'index',
        builderStep: 3,
        icon: 'database',
        priority: 10,
        payload: {
          url,
          title,
          tags: [classification.industry, classification.department, classification.contentType],
          embeddingModel: 'text-embedding-004'
        }
      });
    }

    // B. Compliance Audit Assistant (Healthcare/Finance/Public Sector + PII/PHI)
    if (
      ['Healthcare', 'Finance', 'Public Sector'].includes(classification.industry) &&
      ['Policy', 'Docs'].includes(classification.contentType) &&
      (classification.dataSignals.includes('PII') || classification.dataSignals.includes('PHI') || classification.piiRisk !== 'LOW')
    ) {
      ctas.push({
        id: 'compliance-audit',
        title: 'Build Compliance Audit Assistant',
        description: 'Auto-detect compliance gaps with decision replay and citations',
        benefit: 'Reduce audit prep time by 75%, ensure regulatory readiness',
        action: 'template',
        builderStep: 2,
        icon: 'shield-check',
        priority: 9,
        payload: {
          templateId: 'compliance-ai',
          scope: classification.dataSignals.includes('PHI') ? 'HIPAA' : 'GDPR',
          industry: classification.industry
        }
      });
    }

    // C. Report Automation Workflow (Finance/Ops/Marketing + Pricing/Product/Blog)
    if (
      ['Finance', 'Operations', 'Marketing'].includes(classification.department) &&
      ['Pricing', 'Product', 'Blog', 'Press'].includes(classification.contentType)
    ) {
      ctas.push({
        id: 'report-automation',
        title: 'Generate Report Automation',
        description: 'Auto-summarize and distribute insights on schedule',
        benefit: 'Save 10+ hours/week on manual reporting',
        action: 'workflow',
        builderStep: 5,
        icon: 'file-text',
        priority: 8,
        payload: {
          workflow: {
            nodes: [
              { id: 'ingest', type: 'source', label: 'Ingest' },
              { id: 'summarize', type: 'ai', label: 'Summarize' },
              { id: 'insights', type: 'ai', label: 'Extract Insights' },
              { id: 'notify', type: 'action', label: 'Notify Team' },
              { id: 'archive', type: 'action', label: 'Archive' }
            ]
          }
        }
      });
    }

    // D. FAQ / Support Assistant (Support/KB/Docs)
    if (
      classification.department === 'Support' ||
      ['KB', 'Docs', 'Support'].includes(classification.contentType)
    ) {
      ctas.push({
        id: 'faq-assistant',
        title: 'Create FAQ / Support Assistant',
        description: 'Conversational Q&A with grounding and escalation',
        benefit: 'Deflect 60% of tickets, improve response time by 80%',
        action: 'template',
        builderStep: 4,
        icon: 'message-circle',
        priority: 8,
        payload: {
          templateId: 'support-ai',
          escalation: 'zendesk',
          confidenceThreshold: 0.8
        }
      });
    }

    // E. Monitor for Changes (any content type)
    ctas.push({
      id: 'monitor-changes',
      title: 'Monitor for Changes',
      description: 'Track updates to policies, pricing, or product pages',
      benefit: 'Stay ahead of compliance and competitive changes',
      action: 'monitor',
      builderStep: 5,
      icon: 'eye',
      priority: 7,
      payload: {
        url,
        frequency: classification.contentType === 'Policy' ? 'daily' : 'weekly',
        alertOn: ['content-change', 'structure-change']
      }
    });

    // F. Sales Intel Extract & Sync (Marketing/CRM + Product/Pricing)
    if (
      ['Marketing', 'Sales'].includes(classification.department) &&
      ['Product', 'Pricing', 'Landing'].includes(classification.contentType)
    ) {
      ctas.push({
        id: 'sales-intel',
        title: 'Sales Intel Extract & Sync',
        description: 'Extract features/pricing and push to CRM',
        benefit: 'Accelerate deal cycles with real-time competitive intelligence',
        action: 'workflow',
        builderStep: 3,
        icon: 'trending-up',
        priority: 8,
        payload: {
          connectors: ['salesforce', 'hubspot'],
          extractFields: ['features', 'pricing', 'usps', 'competitors']
        }
      });
    }

    // G. Procurement Risk Snapshot (Public Sector/Vendors)
    if (classification.industry === 'Public Sector' || classification.candidateUseCases.includes('Audit Prep')) {
      ctas.push({
        id: 'procurement-risk',
        title: 'Procurement Risk Snapshot',
        description: 'Compile compliance posture and vendor risk profile',
        benefit: 'Accelerate vendor evaluation from weeks to minutes',
        action: 'report',
        builderStep: 5,
        icon: 'clipboard-check',
        priority: 7,
        payload: {
          reportType: 'vendor-risk',
          sections: ['compliance', 'uptime', 'data-residency', 'security']
        }
      });
    }

    // H. Developer Assist (Engineering + API/Docs)
    if (
      classification.department === 'Engineering' &&
      ['API', 'Docs', 'Technical'].some(t => 
        classification.contentType === t || classification.dataSignals.includes(t)
      )
    ) {
      ctas.push({
        id: 'developer-assist',
        title: 'Developer Assist Agent',
        description: 'Index API docs and integrate with Jira for ticket drafts',
        benefit: 'Reduce onboarding time by 60%, accelerate bug resolution',
        action: 'template',
        builderStep: 2,
        icon: 'code',
        priority: 8,
        payload: {
          templateId: 'developer-ai',
          connectors: ['jira', 'github']
        }
      });
    }

    // Sort by priority and return top 6
    const sortedCtas = ctas
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 6);

    console.log('[generate-ctas] Generated', sortedCtas.length, 'CTAs');

    return new Response(
      JSON.stringify({ ctas: sortedCtas }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-ctas] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate CTAs' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
