/**
 * Industry → Blueprint Profile Mapping Logic
 * Pure function that maps scan signals to the appropriate blueprint profile
 */

import type { DCScanSignals, DCBlueprintProfile, DCScanIndustry } from "@/types/dcScan";

// Keywords for industry detection
const INDUSTRY_KEYWORDS: Record<DCScanIndustry, string[]> = {
  finance: [
    "bank", "banking", "fintech", "financial", "investment", "trading", "hedge fund",
    "insurance", "payments", "credit", "loan", "mortgage", "wealth management",
    "asset management", "capital markets", "securities", "forex", "cryptocurrency",
    "blockchain", "defi", "neobank", "paytech"
  ],
  government: [
    "government", "gov", "federal", "state", "municipal", "city of", "county",
    "public sector", "ministry", "department of", "agency", "defense", "military",
    "homeland", "intelligence", "civic", "public service"
  ],
  retail: [
    "retail", "ecommerce", "e-commerce", "shop", "store", "marketplace",
    "consumer", "fashion", "apparel", "grocery", "supermarket", "department store",
    "online shopping", "fulfillment", "omnichannel"
  ],
  telecom: [
    "telecom", "telecommunications", "carrier", "mobile", "wireless", "5g",
    "network operator", "isp", "broadband", "fiber", "cable", "satellite",
    "voip", "unified communications"
  ],
  cloud_saas: [
    "saas", "software as a service", "cloud platform", "b2b software", "enterprise software",
    "api", "developer platform", "devops", "infrastructure", "paas", "iaas",
    "collaboration", "productivity", "crm", "erp", "hrms"
  ],
  manufacturing: [
    "manufacturing", "industrial", "factory", "production", "automation",
    "robotics", "iot", "industry 4.0", "supply chain", "logistics",
    "automotive", "aerospace", "semiconductor", "electronics"
  ],
  healthcare: [
    "healthcare", "health", "medical", "hospital", "clinic", "pharmaceutical",
    "biotech", "life sciences", "clinical", "patient", "diagnosis", "treatment",
    "telemedicine", "healthtech", "medtech", "genomics"
  ],
  energy: [
    "energy", "utility", "power", "electricity", "grid", "renewable",
    "solar", "wind", "oil", "gas", "petroleum", "nuclear", "hydro",
    "clean energy", "sustainability", "carbon", "emissions"
  ],
  ai_compute: [
    "artificial intelligence", "machine learning", "deep learning", "neural network",
    "foundation model", "llm", "large language model", "generative ai", "genai",
    "computer vision", "nlp", "natural language", "training", "inference",
    "gpu", "hpc", "high performance computing", "supercomputer"
  ],
  other: []
};

// Compliance keywords for detection
const COMPLIANCE_KEYWORDS: Record<string, string[]> = {
  finance: ["pci-dss", "pci dss", "sox", "sarbanes", "dora", "mifid", "basel"],
  healthcare: ["hipaa", "hitrust", "fda", "21 cfr", "phi", "protected health"],
  government: ["fedramp", "itar", "cjis", "stateramp", "cmmc", "fisma", "nist 800"],
  general: ["soc2", "soc 2", "iso 27001", "gdpr", "ccpa", "iso27001"]
};

// AI/ML intensity keywords
const AI_KEYWORDS = [
  "ai", "artificial intelligence", "machine learning", "ml", "deep learning",
  "neural", "model", "training", "inference", "gpu", "cuda", "tensor",
  "pytorch", "tensorflow", "llm", "foundation model", "genai", "generative"
];

/**
 * Detect industry from content and URL
 */
export function detectIndustry(content: string, url: string): DCScanIndustry {
  const lowerContent = (content + " " + url).toLowerCase();
  
  const scores: Record<DCScanIndustry, number> = {
    finance: 0,
    government: 0,
    retail: 0,
    telecom: 0,
    cloud_saas: 0,
    manufacturing: 0,
    healthcare: 0,
    energy: 0,
    ai_compute: 0,
    other: 0
  };

  // Score each industry based on keyword matches
  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerContent.includes(keyword)) {
        scores[industry as DCScanIndustry] += 1;
      }
    }
  }

  // Find the industry with highest score
  let maxScore = 0;
  let detectedIndustry: DCScanIndustry = "other";
  
  for (const [industry, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedIndustry = industry as DCScanIndustry;
    }
  }

  // If no clear winner, default to cloud_saas for tech companies
  if (maxScore < 2) {
    const techKeywords = ["software", "platform", "tech", "digital", "app", "solution"];
    const isTech = techKeywords.some(k => lowerContent.includes(k));
    if (isTech) {
      return "cloud_saas";
    }
  }

  return detectedIndustry;
}

/**
 * Calculate AI intensity score (0-100)
 */
export function calculateAIIntensity(content: string): number {
  const lowerContent = content.toLowerCase();
  let score = 0;
  
  for (const keyword of AI_KEYWORDS) {
    const matches = (lowerContent.match(new RegExp(keyword, 'g')) || []).length;
    score += Math.min(matches * 5, 20); // Cap per keyword
  }
  
  return Math.min(score, 100);
}

/**
 * Extract compliance keywords from content
 */
export function extractComplianceKeywords(content: string): string[] {
  const lowerContent = content.toLowerCase();
  const found: string[] = [];
  
  for (const keywords of Object.values(COMPLIANCE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerContent.includes(keyword) && !found.includes(keyword)) {
        found.push(keyword);
      }
    }
  }
  
  return found;
}

/**
 * Main function: Select the appropriate blueprint profile based on scan signals
 */
export function selectBlueprintProfile(signals: DCScanSignals): DCBlueprintProfile {
  const { industry, aiIntensityScore, complianceKeywords } = signals;
  
  // Rule 1: AI-heavy overrides most industries
  if (aiIntensityScore >= 60) {
    return "sovereign_ai_factory_dc";
  }
  
  // Rule 2: Industry-specific mappings
  switch (industry) {
    case "finance":
      return "finance_green_dc";
    
    case "government":
      return "gov_sovereign_dc";
    
    case "retail":
      return "retail_edge_dc";
    
    case "telecom":
      return "telco_regional_dc";
    
    case "cloud_saas":
      // Check if it's AI-focused SaaS
      if (aiIntensityScore >= 40) {
        return "sovereign_ai_factory_dc";
      }
      return "saas_multi_tenant_dc";
    
    case "manufacturing":
      return "industrial_ai_dc";
    
    case "healthcare":
      return "healthcare_compliant_dc";
    
    case "energy":
      return "energy_low_carbon_dc";
    
    case "ai_compute":
      return "sovereign_ai_factory_dc";
    
    default:
      // Rule 3: Check compliance keywords for fallback
      const hasHealthcareCompliance = complianceKeywords.some(k => 
        ["hipaa", "hitrust", "phi"].includes(k.toLowerCase())
      );
      if (hasHealthcareCompliance) {
        return "healthcare_compliant_dc";
      }
      
      const hasFinanceCompliance = complianceKeywords.some(k =>
        ["pci-dss", "pci dss", "sox", "dora"].includes(k.toLowerCase())
      );
      if (hasFinanceCompliance) {
        return "finance_green_dc";
      }
      
      const hasGovCompliance = complianceKeywords.some(k =>
        ["fedramp", "itar", "cjis", "cmmc"].includes(k.toLowerCase())
      );
      if (hasGovCompliance) {
        return "gov_sovereign_dc";
      }
      
      // Default fallback
      return "saas_multi_tenant_dc";
  }
}

/**
 * Build complete scan signals from scraped content
 */
export function buildScanSignals(url: string, content: string): DCScanSignals {
  const industry = detectIndustry(content, url);
  const aiIntensityScore = calculateAIIntensity(content);
  const complianceKeywords = extractComplianceKeywords(content);
  
  // Estimate scale from content hints
  const lowerContent = content.toLowerCase();
  let careersPageHints: "small" | "medium" | "large" | "hyperscale" = "medium";
  
  if (lowerContent.includes("fortune 500") || lowerContent.includes("global") || lowerContent.includes("worldwide")) {
    careersPageHints = "large";
  }
  if (lowerContent.includes("hyperscale") || lowerContent.includes("exabyte") || lowerContent.includes("petabyte")) {
    careersPageHints = "hyperscale";
  }
  if (lowerContent.includes("startup") || lowerContent.includes("small team")) {
    careersPageHints = "small";
  }
  
  // Detect cloud provider mentions
  const cloudProviders = ["aws", "azure", "gcp", "google cloud", "oracle cloud", "ibm cloud"];
  const cloudProviderMentions = cloudProviders.filter(p => lowerContent.includes(p));
  
  // Sustainability keywords
  const sustainabilityKeywords = [
    "sustainable", "carbon neutral", "net zero", "renewable", "green",
    "esg", "environmental", "climate"
  ].filter(k => lowerContent.includes(k));

  return {
    url,
    industry,
    aiIntensityScore,
    complianceKeywords,
    scaleSignals: {
      careersPageHints,
      cloudProviderMentions,
      globalPresence: lowerContent.includes("global") || lowerContent.includes("worldwide")
    },
    sustainabilityKeywords
  };
}
