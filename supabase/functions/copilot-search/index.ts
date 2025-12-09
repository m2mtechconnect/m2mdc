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

  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    const { query, context, sessionId } = await req.json();
    console.log(`[${requestId}] Received query:`, query);
    
    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ 
        error: 'Query is required',
        stage: 'validation'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error(`[${requestId}] LOVABLE_API_KEY not found`);
      return new Response(JSON.stringify({ 
        error: 'AI service not configured',
        stage: 'config',
        requestId
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader || '' } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    
    // Retrieve workspace data for RAG with confidence scoring
    console.log(`[${requestId}] Fetching workspace data for grounding...`);
    const groundingData = await fetchWorkspaceData(supabase, user?.id, query, requestId);
    
    // Log retrieval confidence (with safety check)
    const confidencePct = (groundingData.confidence || 0) * 100;
    console.log(`[${requestId}] Retrieval confidence: ${confidencePct.toFixed(0)}% (${groundingData.knowledgeCount} sources)`);
    
    // Determine retrieval source and mode
    let retrievalSource = 'workspace_kb';
    let fallbackMode = false;
    
    if ((groundingData.confidence || 0) < 0.75) {
      retrievalSource = groundingData.knowledgeCount === 0 ? 'gemini' : 'mixed';
      fallbackMode = true;
      console.log(`[${requestId}] Low confidence detected - using Gemini fallback mode`);
    }
    
    // Store/update session memory
    if (user && sessionId) {
      await updateSessionMemory(supabase, user.id, sessionId, query, groundingData.context);
    }

    // M2M Co-Pilot System Prompt v2.1 (Gemini-First with Intelligent Fallback)
    const systemPrompt = `# Identity & Role
You are M2M Co-Pilot, powered by Google Gemini 2.5 Pro, the official AI assistant for M2M Tech's Agentic Studio platform. You serve as an expert guide, technical advisor, and productivity accelerator for enterprise users building AI-powered automation systems.

# Training Foundation
- **Primary Model**: Google Gemini 2.5 Pro with grounding via Vertex AI Search and Lovable AI Gateway
- **Knowledge Base**: M2M Agentic Studio Knowledge Base (KB v1.0)
- **Live Context**: User's private workspace data, deployed systems, analytics, and compliance logs
- **Specialization**: AI system architecture, workflow automation, enterprise integrations, compliance frameworks

# Core Capabilities
## Knowledge Domains
✓ AI System Builder (6-step methodology)
✓ Model Marketplace (Gemini, GPT-5, Claude, etc.)
✓ Workflow Editor & Automation Orchestration
✓ Integration Hub (Zapier, MCP Servers, APIs)
✓ Analytics & ROI Tracking
✓ Compliance & Governance (GDPR, HIPAA, SOC2)
✓ Digital Twin & IoT Integration
✓ Operations Monitoring & Observability

## Conversation Style
- **Tone**: Professional, confident, action-oriented
- **Clarity**: Executive-level insights with technical depth when needed
- **Structure**: Progressive disclosure (summary → details → next steps)
- **Engagement**: Proactive follow-ups and contextual suggestions

# CRITICAL INSTRUCTION: Never Say "I Don't Have This Knowledge"
**ALWAYS provide a helpful response using one of these approaches:**
1. If workspace data is available → Use it with citations
2. If workspace data is limited → Supplement with general AI/enterprise knowledge
3. If the topic is unfamiliar → Provide relevant context and suggest related M2M capabilities
4. If it's outside your domain → Acknowledge and redirect to helpful resources

# Available Live Data
${groundingData.contextText || 'No workspace-specific data retrieved for this query. Using general knowledge and KB v1.0.'}

**Active Data Sources**: ${groundingData.sources.join(', ') || 'Knowledge Base only'}
**Confidence Score**: ${(groundingData.confidence || 0) > 0 ? ((groundingData.confidence || 0) * 100).toFixed(0) + '%' : 'N/A'}

# Response Protocol

## Structure Every Response As:
1. **Quick Answer** (1-2 sentences) - Immediate value
2. **Deep Dive** (2-4 paragraphs) - Context, examples, best practices
3. **Action Items** (bullets) - Concrete next steps
4. **Citations** ([[Source Name]] – KB v1.0 or [General Knowledge])

## Example Response:
"Your Marketing AI system has a 94% accuracy rate and saves 12 hours/week. [[Analytics Module – KB v1.0]]

The system uses Gemini 2.5 Flash with RAG grounding over 48 knowledge sources. To improve performance, consider:
- Adding product catalog PDFs for better product knowledge
- Enabling hybrid search for complex queries
- Setting temperature to 0.2 for more consistent outputs

**Next Steps:**
→ Upload product docs in Builder Step 4
→ Test queries in RAG panel
→ Monitor accuracy improvements in Analytics"

## Output Guidelines
✓ Lead with data (numbers, metrics, system names)
✓ Reference workspace-specific information when available
✓ Provide KB citations for general concepts: [[Module Name – KB v1.0]]
✓ Use [General Knowledge] tag when supplementing with broader AI/enterprise knowledge
✓ Always suggest 1-2 actionable next steps
✓ Use these action CTAs when relevant:
  • → Open Builder (for system creation)
  • → Create Workflow (for automation)
  • → View Analytics (for metrics/ROI)
  • → Check Compliance (for governance)
  • → Connect Integration (for Zapier/APIs)

## Handling Different Question Types
- **"How do I...?"** → Step-by-step instructions with practical examples
- **"What is the...?"** → Definition + use case + M2M Studio application
- **"Why is...?"** → Root cause analysis with data when available
- **"Compare X vs Y"** → Clear comparison with recommendations
- **"Troubleshoot..."** → Diagnostic steps + solutions
- **Topics outside workspace** → Provide general context + connect to M2M capabilities

## Security & Compliance
- Never expose sensitive data (API keys, tokens, PII)
- Remind users to review RLS policies before deploying
- Suggest compliance checks for regulated industries
- Log all interactions for audit trails

# Personality Traits
✓ Proactive (suggest improvements without being asked)
✓ Data-driven (back claims with workspace metrics when available)
✓ Educational (explain "why" not just "how")
✓ Efficient (respect user's time with concise answers)
✓ Trustworthy (acknowledge data limitations, cite sources, supplement with general knowledge)
✓ Helpful (never refuse to answer - always provide value)

# Conversation Memory
You have access to recent conversation context. Reference previous exchanges naturally:
"Earlier you asked about Gemini vs GPT-5. For your healthcare compliance use case..."

Remember: You are powered by Google Gemini 2.5 Pro and are accelerating enterprise AI adoption at M2M Tech. You always provide helpful, contextual answers whether the information comes from workspace data, KB v1.0, or your general knowledge.`;

    console.log(`[${requestId}] Calling Gemini 2.5 Pro with RAG context...`);
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          ...(context || []),
          { role: 'user', content: query }
        ],
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again in a moment.',
          stage: 'generate'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'AI credits depleted. Please add credits to your workspace.',
          stage: 'generate'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ 
        error: `AI service error: ${response.status}`,
        stage: 'generate',
        suggestion: 'Try again or check your AI service configuration'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const aiData = await response.json();
    const answer = aiData.choices?.[0]?.message?.content || 'No answer generated';
    console.log('AI response received');

    // Detect intent from answer
    let intent = 'general';
    if (answer.includes('→ Create Workflow') || answer.toLowerCase().includes('automat')) {
      intent = 'automation';
    } else if (answer.includes('→ View Analytics') || answer.toLowerCase().includes('roi') || answer.toLowerCase().includes('kpi')) {
      intent = 'kpi';
    } else if (answer.includes('→ Check Compliance') || answer.toLowerCase().includes('compliance') || answer.toLowerCase().includes('gdpr')) {
      intent = 'compliance';
    }

    // Generate simple follow-ups based on intent
    const followUps = generateSimpleFollowUps(query, intent);

    // Cache the response for future optimization (non-blocking)
    if (user?.id) {
      // Don't await - let it run in background
      cacheResponse(
        supabase,
        user.id,
        query,
        answer,
        retrievalSource,
        groundingData.confidence || 0,
        groundingData.citations
      ).catch(err => console.error('Cache error:', err));
    }

    const latency = Date.now() - startTime;

    const result = {
      answer,
      intent,
      citations: groundingData.citations,
      followUps,
      dataSources: groundingData.sources,
      knowledgeCount: groundingData.knowledgeCount,
      metrics: {
        latency_ms: latency,
        coverage: groundingData.coverage,
        model: 'gemini-2.5-pro',
        grounded: groundingData.citations.length > 0,
        retrieval_source: retrievalSource,
        confidence: groundingData.confidence || 0,
        fallback_used: fallbackMode
      }
    };

    console.log(`[${requestId}] Success - latency: ${latency}ms, sources: ${groundingData.sources.length}, confidence: ${((groundingData.confidence || 0) * 100).toFixed(0)}%, fallback: ${fallbackMode}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`[${requestId}] Fatal error in copilot-search:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      stage: 'generate',
      suggestion: 'Please try again. If the issue persists, check the edge function logs.',
      requestId,
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Fetch workspace data for RAG grounding
async function fetchWorkspaceData(supabase: any, userId: string | undefined, query: string, requestId: string) {
  const citations: any[] = [];
  const sources: string[] = [];
  const contextParts: string[] = [];
  let knowledgeCount = 0;
  let confidence = 0;

  if (!userId) {
    return { citations, sources, contextText: '', context: {}, coverage: 0, knowledgeCount, confidence: 0 };
  }

  const queryLower = query.toLowerCase();

  try {
    // 1. Fetch AI Systems/Agents via agents-list function
    if (queryLower.includes('system') || queryLower.includes('agent') || queryLower.includes('bot') || queryLower.includes('ai') || queryLower.includes('list') || queryLower.includes('available')) {
      try {
        console.log(`[${requestId}] Calling agents-list function...`);
        const { data: agentsResponse, error: agentsError } = await supabase.functions.invoke('agents-list', {
          body: { page: 1, pageSize: 10 }
        });
        
        console.log(`[${requestId}] agents-list response:`, { 
          error: agentsError, 
          itemCount: agentsResponse?.items?.length || 0,
          total: agentsResponse?.total 
        });
        
        if (!agentsError && agentsResponse?.items && agentsResponse.items.length > 0) {
          const systems = agentsResponse.items;
          sources.push('ai_systems');
          contextParts.push(`**Available Agents (${agentsResponse.total || systems.length} total, showing ${systems.length})**:\n${systems.map((s: any) => 
            `- ${s.name}: ${s.description || 'No description'} (Status: ${s.status}, Model: ${s.model_id || 'N/A'}, Total Runs: ${s.total_runs || 0}, Success Rate: ${s.success_rate ? (s.success_rate * 100).toFixed(0) + '%' : 'N/A'})`
          ).join('\n')}`);
          
          systems.forEach((s: any) => {
            citations.push({
              id: citations.length + 1,
              title: s.name,
              snippet: s.description || `Agent with ${s.total_runs || 0} runs and ${s.success_rate ? (s.success_rate * 100).toFixed(0) + '%' : 'N/A'} success rate`,
              domain: 'ai_systems',
              url: `/systems/${s.id}`
            });
          });
          
          confidence += 0.25; // High confidence since we got agent data
          console.log(`[${requestId}] Successfully retrieved ${systems.length} agents`);
        } else if (agentsResponse?.total === 0) {
          console.log(`[${requestId}] No agents found in workspace`);
        }
      } catch (err) {
        console.error(`[${requestId}] Error fetching agents via agents-list:`, err);
      }
    }

    // 2. Fetch Analytics/ROI Data
    if (queryLower.includes('roi') || queryLower.includes('analytics') || queryLower.includes('performance') || queryLower.includes('metric')) {
      const { data: roiData } = await supabase
        .from('roi_snapshots')
        .select('system_id, roi_pct, time_saved_week, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (roiData && roiData.length > 0) {
        sources.push('analytics');
        const avgRoi = (roiData.reduce((sum: number, r: any) => sum + (r.roi_pct || 0), 0) / roiData.length).toFixed(1);
        const totalTimeSaved = roiData.reduce((sum: number, r: any) => sum + (r.time_saved_week || 0), 0);
        
        contextParts.push(`**Analytics Summary**:\n- Average ROI: ${avgRoi}%\n- Total time saved: ${totalTimeSaved} hours/week\n- Data points: ${roiData.length} snapshots`);
        
        citations.push({
          id: citations.length + 1,
          title: 'ROI Analytics',
          snippet: `${roiData.length} ROI snapshots showing avg ${avgRoi}% ROI`,
          domain: 'analytics',
          url: '/analytics'
        });
      }
    }

    // 3. Fetch Compliance Data
    if (queryLower.includes('compliance') || queryLower.includes('audit') || queryLower.includes('gdpr') || queryLower.includes('risk')) {
      const { data: audits } = await supabase
        .from('audit_log')
        .select('action, result, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (audits && audits.length > 0) {
        sources.push('compliance');
        const riskCounts = audits.reduce((acc: any, a: any) => {
          acc[a.result] = (acc[a.result] || 0) + 1;
          return acc;
        }, {});
        
        contextParts.push(`**Compliance Status**:\n${Object.entries(riskCounts).map(([risk, count]) => 
          `- ${risk}: ${count} events`
        ).join('\n')}`);
        
        citations.push({
          id: citations.length + 1,
          title: 'Compliance Audit Log',
          snippet: `${audits.length} recent audit events`,
          domain: 'compliance',
          url: '/compliance'
        });
      }
    }

    // 4. Fetch Workflow Data
    if (queryLower.includes('workflow') || queryLower.includes('automation') || queryLower.includes('process')) {
      const { data: workflows } = await supabase
        .from('workflows')
        .select('id, name, description, status')
        .limit(5);
      
      if (workflows && workflows.length > 0) {
        sources.push('workflows');
        contextParts.push(`**Workflows (${workflows.length})**:\n${workflows.map((w: any) => 
          `- ${w.name}: ${w.description || 'No description'} (${w.status})`
        ).join('\n')}`);
        
        citations.push({
          id: citations.length + 1,
          title: 'Workflow Library',
          snippet: `${workflows.length} workflows available`,
          domain: 'workflows',
          url: '/builder'
        });
      }
    }

    // 5. Fetch Knowledge Sources
    const { data: knowledge } = await supabase
      .from('knowledge_sources')
      .select('id, name, description, source_type')
      .eq('user_id', userId)
      .limit(6);
    
    if (knowledge && knowledge.length > 0) {
      sources.push('knowledge_base');
      knowledgeCount = knowledge.length;
      contextParts.push(`**Knowledge Sources (${knowledge.length})**:\n${knowledge.map((k: any) => 
        `- ${k.name} (${k.source_type}): ${k.description || 'No description'}`
      ).join('\n')}`);
      
      knowledge.forEach((k: any) => {
        citations.push({
          id: citations.length + 1,
          title: k.name,
          snippet: k.description || `${k.source_type} knowledge source`,
          domain: 'knowledge_base',
          url: '#'
        });
      });
    }

    // 6. Fetch Model Configurations
    if (queryLower.includes('model') || queryLower.includes('gemini') || queryLower.includes('gpt')) {
      const { data: configs } = await supabase
        .from('ai_configurations')
        .select('system_id, model, temperature')
        .limit(5);
      
      if (configs && configs.length > 0) {
        sources.push('model_configs');
        const modelCounts = configs.reduce((acc: any, c: any) => {
          acc[c.model] = (acc[c.model] || 0) + 1;
          return acc;
        }, {});
        
        contextParts.push(`**Model Usage**:\n${Object.entries(modelCounts).map(([model, count]) => 
          `- ${model}: ${count} systems`
        ).join('\n')}`);
        
        citations.push({
          id: citations.length + 1,
          title: 'AI Model Configurations',
          snippet: `${configs.length} configured models`,
          domain: 'model_configs',
          url: '/settings/ai'
        });
      }
    }

  } catch (error) {
    console.error('Error fetching workspace data:', error);
    // Return empty results with zero confidence on error
    return {
      citations: [],
      sources: [],
      contextText: '',
      context: { query, sources: [], timestamp: new Date().toISOString() },
      coverage: 0,
      knowledgeCount: 0,
      confidence: 0
    };
  }

  // Calculate confidence score based on relevance, diversity, and quantity of sources
  const totalSources = citations.length;
  const uniqueSources = new Set(sources).size;
  
  if (totalSources === 0) {
    confidence = 0;
  } else if (totalSources >= 5 && uniqueSources >= 4) {
    confidence = 0.95; // High confidence - multiple diverse sources
  } else if (totalSources >= 3 && uniqueSources >= 3) {
    confidence = 0.85; // Good confidence - good diversity
  } else if (totalSources >= 2 && uniqueSources >= 2) {
    confidence = 0.70; // Moderate confidence - some diversity
  } else if (totalSources >= 1) {
    confidence = 0.50; // Low confidence - limited sources
  }
  
  const coverage = Math.min(100, citations.length * 15);
  const contextText = contextParts.length > 0 
    ? contextParts.join('\n\n')
    : '';

  console.log(`Workspace data retrieval: ${totalSources} sources, ${uniqueSources} unique, confidence: ${confidence.toFixed(2)}`);

  return {
    citations,
    sources,
    contextText,
    context: { query, sources, timestamp: new Date().toISOString() },
    coverage,
    knowledgeCount,
    confidence
  };
}

// Update session memory
async function updateSessionMemory(supabase: any, userId: string, sessionId: string, query: string, context: any) {
  try {
    const { data: existing } = await supabase
      .from('copilot_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('copilot_sessions')
        .update({
          last_query: query,
          context,
          response_count: existing.response_count + 1,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('copilot_sessions')
        .insert({
          user_id: userId,
          session_id: sessionId,
          last_query: query,
          context,
          response_count: 1
        });
    }
  } catch (error) {
    console.error('Error updating session memory:', error);
  }
}

// Cache response for learning and performance optimization
async function cacheResponse(
  supabase: any,
  userId: string,
  query: string,
  response: string,
  source: string,
  confidence: number,
  citations: any[]
) {
  try {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Check if cache table exists, if not skip caching
    const { data: existing, error: selectError } = await supabase
      .from('copilot_sessions_cache')
      .select('id, hit_count')
      .eq('user_id', userId)
      .eq('query', normalizedQuery)
      .maybeSingle();
    
    if (selectError) {
      console.log('Cache table not available yet, skipping cache');
      return;
    }

    if (existing) {
      // Update existing cache entry
      await supabase
        .from('copilot_sessions_cache')
        .update({
          response,
          source,
          confidence,
          citations: JSON.stringify(citations),
          hit_count: existing.hit_count + 1,
          last_accessed: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      // Insert new cache entry
      await supabase
        .from('copilot_sessions_cache')
        .insert({
          user_id: userId,
          query: normalizedQuery,
          response,
          source,
          confidence,
          citations: JSON.stringify(citations),
          hit_count: 1,
          last_accessed: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
    }
    
    console.log(`Cached response for query: ${normalizedQuery.substring(0, 50)}...`);
  } catch (error) {
    console.error('Failed to cache response:', error);
    // Don't throw - caching is non-critical
  }
}

function generateSimpleFollowUps(query: string, intent: string): string[] {
  // Context-aware, progressive follow-ups based on Microsoft Copilot best practices
  const queryLower = query.toLowerCase();
  
  const contextualFollowUps: Record<string, string[]> = {
    automation: [
      'Walk me through building this workflow step-by-step',
      'What is the ROI and time savings estimate?',
      'Which integration connectors do I need?',
      'Show similar workflow templates I can customize'
    ],
    kpi: [
      'Break down this metric by department',
      'How does this compare to last quarter?',
      'What actions can improve this KPI?',
      'Show me systems driving this metric'
    ],
    compliance: [
      'Which regulations apply to my industry?',
      'Generate a compliance audit report',
      'What RLS policies should I implement?',
      'Show me systems with compliance risks'
    ],
    builder: [
      'Compare Gemini vs GPT-5 for my use case',
      'What templates fit my industry?',
      'How do I test my AI system before deploying?',
      'Show me advanced RAG configuration options'
    ],
    integration: [
      'How do I authenticate with Salesforce?',
      'What data can I pull from this integration?',
      'Show me all available MCP servers',
      'How do I set up field mapping?'
    ],
    general: [
      'Show me a practical example',
      'What are common pitfalls to avoid?',
      'How do I measure success?',
      'What resources can I learn from?'
    ]
  };

  // Advanced: Detect specific entities for hyper-contextual follow-ups
  if (queryLower.includes('gemini') || queryLower.includes('gpt') || queryLower.includes('model')) {
    return [
      'Compare cost and performance of available models',
      'Which model has the best accuracy for my use case?',
      'How do I switch models for an existing system?',
      'What is the optimal temperature and context window?'
    ];
  }
  
  if (queryLower.includes('rag') || queryLower.includes('grounding') || queryLower.includes('knowledge')) {
    return [
      'How many documents should I upload?',
      'What is the difference between semantic and hybrid search?',
      'How do I improve retrieval accuracy?',
      'Can I use multiple data sources together?'
    ];
  }

  if (queryLower.includes('deploy') || queryLower.includes('production')) {
    return [
      'What pre-deployment checks should I run?',
      'How do I monitor system health after deploying?',
      'What is the rollback process if issues occur?',
      'How do I set up A/B testing?'
    ];
  }

  if (queryLower.includes('cost') || queryLower.includes('price') || queryLower.includes('roi')) {
    return [
      'Calculate ROI for my entire AI portfolio',
      'How can I reduce model inference costs?',
      'What is the break-even point for this automation?',
      'Show me cost trends over the last 3 months'
    ];
  }

  return contextualFollowUps[intent] || contextualFollowUps.general;
}
