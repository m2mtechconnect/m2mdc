/**
 * /v1/copilot-stream
 * 
 * Streaming Co-Pilot endpoint with multi-agent orchestration and persistent memory
 * 
 * REQUEST:
 * - query: string (required)
 * - context: CoPilotContext (required)
 * - sessionId: string (required)
 * 
 * RESPONSE: Server-Sent Events (SSE)
 * - Tokens: { type: 'token', content: string }
 * - Structured: { type: 'structured', data: {...} }
 * - Done: data: [DONE]
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CoPilotStreamRequest {
  query: string;
  context: any;
  sessionId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    
    // Create Supabase client - works with or without auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      authHeader ? { global: { headers: { Authorization: authHeader } } } : undefined
    );

    // Try to get user if authenticated (optional for public access)
    let user: any = null;
    if (authHeader) {
      const { data } = await supabaseClient.auth.getUser();
      user = data?.user;
    }

    const { query, context, sessionId }: CoPilotStreamRequest = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // ENFORCE GEMINI 3.X MODEL
    const model = 'google/gemini-3-pro-preview';

    // Fetch persistent memory (only for authenticated users)
    const memory = user ? await fetchMemory(supabaseClient, user.id) : {};
    console.log('[CoPilot] Loaded memory:', Object.keys(memory), 'authenticated:', !!user);

    // Build context-aware system prompt with memory
    const systemPrompt = buildSystemPrompt(context, memory);

    // Stream setup
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Call Lovable AI Gateway with streaming
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: query }
              ],
              temperature: 0.7,
              max_tokens: 2048,
              stream: true,
            })
          });

          if (!aiResponse.ok) {
            throw new Error(`AI API error: ${aiResponse.status}`);
          }

          if (!aiResponse.body) {
            throw new Error('No response body');
          }

          const reader = aiResponse.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let accumulatedContent = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim() || line.startsWith(':')) continue;
              if (!line.startsWith('data: ')) continue;

              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                // Send structured response
                const structured = generateStructuredResponse(query, context, accumulatedContent);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'structured', data: structured })}\n\n`));
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                
                // Save memory after response (only for authenticated users)
                if (user) {
                  await saveMemory(supabaseClient, user.id, query, context, accumulatedContent);
                }
                
                controller.close();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  accumulatedContent += delta;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', content: delta })}\n\n`));
                }
              } catch (e) {
                console.error('Parse error:', e);
              }
            }
          }

          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (error) {
    console.error('Co-Pilot stream error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Fetch user's persistent memory
 */
async function fetchMemory(supabase: any, userId: string): Promise<Record<string, any>> {
  const { data, error } = await supabase
    .from('copilot_memory')
    .select('key, value')
    .eq('user_id', userId);

  if (error) {
    console.error('[CoPilot] Failed to fetch memory:', error);
    return {};
  }

  const memory: Record<string, any> = {};
  for (const row of data || []) {
    memory[row.key] = row.value;
  }
  return memory;
}

/**
 * Save/update user's persistent memory
 */
async function saveMemory(supabase: any, userId: string, query: string, context: any, response: string): Promise<void> {
  const updates: Array<{ key: string; value: any }> = [];

  // Save last agent context
  if (context.agentId) {
    updates.push({
      key: 'last_agent_id',
      value: { agentId: context.agentId, agentName: context.agentName, timestamp: new Date().toISOString() }
    });
  }

  // Save last industry
  if (context.industry) {
    updates.push({
      key: 'last_industry',
      value: { industry: context.industry, timestamp: new Date().toISOString() }
    });
  }

  // Save last active page
  if (context.activePage) {
    updates.push({
      key: 'last_page',
      value: { page: context.activePage, tab: context.activeTab, timestamp: new Date().toISOString() }
    });
  }

  // Append recent task (keep last 5)
  const recentTask = {
    query: query.slice(0, 100),
    context: context.activePage,
    timestamp: new Date().toISOString()
  };
  
  // Fetch existing recent tasks
  const { data: existing } = await supabase
    .from('copilot_memory')
    .select('value')
    .eq('user_id', userId)
    .eq('key', 'recent_tasks')
    .single();

  const recentTasks = existing?.value?.tasks || [];
  recentTasks.unshift(recentTask);
  recentTasks.splice(5); // Keep last 5

  updates.push({
    key: 'recent_tasks',
    value: { tasks: recentTasks }
  });

  // Upsert memory
  for (const update of updates) {
    await supabase
      .from('copilot_memory')
      .upsert({
        user_id: userId,
        key: update.key,
        value: update.value,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,key'
      });
  }

  console.log('[CoPilot] Saved memory:', updates.map(u => u.key));
}

/**
 * Build context-aware system prompt
 */
function buildSystemPrompt(context: any, memory: Record<string, any> = {}): string {
  // If DC domain system prompt is provided, use it directly
  if (context.domainSystemPrompt && context.isDataCentreDomain) {
    console.log('[CoPilot] Using DC domain system prompt');
    return context.domainSystemPrompt;
  }

  let prompt = `You are AURA Co-Pilot, an intelligent assistant for the AURA Digital Twin & Agentic Studio platform.

Current Context:
- Page: ${context.activePage}`;

  if (context.agentName) {
    prompt += `\n- Agent: ${context.agentName} (${context.agentType || 'agent'})`;
  }
  if (context.industry) {
    prompt += `\n- Industry: ${context.industry}`;
  }
  if (context.workflowsCount !== undefined) {
    prompt += `\n- Workflows: ${context.workflowsCount}`;
  }
  if (context.integrationsCount !== undefined) {
    prompt += `\n- Integrations: ${context.integrationsCount}`;
  }
  if (context.totalRuns !== undefined) {
    prompt += `\n- Total Runs: ${context.totalRuns}`;
  }

  // Add memory context
  if (Object.keys(memory).length > 0) {
    prompt += `\n\nUser History & Preferences:`;
    
    if (memory.last_agent_id) {
      prompt += `\n- Last worked on: ${memory.last_agent_id.agentName || 'agent'}`;
    }
    if (memory.last_industry) {
      prompt += `\n- Primary industry: ${memory.last_industry.industry}`;
    }
    if (memory.preferred_response_style) {
      prompt += `\n- Prefers: ${memory.preferred_response_style.style}`;
    }
    if (memory.recent_tasks?.tasks?.length) {
      const recentContexts = memory.recent_tasks.tasks.slice(0, 3).map((t: any) => t.context).join(', ');
      prompt += `\n- Recent work: ${recentContexts}`;
    }
  }

  prompt += `\n\nYour role is to:
1. Provide immediate, actionable guidance based on current context
2. Identify missing configurations or workflows
3. Suggest next steps tailored to the user's current page and agent
4. Be concise and professional

Keep responses under 200 words unless complex explanation is needed.`;

  return prompt;
}

/**
 * Generate structured response (Actions, Insights, Next Steps, Follow-ups)
 * Now with full DC domain support
 */
function generateStructuredResponse(query: string, context: any, response: string): any {
  const structured: any = {
    actions: [],
    insights: [],
    nextSteps: [],
    followUps: [],
  };

  // Check if this is a DC domain context
  const isDCDomain = context.isDataCentreDomain || 
                     context.activePage === 'data_centre_twin' ||
                     context.dcContext;

  if (isDCDomain) {
    return generateDCStructuredResponse(query, context, response);
  }

  // Generate context-aware actions for non-DC pages
  if (context.activePage === 'builder' || (context.workflowsCount !== undefined && context.workflowsCount === 0)) {
    structured.actions.push({
      label: 'Create Workflow',
      handler: '/builder/step-4',
      icon: 'plus'
    });
  }

  if (context.activePage === 'agent_detail' && context.activeTab === 'simulation') {
    structured.actions.push({
      label: 'Run Simulation',
      handler: 'simulate',
      icon: 'play'
    });
  }

  if (context.activePage === 'template_library') {
    structured.actions.push({
      label: 'Browse Templates',
      handler: '/templates',
      icon: 'external'
    });
  }

  // Generate insights
  if (context.workflowsCount === 0) {
    structured.insights.push('No workflows configured yet. Consider adding a monitoring or automation workflow.');
  }
  if (context.integrationsCount === 0) {
    structured.insights.push('No integrations connected. Connect data sources to enable rich agent functionality.');
  }
  if (context.totalRuns === 0) {
    structured.insights.push('Agent has not been run yet. Test it with a simulation or deploy to production.');
  }

  // Generate next steps based on context
  if (context.activePage === 'builder') {
    structured.nextSteps = [
      'Complete all 5 builder steps',
      'Test your agent in the simulation sandbox',
      'Deploy to a test environment first'
    ];
  } else if (context.activePage === 'agent_detail') {
    structured.nextSteps = [
      'Review workflow configurations',
      'Run a test simulation',
      'Monitor metrics and logs'
    ];
  } else {
    structured.nextSteps = [
      'Explore available templates',
      'Create or configure an agent',
      'Set up workflows and integrations'
    ];
  }

  // Generate contextually relevant follow-up questions
  structured.followUps = generateContextualFollowUps(query, context, response);

  return structured;
}

/**
 * Generate DC-specific structured response with actions, insights, and follow-ups
 */
function generateDCStructuredResponse(query: string, context: any, response: string): any {
  const queryLower = query.toLowerCase();
  const dcContext = context.dcContext || {};
  
  const structured: any = {
    actions: [],
    insights: [],
    nextSteps: [],
    followUps: [],
  };

  // Detect query intent for DC domain
  const isPUEQuery = /pue|power\s*usage|efficiency/i.test(queryLower);
  const isThermalQuery = /thermal|temperature|heat|cooling|hot\s*spot/i.test(queryLower);
  const isGPUQuery = /gpu|utilization|workload|cluster|training|inference/i.test(queryLower);
  const isCarbonQuery = /carbon|emission|green|renewable|sustainability/i.test(queryLower);
  const isSovereigntyQuery = /sovereign|compliance|cross.?border|jurisdiction|residency/i.test(queryLower);
  const isFinancialQuery = /cost|expense|roi|financial|budget|opex/i.test(queryLower);
  const isPowerQuery = /power|ups|pdu|battery|grid|outage/i.test(queryLower);
  const isSimulationQuery = /simulation|scenario|simulate|what.?if/i.test(queryLower);
  const isRCAQuery = /why|cause|reason|explain|diagnose|root\s*cause|troubleshoot/i.test(queryLower);

  // Generate DC-specific actions based on query and context
  if (isSimulationQuery) {
    structured.actions.push(
      { label: 'Run Cooling Failure', handler: 'cmd:runSimulation:cooling_failure_hot_aisle', icon: 'play' },
      { label: 'Run GPU Spike', handler: 'cmd:runSimulation:gpu_spike_training_job', icon: 'play' }
    );
  }

  if (isThermalQuery || isPUEQuery) {
    structured.actions.push(
      { label: 'View Thermal Tab', handler: 'cmd:navigateToTab:thermal', icon: 'thermal' },
      { label: 'Highlight PUE', handler: 'cmd:highlightKPI:pue', icon: 'activity' }
    );
  }

  if (isGPUQuery) {
    structured.actions.push(
      { label: 'View Workload Tab', handler: 'cmd:navigateToTab:workload', icon: 'workload' }
    );
  }

  if (isCarbonQuery) {
    structured.actions.push(
      { label: 'View Financial Tab', handler: 'cmd:navigateToTab:financial', icon: 'financial' },
      { label: 'Run Carbon Shock', handler: 'cmd:runSimulation:carbon_price_shock', icon: 'play' }
    );
  }

  if (isSovereigntyQuery) {
    structured.actions.push(
      { label: 'View Sovereignty Tab', handler: 'cmd:navigateToTab:sovereignty', icon: 'sovereignty' }
    );
  }

  if (isPowerQuery) {
    structured.actions.push(
      { label: 'View Power Tab', handler: 'cmd:navigateToTab:power', icon: 'power' },
      { label: 'Run UPS Failure', handler: 'cmd:runSimulation:ups_failure_runtime_drop', icon: 'play' }
    );
  }

  // Generate insights based on DC context
  if (dcContext.pue) {
    if (dcContext.pue > 1.6) {
      structured.insights.push(`PUE is elevated at ${dcContext.pue.toFixed(2)}. Consider reviewing cooling efficiency.`);
    } else if (dcContext.pue < 1.3) {
      structured.insights.push(`Excellent PUE of ${dcContext.pue.toFixed(2)} indicates highly efficient operations.`);
    }
  }

  if (dcContext.gpuUtilization) {
    if (dcContext.gpuUtilization > 90) {
      structured.insights.push(`GPU cluster is running at ${dcContext.gpuUtilization}% - near saturation. Consider capacity planning.`);
    } else if (dcContext.gpuUtilization < 50) {
      structured.insights.push(`GPU utilization at ${dcContext.gpuUtilization}% is below optimal. Review workload scheduling.`);
    }
  }

  if (dcContext.sovereigntyRisk && dcContext.sovereigntyRisk > 5) {
    structured.insights.push(`Sovereignty risk score is elevated at ${dcContext.sovereigntyRisk}%. Review cross-border data flows.`);
  }

  if (dcContext.alertsOpen && dcContext.alertsOpen > 0) {
    structured.insights.push(`${dcContext.alertsOpen} active alerts require attention. ${dcContext.criticalAlerts || 0} are critical.`);
  }

  // Generate next steps based on RCA or general query
  if (isRCAQuery) {
    structured.nextSteps = [
      'Review correlated metrics across thermal and power domains',
      'Check event timeline for triggering events',
      'Run simulation to verify root cause hypothesis'
    ];
  } else if (isSimulationQuery) {
    structured.nextSteps = [
      'Select a scenario from the preset list',
      'Review KPI deltas after simulation completes',
      'Document findings for operational playbook'
    ];
  } else {
    structured.nextSteps = [
      'Monitor real-time KPIs in the dashboard',
      'Review alerts and acknowledge resolved issues',
      'Run simulations to test operational resilience'
    ];
  }

  // Generate DC-specific follow-ups
  structured.followUps = generateDCFollowUps(query, dcContext);

  return structured;
}

/**
 * Generate DC domain-specific follow-up questions
 */
function generateDCFollowUps(query: string, dcContext: any): string[] {
  const queryLower = query.toLowerCase();
  const followUps: string[] = [];

  if (/pue/i.test(queryLower)) {
    followUps.push("What is causing the current PUE trend?", "How does PUE compare to last week?");
  }
  
  if (/thermal|temperature|cooling/i.test(queryLower)) {
    followUps.push('Are there any thermal hotspots?', 'Run cooling failure simulation');
  }
  
  if (/gpu|workload/i.test(queryLower)) {
    followUps.push('Which GPU cluster is most saturated?', 'What is the training vs inference split?');
  }
  
  if (/carbon|emission/i.test(queryLower)) {
    followUps.push('Compare carbon intensity QC vs AB', 'What is the projected annual emissions?');
  }
  
  if (/sovereign|compliance/i.test(queryLower)) {
    followUps.push('Are there any cross-border data flows?', 'What is the sovereign compute ratio?');
  }
  
  if (/cost|financial|roi/i.test(queryLower)) {
    followUps.push('What is the cost per GPU-hour?', 'What is the carbon cost impact?');
  }
  
  if (/power|ups/i.test(queryLower)) {
    followUps.push('What is the UPS battery health?', 'Run grid outage simulation');
  }

  // Default DC follow-ups if nothing specific matched
  if (followUps.length === 0) {
    followUps.push(
      'What is the current PUE?',
      'Are there any active alerts?',
      'Show GPU cluster utilization'
    );
  }

  return followUps.slice(0, 3);
}

/**
 * Generate follow-up questions that are directly relevant to the original query
 */
function generateContextualFollowUps(query: string, context: any, response: string): string[] {
  const queryLower = query.toLowerCase();
  const followUps: string[] = [];

  // Detect query intent and generate relevant follow-ups
  
  // Best practices queries
  if (queryLower.includes('best practice') || queryLower.includes('best-practice')) {
    followUps.push(
      `What are common mistakes to avoid with ${context.agentName || 'this agent'}?`,
      `How do I measure success for these best practices?`,
      `Can you show me an example implementation?`
    );
  }
  // Workflow queries
  else if (queryLower.includes('workflow')) {
    followUps.push(
      `How do I test this workflow before deploying?`,
      `What triggers should I configure for this workflow?`,
      `How can I add error handling to this workflow?`
    );
  }
  // Integration queries
  else if (queryLower.includes('integration') || queryLower.includes('connect')) {
    followUps.push(
      `What data will this integration sync?`,
      `How do I troubleshoot integration connection issues?`,
      `Can I set up multiple integrations at once?`
    );
  }
  // Simulation/testing queries
  else if (queryLower.includes('simulation') || queryLower.includes('test')) {
    followUps.push(
      `What scenarios should I test first?`,
      `How do I interpret the simulation results?`,
      `Can I automate these tests?`
    );
  }
  // Deployment queries
  else if (queryLower.includes('deploy') || queryLower.includes('production')) {
    followUps.push(
      `What should I check before deploying to production?`,
      `How do I rollback if something goes wrong?`,
      `What monitoring should I set up after deployment?`
    );
  }
  // Performance/metrics queries
  else if (queryLower.includes('metric') || queryLower.includes('performance') || queryLower.includes('monitor')) {
    followUps.push(
      `What are the key metrics I should track?`,
      `How do I set up alerts for these metrics?`,
      `What does a healthy performance baseline look like?`
    );
  }
  // Error/troubleshooting queries
  else if (queryLower.includes('error') || queryLower.includes('issue') || queryLower.includes('problem') || queryLower.includes('fix')) {
    followUps.push(
      `What are the most common causes for this error?`,
      `How can I prevent this from happening again?`,
      `Where can I find more detailed logs?`
    );
  }
  // ROI/value queries
  else if (queryLower.includes('roi') || queryLower.includes('value') || queryLower.includes('benefit')) {
    followUps.push(
      `How do I track ROI over time?`,
      `What benchmarks should I compare against?`,
      `How long until I see measurable results?`
    );
  }
  // Setup/configuration queries
  else if (queryLower.includes('setup') || queryLower.includes('configure') || queryLower.includes('create')) {
    followUps.push(
      `What configuration options are available?`,
      `Are there templates I can start from?`,
      `What's the minimum configuration needed to get started?`
    );
  }
  // Default contextual follow-ups based on page/agent context
  else {
    if (context.agentName) {
      followUps.push(
        `What else can ${context.agentName} do?`,
        `How do I optimize ${context.agentName}'s performance?`
      );
    }
    
    if (context.activePage === 'dashboard') {
      followUps.push(`What should I focus on first?`);
    } else if (context.activePage === 'agent_detail') {
      followUps.push(`What's the next step for this agent?`);
    } else {
      followUps.push(`Can you explain more about this?`);
    }
  }

  // Limit to 3 follow-ups
  return followUps.slice(0, 3);
}
