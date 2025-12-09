import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const templates = [
      {
        id: 'compliance-ai',
        name: 'Compliance AI Assistant',
        description: 'Automated compliance monitoring, policy Q&A, and regulatory updates with grounded citations',
        category: 'Compliance & Legal',
        icon: '⚖️',
        default_config: {
          systemPrompt: 'You are a Compliance AI Assistant specializing in regulatory compliance, policy interpretation, and risk assessment. Always provide grounded responses with citations from relevant policies and regulations. When uncertain, clearly state limitations and recommend consulting legal professionals.',
          model: 'google/gemini-2.5-flash',
          temperature: 0.3,
          region: 'northamerica-northeast1',
          ragEnabled: true,
          ragConfig: {
            dataStoreId: Deno.env.get('VERTEX_DATA_STORE_ID'),
            searchType: 'hybrid',
            topK: 5,
            semanticWeight: 0.7
          }
        },
        recommended_models: ['google/gemini-2.5-flash', 'google/gemini-2.5-pro'],
        sample_prompts: [
          'What are the key requirements for GDPR compliance?',
          'Explain our data retention policy for customer records',
          'What are the penalties for non-compliance with SOX regulations?',
          'How do we handle CCPA data deletion requests?'
        ],
        kpi_definitions: [
          { name: 'Policy Queries', metric: 'total_runs', target: 100 },
          { name: 'Avg Response Time', metric: 'avg_duration_ms', target: 2000 },
          { name: 'Citation Rate', metric: 'grounding_rate', target: 0.9 },
          { name: 'Success Rate', metric: 'success_rate', target: 0.95 }
        ]
      },
      {
        id: 'predictive-maintenance',
        name: 'Predictive Maintenance AI',
        description: 'IoT sensor analysis, failure prediction, and maintenance scheduling with real-time monitoring',
        category: 'Operations & IoT',
        icon: '🔧',
        default_config: {
          systemPrompt: 'You are a Predictive Maintenance AI specializing in equipment monitoring, failure prediction, and maintenance optimization. Analyze sensor data patterns, identify anomalies, and recommend preventive actions. Provide confidence scores for predictions.',
          model: 'google/gemini-2.5-flash',
          temperature: 0.4,
          region: 'northamerica-northeast1',
          ragEnabled: true,
          ragConfig: {
            dataStoreId: Deno.env.get('VERTEX_DATA_STORE_ID'),
            searchType: 'hybrid',
            topK: 10,
            semanticWeight: 0.6
          }
        },
        recommended_models: ['google/gemini-2.5-flash', 'google/gemini-2.5-pro'],
        sample_prompts: [
          'Analyze temperature trends for Machine ID 3421',
          'When should we schedule maintenance for conveyor belt CB-12?',
          'Predict failure probability for pump system PS-789',
          'What are the common failure patterns in HVAC systems?'
        ],
        kpi_definitions: [
          { name: 'Equipment Monitored', metric: 'total_runs', target: 500 },
          { name: 'Prediction Accuracy', metric: 'success_rate', target: 0.85 },
          { name: 'Downtime Prevented (hrs)', metric: 'custom_metric', target: 100 },
          { name: 'Cost Savings ($)', metric: 'custom_metric', target: 50000 }
        ]
      },
      {
        id: 'marketing-campaign',
        name: 'Marketing Campaign Bot',
        description: 'Campaign planning, content generation, A/B testing insights, and performance analytics',
        category: 'Marketing & Sales',
        icon: '📢',
        default_config: {
          systemPrompt: 'You are a Marketing Campaign AI specializing in campaign strategy, content creation, audience targeting, and performance optimization. Generate creative copy, analyze campaign metrics, and provide data-driven recommendations for improvement.',
          model: 'google/gemini-2.5-flash',
          temperature: 0.7,
          region: 'northamerica-northeast1',
          ragEnabled: true,
          ragConfig: {
            dataStoreId: Deno.env.get('VERTEX_DATA_STORE_ID'),
            searchType: 'hybrid',
            topK: 8,
            semanticWeight: 0.5
          }
        },
        recommended_models: ['google/gemini-2.5-flash', 'openai/gpt-5-mini'],
        sample_prompts: [
          'Generate 5 email subject lines for our product launch',
          'What are the best practices for holiday email campaigns?',
          'Analyze the performance of our last social media campaign',
          'Create a content calendar for Q2 product promotions'
        ],
        kpi_definitions: [
          { name: 'Campaigns Created', metric: 'total_runs', target: 50 },
          { name: 'Content Pieces', metric: 'custom_metric', target: 200 },
          { name: 'Engagement Rate', metric: 'custom_metric', target: 0.15 },
          { name: 'Conversion Lift', metric: 'custom_metric', target: 0.25 }
        ]
      },
      {
        id: 'finance-report',
        name: 'Finance Report Automation',
        description: 'Automated financial reporting, variance analysis, and budget forecasting with compliance checks',
        category: 'Finance & Accounting',
        icon: '💰',
        default_config: {
          systemPrompt: 'You are a Finance Automation AI specializing in financial reporting, variance analysis, budget forecasting, and compliance verification. Generate accurate reports, identify anomalies, and provide actionable insights for financial decision-making.',
          model: 'google/gemini-2.5-pro',
          temperature: 0.2,
          region: 'northamerica-northeast1',
          ragEnabled: true,
          ragConfig: {
            dataStoreId: Deno.env.get('VERTEX_DATA_STORE_ID'),
            searchType: 'hybrid',
            topK: 12,
            semanticWeight: 0.8
          }
        },
        recommended_models: ['google/gemini-2.5-pro', 'google/gemini-2.5-flash'],
        sample_prompts: [
          'Generate Q3 financial summary report',
          'Analyze variance between actual and budgeted expenses',
          'What are the key drivers of revenue growth this quarter?',
          'Forecast next quarter operating expenses'
        ],
        kpi_definitions: [
          { name: 'Reports Generated', metric: 'total_runs', target: 40 },
          { name: 'Processing Time', metric: 'avg_duration_ms', target: 3000 },
          { name: 'Accuracy Rate', metric: 'success_rate', target: 0.98 },
          { name: 'Time Saved (hrs)', metric: 'custom_metric', target: 200 }
        ]
      },
      {
        id: 'hr-onboarding',
        name: 'HR Onboarding Assistant',
        description: 'New hire onboarding automation, policy guidance, benefits Q&A, and document management',
        category: 'Human Resources',
        icon: '👥',
        default_config: {
          systemPrompt: 'You are an HR Onboarding AI Assistant helping new employees navigate their first weeks. Provide clear answers about company policies, benefits, onboarding tasks, and workplace resources. Maintain a friendly, welcoming tone while ensuring accuracy.',
          model: 'google/gemini-2.5-flash',
          temperature: 0.5,
          region: 'northamerica-northeast1',
          ragEnabled: true,
          ragConfig: {
            dataStoreId: Deno.env.get('VERTEX_DATA_STORE_ID'),
            searchType: 'hybrid',
            topK: 6,
            semanticWeight: 0.6
          }
        },
        recommended_models: ['google/gemini-2.5-flash', 'openai/gpt-5-mini'],
        sample_prompts: [
          'What documents do I need to complete on my first day?',
          'How do I enroll in health insurance benefits?',
          'What is our vacation policy for new employees?',
          'Who do I contact for IT equipment setup?'
        ],
        kpi_definitions: [
          { name: 'New Hires Assisted', metric: 'total_runs', target: 30 },
          { name: 'Onboarding Questions', metric: 'custom_metric', target: 150 },
          { name: 'Satisfaction Score', metric: 'custom_metric', target: 4.5 },
          { name: 'Time to Productivity', metric: 'custom_metric', target: 7 }
        ]
      }
    ];

    // Upsert templates (insert or update if exists)
    for (const template of templates) {
      const { error } = await supabaseClient
        .from('agent_templates')
        .upsert(template, { onConflict: 'id' });
      
      if (error) {
        console.error(`Error seeding template ${template.id}:`, error);
      } else {
        console.log(`Seeded template: ${template.id}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Seeded ${templates.length} agent templates`,
        templates: templates.map(t => t.id)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Template seeding error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Template seeding failed',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
