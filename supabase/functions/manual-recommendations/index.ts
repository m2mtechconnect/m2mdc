import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RecoResponse {
  company: string | null;
  domain: string;
  industryGuess: string | null;
  departmentsCovered: string[];
  items: any[];
  status: "ok" | "empty" | "error";
  message?: string;
  captureResults?: Array<{
    url: string;
    status: "success" | "success_thin" | "failed";
    wordCount?: number;
    error?: string;
  }>;
  telemetry?: {
    crawl_pages_found?: number;
    force_ingest_pages_found?: number;
    context_chars: number;
    gemini_ok: boolean;
    gemini_error?: string;
    returned_items_count: number;
  };
}

const normalizeResponse = (
  partial: Partial<RecoResponse>,
  domain: string
): RecoResponse => ({
  company: partial.company ?? null,
  domain: partial.domain ?? domain,
  industryGuess: partial.industryGuess ?? null,
  departmentsCovered: Array.isArray(partial.departmentsCovered)
    ? partial.departmentsCovered
    : [],
  items: Array.isArray(partial.items) ? partial.items : [],
  status: partial.status ?? "ok",
  message: partial.message,
  captureResults: partial.captureResults,
  telemetry: partial.telemetry,
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let domain = "manual-input";

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify(
          normalizeResponse(
            {
              status: "error",
              message: "Only POST is supported for manual content.",
            },
            domain
          )
        ),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const body = await req.json();
    const inputUrl: string | undefined = body.url;
    const companyName: string | undefined = body.companyName;
    const rawContent: string | undefined = body.content;
    const topN: number = typeof body.topN === "number" && body.topN > 0 ? body.topN : 3;

    if (!rawContent || typeof rawContent !== "string") {
      return new Response(
        JSON.stringify(
          normalizeResponse(
            {
              status: "error",
              message: "Content is required to generate recommendations.",
            },
            domain
          )
        ),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const trimmedContent = rawContent.trim();
    if (trimmedContent.length < 100) {
      return new Response(
        JSON.stringify(
          normalizeResponse(
            {
              status: "error",
              message:
                "Content is too short. Please paste at least a few detailed paragraphs.",
            },
            domain
          )
        ),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        }
      );
    }

    if (inputUrl && typeof inputUrl === "string") {
      try {
        const urlObj = new URL(
          inputUrl.startsWith("http") ? inputUrl : `https://${inputUrl}`
        );
        domain = urlObj.hostname.replace(/^www\./, "");
      } catch {
        // Keep default manual-input domain
      }
    }

    const context = trimmedContent.slice(0, 120000);
    const contextChars = context.length;

    const systemPrompt = `You are M2M's Agentic Advisor. Given raw website text from a single company,
produce the TOP ${topN} AI initiatives PER department that can deliver measurable impact in 90–180 days.

Departments (only these):
Sales, Marketing, Product, Operations, Support, Engineering, Finance, HR, Legal, Compliance.

Rules:
- For each department, propose up to ${topN} initiatives. If insufficient evidence, omit the department.
- Each initiative MUST include: concise title; ≤80-word value proposition; one concrete "Next Step" doable in 2 weeks; tags chosen only from ["Adoption","Commercialization","Funding Eligible","MEA Spark","MEA Gateway"]; Impact (Low/Medium/High); Effort (Low/Medium/High); Confidence 0–1; optional fundingHints (Canada: IRAP, Scale AI, NGen, etc. when relevant); blueprintId + defaultAgents/defaultDatasets/defaultConnections that our studio can preload.
- Base everything ONLY on the provided text. If uncertain, lower confidence or omit.
- Prefer quick wins that can be piloted in AURA. Map to Canadian funding when appropriate.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const recommendationSchema = {
      type: "object",
      properties: {
        company: { type: "string" },
        domain: { type: "string" },
        industryGuess: { type: "string" },
        departmentsCovered: { type: "array", items: { type: "string" } },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              department: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              nextStep: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              confidence: { type: "number" },
              impact: { type: "string", enum: ["Low", "Medium", "High"] },
              effort: { type: "string", enum: ["Low", "Medium", "High"] },
              fundingHints: { type: "array", items: { type: "string" } },
              sources: { type: "array", items: { type: "string" } },
              blueprintId: { type: "string" },
              defaultAgents: { type: "array", items: { type: "object" } },
              defaultDatasets: { type: "array", items: { type: "string" } },
              defaultConnections: { type: "array", items: { type: "string" } },
            },
            required: [
              "department",
              "title",
              "description",
              "nextStep",
              "tags",
              "confidence",
              "impact",
              "effort",
            ],
          },
        },
      },
      required: ["company", "domain", "departmentsCovered", "items"],
    };

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Analyze this company from manually pasted content:\n\nDomain: ${
                domain || "manual-input"
              }\nCompany: ${companyName || "Unknown"}\n\nContent:\n${context}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_recommendations",
                description:
                  "Generate AI initiative recommendations for a company",
                parameters: recommendationSchema,
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "generate_recommendations" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[ManualRecommendations] AI gateway error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify(
            normalizeResponse(
              {
                status: "error",
                message:
                  "Rate limit exceeded. Please try again in a few moments.",
              },
              domain
            )
          ),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          }
        );
      }

      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify(
            normalizeResponse(
              {
                status: "error",
                message: "AI credits exhausted. Please contact support.",
              },
              domain
            )
          ),
          {
            status: 402,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          }
        );
      }

      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let result: any;
    let geminiOk = false;
    let geminiError: string | undefined;

    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        result = JSON.parse(toolCall.function.arguments);
        geminiOk = true;
        console.log(
          "[ManualRecommendations] Successfully extracted structured response from tool call"
        );
      } else {
        result = JSON.parse(aiData.choices[0].message.content);
        geminiOk = true;
        console.log(
          "[ManualRecommendations] Fallback: parsed response from message content"
        );
      }
    } catch (parseError: any) {
      console.error(
        "[ManualRecommendations] Failed to parse AI response:",
        parseError
      );
      geminiError = parseError?.message;

      return new Response(
        JSON.stringify(
          normalizeResponse(
            {
              status: "error",
              message:
                "AI returned invalid response format. Please try again.",
              telemetry: {
                crawl_pages_found: 0,
                force_ingest_pages_found: 0,
                context_chars: contextChars,
                gemini_ok: false,
                gemini_error: geminiError,
                returned_items_count: 0,
              },
            },
            domain
          )
        ),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const itemsCount = result.items?.length || 0;
    console.log(
      `[ManualRecommendations] AI returned ${itemsCount} recommendations from manual content`
    );

    if (!result.items || !Array.isArray(result.items) || result.items.length === 0) {
      return new Response(
        JSON.stringify(
          normalizeResponse(
            {
              status: "empty",
              message:
                "AI could not generate recommendations from this content. Please include more detail about services, products, and operations.",
              company: result.company ?? companyName ?? null,
              industryGuess: result.industryGuess,
              telemetry: {
                crawl_pages_found: 0,
                force_ingest_pages_found: 0,
                context_chars: contextChars,
                gemini_ok: geminiOk,
                gemini_error: geminiError,
                returned_items_count: 0,
              },
            },
            domain
          )
        ),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        }
      );
    }

    result.items = result.items.map((item: any, idx: number) => ({
      ...item,
      id: `manual-${domain}-${idx}`,
      sources: inputUrl ? [inputUrl] : ["manual-input"],
    }));

    result.departmentsCovered = Array.isArray(result.departmentsCovered)
      ? result.departmentsCovered
      : [];

    const response = normalizeResponse(
      {
        ...result,
        company: result.company ?? companyName ?? null,
        domain: result.domain ?? (domain || inputUrl || "manual-input"),
        status: "ok",
        telemetry: {
          crawl_pages_found: 0,
          force_ingest_pages_found: 0,
          context_chars: contextChars,
          gemini_ok: geminiOk,
          returned_items_count: itemsCount,
        },
      },
      domain
    );

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("[ManualRecommendations] Error:", error);
    return new Response(
      JSON.stringify(
        normalizeResponse(
          {
            status: "error",
            message:
              error?.message ||
              "An unexpected error occurred while generating recommendations.",
          },
          domain
        )
      ),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
});
