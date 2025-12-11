/**
 * green-dc-recommend
 * 
 * PURPOSE: Generate Green Data Centre Twin recommendations from a scanned URL
 * AUTH: public (no JWT required - uses existing crawl data)
 * 
 * REQUEST:
 * - url: string (required) - Website URL to analyze
 * - forceRecrawl: boolean (optional) - Force re-crawl of the site
 * - deepRecrawl: boolean (optional) - Deep crawl with more pages
 * 
 * RESPONSE:
 * - status: 'ok' | 'error'
 * - recommendation: GreenDcTwinRecommendation (if status ok)
 * - message: string (if status error)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Types
type DcIndustry = "finance" | "government" | "retail" | "saas" | "healthcare" | "telecom" | "manufacturing" | "energy" | "education" | "generic";
type DcCapacityTier = "small" | "medium" | "large" | "hyperscale";
type DcTwinArchetypeId = 
  | "finance_core_banking_green_twin"
  | "retail_ecommerce_green_twin"
  | "retail_hyperscale_green_twin"
  | "gov_sovereign_cloud_twin"
  | "saas_multitenant_ai_twin"
  | "healthcare_phi_twin"
  | "telco_edge_5g_twin"
  | "manufacturing_iiot_twin"
  | "energy_grid_ai_twin"
  | "education_research_ai_twin"
  | "generic_enterprise_green_twin";

// Mega-retailer domain patterns (Fortune 50 retailers)
const MEGA_RETAILER_DOMAINS = [
  "walmart", "costco", "target", "kroger", "walgreens", "cvs",
  "homedepot", "lowes", "bestbuy", "tjx", "dollar", "macys",
  "nordstrom", "kohls", "jcpenney", "sears", "albertsons", "safeway",
  "publix", "ahold", "tesco", "carrefour", "aldi", "lidl",
  "metro", "auchan", "leclerc", "edeka", "rewe", "migros", "coop",
  "woolworths", "coles", "aeon", "seven", "lawson", "familymart",
  "alibaba", "jd", "pinduoduo", "suning", "rakuten", "mercadolibre"
];

interface GreenDcTwinRecommendation {
  id: string;
  domain: string;
  companyName: string; // Always populated - clean company name
  industryId: string; // Normalized industry ID (retail, financial_services, etc.)
  industry: DcIndustry;
  businessModel?: string;
  archetypeId: DcTwinArchetypeId;
  regions: string[];
  capacityTier: DcCapacityTier;
  objectives: string[];
  agents: string[];
  kpiTargets: {
    pueTarget: number;
    renewableShareTargetPct: number;
    sovereigntyScoreTargetPct: number;
    carbonIntensityTargetGPerKwh: number;
    uptimeTargetPct: number;
  };
  scenarios: string[];
  financialModel: {
    baselineAnnualCostUsd: number;
    baselineAnnualCarbonTonnes: number;
    greenVariantSavingsCostPct: number;
    greenVariantSavingsCarbonPct: number;
    estimatedPaybackYears: number;
    // Retail hyperscale fields
    annualColdChainEnergyCostUsd?: number;
    annualEdgeComputeEnergyCostUsd?: number;
    fleetWideCarbonTaxRiskUsd?: number;
    aiWorkloadOptimizationSavingsUsd?: number;
    multiStoreAggregationCount?: number;
  };
  notes: string[];
  detectedConstraints?: string[];
  isMegaRetailer?: boolean;
  scanSummary?: {
    pagesScanned: number;
    contentExtracted: string;
  };
}

// Archetypes configuration
const GREEN_DC_ARCHETYPES: Record<DcTwinArchetypeId, {
  label: string;
  defaultObjectives: string[];
  defaultAgents: string[];
  defaultKpiTargets: Partial<GreenDcTwinRecommendation["kpiTargets"]>;
  defaultScenarios: string[];
}> = {
  finance_core_banking_green_twin: {
    label: "Green Core Banking DC Twin",
    defaultObjectives: [
      "Guarantee 99.99% uptime for core banking systems",
      "Minimize carbon footprint per transaction",
      "Ensure strict financial data sovereignty compliance",
      "Optimize power usage during trading hours peaks"
    ],
    defaultAgents: ["thermal_agent", "power_agent", "cooling_agent", "network_agent", "facility_safety_agent", "workload_gpu_agent", "sovereignty_agent", "carbon_cost_agent", "incident_response_agent"],
    defaultKpiTargets: { pueTarget: 1.25, renewableShareTargetPct: 80, sovereigntyScoreTargetPct: 98, carbonIntensityTargetGPerKwh: 50, uptimeTargetPct: 99.99 },
    defaultScenarios: ["trading_peak_surge", "ups_failure_generator_failover", "cooling_unit_degradation", "grid_outage_battery_transition", "sovereignty_routing_violation"]
  },
  retail_ecommerce_green_twin: {
    label: "Green E-Commerce DC Twin",
    defaultObjectives: [
      "Scale elastically for Black Friday/Cyber Monday peaks",
      "Minimize carbon per order processed",
      "Maintain sub-100ms checkout latency globally",
      "Optimize cooling during demand spikes"
    ],
    defaultAgents: ["thermal_agent", "power_agent", "cooling_agent", "network_agent", "workload_gpu_agent", "carbon_cost_agent", "incident_response_agent"],
    defaultKpiTargets: { pueTarget: 1.3, renewableShareTargetPct: 75, sovereigntyScoreTargetPct: 85, carbonIntensityTargetGPerKwh: 70, uptimeTargetPct: 99.95 },
    defaultScenarios: ["black_friday_peak_load", "flash_sale_gpu_spike", "cooling_cascade_failure", "cdn_origin_overload", "carbon_price_spike"]
  },
  retail_hyperscale_green_twin: {
    label: "Hyperscale Retail DC Twin (Fortune 50)",
    defaultObjectives: [
      "Maintain sub-2-second failover for 4,000+ distributed retail edge sites",
      "Reduce cold-chain energy consumption across logistics and stores",
      "Optimize GPU fleet for real-time computer vision (inventory, robotics)",
      "Improve global supply chain sovereignty compliance",
      "Reduce carbon footprint for refrigerated warehouses",
      "Optimize edge–core–cloud routing for retail AI workloads"
    ],
    defaultAgents: [
      "thermal_agent", "power_agent", "cooling_agent", "network_agent", 
      "facility_safety_agent", "workload_gpu_agent", "sovereignty_agent", 
      "carbon_cost_agent", "incident_response_agent",
      "retail_edge_resilience_agent", "cold_chain_optimizer_agent", "supply_chain_sovereignty_agent"
    ],
    defaultKpiTargets: { pueTarget: 1.25, renewableShareTargetPct: 85, sovereigntyScoreTargetPct: 92, carbonIntensityTargetGPerKwh: 55, uptimeTargetPct: 99.99 },
    defaultScenarios: [
      "black_friday_peak_load", "flash_sale_gpu_spike", "cooling_cascade_failure", 
      "cdn_origin_overload", "carbon_price_spike", "retail_edge_failure", 
      "cold_chain_failure", "logistics_dc_overload", "ai_model_drift", "global_sovereignty_breach"
    ]
  },
  gov_sovereign_cloud_twin: {
    label: "Sovereign Government Cloud Twin",
    defaultObjectives: [
      "100% data residency compliance within jurisdiction",
      "Zero unauthorized cross-border data flows",
      "Meet government net-zero commitments",
      "Maintain classified workload isolation"
    ],
    defaultAgents: ["thermal_agent", "power_agent", "cooling_agent", "network_agent", "facility_safety_agent", "workload_gpu_agent", "sovereignty_agent", "carbon_cost_agent", "incident_response_agent"],
    defaultKpiTargets: { pueTarget: 1.35, renewableShareTargetPct: 90, sovereigntyScoreTargetPct: 100, carbonIntensityTargetGPerKwh: 40, uptimeTargetPct: 99.99 },
    defaultScenarios: ["sovereignty_breach_attempt", "classified_workload_spillover", "grid_outage_critical_services", "thermal_excursion_secure_zone", "emergency_evacuation_protocol"]
  },
  saas_multitenant_ai_twin: {
    label: "Green Multi-Tenant AI/SaaS Twin",
    defaultObjectives: [
      "Optimize GPU utilization across training and inference",
      "Balance carbon intensity with latency SLAs",
      "Fair resource allocation across tenants",
      "Minimize idle GPU power consumption"
    ],
    defaultAgents: ["thermal_agent", "power_agent", "cooling_agent", "network_agent", "workload_gpu_agent", "carbon_cost_agent", "incident_response_agent"],
    defaultKpiTargets: { pueTarget: 1.2, renewableShareTargetPct: 85, sovereigntyScoreTargetPct: 80, carbonIntensityTargetGPerKwh: 45, uptimeTargetPct: 99.9 },
    defaultScenarios: ["training_job_surge", "gpu_thermal_throttling", "tenant_noisy_neighbor", "model_serving_spike", "renewable_availability_drop"]
  },
  healthcare_phi_twin: {
    label: "Green Healthcare PHI Twin",
    defaultObjectives: [
      "HIPAA/PHIPA compliant data handling at all times",
      "Sub-second access to patient imaging systems",
      "Continuous uptime for life-critical systems",
      "Minimize carbon while maintaining redundancy"
    ],
    defaultAgents: ["thermal_agent", "power_agent", "cooling_agent", "network_agent", "facility_safety_agent", "sovereignty_agent", "carbon_cost_agent", "incident_response_agent"],
    defaultKpiTargets: { pueTarget: 1.35, renewableShareTargetPct: 70, sovereigntyScoreTargetPct: 100, carbonIntensityTargetGPerKwh: 65, uptimeTargetPct: 99.999 },
    defaultScenarios: ["ehr_access_surge", "imaging_storage_spike", "hipaa_audit_simulation", "emergency_generator_test", "phi_sovereignty_violation"]
  },
  telco_edge_5g_twin: {
    label: "Green Telco Edge/5G Twin",
    defaultObjectives: [
      "Ultra-low latency for 5G edge workloads",
      "Distributed cooling optimization across edge sites",
      "Minimize tower power consumption",
      "Carbon-aware traffic routing"
    ],
    defaultAgents: ["thermal_agent", "power_agent", "cooling_agent", "network_agent", "workload_gpu_agent", "carbon_cost_agent", "incident_response_agent"],
    defaultKpiTargets: { pueTarget: 1.4, renewableShareTargetPct: 60, sovereigntyScoreTargetPct: 75, carbonIntensityTargetGPerKwh: 80, uptimeTargetPct: 99.95 },
    defaultScenarios: ["edge_site_overload", "backhaul_congestion", "distributed_cooling_failure", "5g_traffic_surge", "renewable_grid_fluctuation"]
  },
  manufacturing_iiot_twin: {
    label: "Green Manufacturing IIoT Twin",
    defaultObjectives: [
      "Real-time OT data processing with minimal latency",
      "Integration with factory floor systems (OPC-UA/Modbus)",
      "Predictive maintenance model hosting",
      "Carbon tracking per production line"
    ],
    defaultAgents: ["thermal_agent", "power_agent", "cooling_agent", "network_agent", "facility_safety_agent", "workload_gpu_agent", "carbon_cost_agent", "incident_response_agent"],
    defaultKpiTargets: { pueTarget: 1.35, renewableShareTargetPct: 65, sovereigntyScoreTargetPct: 70, carbonIntensityTargetGPerKwh: 75, uptimeTargetPct: 99.9 },
    defaultScenarios: ["production_line_surge", "ot_network_isolation", "scada_integration_failure", "predictive_model_update", "shift_change_load_spike"]
  },
  energy_grid_ai_twin: {
    label: "Green Energy/Grid AI Twin",
    defaultObjectives: [
      "Real-time grid balancing and demand response",
      "Maximize renewable energy utilization",
      "Carbon-negative data center operations",
      "Grid stability during peak demand"
    ],
    defaultAgents: ["thermal_agent", "power_agent", "cooling_agent", "network_agent", "carbon_cost_agent", "incident_response_agent"],
    defaultKpiTargets: { pueTarget: 1.15, renewableShareTargetPct: 100, sovereigntyScoreTargetPct: 60, carbonIntensityTargetGPerKwh: 20, uptimeTargetPct: 99.9 },
    defaultScenarios: ["grid_frequency_deviation", "renewable_intermittency", "demand_response_event", "battery_storage_cycle", "carbon_credit_optimization"]
  },
  education_research_ai_twin: {
    label: "Green Research/Education AI Twin",
    defaultObjectives: [
      "Burst capacity for research computing workloads",
      "Fair GPU allocation across research groups",
      "Grant compliance and usage tracking",
      "Minimize carbon per research computation"
    ],
    defaultAgents: ["thermal_agent", "power_agent", "cooling_agent", "network_agent", "workload_gpu_agent", "carbon_cost_agent", "incident_response_agent"],
    defaultKpiTargets: { pueTarget: 1.25, renewableShareTargetPct: 80, sovereigntyScoreTargetPct: 70, carbonIntensityTargetGPerKwh: 55, uptimeTargetPct: 99.5 },
    defaultScenarios: ["semester_end_compute_rush", "research_grant_deadline", "shared_cluster_contention", "data_intensive_experiment", "conference_demo_preparation"]
  },
  generic_enterprise_green_twin: {
    label: "Green Enterprise DC Twin",
    defaultObjectives: [
      "Optimize power usage effectiveness (PUE)",
      "Increase renewable energy share",
      "Reduce carbon footprint year-over-year",
      "Maintain high availability for business workloads"
    ],
    defaultAgents: ["thermal_agent", "power_agent", "cooling_agent", "network_agent", "facility_safety_agent", "workload_gpu_agent", "sovereignty_agent", "carbon_cost_agent", "incident_response_agent"],
    defaultKpiTargets: { pueTarget: 1.3, renewableShareTargetPct: 70, sovereigntyScoreTargetPct: 80, carbonIntensityTargetGPerKwh: 70, uptimeTargetPct: 99.9 },
    defaultScenarios: ["gpu_spike_training_cluster", "cooling_unit_degradation", "ups_failure_generator_failover", "carbon_price_spike", "grid_outage_battery_transition"]
  }
};

// Classification functions
// Known consulting/professional services domains (check before industry keyword matching)
const CONSULTING_DOMAINS = [
  "deloitte", "pwc", "ey", "kpmg", "mckinsey", "bcg", "bain", "accenture", 
  "capgemini", "cognizant", "infosys", "tcs", "wipro", "ibm", "oracle",
  "sap", "microsoft", "google", "amazon", "meta", "apple", "nvidia",
  "salesforce", "adobe", "servicenow", "workday", "snowflake", "databricks"
];

function isConsultingFirm(domain: string): boolean {
  const lowerDomain = domain.toLowerCase();
  return CONSULTING_DOMAINS.some(firm => lowerDomain.includes(firm));
}

function classifyIndustry(text: string, domain: string): { industry: DcIndustry; businessModel?: string; isMegaRetailerDomain: boolean } {
  const lower = text.toLowerCase();
  
  // CRITICAL: Check domain first for mega-retailers (they may not have retail keywords in page content)
  if (isMegaRetailer(domain)) {
    return { industry: "retail", businessModel: "hyperscale_retail", isMegaRetailerDomain: true };
  }
  
  // IMPORTANT: Check for consulting/professional services firms BEFORE retail
  // These firms mention "retail" because they serve retail clients, not because they ARE retail
  if (isConsultingFirm(domain) || 
      lower.includes("consulting") || lower.includes("advisory") || 
      lower.includes("professional services") || lower.includes("big four") ||
      lower.includes("management consulting") || lower.includes("strategy consulting") ||
      lower.includes("audit") || lower.includes("assurance") || lower.includes("tax services")) {
    return { industry: "saas", businessModel: "enterprise_consulting", isMegaRetailerDomain: false };
  }

  if (lower.includes("core banking") || lower.includes("retail banking") || lower.includes("capital markets") || lower.includes("wealth management") || lower.includes("payment processing") || lower.includes("financial services")) {
    return { industry: "finance", businessModel: "bank", isMegaRetailerDomain: false };
  }
  if (lower.includes("insurance") || lower.includes("policyholder") || lower.includes("underwriting")) {
    return { industry: "finance", businessModel: "insurance", isMegaRetailerDomain: false };
  }
  if (lower.includes("ministry") || lower.includes("government") || lower.includes("public sector") || lower.includes("federal agency") || lower.includes("municipal") || lower.includes("provincial") || lower.includes("state agency") || lower.includes(".gov")) {
    return { industry: "government", businessModel: "public_sector", isMegaRetailerDomain: false };
  }
  if (lower.includes("ehr") || lower.includes("electronic health record") || lower.includes("clinical data") || lower.includes("patient") || lower.includes("hospital") || lower.includes("healthcare") || lower.includes("medical") || lower.includes("hipaa") || lower.includes("phipa")) {
    return { industry: "healthcare", businessModel: "health_system", isMegaRetailerDomain: false };
  }
  if (lower.includes("5g") || lower.includes("telecom") || lower.includes("telecommunications") || lower.includes("carrier") || lower.includes("mobile network") || lower.includes("wireless")) {
    return { industry: "telecom", isMegaRetailerDomain: false };
  }
  if (lower.includes("manufacturing") || lower.includes("factory") || lower.includes("iiot") || lower.includes("industrial iot") || lower.includes("production line") || lower.includes("supply chain") || lower.includes("assembly")) {
    return { industry: "manufacturing", isMegaRetailerDomain: false };
  }
  if (lower.includes("energy") || lower.includes("utility") || lower.includes("power grid") || lower.includes("renewable") || lower.includes("solar") || lower.includes("wind power") || lower.includes("electricity")) {
    return { industry: "energy", isMegaRetailerDomain: false };
  }
  if (lower.includes("university") || lower.includes("research institute") || lower.includes("college") || lower.includes("academic") || lower.includes("higher education") || lower.includes(".edu")) {
    return { industry: "education", isMegaRetailerDomain: false };
  }
  // Retail check AFTER consulting - to avoid mis-classifying consulting firms that mention retail clients
  if (lower.includes("e-commerce") || lower.includes("ecommerce") || lower.includes("shopping cart") || lower.includes("online store") || lower.includes("marketplace") ||
      (lower.includes("retail") && !lower.includes("consulting") && !lower.includes("advisory"))) {
    return { industry: "retail", businessModel: "ecommerce", isMegaRetailerDomain: false };
  }
  if (lower.includes("cloud") || lower.includes("saas") || lower.includes("software as a service") || lower.includes("platform") || lower.includes("api")) {
    return { industry: "saas", businessModel: "enterprise_saas", isMegaRetailerDomain: false };
  }
  return { industry: "generic", isMegaRetailerDomain: false };
}

function isMegaRetailer(domain: string): boolean {
  const lowerDomain = domain.toLowerCase();
  return MEGA_RETAILER_DOMAINS.some(retailer => lowerDomain.includes(retailer));
}

function selectArchetype(industry: DcIndustry, text: string, domain: string): DcTwinArchetypeId {
  const lower = text.toLowerCase();
  switch (industry) {
    case "finance": return "finance_core_banking_green_twin";
    case "retail": 
      // Check for mega-retailer domains or hyperscale indicators
      if (isMegaRetailer(domain) || 
          lower.includes("fortune 50") || lower.includes("fortune 100") ||
          lower.includes("thousands of stores") || lower.includes("global retail") ||
          lower.includes("supply chain") || lower.includes("logistics network") ||
          lower.includes("distribution center") || lower.includes("fulfillment")) {
        return "retail_hyperscale_green_twin";
      }
      return "retail_ecommerce_green_twin";
    case "government": return "gov_sovereign_cloud_twin";
    case "healthcare": return "healthcare_phi_twin";
    case "telecom": return "telco_edge_5g_twin";
    case "manufacturing": return "manufacturing_iiot_twin";
    case "energy": return "energy_grid_ai_twin";
    case "education": return "education_research_ai_twin";
    case "saas":
      if (lower.includes("ai") || lower.includes("llm") || lower.includes("ml") || lower.includes("machine learning")) {
        return "saas_multitenant_ai_twin";
      }
      return "generic_enterprise_green_twin";
    default: return "generic_enterprise_green_twin";
  }
}

function inferRegions(text: string): string[] {
  const lower = text.toLowerCase();
  const regions: string[] = [];
  if (lower.includes("north america") || lower.includes("united states") || lower.includes("usa") || lower.includes("canada") || lower.includes("mexico") || lower.includes("american")) regions.push("NA");
  if (lower.includes("europe") || lower.includes("european") || lower.includes("eu") || lower.includes("uk") || lower.includes("germany") || lower.includes("france") || lower.includes("gdpr")) regions.push("EU");
  if (lower.includes("asia") || lower.includes("apac") || lower.includes("pacific") || lower.includes("australia") || lower.includes("japan") || lower.includes("singapore") || lower.includes("china") || lower.includes("india")) regions.push("APAC");
  if (lower.includes("latin america") || lower.includes("latam") || lower.includes("brazil") || lower.includes("argentina") || lower.includes("colombia")) regions.push("LATAM");
  return regions.length > 0 ? regions : ["NA"];
}

function inferCapacityTier(text: string, domain: string): DcCapacityTier {
  const lower = text.toLowerCase();
  // Mega-retailers are always hyperscale
  if (isMegaRetailer(domain)) return "hyperscale";
  if (lower.includes("global leader") || lower.includes("hyperscale") || lower.includes("millions of customers") || lower.includes("billions of") || lower.includes("worldwide operations") || lower.includes("fortune 100") || lower.includes("fortune 500") || lower.includes("fortune 50")) return "hyperscale";
  if (lower.includes("national") || lower.includes("enterprise") || lower.includes("large scale") || lower.includes("multinational") || lower.includes("thousands of employees") || lower.includes("regional leader")) return "large";
  if (lower.includes("startup") || lower.includes("small business") || lower.includes("local") || lower.includes("boutique")) return "small";
  return "medium";
}

function detectConstraints(text: string): string[] {
  const lower = text.toLowerCase();
  const constraints: string[] = [];
  if (lower.includes("soc 2") || lower.includes("soc2")) constraints.push("SOC 2");
  if (lower.includes("iso 27001") || lower.includes("iso27001")) constraints.push("ISO 27001");
  if (lower.includes("gdpr")) constraints.push("GDPR");
  if (lower.includes("hipaa")) constraints.push("HIPAA");
  if (lower.includes("pci") || lower.includes("pci-dss") || lower.includes("pci dss")) constraints.push("PCI-DSS");
  if (lower.includes("fedramp")) constraints.push("FedRAMP");
  if (lower.includes("pipeda")) constraints.push("PIPEDA");
  if (lower.includes("ccpa")) constraints.push("CCPA");
  if (lower.includes("phipa")) constraints.push("PHIPA");
  if (lower.includes("net zero") || lower.includes("net-zero")) constraints.push("Net Zero Pledge");
  if (lower.includes("carbon neutral")) constraints.push("Carbon Neutral");
  if (lower.includes("science based targets") || lower.includes("sbti")) constraints.push("SBTi");
  if (lower.includes("esg")) constraints.push("ESG Reporting");
  if (lower.includes("data residency")) constraints.push("Data Residency");
  if (lower.includes("data sovereignty")) constraints.push("Data Sovereignty");
  if (lower.includes("canada only") || lower.includes("canadian data")) constraints.push("Canada-Only");
  return constraints;
}

/**
 * Robust company name extractor with priority order:
 * 1. og:site_name or application-name meta tag
 * 2. First segment of <title> (before | - :)
 * 3. Domain root capitalized
 * 
 * Strips common junk patterns like "Skip to main content", brackets, "Welcome to..."
 */
function deriveCompanyName(html: string, text: string, domain: string): string {
  // Known company name mappings for common domains
  const KNOWN_COMPANIES: Record<string, string> = {
    // Mega-retailers
    "walmart": "Walmart",
    "target": "Target",
    "costco": "Costco",
    "amazon": "Amazon",
    "bestbuy": "Best Buy",
    "homedepot": "The Home Depot",
    "lowes": "Lowe's",
    "kroger": "Kroger",
    "walgreens": "Walgreens",
    "cvs": "CVS Health",
    // Tech giants
    "apple": "Apple",
    "microsoft": "Microsoft",
    "google": "Google",
    "meta": "Meta",
    "netflix": "Netflix",
    "disney": "Disney",
    "nike": "Nike",
    "starbucks": "Starbucks",
    "mcdonalds": "McDonald's",
    // Energy
    "chevron": "Chevron",
    "shell": "Shell",
    "exxonmobil": "ExxonMobil",
    // Financial
    "jpmorgan": "JPMorgan Chase",
    "bankofamerica": "Bank of America",
    "wellsfargo": "Wells Fargo",
    "citibank": "Citibank",
    "citigroup": "Citigroup",
    "goldmansachs": "Goldman Sachs",
    "morganstanley": "Morgan Stanley",
    // Logistics
    "fedex": "FedEx",
    "ups": "UPS",
    // Automotive
    "tesla": "Tesla",
    "ford": "Ford",
    "gm": "General Motors",
    "toyota": "Toyota",
    "honda": "Honda",
    // Consulting / Professional Services (Big 4 + major firms)
    "deloitte": "Deloitte",
    "pwc": "PwC",
    "ey": "EY (Ernst & Young)",
    "kpmg": "KPMG",
    "mckinsey": "McKinsey & Company",
    "bcg": "Boston Consulting Group",
    "bain": "Bain & Company",
    "accenture": "Accenture",
    "capgemini": "Capgemini",
    "cognizant": "Cognizant",
    "infosys": "Infosys",
    "tcs": "Tata Consultancy Services",
    "wipro": "Wipro",
    "ibm": "IBM",
    "oracle": "Oracle",
    "sap": "SAP",
    "salesforce": "Salesforce",
    "adobe": "Adobe",
    "servicenow": "ServiceNow",
    "workday": "Workday",
    "snowflake": "Snowflake",
    "databricks": "Databricks",
    "nvidia": "NVIDIA",
  };
  
  // Check known companies first (from domain)
  const baseDomain = domain.replace(/^www\./, "").split(".")[0].toLowerCase();
  if (KNOWN_COMPANIES[baseDomain]) {
    return KNOWN_COMPANIES[baseDomain];
  }
  
  // Helper to clean extracted names
  const cleanName = (name: string): string | null => {
    if (!name) return null;
    let cleaned = name.trim();
    
    // Explicitly filter out garbage patterns
    if (/^\*[\s\*]*\*?$/.test(cleaned)) return null; // "* * *" patterns
    if (/^[\s\*\-_=\.]+$/.test(cleaned)) return null; // Only symbols
    if (/^(loading|please wait|javascript|undefined|null)$/i.test(cleaned)) return null;
    
    // Strip junk patterns
    cleaned = cleaned
      .replace(/^skip\s+to\s+(main\s+)?content\s*/i, "")
      .replace(/^welcome\s+to\s+/i, "")
      .replace(/\[.*?\]/g, "") // Remove [brackets]
      .replace(/\(.*?\)/g, "") // Remove (parentheses)
      .replace(/^\s*[-–—|:*]\s*/, "") // Remove leading separators including *
      .replace(/\s*[-–—|:*]\s*$/, "") // Remove trailing separators including *
      .replace(/\*+/g, "") // Remove asterisks
      .trim();
    
    // Skip if too short, too long, or looks like junk
    if (cleaned.length < 2 || cleaned.length > 60) return null;
    if (/^(home|homepage|main|page|site|website|official)$/i.test(cleaned)) return null;
    if (/^\d+$/.test(cleaned)) return null; // Just numbers
    if (/^[\s\*\-_=\.]+$/.test(cleaned)) return null; // Re-check after cleaning
    
    return cleaned;
  };
  
  // Priority 1: Try og:site_name meta tag
  const ogSiteNameMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i) ||
                          html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:site_name["']/i);
  if (ogSiteNameMatch) {
    const cleaned = cleanName(ogSiteNameMatch[1]);
    if (cleaned) return cleaned;
  }
  
  // Priority 2: Try application-name meta tag
  const appNameMatch = html.match(/<meta[^>]*name=["']application-name["'][^>]*content=["']([^"']+)["']/i) ||
                       html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']application-name["']/i);
  if (appNameMatch) {
    const cleaned = cleanName(appNameMatch[1]);
    if (cleaned) return cleaned;
  }
  
  // Priority 3: First segment of title (before | - – — :)
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    // Split on common separators and take first part
    const parts = titleMatch[1].split(/\s*[|–—\-:]\s*/);
    for (const part of parts) {
      const cleaned = cleanName(part);
      if (cleaned) return cleaned;
    }
  }
  
  // Also try from extracted text (markdown or plain text)
  const textTitleMatch = text.match(/^#?\s*([^\n|–\-:]+)/);
  if (textTitleMatch) {
    const cleaned = cleanName(textTitleMatch[1]);
    if (cleaned && cleaned.length < 40) return cleaned;
  }
  
  // Priority 4: Fallback to domain name (properly capitalized)
  const domainName = baseDomain;
  return domainName.charAt(0).toUpperCase() + domainName.slice(1);
}

// Legacy wrapper for backward compatibility
function extractCompanyName(text: string, domain: string): string {
  return deriveCompanyName("", text, domain);
}

/**
 * Normalize raw industry detection to standard IndustryId
 */
function normalizeIndustryToId(industry: DcIndustry, businessModel?: string): string {
  if (industry === "finance") return "financial_services";
  if (industry === "government") return "public_sector";
  if (industry === "saas") return "technology_saas";
  if (industry === "education") return "ai_compute";
  if (businessModel === "hyperscale_retail") return "retail";
  return industry; // retail, healthcare, telecom, manufacturing, energy, generic
}

// Financial estimator
const CAPACITY_BASELINES: Record<DcCapacityTier, { costUsd: number; carbonTonnes: number }> = {
  small: { costUsd: 500_000, carbonTonnes: 150 },
  medium: { costUsd: 2_500_000, carbonTonnes: 800 },
  large: { costUsd: 12_000_000, carbonTonnes: 4_000 },
  hyperscale: { costUsd: 75_000_000, carbonTonnes: 25_000 }
};

const INDUSTRY_MULTIPLIERS: Record<DcTwinArchetypeId, { cost: number; carbon: number; savings: number }> = {
  finance_core_banking_green_twin: { cost: 1.4, carbon: 1.2, savings: 0.18 },
  retail_ecommerce_green_twin: { cost: 1.1, carbon: 1.3, savings: 0.22 },
  retail_hyperscale_green_twin: { cost: 2.5, carbon: 2.2, savings: 0.28 },
  gov_sovereign_cloud_twin: { cost: 1.3, carbon: 0.9, savings: 0.15 },
  saas_multitenant_ai_twin: { cost: 1.5, carbon: 1.6, savings: 0.25 },
  healthcare_phi_twin: { cost: 1.2, carbon: 1.0, savings: 0.16 },
  telco_edge_5g_twin: { cost: 1.3, carbon: 1.4, savings: 0.20 },
  manufacturing_iiot_twin: { cost: 1.1, carbon: 1.5, savings: 0.23 },
  energy_grid_ai_twin: { cost: 0.9, carbon: 0.6, savings: 0.35 },
  education_research_ai_twin: { cost: 0.8, carbon: 1.1, savings: 0.20 },
  generic_enterprise_green_twin: { cost: 1.0, carbon: 1.0, savings: 0.18 }
};

// Retail hyperscale financial estimator
function estimateRetailHyperscaleFinancials(baseFinancials: GreenDcTwinRecommendation["financialModel"], storeCount: number) {
  const coldChainMultiplier = 0.25; // 25% of energy goes to cold chain
  const edgeComputeMultiplier = 0.15; // 15% for edge computing
  const carbonTaxRate = 50; // $50/tonne assumed carbon tax
  const aiOptimizationSavings = 0.12; // 12% savings from AI optimization
  
  return {
    ...baseFinancials,
    annualColdChainEnergyCostUsd: Math.round(baseFinancials.baselineAnnualCostUsd * coldChainMultiplier),
    annualEdgeComputeEnergyCostUsd: Math.round(baseFinancials.baselineAnnualCostUsd * edgeComputeMultiplier),
    fleetWideCarbonTaxRiskUsd: Math.round(baseFinancials.baselineAnnualCarbonTonnes * carbonTaxRate),
    aiWorkloadOptimizationSavingsUsd: Math.round(baseFinancials.baselineAnnualCostUsd * aiOptimizationSavings),
    multiStoreAggregationCount: storeCount,
  };
}

const REGION_COST_MULTIPLIERS: Record<string, number> = { NA: 1.0, EU: 1.15, APAC: 0.9, LATAM: 0.75 };

function estimateFinancials(archetypeId: DcTwinArchetypeId, capacityTier: DcCapacityTier, regions: string[]) {
  const baseline = CAPACITY_BASELINES[capacityTier];
  const multiplier = INDUSTRY_MULTIPLIERS[archetypeId];
  const avgRegionMultiplier = regions.length > 0 ? regions.reduce((sum, r) => sum + (REGION_COST_MULTIPLIERS[r] || 1.0), 0) / regions.length : 1.0;
  const baselineAnnualCostUsd = Math.round(baseline.costUsd * multiplier.cost * avgRegionMultiplier);
  const baselineAnnualCarbonTonnes = Math.round(baseline.carbonTonnes * multiplier.carbon);
  const greenVariantSavingsCostPct = Math.round(multiplier.savings * 100);
  const greenVariantSavingsCarbonPct = Math.round(multiplier.savings * 1.5 * 100);
  const estimatedPaybackYears = Math.min(Math.round((2 / multiplier.savings) * 10) / 10, 5);
  return { baselineAnnualCostUsd, baselineAnnualCarbonTonnes, greenVariantSavingsCostPct, greenVariantSavingsCarbonPct, estimatedPaybackYears };
}

function buildNotes(industry: string, regions: string[], constraints: string[], capacityTier: DcCapacityTier): string[] {
  const notes: string[] = [];
  const industryNotes: Record<string, string> = {
    finance: "Financial services require highest availability (99.99%+) with strict data sovereignty for regulatory compliance.",
    government: "Government workloads mandate 100% data residency and enhanced physical security controls.",
    healthcare: "PHI handling requires HIPAA/PHIPA compliance with encrypted data-at-rest and audit logging.",
    retail: "E-commerce workloads need elastic scaling for seasonal peaks with cost optimization focus.",
    telecom: "Edge computing architecture optimizes latency for 5G services with distributed cooling management.",
    manufacturing: "IIoT integration requires OT/IT convergence with real-time analytics at the edge.",
    energy: "Grid AI operations prioritize renewable utilization and demand response capabilities.",
    education: "Research computing needs burst capacity with fair resource allocation across groups.",
    saas: "Multi-tenant AI workloads benefit from GPU scheduling optimization and tenant isolation.",
    generic: "Enterprise DC operations focus on balanced PUE optimization and carbon reduction."
  };
  notes.push(industryNotes[industry] || industryNotes.generic);
  if (regions.includes("EU")) notes.push("EU presence requires GDPR compliance with data processing impact assessments.");
  if (regions.includes("NA") && regions.length > 1) notes.push("Multi-region deployment enables carbon-aware workload routing to lowest-intensity grids.");
  if (constraints.includes("Net Zero Pledge") || constraints.includes("Carbon Neutral")) notes.push("Net zero commitment accelerates renewable energy targets and carbon credit strategies.");
  if (constraints.includes("SOC 2") || constraints.includes("ISO 27001")) notes.push("Security certifications require comprehensive audit logging and access controls.");
  if (capacityTier === "hyperscale") notes.push("Hyperscale operations benefit from advanced cooling technologies (liquid cooling, free cooling).");
  return notes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[green-dc-recommend:${requestId}] Request started`);

  try {
    const { url, forceRecrawl, deepRecrawl } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ status: "error", message: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Robust URL normalization - accepts any format
    let normalizedUrl = url.trim()
      .replace(/^(https?:\/\/)?/i, '') // Remove existing protocol
      .replace(/^www\./i, '')          // Remove www prefix for normalization
      .replace(/\/+$/, '')             // Remove trailing slashes
      .split(/[?#]/)[0];               // Remove query params and hash for base URL
    
    // Clean up any remaining whitespace or invalid chars
    normalizedUrl = normalizedUrl.replace(/\s+/g, '').toLowerCase();
    
    // Handle edge cases like "walmart" -> "walmart.com"
    if (!normalizedUrl.includes('.')) {
      // Try common TLDs
      normalizedUrl = `${normalizedUrl}.com`;
    }
    
    // Add https protocol
    normalizedUrl = `https://${normalizedUrl}`;
    
    let urlObj: URL;
    try {
      urlObj = new URL(normalizedUrl);
    } catch (urlError) {
      console.error(`[green-dc-recommend:${requestId}] URL parse error:`, urlError);
      return new Response(
        JSON.stringify({ 
          status: "error", 
          message: `Invalid URL format: "${url}". Please enter a valid website (e.g., walmart.com, www.target.com, https://costco.com)` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const domain = urlObj.hostname.replace(/^www\./, "");
    console.log(`[green-dc-recommend:${requestId}] Processing domain: ${domain}`);

    // Crawl the website using Firecrawl if available, otherwise use simple fetch
    let extractedText = "";
    let rawHtml = ""; // Keep raw HTML for company name extraction
    let pagesScanned = 1;

    try {
      const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
      
      if (apiKey) {
        console.log(`[green-dc-recommend:${requestId}] Using Firecrawl API`);
        
        const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: normalizedUrl,
            formats: ["markdown", "html"],
            onlyMainContent: true,
          }),
        });

        if (scrapeResponse.ok) {
          const scrapeData = await scrapeResponse.json();
          extractedText = scrapeData.markdown || scrapeData.data?.markdown || "";
          rawHtml = scrapeData.html || scrapeData.data?.html || "";
          console.log(`[green-dc-recommend:${requestId}] Firecrawl extracted ${extractedText.length} chars`);
        }
      }

      // Fallback to simple fetch if Firecrawl didn't work
      if (!extractedText) {
        console.log(`[green-dc-recommend:${requestId}] Using simple fetch fallback`);
        const response = await fetch(normalizedUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; GreenDCBot/1.0)" }
        });
        
        if (response.ok) {
          rawHtml = await response.text();
          // Extract title and meta description
          const titleMatch = rawHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
          const descMatch = rawHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
          const h1Matches = rawHtml.match(/<h1[^>]*>([^<]+)<\/h1>/gi) || [];
          const h2Matches = rawHtml.match(/<h2[^>]*>([^<]+)<\/h2>/gi) || [];
          
          extractedText = [
            titleMatch ? titleMatch[1] : "",
            descMatch ? descMatch[1] : "",
            ...h1Matches.map(h => h.replace(/<[^>]+>/g, "")),
            ...h2Matches.slice(0, 5).map(h => h.replace(/<[^>]+>/g, "")),
          ].join(" ");
          
          // Also try to get text from body
          const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          if (bodyMatch) {
            const bodyText = bodyMatch[1]
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            extractedText += " " + bodyText.slice(0, 5000);
          }
        }
      }
    } catch (fetchError) {
      console.error(`[green-dc-recommend:${requestId}] Fetch error:`, fetchError);
      // Continue with empty text - we'll generate generic recommendation
    }

    // If we still have no text, use the domain itself for classification
    if (!extractedText) {
      extractedText = domain;
      console.log(`[green-dc-recommend:${requestId}] Using domain-only classification`);
    }

    // Run classification - pass domain for mega-retailer detection
    const { industry, businessModel, isMegaRetailerDomain } = classifyIndustry(extractedText, domain);
    const archetypeId = selectArchetype(industry, extractedText, domain);
    const regions = inferRegions(extractedText);
    const capacityTier = inferCapacityTier(extractedText, domain);
    const constraints = detectConstraints(extractedText);
    
    // Extract company name using robust extractor with HTML priority
    const companyName = deriveCompanyName(rawHtml, extractedText, domain);
    
    // Normalize industry to standard ID
    const industryId = normalizeIndustryToId(industry, businessModel);
    
    const megaRetailer = isMegaRetailerDomain || isMegaRetailer(domain);
    
    console.log(`[green-dc-recommend:${requestId}] Classification:`, { industry, industryId, businessModel, archetypeId, regions, capacityTier, megaRetailer, companyName });

    // Get archetype configuration
    const archetype = GREEN_DC_ARCHETYPES[archetypeId];
    
    // Calculate base financials
    let financialModel = estimateFinancials(archetypeId, capacityTier, regions);
    
    // Enhance financials for mega-retailers
    if (megaRetailer || archetypeId === "retail_hyperscale_green_twin") {
      const storeCount = megaRetailer ? 4000 : 500; // Default store count estimate
      financialModel = estimateRetailHyperscaleFinancials(financialModel, storeCount);
    }
    
    // Build recommendation
    const recommendation: GreenDcTwinRecommendation = {
      id: crypto.randomUUID(),
      domain,
      companyName,
      industryId,
      industry,
      businessModel,
      archetypeId,
      regions,
      capacityTier,
      objectives: archetype.defaultObjectives,
      agents: archetype.defaultAgents,
      kpiTargets: {
        pueTarget: archetype.defaultKpiTargets.pueTarget ?? 1.3,
        renewableShareTargetPct: archetype.defaultKpiTargets.renewableShareTargetPct ?? 70,
        sovereigntyScoreTargetPct: archetype.defaultKpiTargets.sovereigntyScoreTargetPct ?? 80,
        carbonIntensityTargetGPerKwh: archetype.defaultKpiTargets.carbonIntensityTargetGPerKwh ?? 70,
        uptimeTargetPct: archetype.defaultKpiTargets.uptimeTargetPct ?? 99.9,
      },
      scenarios: archetype.defaultScenarios,
      financialModel,
      notes: buildNotes(industry, regions, constraints, capacityTier),
      detectedConstraints: constraints,
      isMegaRetailer: megaRetailer,
      scanSummary: {
        pagesScanned,
        contentExtracted: extractedText.slice(0, 500) + (extractedText.length > 500 ? "..." : ""),
      },
    };

    console.log(`[green-dc-recommend:${requestId}] Recommendation generated:`, { archetypeLabel: archetype.label, agents: recommendation.agents.length, scenarios: recommendation.scenarios.length });

    return new Response(
      JSON.stringify({ status: "ok", recommendation }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[green-dc-recommend:${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ status: "error", message: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
