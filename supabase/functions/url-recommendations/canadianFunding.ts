/**
 * Canadian Funding Matching for URL Recommendations
 * Matches recommendations to Canadian federal/provincial programs
 */

interface FundingMatch {
  programName: string;
  jurisdiction: "Federal" | "Provincial" | "Municipal";
  province?: string;
  description: string;
  maxContribution: string;
  coveragePercent: string;
  url: string;
  tags: string[];
}

const canadianPrograms = [
  {
    id: "scale-ai",
    programName: "Scale AI Supercluster",
    jurisdiction: "Federal" as const,
    province: undefined,
    description: "Co-investment in AI-powered supply chain, logistics, and manufacturing projects.",
    maxContribution: "$5M-$10M",
    coveragePercent: "up to 50%",
    url: "https://www.scaleai.ca/",
    tags: ["AI", "Supply Chain", "Manufacturing", "Logistics"],
    industries: ["Manufacturing", "Logistics", "Transportation", "Retail"],
  },
  {
    id: "nrc-irap",
    programName: "NRC IRAP",
    jurisdiction: "Federal" as const,
    province: undefined,
    description: "Financial support for SMEs developing innovative technologies including AI.",
    maxContribution: "$10M+",
    coveragePercent: "up to 80%",
    url: "https://nrc.canada.ca/en/support-technology-innovation/about-irap",
    tags: ["R&D", "AI", "Innovation", "SME"],
    industries: ["All"],
  },
  {
    id: "cdap",
    programName: "Canada Digital Adoption Program",
    jurisdiction: "Federal" as const,
    province: undefined,
    description: "Grants + loans for SMEs to adopt digital technologies including AI agents.",
    maxContribution: "$15K grant + $100K loan",
    coveragePercent: "grant + 0% loan",
    url: "https://www.ic.gc.ca/eic/site/152.nsf/eng/home",
    tags: ["Digital", "SME", "AI", "Adoption"],
    industries: ["All"],
  },
  {
    id: "sif",
    programName: "Strategic Innovation Fund",
    jurisdiction: "Federal" as const,
    province: undefined,
    description: "Large-scale investments in transformative AI and automation projects.",
    maxContribution: "$10M+",
    coveragePercent: "30-50%",
    url: "https://ised-isde.canada.ca/site/strategic-innovation-fund/en",
    tags: ["Large Scale", "AI", "Digital Transformation"],
    industries: ["All", "Healthcare", "Energy"],
  },
];

export function matchCanadianFunding(recommendation: {
  industry?: string;
  department?: string;
  tags?: string[];
}): FundingMatch[] {
  const matches: { program: typeof canadianPrograms[0]; score: number }[] = [];

  for (const program of canadianPrograms) {
    let score = 0;

    // Industry match
    if (recommendation.industry) {
      if (program.industries.includes(recommendation.industry)) {
        score += 25;
      } else if (program.industries.includes("All")) {
        score += 10;
      }
    }

    // Tag overlap
    const recTags = recommendation.tags || [];
    for (const tag of program.tags) {
      if (recTags.some(rt => rt.toLowerCase().includes(tag.toLowerCase()) || 
                             tag.toLowerCase().includes(rt.toLowerCase()))) {
        score += 10;
      }
    }

    // Federal programs always relevant
    if (program.jurisdiction === "Federal") {
      score += 5;
    }

    if (score >= 15) {
      matches.push({ program, score });
    }
  }

  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(m => ({
      programName: m.program.programName,
      jurisdiction: m.program.jurisdiction,
      province: (m.program as any).province,
      description: m.program.description,
      maxContribution: m.program.maxContribution,
      coveragePercent: m.program.coveragePercent,
      url: m.program.url,
      tags: m.program.tags,
    }));
}
