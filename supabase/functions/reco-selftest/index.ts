import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";


serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const report: Record<string, any> = { 
    ok: true, 
    timestamp: new Date().toISOString(),
    checks: {} 
  };

  try {
    // 1. Environment Variables Check
    const requiredEnvVars = [
      'LOVABLE_API_KEY',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
    ];

    report.checks.env = {};
    for (const varName of requiredEnvVars) {
      const exists = !!Deno.env.get(varName);
      report.checks.env[varName] = exists;
      if (!exists) {
        report.ok = false;
        report.checks.env[`${varName}_error`] = 'Missing or undefined';
      }
    }

    // 2. Request Origin Check
    report.checks.origin = {
      host: req.headers.get('host'),
      origin: req.headers.get('origin'),
      userAgent: req.headers.get('user-agent'),
    };

    // 3. Database Connectivity Check
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Check sites table
      const { data: sitesData, error: sitesError } = await supabase
        .from('sites')
        .select('id, domain')
        .limit(1);
      
      report.checks.db_sites = {
        ok: !sitesError,
        rowFound: !!sitesData?.length,
        error: sitesError?.message,
      };
      if (sitesError) report.ok = false;

      // Check site_pages table
      const { data: pagesData, error: pagesError } = await supabase
        .from('site_pages')
        .select('id, url, word_count')
        .limit(1);
      
      report.checks.db_pages = {
        ok: !pagesError,
        rowFound: !!pagesData?.length,
        error: pagesError?.message,
      };
      if (pagesError) report.ok = false;

      // Check recommendations table
      const { data: recosData, error: recosError } = await supabase
        .from('recommendations')
        .select('id, site_id')
        .limit(1);
      
      report.checks.db_recommendations = {
        ok: !recosError,
        rowFound: !!recosData?.length,
        error: recosError?.message,
      };
      if (recosError) report.ok = false;

    } catch (e: any) {
      report.checks.db = { 
        ok: false, 
        error: e?.message || 'Database connection failed' 
      };
      report.ok = false;
    }

    // 4. Lovable AI Gateway Check (Canary Test)
    try {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      
      if (!LOVABLE_API_KEY) {
        report.checks.ai = { 
          ok: false, 
          error: 'LOVABLE_API_KEY not set' 
        };
        report.ok = false;
      } else {
        const startTime = Date.now();
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3-pro-preview',
            messages: [
              { 
                role: 'user', 
                content: 'Return strict JSON only: {"probe":"ok","timestamp":"' + new Date().toISOString() + '"}. No markdown, no prose.' 
              }
            ],
          }),
        });

        const latency = Date.now() - startTime;

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          report.checks.ai = {
            ok: false,
            status: aiResponse.status,
            error: `AI gateway returned ${aiResponse.status}`,
            details: errorText.substring(0, 500),
            latency,
          };
          report.ok = false;
        } else {
          const aiData = await aiResponse.json();
          const content = aiData?.choices?.[0]?.message?.content || '';
          
          let parsed: any = null;
          try {
            parsed = JSON.parse(content);
          } catch {
            // Try to extract JSON from markdown
            const jsonMatch = content.match(/\{[^}]+\}/);
            if (jsonMatch) {
              try {
                parsed = JSON.parse(jsonMatch[0]);
              } catch { /* non-JSON model output is handled by the caller */ }
            }
          }

          report.checks.ai = {
            ok: !!parsed?.probe,
            model: 'google/gemini-3-pro-preview',
            latency,
            parsed,
            rawResponseLength: content.length,
          };

          if (!parsed?.probe) {
            report.ok = false;
            report.checks.ai.warning = 'AI returned response but JSON parsing failed';
          }
        }
      }
    } catch (e: any) {
      report.checks.ai = { 
        ok: false, 
        error: e?.message || 'AI gateway connection failed' 
      };
      report.ok = false;
    }

    // 5. Edge Functions Health
    report.checks.functions = {
      current: 'reco-selftest',
      related: [
        'url-recommendations',
        'url-crawl',
        'url-capture',
      ],
    };

    // 6. Summary
    report.summary = {
      allChecksPass: report.ok,
      failedChecks: Object.entries(report.checks)
        .filter(([_, v]: any) => v.ok === false)
        .map(([k]) => k),
      recommendations: report.ok 
        ? 'All systems operational' 
        : 'See failedChecks for details',
    };

  } catch (error: any) {
    report.ok = false;
    report.error = error?.message || 'Unknown error during diagnostics';
    report.stack = error?.stack;
  }

  return new Response(
    JSON.stringify(report, null, 2), 
    {
      status: report.ok ? 200 : 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
});
