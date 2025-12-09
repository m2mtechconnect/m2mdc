export interface FundingProgram {
  id: string;
  name: string;
  provider: string;
  amount: string;
  deadline: string;
  description: string;
  departments: string[];
  outcomes: string[];
  eligibility: string[];
  applicationUrl: string;
  matchScore: number;
}

export const fundingPrograms: FundingProgram[] = [
  {
    id: "nsf-ai-1",
    name: "NSF AI Research Institutes",
    provider: "National Science Foundation",
    amount: "$20M - $100M over 5 years",
    deadline: "Rolling",
    description: "Support for AI research institutes focused on advancing AI capabilities and addressing societal challenges through AI innovation.",
    departments: ["Sales", "Marketing", "Operations", "Finance", "Support"],
    outcomes: ["Predictive", "Prescriptive", "Generative"],
    eligibility: ["Universities", "Research institutions", "Private companies with R&D focus"],
    applicationUrl: "https://www.nsf.gov/funding/",
    matchScore: 95
  },
  {
    id: "sba-sbir-1",
    name: "SBIR Phase I - AI & Machine Learning",
    provider: "Small Business Administration",
    amount: "$50K - $250K",
    deadline: "Quarterly",
    description: "Early-stage funding for small businesses developing innovative AI and ML solutions with commercial potential.",
    departments: ["Sales", "Marketing", "Operations"],
    outcomes: ["Predictive", "Prescriptive"],
    eligibility: ["Small businesses (<500 employees)", "US-based", "For-profit"],
    applicationUrl: "https://www.sbir.gov/",
    matchScore: 88
  },
  {
    id: "doe-ai-1",
    name: "DOE AI for Energy Efficiency",
    provider: "Department of Energy",
    amount: "$500K - $5M",
    deadline: "Annual",
    description: "Funding for AI systems that improve energy efficiency, reduce costs, and optimize resource utilization in operations.",
    departments: ["Operations", "Finance"],
    outcomes: ["Predictive", "Prescriptive"],
    eligibility: ["Businesses", "Research institutions", "Must demonstrate energy impact"],
    applicationUrl: "https://www.energy.gov/funding-financing",
    matchScore: 82
  },
  {
    id: "eda-tech-1",
    name: "EDA Build to Scale",
    provider: "Economic Development Administration",
    amount: "$500K - $2M",
    deadline: "Semi-annual",
    description: "Support for scaling AI-driven business solutions that create jobs and drive economic growth.",
    departments: ["Sales", "Marketing", "Operations", "Finance"],
    outcomes: ["Predictive", "Prescriptive", "Generative"],
    eligibility: ["Startups", "Growth-stage companies", "Regional economic development organizations"],
    applicationUrl: "https://www.eda.gov/funding/",
    matchScore: 78
  },
  {
    id: "nist-mep-1",
    name: "NIST MEP AI Adoption",
    provider: "National Institute of Standards and Technology",
    amount: "$100K - $750K",
    deadline: "Rolling",
    description: "Grants for small and medium manufacturers to adopt AI technologies for process optimization and quality improvement.",
    departments: ["Operations"],
    outcomes: ["Predictive", "Prescriptive"],
    eligibility: ["Manufacturing companies", "SMEs (<500 employees)", "Located in MEP service areas"],
    applicationUrl: "https://www.nist.gov/mep",
    matchScore: 75
  },
  {
    id: "cdc-ai-health-1",
    name: "CDC AI for Public Health",
    provider: "Centers for Disease Control",
    amount: "$250K - $1M",
    deadline: "Annual",
    description: "Funding for AI systems that improve public health outcomes, disease prediction, and healthcare delivery.",
    departments: ["Support", "Operations"],
    outcomes: ["Predictive", "Prescriptive"],
    eligibility: ["Healthcare organizations", "Public health departments", "Research institutions"],
    applicationUrl: "https://www.cdc.gov/grants/",
    matchScore: 72
  },
  {
    id: "usda-ai-ag-1",
    name: "USDA AI for Agriculture",
    provider: "U.S. Department of Agriculture",
    amount: "$300K - $2M",
    deadline: "Annual",
    description: "Support for AI applications in agriculture, including crop prediction, yield optimization, and sustainable farming practices.",
    departments: ["Operations", "Finance"],
    outcomes: ["Predictive", "Prescriptive"],
    eligibility: ["Agricultural businesses", "Farming cooperatives", "AgTech companies"],
    applicationUrl: "https://www.usda.gov/topics/farming/grants-and-loans",
    matchScore: 70
  },
  {
    id: "dhs-cyber-1",
    name: "DHS Cybersecurity AI Innovation",
    provider: "Department of Homeland Security",
    amount: "$500K - $3M",
    deadline: "Semi-annual",
    description: "Funding for AI systems that enhance cybersecurity, threat detection, and incident response capabilities.",
    departments: ["Operations", "Support"],
    outcomes: ["Predictive", "Prescriptive"],
    eligibility: ["Cybersecurity firms", "Technology companies", "Critical infrastructure operators"],
    applicationUrl: "https://www.dhs.gov/science-and-technology/funding-opportunities",
    matchScore: 68
  },
  {
    id: "commerce-ai-1",
    name: "Commerce AI for Economic Growth",
    provider: "Department of Commerce",
    amount: "$250K - $1.5M",
    deadline: "Quarterly",
    description: "Grants for AI solutions that drive economic development, improve business operations, and create competitive advantages.",
    departments: ["Sales", "Marketing", "Finance"],
    outcomes: ["Predictive", "Prescriptive", "Generative"],
    eligibility: ["Businesses", "Economic development organizations", "Technology consortiums"],
    applicationUrl: "https://www.commerce.gov/bureaus-and-offices/os/grants-management",
    matchScore: 65
  },
  {
    id: "state-local-1",
    name: "State & Local AI Modernization",
    provider: "Various State Agencies",
    amount: "$50K - $500K",
    deadline: "Varies by state",
    description: "State and local government grants for modernizing operations and services through AI adoption.",
    departments: ["Operations", "Support", "Finance"],
    outcomes: ["Predictive", "Prescriptive"],
    eligibility: ["Local businesses", "State-based organizations", "Varies by program"],
    applicationUrl: "https://www.grants.gov/",
    matchScore: 60
  }
];

export function filterFundingPrograms(
  department?: string,
  outcome?: string,
  minMatchScore: number = 60
): FundingProgram[] {
  return fundingPrograms
    .filter(program => {
      const departmentMatch = !department || program.departments.includes(department);
      const outcomeMatch = !outcome || program.outcomes.includes(outcome);
      const scoreMatch = program.matchScore >= minMatchScore;
      return departmentMatch && outcomeMatch && scoreMatch;
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}
