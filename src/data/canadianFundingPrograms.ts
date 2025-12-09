/**
 * Canadian Federal & Provincial Funding Programs
 * For AI/Digital Transformation
 */

export interface CanadianFundingProgram {
  id: string;
  programName: string;
  jurisdiction: "Federal" | "Provincial" | "Municipal";
  province?: string;
  description: string;
  maxContribution: string;
  coveragePercent: string;
  url: string;
  tags: string[];
  industries: string[];
  eligibility: string[];
}

export const canadianFundingPrograms: CanadianFundingProgram[] = [
  // Federal Programs
  {
    id: "scale-ai",
    programName: "Scale AI - AI Supply Chain Supercluster",
    jurisdiction: "Federal",
    description: "Co-investment in AI-powered supply chain, logistics, and manufacturing projects. Focus on operational excellence through AI.",
    maxContribution: "$5M - $10M per project",
    coveragePercent: "up to 50%",
    url: "https://www.scaleai.ca/",
    tags: ["AI", "Supply Chain", "Manufacturing", "Digital Transformation"],
    industries: ["Manufacturing", "Logistics", "Transportation", "Retail", "Public Sector"],
    eligibility: ["Canadian companies", "Consortiums", "Min. $2M project budget"]
  },
  {
    id: "nrc-irap",
    programName: "NRC IRAP - Industrial Research Assistance Program",
    jurisdiction: "Federal",
    description: "Financial support for Canadian SMEs developing and adopting innovative technologies including AI and automation.",
    maxContribution: "$10M+ (varies by project)",
    coveragePercent: "up to 80% for R&D",
    url: "https://nrc.canada.ca/en/support-technology-innovation/about-irap",
    tags: ["R&D", "AI", "Innovation", "SME"],
    industries: ["All Industries", "Technology", "Manufacturing", "Healthcare"],
    eligibility: ["Canadian SMEs", "Incorporated", "<500 employees"]
  },
  {
    id: "strategic-innovation-fund",
    programName: "Strategic Innovation Fund (SIF)",
    jurisdiction: "Federal",
    description: "Large-scale investments in transformative projects. Focus on AI, automation, and digital transformation at scale.",
    maxContribution: "$10M+",
    coveragePercent: "varies by project (typically 30-50%)",
    url: "https://ised-isde.canada.ca/site/strategic-innovation-fund/en",
    tags: ["Large Scale", "AI", "Digital Transformation", "Innovation"],
    industries: ["All Industries", "Public Sector", "Healthcare", "Energy"],
    eligibility: ["Large projects ($10M+)", "Canadian operations", "National benefit"]
  },
  {
    id: "ceba-transformation",
    programName: "Canada Digital Adoption Program (CDAP)",
    jurisdiction: "Federal",
    description: "Up to $15K grants + interest-free loans for SMEs to adopt digital technologies including AI agents.",
    maxContribution: "$15K grant + $100K loan",
    coveragePercent: "100% grant + 0% interest loan",
    url: "https://www.ic.gc.ca/eic/site/152.nsf/eng/home",
    tags: ["Digital Adoption", "SME", "AI", "Automation"],
    industries: ["All Industries", "Retail", "Services", "Manufacturing"],
    eligibility: ["Canadian SMEs", "1-499 employees", "Private sector"]
  },
  
  // Ontario Programs
  {
    id: "ontario-together-fund",
    programName: "Ontario Together Fund",
    jurisdiction: "Provincial",
    province: "Ontario",
    description: "Support for innovative solutions addressing Ontario's challenges. Includes AI for public services and operations.",
    maxContribution: "$500K - $5M",
    coveragePercent: "up to 50%",
    url: "https://www.ontario.ca/page/ontario-together-fund",
    tags: ["Innovation", "Public Sector", "AI", "Healthcare"],
    industries: ["Public Sector", "Healthcare", "Technology"],
    eligibility: ["Ontario-based", "Incorporated", "Innovative solutions"]
  },
  {
    id: "ontario-made",
    programName: "Ontario Made Manufacturing Investment Tax Credit",
    jurisdiction: "Provincial",
    province: "Ontario",
    description: "10% refundable tax credit for investments in manufacturing tech including AI, automation, and robotics.",
    maxContribution: "10% tax credit",
    coveragePercent: "10% of eligible investments",
    url: "https://www.ontario.ca/page/ontario-made-manufacturing-investment-tax-credit",
    tags: ["Manufacturing", "Tax Credit", "AI", "Automation"],
    industries: ["Manufacturing", "Technology"],
    eligibility: ["Ontario manufacturers", "Eligible capital investments"]
  },
  
  // Quebec Programs
  {
    id: "quebec-crescendo",
    programName: "Québec Innovation Program (Crescendo)",
    jurisdiction: "Provincial",
    province: "Quebec",
    description: "Support for R&D and digital transformation projects including AI adoption in operations.",
    maxContribution: "$500K - $2M",
    coveragePercent: "up to 50%",
    url: "https://www.economie.gouv.qc.ca/en/programs/crescendo/",
    tags: ["R&D", "AI", "Digital Transformation", "Innovation"],
    industries: ["All Industries", "Manufacturing", "Technology"],
    eligibility: ["Quebec-based companies", "Innovation projects"]
  },
  {
    id: "investissement-quebec-ai",
    programName: "Investissement Québec - AI Projects",
    jurisdiction: "Provincial",
    province: "Quebec",
    description: "Financing for AI projects including operational AI agents, twins, and automation systems.",
    maxContribution: "$250K - $10M",
    coveragePercent: "varies (typically 40-60%)",
    url: "https://www.investquebec.com/",
    tags: ["AI", "Financing", "Digital Transformation"],
    industries: ["All Industries", "Technology", "Manufacturing"],
    eligibility: ["Quebec operations", "Job creation", "Innovation"]
  },
  
  // British Columbia Programs
  {
    id: "bc-innovate",
    programName: "Innovate BC - Technology Impact Program",
    jurisdiction: "Provincial",
    province: "British Columbia",
    description: "Funding for BC companies adopting emerging technologies including AI for operations and customer experience.",
    maxContribution: "$150K",
    coveragePercent: "up to 80%",
    url: "https://innovatebc.ca/programs/technology-impact-award/",
    tags: ["Technology", "AI", "Innovation", "SME"],
    industries: ["Technology", "All Industries"],
    eligibility: ["BC-based", "Incorporated", "Technology adoption"]
  },
  
  // Alberta Programs
  {
    id: "alberta-innovates",
    programName: "Alberta Innovates - Applied Research & Innovation",
    jurisdiction: "Provincial",
    province: "Alberta",
    description: "Support for AI and digital tech projects focused on operational efficiency, especially in energy and resources.",
    maxContribution: "$500K - $2M",
    coveragePercent: "up to 50%",
    url: "https://albertainnovates.ca/",
    tags: ["AI", "Energy", "Innovation", "R&D"],
    industries: ["Energy", "Manufacturing", "Agriculture", "Technology"],
    eligibility: ["Alberta-based", "Innovation projects", "Collaboration"]
  },
  
  // Atlantic Canada Programs
  {
    id: "acoa-business-dev",
    programName: "ACOA - Business Development Program",
    jurisdiction: "Federal",
    description: "Support for Atlantic Canadian businesses implementing AI and automation to improve competitiveness.",
    maxContribution: "$1M+",
    coveragePercent: "up to 75%",
    url: "https://www.canada.ca/en/atlantic-canada-opportunities.html",
    tags: ["Atlantic Canada", "AI", "Business Development", "SME"],
    industries: ["All Industries", "Manufacturing", "Technology"],
    eligibility: ["Atlantic Canada-based", "For-profit", "Growth potential"]
  },
  
  // Sector-Specific Programs
  {
    id: "sustainable-development-tech",
    programName: "Sustainable Development Technology Canada (SDTC)",
    jurisdiction: "Federal",
    description: "Funding for cleantech and AI projects that address climate change and environmental challenges.",
    maxContribution: "$3M - $10M",
    coveragePercent: "up to 33%",
    url: "https://www.sdtc.ca/",
    tags: ["Cleantech", "AI", "Sustainability", "Climate"],
    industries: ["Energy", "Manufacturing", "Transportation", "Construction"],
    eligibility: ["Canadian companies", "Cleantech focus", "Pre-commercial"]
  },
  {
    id: "cmhc-housing-innovation",
    programName: "CMHC - Housing Innovation Fund",
    jurisdiction: "Federal",
    description: "Support for innovative housing solutions including AI for construction, permit processing, and project management.",
    maxContribution: "$20M",
    coveragePercent: "varies",
    url: "https://www.cmhc-schl.gc.ca/en/professionals/project-funding-and-mortgage-financing/funding-programs",
    tags: ["Housing", "Construction", "AI", "Public Sector"],
    industries: ["Construction", "Public Sector", "Real Estate"],
    eligibility: ["Canadian organizations", "Housing sector", "Innovation"]
  },
];

/**
 * Match funding programs to recommendation based on industry, tags, and company profile
 */
export function matchFundingPrograms(
  recommendation: {
    industry?: string;
    department?: string;
    tags?: string[];
  },
  companyProfile?: {
    province?: string;
    size?: "SME" | "Large" | "Public";
    sector?: string;
  }
): CanadianFundingProgram[] {
  const matches: { program: CanadianFundingProgram; score: number }[] = [];

  for (const program of canadianFundingPrograms) {
    let score = 0;

    // Industry match (high weight)
    if (recommendation.industry && program.industries.includes(recommendation.industry)) {
      score += 30;
    } else if (program.industries.includes("All Industries")) {
      score += 10;
    }

    // Tag overlap (medium weight)
    const recTags = recommendation.tags || [];
    const matchingTags = program.tags.filter(tag => 
      recTags.some(rt => rt.toLowerCase().includes(tag.toLowerCase()) || tag.toLowerCase().includes(rt.toLowerCase()))
    );
    score += matchingTags.length * 5;

    // Department match (low weight)
    if (recommendation.department && program.tags.some(tag => 
      tag.toLowerCase().includes(recommendation.department!.toLowerCase())
    )) {
      score += 10;
    }

    // Provincial match (bonus if applicable)
    if (companyProfile?.province && program.province === companyProfile.province) {
      score += 15;
    }

    // Company size eligibility
    if (companyProfile?.size === "SME") {
      if (program.eligibility.some(e => e.toLowerCase().includes("sme") || e.toLowerCase().includes("small"))) {
        score += 10;
      }
    }

    // Federal programs are always relevant
    if (program.jurisdiction === "Federal") {
      score += 5;
    }

    // Only include if score is meaningful
    if (score >= 15) {
      matches.push({ program, score });
    }
  }

  // Sort by score and return top programs
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(m => m.program);
}
