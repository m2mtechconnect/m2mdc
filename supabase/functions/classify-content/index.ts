/**
 * /v1/classify-content
 * 
 * PURPOSE: AI-powered content classification for enterprise systems
 * AUTH: public (no auth required)
 * 
 * REQUEST:
 * - url: string (optional) - URL of content
 * - text: string (optional) - Content text to classify
 * - title: string (optional) - Content title
 * - pageId: string (optional) - Page ID to store classification
 * 
 * RESPONSE:
 * - industry: string - Classified industry
 * - department: string - Classified department
 * - contentType: string - Type of content
 * - dataSignals: string[] - Detected data signals
 * - piiRisk: string - PII risk level (LOW/MEDIUM/HIGH)
 * - confidence: number - Classification confidence (0.0-1.0)
 * - candidateUseCases: string[] - Suggested use cases
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";

const InputSchema = z.object({
  url: z.string().optional(),
  text: z.string().optional(),
  title: z.string().optional(),
  pageId: z.string().optional(),
}).refine(data => data.text || data.title, {
  message: "Either text or title is required"
});

serve(createHandler({
  name: "classify-content",
  authLevel: "public",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { url, text, title, pageId } = input;
    const { supabase, log } = context;

    log("Classifying content", { hasUrl: !!url, hasText: !!text });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'AI service not configured',
        status: 500,
      };
    }

    const systemPrompt = `You are a content classifier for enterprise AI systems. Analyze the provided content and return a JSON object with the following structure:

{
  "industry": "Healthcare|Energy|Manufacturing|Finance|Public Sector|Maritime|Agriculture|Technology|Retail|Other",
  "department": "Compliance|Operations|Engineering|Marketing|Finance|HR|Support|R&D|Sales|Legal",
  "contentType": "Policy|KB|Product|Pricing|Blog|Docs|API|Press|Landing|Support",
  "dataSignals": ["PII","PHI","Financial","Telemetry","SupportLogs","MarketingCopy","Technical","Legal"],
  "piiRisk": "LOW|MEDIUM|HIGH",
  "confidence": 0.0-1.0,
  "candidateUseCases": ["Audit Prep","Report Automation","Predictive Maintenance","Policy Summarization","FAQ Bot","Sales Intelligence","Developer Support","Compliance Monitoring"]
}

Be precise and confident in your classifications. If multiple industries apply, choose the primary one.`;

    const userPrompt = `URL: ${url || 'N/A'}
Title: ${title || 'N/A'}

Content:
${(text || '').substring(0, 8000)}

Classify this content and return only valid JSON.`;

    log("Calling AI for classification");

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      log("AI API error", { status: aiResponse.status, error: errorText });
      
      if (aiResponse.status === 429) {
        throw {
          code: ErrorCodes.EXTERNAL_API_ERROR,
          message: 'Rate limit exceeded. Please try again in a moment.',
          status: 429,
        };
      }
      
      if (aiResponse.status === 402) {
        throw {
          code: ErrorCodes.EXTERNAL_API_ERROR,
          message: 'AI credits depleted. Please add credits to continue.',
          status: 402,
        };
      }

      throw {
        code: ErrorCodes.EXTERNAL_API_ERROR,
        message: `AI API error: ${aiResponse.status}`,
        status: 502,
      };
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content;

    if (!content) {
      throw {
        code: ErrorCodes.EXTERNAL_API_ERROR,
        message: 'No content in AI response',
        status: 502,
      };
    }

    // Parse JSON from response (handle markdown code blocks)
    let classification;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      classification = JSON.parse(jsonStr);
    } catch (parseError) {
      log("JSON parse error, using fallback", { error: parseError });
      // Fallback classification
      classification = {
        industry: 'Other',
        department: 'Operations',
        contentType: 'Docs',
        dataSignals: [],
        piiRisk: 'LOW',
        confidence: 0.5,
        candidateUseCases: ['Knowledge Source']
      };
    }

    log("Classification complete", { industry: classification.industry });

    // Store classification in database if pageId provided
    if (pageId && supabase) {
      const { error: insertError } = await supabase
        .from('page_classifications')
        .upsert({
          page_id: pageId,
          industry: classification.industry,
          department: classification.department,
          content_type: classification.contentType,
          data_signals: classification.dataSignals || [],
          pii_risk: classification.piiRisk,
          confidence: classification.confidence,
          candidate_use_cases: classification.candidateUseCases || []
        }, {
          onConflict: 'page_id'
        });

      if (insertError) {
        log("DB insert error", { error: insertError.message });
      } else {
        log("Classification stored in database");
      }
    }

    return classification;
  }
}));
