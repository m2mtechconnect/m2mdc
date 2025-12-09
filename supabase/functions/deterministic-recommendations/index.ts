import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ALLOWED INDUSTRIES (exact match only)
const ALLOWED_INDUSTRIES = [
  'Healthcare',
  'Energy',
  'Manufacturing',
  'Public Sector',
  'Maritime',
  'Agriculture',
  'Retail',
  'Real Estate',
  'Financial Services',
  'Insurance',
  'Transportation & Logistics',
  'Telecommunications',
  'Education',
  'Construction',
  'Hospitality & Tourism',
  'Mining & Natural Resources',
  'Technology & SaaS',
  'CPG',
  'Automotive',
  'Media & Entertainment',
];

// ALLOWED DEPARTMENTS
const ALLOWED_DEPARTMENTS = [
  'Operations',
  'Sales',
  'Marketing',
  'Finance',
  'Customer Support',
  'HR',
  'IT/Engineering',
  'Product',
  'Legal',
  'Supply Chain',
  'Risk & Compliance',
  'Procurement',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, industry, department, topN = 3 } = await req.json();

    console.log('[deterministic-recommendations] Input:', { url, industry, department, topN });

    if (!url) {
      throw new Error('URL is required');
    }

    // Validate industry
    const normalizedIndustry = ALLOWED_INDUSTRIES.find(
      (i) => i.toLowerCase() === industry?.toLowerCase().trim()
    );

    if (!normalizedIndustry) {
      return new Response(
        JSON.stringify({
          error: 'INVALID_MAPPING',
          reason: `Industry "${industry}" not in allowed list. Must be one of: ${ALLOWED_INDUSTRIES.join(', ')}`,
          missing: ['industry'],
          next_step: 'Provide a valid industry from the allowed list.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate department
    const normalizedDepartment = ALLOWED_DEPARTMENTS.find(
      (d) => d.toLowerCase() === department?.toLowerCase().trim()
    );

    if (!normalizedDepartment) {
      return new Response(
        JSON.stringify({
          error: 'INVALID_MAPPING',
          reason: `Department "${department}" not in allowed list. Must be one of: ${ALLOWED_DEPARTMENTS.join(', ')}`,
          missing: ['department'],
          next_step: 'Provide a valid department from the allowed list.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get LOVABLE_API_KEY from environment
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Fetch the URL content (simplified, you can use your existing capture logic)
    const domain = new URL(url).hostname.replace('www.', '');

    // Build the system prompt for deterministic mapping
    const systemPrompt = `You are a DETERMINISTIC CLASSIFIER for Digital Twin / Agent recommendations.

STRICT RULES:
1. You MUST follow the exact decision tree.
2. You MUST output ONLY valid JSON.
3. You MUST NOT guess or improvise.
4. You MUST use ONLY the allowed templates.

INDUSTRY: ${normalizedIndustry}
DEPARTMENT: ${normalizedDepartment}

DECISION TREE:
1. Determine category:
   - If spatial/robotics/physical → 3D Twin
   - Else if workflow/logic/approvals → Process Twin
   - Else if task automation/integration → Agent
   - Else → Process Twin (default)

2. Select template based on industry + department mapping.

3. Output ONLY JSON in this exact format:
{
  "recommendation": "<recommendation title>",
  "industry": "${normalizedIndustry}",
  "department": "${normalizedDepartment}",
  "twin_or_agent_type": "agent | process_twin | 3d_twin",
  "template_assigned": "<exact template name>",
  "why": "<1-3 sentence explanation>",
  "integration_requirements": [
    "event triggers",
    "system integrations",
    "MCP endpoints",
    "structured outputs",
    "HITL approval (if required)"
  ],
  "config": {
    "skills": ["<skill1>", "<skill2>"],
    "workflows": ["<workflow1>"],
    "tools": ["<tool1>", "<tool2>"],
    "data_sources": ["<source1>", "<source2>"],
    "KPIs": ["<kpi1>", "<kpi2>"]
  },
  "validation_status": "passed"
}

ALLOWED AGENT TEMPLATES:
- Marketing Automation Agent
- Sales Outreach Agent
- Customer Support Agent
- Compliance & Policy Agent
- Financial Analysis Agent
- HR Assistant Agent
- Supply Chain Monitoring Agent
- IT Automation Agent
- Procurement Workflow Agent
- Operations Efficiency Agent

ALLOWED PROCESS TWIN TEMPLATES:
- Real Estate Portfolio Twin
- Finance Risk Twin
- Insurance Claim Twin
- Retail Store Twin
- Logistics Network Twin
- Agriculture Yield Twin
- Public Sector Service Twin
- Media Content Twin
- Telecom Network Twin
- Education Success Twin
- SaaS Customer Lifecycle Twin
- Hospitality Guest Journey Twin

ALLOWED 3D TWIN TEMPLATES:
- Manufacturing Operations Twin
- Energy Grid Twin
- Maritime Fleet Twin
- Transportation Fleet Twin
- Construction Project Twin
- Mining Production Twin
- Automotive Dealership Twin
- Healthcare Facility Twin

Generate ${topN} distinct recommendations following the rules above.
Return a JSON array of ${topN} objects.`;

    const userPrompt = `Generate ${topN} Digital Twin or Agent recommendations for ${domain} in the ${normalizedIndustry} industry, ${normalizedDepartment} department.

Each recommendation must:
1. Match the industry and department
2. Use ONLY allowed templates
3. Include ALL required fields
4. Follow the deterministic decision tree
5. Be distinct from each other

Output ONLY a JSON array of ${topN} objects, no other text.`;

    console.log('[deterministic-recommendations] Calling Lovable AI...');

    // Call Lovable AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // Low temperature for deterministic output
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[deterministic-recommendations] AI error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    console.log('[deterministic-recommendations] AI response:', content);

    let recommendations;
    try {
      const parsed = JSON.parse(content);
      recommendations = Array.isArray(parsed) ? parsed : parsed.recommendations || [parsed];
    } catch (e) {
      console.error('[deterministic-recommendations] JSON parse error:', e);
      throw new Error('Invalid JSON from AI');
    }

    // Validate each recommendation
    const validated = recommendations.map((rec: any) => {
      // Ensure all required fields exist
      if (!rec.recommendation || !rec.twin_or_agent_type || !rec.template_assigned) {
        return {
          error: 'INVALID_MAPPING',
          reason: 'Missing required fields in recommendation',
          missing: ['recommendation', 'twin_or_agent_type', 'template_assigned'],
          next_step: 'Regenerate with all required fields.',
        };
      }

      // Ensure industry and department match
      if (rec.industry !== normalizedIndustry || rec.department !== normalizedDepartment) {
        return {
          error: 'INVALID_MAPPING',
          reason: 'Industry or department mismatch',
          missing: [],
          next_step: 'Regenerate with correct industry and department.',
        };
      }

      return {
        ...rec,
        validation_status: 'passed',
      };
    });

    console.log('[deterministic-recommendations] Validated:', validated.length);

    return new Response(JSON.stringify({ recommendations: validated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[deterministic-recommendations] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'INVALID_MAPPING',
        reason: error instanceof Error ? error.message : 'Unknown error',
        missing: [],
        next_step: 'Check input and try again.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
