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
 * Build context-aware system prompt with Blueprint Designer / Simulation mode support
 */
function buildSystemPrompt(context: any, memory: Record<string, any> = {}): string {
  // Check for new CoPilotContextPayload format (mode-aware)
  if (context.mode === 'blueprint-designer' || context.mode === 'simulation') {
    console.log('[CoPilot] Using mode-aware system prompt:', context.mode);
    return buildModeAwarePrompt(context, memory);
  }
  
  // If DC domain system prompt is provided, use it directly (legacy)
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
 * Build mode-aware prompt for Blueprint Designer or Simulation context
 */
function buildModeAwarePrompt(context: any, memory: Record<string, any> = {}): string {
  const { mode, twinId, overview, domains, agents, kpis, workflows, scenarios, financial } = context;
  
  const twinName = overview?.twinName || 'Data Centre Twin';
  const tier = overview?.tier || 'Tier III';
  const capacityKw = overview?.capacityKw || 5000;
  const region = overview?.cloudRegion || 'ca-central-1';
  
  // Common twin context
  let prompt = `You are AURA Co-Pilot, a context-aware assistant for the Data Centre Digital Twin Studio.

=== TWIN CONTEXT ===
Twin: ${twinName}
ID: ${twinId}
Region: ${region}
Tier: ${tier}
Capacity: ${capacityKw} kW
`;

  // Add domain summary
  if (domains?.length > 0) {
    prompt += `\nDomains (${domains.length}):`;
    for (const domain of domains.slice(0, 8)) {
      prompt += `\n  - ${domain.label}: ${domain.agentCount} agents, ${domain.kpiCount} KPIs, status: ${domain.healthStatus}`;
    }
  }

  // Add agent summary
  if (agents?.length > 0) {
    const enabledAgents = agents.filter((a: any) => a.enabled);
    prompt += `\n\nAgents (${enabledAgents.length}/${agents.length} enabled):`;
    for (const agent of enabledAgents.slice(0, 6)) {
      prompt += `\n  - ${agent.name} (${agent.domain})`;
    }
  }

  // Add KPI summary
  if (kpis?.length > 0) {
    const enabledKpis = kpis.filter((k: any) => k.enabled);
    prompt += `\n\nKPIs (${enabledKpis.length}/${kpis.length} enabled):`;
    for (const kpi of enabledKpis.slice(0, 8)) {
      const value = kpi.currentValue !== undefined ? ` = ${kpi.currentValue}${kpi.unit}` : '';
      const target = kpi.targetValue !== undefined ? ` (target: ${kpi.targetValue})` : '';
      prompt += `\n  - ${kpi.name}${value}${target}`;
    }
  }

  // Add workflow summary
  if (workflows?.length > 0) {
    const enabledWorkflows = workflows.filter((w: any) => w.enabled);
    prompt += `\n\nWorkflows (${enabledWorkflows.length}/${workflows.length} enabled):`;
    for (const workflow of enabledWorkflows.slice(0, 5)) {
      prompt += `\n  - ${workflow.name} (trigger: ${workflow.triggerType})`;
    }
  }

  // Add financial summary
  if (financial) {
    prompt += `\n\nFinancial Model:`;
    if (financial.annualPowerCostUsd) prompt += `\n  - Annual Power Cost: $${financial.annualPowerCostUsd.toLocaleString()}`;
    if (financial.annualCarbonTonnes) prompt += `\n  - Annual Carbon: ${financial.annualCarbonTonnes} tonnes`;
    if (financial.paybackMonths) prompt += `\n  - Payback: ${financial.paybackMonths} months`;
    if (financial.projectedROI) prompt += `\n  - Projected ROI: ${financial.projectedROI}%`;
  }

  // MODE-SPECIFIC CONTEXT
  if (mode === 'blueprint-designer') {
    prompt += buildBlueprintDesignerContext(context, memory);
  } else if (mode === 'simulation') {
    prompt += buildSimulationContext(context, memory);
  }

  return prompt;
}

/**
 * Build Blueprint Designer specific context
 */
function buildBlueprintDesignerContext(context: any, memory: Record<string, any>): string {
  let prompt = `

=== MODE: BLUEPRINT DESIGNER (Design-Time) ===
You are a Design Assistant helping configure and optimize this twin's blueprint.

YOUR CAPABILITIES:
- Explain current design: domains, agents, KPIs, workflows, scenarios
- Suggest missing agents/KPIs based on industry, tier, and capacity
- Recommend optimization scenarios (carbon, ROI, thermal risk)
- Explain validation warnings and how to fix them
- Summarize recent changes from ChangeLog
- Propose new scenarios, workflows, or KPI threshold adjustments

CONSTRAINTS:
- You can PROPOSE changes to the blueprint
- You should NEVER claim to "run" anything - only DESIGN
- Always be specific about what changes you recommend`;

  // Add validation report if available
  if (context.validationReport) {
    const { isValid, readinessScore, issues, missingAgents, missingKPIs, warnings } = context.validationReport;
    prompt += `\n\nValidation Report:
  - Valid: ${isValid}
  - Readiness Score: ${readinessScore}%`;
    
    if (issues?.length > 0) {
      prompt += `\n  - Issues (${issues.length}):`;
      for (const issue of issues.slice(0, 5)) {
        prompt += `\n      [${issue.severity}] ${issue.message}`;
      }
    }
    if (missingAgents?.length > 0) {
      prompt += `\n  - Missing Agents: ${missingAgents.join(', ')}`;
    }
    if (missingKPIs?.length > 0) {
      prompt += `\n  - Missing KPIs: ${missingKPIs.join(', ')}`;
    }
    if (warnings?.length > 0) {
      prompt += `\n  - Warnings: ${warnings.slice(0, 3).join('; ')}`;
    }
  }

  // Add change log if available
  if (context.changeLog?.length > 0) {
    prompt += `\n\nRecent Changes (${context.changeLog.length}):`;
    for (const entry of context.changeLog.slice(0, 5)) {
      prompt += `\n  - ${entry.action} ${entry.entityType} "${entry.entityId}"${entry.field ? ` (${entry.field})` : ''}`;
    }
  }

  // Add readiness score
  if (context.readinessScore !== undefined) {
    prompt += `\n\nBlueprint Readiness: ${context.readinessScore}%`;
  }

  prompt += `\n
When proposing changes, structure your response to include:
1. Clear explanation of the change
2. Expected impact on KPIs or operations
3. Any dependencies or prerequisites`;

  return prompt;
}

/**
 * Build Simulation specific context
 */
function buildSimulationContext(context: any, memory: Record<string, any>): string {
  let prompt = `

=== MODE: SIMULATION (Run-Time) ===
You are a Run Analyst helping interpret and improve simulation runs.

YOUR CAPABILITIES:
- Explain what is happening in the current run (hot spots, bottlenecks)
- Interpret KPI trends (anomalies, breaking points, correlations)
- Compare Run A vs Run B and explain deltas in plain language
- Prioritize Live Recommendations (which to apply first & why)
- Suggest design changes to fix issues (as suggestions for Blueprint Designer)

CONSTRAINTS:
- You CANNOT directly edit the blueprint
- Any design suggestions must be surfaced as "Send to Blueprint Designer" recommendations
- Always reference the Design Snapshot version to avoid confusion`;

  // Add simulation run info
  if (context.simulationRun) {
    const { runId, scenarioId, scenarioName, startedAt, duration, speed, status } = context.simulationRun;
    prompt += `\n\nActive Simulation:
  - Run ID: ${runId}
  - Scenario: ${scenarioName} (${scenarioId})
  - Status: ${status}
  - Duration: ${duration}s at ${speed}x speed
  - Started: ${startedAt}`;
  }

  // Add active scenario
  if (context.activeScenarioId) {
    const activeScenario = context.scenarios?.find((s: any) => s.id === context.activeScenarioId);
    if (activeScenario) {
      prompt += `\n\nActive Scenario: ${activeScenario.name}
  - Severity: ${activeScenario.severity}
  - Category: ${activeScenario.category}
  - Duration: ${activeScenario.durationMinutes} minutes`;
    }
  }

  // Add KPI time series summary
  if (context.kpiTimeSeries?.length > 0) {
    prompt += `\n\nKPI Trends (${context.kpiTimeSeries.length} tracked):`;
    for (const series of context.kpiTimeSeries.slice(0, 6)) {
      const anomaly = series.anomalyDetected ? ' [ANOMALY]' : '';
      prompt += `\n  - ${series.kpiName}: trend ${series.trend}${anomaly}`;
    }
  }

  // Add comparison runs
  if (context.comparisonRuns?.length > 0) {
    prompt += `\n\nRun Comparisons Available:`;
    for (const comp of context.comparisonRuns) {
      prompt += `\n  - ${comp.runAName} vs ${comp.runBName} (${comp.kpiDeltas.length} KPI deltas)`;
    }
  }

  // Add live recommendations
  if (context.liveRecommendations?.length > 0) {
    prompt += `\n\nLive Recommendations (${context.liveRecommendations.length}):`;
    for (const rec of context.liveRecommendations.slice(0, 5)) {
      prompt += `\n  - [${rec.priority}/${rec.type}] ${rec.title}`;
    }
  }

  // Add snapshot metadata
  if (context.snapshotVersion) {
    prompt += `\n\nDesign Snapshot: v${context.snapshotVersion}`;
    if (context.snapshotCapturedAt) {
      prompt += ` (captured: ${context.snapshotCapturedAt})`;
    }
  }

  prompt += `\n
When analyzing simulation results, provide:
1. Clear explanation of what happened
2. Root cause analysis if issues detected
3. Actionable recommendations (immediate and design-level)`;

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

  // Check for mode-aware context (new CoPilotContextPayload)
  if (context.mode === 'blueprint-designer') {
    return generateBlueprintDesignerResponse(query, context, response);
  }
  
  if (context.mode === 'simulation') {
    return generateSimulationResponse(query, context, response);
  }

  // Check if this is a DC domain context (legacy)
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
 * Generate Blueprint Designer specific structured response
 */
function generateBlueprintDesignerResponse(query: string, context: any, response: string): any {
  const queryLower = query.toLowerCase();
  
  const structured: any = {
    actions: [],
    insights: [],
    nextSteps: [],
    followUps: [],
    proposedChanges: [], // Blueprint-specific: changes to apply
  };

  // Detect query intent
  const isValidationQuery = /validation|issue|warning|error|fix|problem/i.test(queryLower);
  const isAgentQuery = /agent|missing|add|enable|disable/i.test(queryLower);
  const isKPIQuery = /kpi|threshold|metric|target/i.test(queryLower);
  const isWorkflowQuery = /workflow|trigger|automation/i.test(queryLower);
  const isScenarioQuery = /scenario|simulation|test|what.?if/i.test(queryLower);
  const isOptimizeQuery = /optimize|improve|reduce|increase|better/i.test(queryLower);

  // Generate actions based on query
  if (isValidationQuery && context.validationReport?.issues?.length > 0) {
    structured.actions.push(
      { label: 'Fix All Issues', handler: 'cmd:fixValidationIssues', icon: 'wrench' },
      { label: 'View Validation Tab', handler: 'cmd:navigateToTab:validation', icon: 'clipboard-check' }
    );
  }

  if (isAgentQuery) {
    structured.actions.push(
      { label: 'View Agents Tab', handler: 'cmd:navigateToTab:agents', icon: 'bot' },
      { label: 'Suggest Agents', handler: 'cmd:suggestAgents', icon: 'sparkles' }
    );
  }

  if (isKPIQuery) {
    structured.actions.push(
      { label: 'View KPIs Tab', handler: 'cmd:navigateToTab:kpis', icon: 'activity' },
      { label: 'Adjust Thresholds', handler: 'cmd:openKPIEditor', icon: 'sliders' }
    );
  }

  if (isWorkflowQuery) {
    structured.actions.push(
      { label: 'View Workflows Tab', handler: 'cmd:navigateToTab:workflows', icon: 'git-branch' }
    );
  }

  if (isScenarioQuery) {
    structured.actions.push(
      { label: 'View Scenarios Tab', handler: 'cmd:navigateToTab:scenarios', icon: 'play' },
      { label: 'Create Scenario', handler: 'cmd:createScenario', icon: 'plus' }
    );
  }

  // Generate insights from validation report
  if (context.validationReport) {
    if (!context.validationReport.isValid) {
      structured.insights.push(`Blueprint has ${context.validationReport.issues?.length || 0} validation issues to resolve.`);
    }
    if (context.validationReport.missingAgents?.length > 0) {
      structured.insights.push(`Missing recommended agents: ${context.validationReport.missingAgents.join(', ')}`);
    }
    if (context.validationReport.readinessScore < 70) {
      structured.insights.push(`Blueprint readiness is ${context.validationReport.readinessScore}% - consider addressing validation issues.`);
    }
  }

  // Generate next steps
  if (isOptimizeQuery) {
    structured.nextSteps = [
      'Review KPI thresholds and adjust targets',
      'Enable additional monitoring agents',
      'Add optimization scenarios for testing'
    ];
  } else {
    structured.nextSteps = [
      'Complete validation to ensure blueprint is ready',
      'Review agent configurations for all domains',
      'Set up scenarios to test operational resilience'
    ];
  }

  // Generate follow-ups
  structured.followUps = [
    'What agents are missing for this configuration?',
    'How can I improve the readiness score?',
    'What scenarios should I add for testing?'
  ];

  return structured;
}

/**
 * Generate Simulation specific structured response
 */
function generateSimulationResponse(query: string, context: any, response: string): any {
  const queryLower = query.toLowerCase();
  
  const structured: any = {
    actions: [],
    insights: [],
    nextSteps: [],
    followUps: [],
    blueprintSuggestions: [], // Simulation-specific: suggestions for blueprint designer
  };

  // Detect query intent
  const isExplainQuery = /explain|what|why|happening|cause/i.test(queryLower);
  const isTrendQuery = /trend|spike|anomaly|pattern/i.test(queryLower);
  const isCompareQuery = /compare|difference|delta|vs/i.test(queryLower);
  const isRecommendQuery = /recommend|suggest|fix|improve|prioritize/i.test(queryLower);

  // Generate actions based on query
  if (isExplainQuery) {
    structured.actions.push(
      { label: 'View Event Timeline', handler: 'cmd:showEventTimeline', icon: 'clock' },
      { label: 'Inspect KPI Details', handler: 'cmd:showKPIDetails', icon: 'activity' }
    );
  }

  if (isTrendQuery && context.kpiTimeSeries?.length > 0) {
    const anomalyKpis = context.kpiTimeSeries.filter((k: any) => k.anomalyDetected);
    if (anomalyKpis.length > 0) {
      structured.actions.push(
        { label: `View ${anomalyKpis.length} Anomalies`, handler: 'cmd:showAnomalies', icon: 'alert-triangle' }
      );
    }
  }

  if (isCompareQuery && context.comparisonRuns?.length > 0) {
    structured.actions.push(
      { label: 'Open Comparison View', handler: 'cmd:showComparison', icon: 'columns' }
    );
  }

  if (isRecommendQuery && context.liveRecommendations?.length > 0) {
    const highPriority = context.liveRecommendations.filter((r: any) => r.priority === 'high');
    structured.actions.push(
      { label: `Apply ${highPriority.length} High Priority`, handler: 'cmd:applyHighPriorityRecs', icon: 'zap' }
    );
  }

  // Always offer to send suggestions to blueprint
  structured.actions.push(
    { label: 'Send to Blueprint Designer', handler: 'cmd:sendToBlueprintDesigner', icon: 'send' }
  );

  // Generate insights from simulation state
  if (context.simulationRun?.status === 'running') {
    structured.insights.push(`Simulation "${context.simulationRun.scenarioName}" is in progress at ${context.simulationRun.speed}x speed.`);
  }

  if (context.kpiTimeSeries?.some((k: any) => k.anomalyDetected)) {
    const anomalyCount = context.kpiTimeSeries.filter((k: any) => k.anomalyDetected).length;
    structured.insights.push(`${anomalyCount} KPI(s) showing anomalous behavior.`);
  }

  if (context.liveRecommendations?.length > 0) {
    const highCount = context.liveRecommendations.filter((r: any) => r.priority === 'high').length;
    structured.insights.push(`${context.liveRecommendations.length} recommendations available (${highCount} high priority).`);
  }

  // Generate next steps
  if (context.simulationRun?.status === 'completed') {
    structured.nextSteps = [
      'Review KPI deltas and root cause analysis',
      'Export simulation report for documentation',
      'Run comparison with baseline scenario'
    ];
  } else {
    structured.nextSteps = [
      'Monitor KPI trends for anomalies',
      'Review live recommendations as they appear',
      'Prepare design changes based on findings'
    ];
  }

  // Generate follow-ups
  structured.followUps = [
    'What is causing this KPI trend?',
    'Compare this run to the baseline',
    'What design changes would prevent this failure?'
  ];

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
