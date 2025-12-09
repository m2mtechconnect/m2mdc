/**
 * Gemini-powered document analysis with chunking
 * Uses map-reduce approach for large documents
 */

interface AnalysisInput {
  text: string;
  fileName?: string;
  charCount: number;
  charCountTotal?: number;
  truncated?: boolean;
}

interface AnalysisResult {
  outline: string[];
  keySections: Array<{ heading: string; summary: string }>;
  mainSummary: string;
  entities: string[];
  domainGuess?: string;
  recommendedTwinTypes: Array<{
    id: string;
    title: string;
    description: string;
  }>;
  builderPrefill: {
    step1_goal?: string;
    step2_knowledge?: string;
    step3_tools_apis?: string;
    step4_workflows?: string;
    step5_kpis?: string;
  };
}

const CHUNK_SIZE = 10000; // ~10k chars per chunk
const CHUNK_OVERLAP = 500; // 500 char overlap between chunks

export async function geminiAnalyzeDocument(
  input: AnalysisInput
): Promise<AnalysisResult> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("GEMINI_NOT_CONFIGURED");
  }

  try {
    const MAX_GEMINI_CHARS = 12000;
    const fileName = input.fileName || "document";

    // Analyze in a single pass, truncating very large documents to stay within worker limits
    const textForAnalysis =
      input.text.length > MAX_GEMINI_CHARS
        ? input.text.slice(0, MAX_GEMINI_CHARS)
        : input.text;

    return await analyzeFullDocument(textForAnalysis, fileName);
  } catch (error: any) {
    console.error("Gemini analysis error:", error);
    
    if (error.message === "GEMINI_NOT_CONFIGURED") {
      throw error;
    }
    
    throw new Error(`Analysis failed: ${error.message || "Unknown error"}`);
  }
}

async function analyzeFullDocument(
  text: string,
  fileName: string
): Promise<AnalysisResult> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

  const systemPrompt = `You are an expert document analyst. Analyze the following document and extract:
1. A brief outline (3-5 main points)
2. Key sections with summaries
3. A main summary (2-3 paragraphs)
4. Key entities (people, organizations, products, technologies)
5. The domain/industry this relates to
6. Recommended Digital Twin or AI Agent types that could be built from this
7. Specific prefill suggestions for a 5-step agent builder

Return your analysis as a JSON object with this structure:
{
  "outline": ["point1", "point2", ...],
  "keySections": [{"heading": "...", "summary": "..."}],
  "mainSummary": "...",
  "entities": ["entity1", "entity2", ...],
  "domainGuess": "Industry/Domain",
  "recommendedTwinTypes": [{"id": "type1", "title": "...", "description": "..."}],
  "builderPrefill": {
    "step1_goal": "What this agent should accomplish",
    "step2_knowledge": "Key knowledge sources",
    "step3_tools_apis": "Suggested tools/APIs",
    "step4_workflows": "Workflow description",
    "step5_kpis": "Success metrics"
  }
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-pro-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Document: ${fileName}\n\n${text}` },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted. Please add credits.");
    }
    const error = await response.text();
    throw new Error(`AI request failed: ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No response from AI");
  }

  return JSON.parse(content);
}

async function analyzeWithChunking(input: AnalysisInput): Promise<AnalysisResult> {
  const chunks = createChunks(input.text);
  console.log(`Analyzing document in ${chunks.length} chunks`);

  // Step 1: Analyze each chunk
  const chunkSummaries: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const summary = await analyzeChunk(chunks[i], i + 1, chunks.length);
    chunkSummaries.push(summary);
  }

  // Step 2: Combine summaries and do final analysis
  const combinedText = chunkSummaries.join("\n\n");
  return await analyzeFullDocument(combinedText, input.fileName || "document");
}

function createChunks(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.substring(start, end));
    start = end - CHUNK_OVERLAP; // Overlap for context
  }

  return chunks;
}

async function analyzeChunk(
  chunk: string,
  chunkIndex: number,
  totalChunks: number
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

  const systemPrompt = `You are analyzing part ${chunkIndex} of ${totalChunks} of a larger document.
Provide a concise summary of the key points, entities, and concepts in this section.
Focus on what's important and actionable. Keep it under 500 words.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-pro-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: chunk },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    console.error(`Chunk ${chunkIndex} analysis failed`);
    return `[Analysis failed for section ${chunkIndex}]`;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
