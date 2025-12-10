/**
 * Industry and capacity classifier for Green DC Twin recommendations
 */

import type { DcIndustry, DcCapacityTier, DcTwinArchetypeId } from "@/types/greenDcTwin";

/**
 * Classify industry from extracted website text
 */
export function classifyIndustry(text: string): { industry: DcIndustry; businessModel?: string } {
  const lower = text.toLowerCase();

  // Finance / Banking
  if (
    lower.includes("core banking") ||
    lower.includes("retail banking") ||
    lower.includes("capital markets") ||
    lower.includes("wealth management") ||
    lower.includes("payment processing") ||
    lower.includes("financial services")
  ) {
    return { industry: "finance", businessModel: "bank" };
  }
  
  if (lower.includes("insurance") || lower.includes("policyholder") || lower.includes("underwriting")) {
    return { industry: "finance", businessModel: "insurance" };
  }

  // Government / Public Sector
  if (
    lower.includes("ministry") ||
    lower.includes("government") ||
    lower.includes("public sector") ||
    lower.includes("federal agency") ||
    lower.includes("municipal") ||
    lower.includes("provincial") ||
    lower.includes("state agency") ||
    lower.includes(".gov")
  ) {
    return { industry: "government", businessModel: "public_sector" };
  }

  // Healthcare
  if (
    lower.includes("ehr") ||
    lower.includes("electronic health record") ||
    lower.includes("clinical data") ||
    lower.includes("patient") ||
    lower.includes("hospital") ||
    lower.includes("healthcare") ||
    lower.includes("medical") ||
    lower.includes("hipaa") ||
    lower.includes("phipa")
  ) {
    return { industry: "healthcare", businessModel: "health_system" };
  }

  // Telecom
  if (
    lower.includes("5g") ||
    lower.includes("telecom") ||
    lower.includes("telecommunications") ||
    lower.includes("carrier") ||
    lower.includes("mobile network") ||
    lower.includes("wireless")
  ) {
    return { industry: "telecom" };
  }

  // Manufacturing
  if (
    lower.includes("manufacturing") ||
    lower.includes("factory") ||
    lower.includes("iiot") ||
    lower.includes("industrial iot") ||
    lower.includes("production line") ||
    lower.includes("supply chain") ||
    lower.includes("assembly")
  ) {
    return { industry: "manufacturing" };
  }

  // Energy / Utilities
  if (
    lower.includes("energy") ||
    lower.includes("utility") ||
    lower.includes("power grid") ||
    lower.includes("renewable") ||
    lower.includes("solar") ||
    lower.includes("wind power") ||
    lower.includes("electricity")
  ) {
    return { industry: "energy" };
  }

  // Education / Research
  if (
    lower.includes("university") ||
    lower.includes("research institute") ||
    lower.includes("college") ||
    lower.includes("academic") ||
    lower.includes("higher education") ||
    lower.includes(".edu")
  ) {
    return { industry: "education" };
  }

  // Retail / E-commerce
  if (
    lower.includes("e-commerce") ||
    lower.includes("ecommerce") ||
    lower.includes("shopping cart") ||
    lower.includes("retail") ||
    lower.includes("online store") ||
    lower.includes("marketplace")
  ) {
    return { industry: "retail", businessModel: "ecommerce" };
  }

  // SaaS / Cloud
  if (
    lower.includes("cloud") ||
    lower.includes("saas") ||
    lower.includes("software as a service") ||
    lower.includes("platform") ||
    lower.includes("api")
  ) {
    return { industry: "saas", businessModel: "enterprise_saas" };
  }

  return { industry: "generic" };
}

/**
 * Select archetype based on industry and text content
 */
export function selectArchetype(industry: DcIndustry, text: string): DcTwinArchetypeId {
  const lower = text.toLowerCase();

  switch (industry) {
    case "finance":
      return "finance_core_banking_green_twin";
    case "retail":
      return "retail_ecommerce_green_twin";
    case "government":
      return "gov_sovereign_cloud_twin";
    case "healthcare":
      return "healthcare_phi_twin";
    case "telecom":
      return "telco_edge_5g_twin";
    case "manufacturing":
      return "manufacturing_iiot_twin";
    case "energy":
      return "energy_grid_ai_twin";
    case "education":
      return "education_research_ai_twin";
    case "saas":
      // If SaaS + clear AI focus, pick AI twin
      if (lower.includes("ai") || lower.includes("llm") || lower.includes("ml") || lower.includes("machine learning")) {
        return "saas_multitenant_ai_twin";
      }
      return "generic_enterprise_green_twin";
    default:
      return "generic_enterprise_green_twin";
  }
}

/**
 * Infer regions from text content
 */
export function inferRegions(text: string): string[] {
  const lower = text.toLowerCase();
  const regions: string[] = [];

  // North America
  if (
    lower.includes("north america") ||
    lower.includes("united states") ||
    lower.includes("usa") ||
    lower.includes("canada") ||
    lower.includes("mexico") ||
    lower.includes("american")
  ) {
    regions.push("NA");
  }

  // Europe
  if (
    lower.includes("europe") ||
    lower.includes("european") ||
    lower.includes("eu") ||
    lower.includes("uk") ||
    lower.includes("germany") ||
    lower.includes("france") ||
    lower.includes("gdpr")
  ) {
    regions.push("EU");
  }

  // Asia Pacific
  if (
    lower.includes("asia") ||
    lower.includes("apac") ||
    lower.includes("pacific") ||
    lower.includes("australia") ||
    lower.includes("japan") ||
    lower.includes("singapore") ||
    lower.includes("china") ||
    lower.includes("india")
  ) {
    regions.push("APAC");
  }

  // Latin America
  if (
    lower.includes("latin america") ||
    lower.includes("latam") ||
    lower.includes("brazil") ||
    lower.includes("argentina") ||
    lower.includes("colombia")
  ) {
    regions.push("LATAM");
  }

  // Default to NA if nothing detected
  return regions.length > 0 ? regions : ["NA"];
}

/**
 * Determine capacity tier from text content
 */
export function inferCapacityTier(text: string): DcCapacityTier {
  const lower = text.toLowerCase();

  // Hyperscale indicators
  if (
    lower.includes("global leader") ||
    lower.includes("hyperscale") ||
    lower.includes("millions of customers") ||
    lower.includes("billions of") ||
    lower.includes("worldwide operations") ||
    lower.includes("fortune 100") ||
    lower.includes("fortune 500")
  ) {
    return "hyperscale";
  }

  // Large indicators
  if (
    lower.includes("national") ||
    lower.includes("enterprise") ||
    lower.includes("large scale") ||
    lower.includes("multinational") ||
    lower.includes("thousands of employees") ||
    lower.includes("regional leader")
  ) {
    return "large";
  }

  // Small indicators
  if (
    lower.includes("startup") ||
    lower.includes("small business") ||
    lower.includes("local") ||
    lower.includes("boutique")
  ) {
    return "small";
  }

  // Default to medium
  return "medium";
}

/**
 * Detect compliance constraints from text
 */
export function detectConstraints(text: string): string[] {
  const lower = text.toLowerCase();
  const constraints: string[] = [];

  // Security & Compliance standards
  if (lower.includes("soc 2") || lower.includes("soc2")) constraints.push("SOC 2");
  if (lower.includes("iso 27001") || lower.includes("iso27001")) constraints.push("ISO 27001");
  if (lower.includes("gdpr")) constraints.push("GDPR");
  if (lower.includes("hipaa")) constraints.push("HIPAA");
  if (lower.includes("pci") || lower.includes("pci-dss") || lower.includes("pci dss")) constraints.push("PCI-DSS");
  if (lower.includes("fedramp")) constraints.push("FedRAMP");
  if (lower.includes("pipeda")) constraints.push("PIPEDA");
  if (lower.includes("ccpa")) constraints.push("CCPA");
  if (lower.includes("phipa")) constraints.push("PHIPA");

  // Sustainability
  if (lower.includes("net zero") || lower.includes("net-zero")) constraints.push("Net Zero Pledge");
  if (lower.includes("carbon neutral")) constraints.push("Carbon Neutral");
  if (lower.includes("science based targets") || lower.includes("sbti")) constraints.push("SBTi");
  if (lower.includes("esg")) constraints.push("ESG Reporting");

  // Data sovereignty
  if (lower.includes("data residency")) constraints.push("Data Residency");
  if (lower.includes("data sovereignty")) constraints.push("Data Sovereignty");
  if (lower.includes("canada only") || lower.includes("canadian data")) constraints.push("Canada-Only");

  return constraints;
}

/**
 * Extract company name from text
 */
export function extractCompanyName(text: string, domain: string): string {
  // Try to extract from title patterns
  const titleMatch = text.match(/^([^|–\-:]+)/);
  if (titleMatch && titleMatch[1].length < 50) {
    return titleMatch[1].trim();
  }

  // Fall back to domain name
  const domainParts = domain.replace(/^www\./, "").split(".");
  return domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);
}
