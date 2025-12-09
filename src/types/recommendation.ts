/**
 * Standardized recommendation data structure used throughout the application
 */
export interface RecommendationData {
  id: string;
  source: "url_recommendations" | "quick_recommendations" | "grounded_recommendations";
  title: string;
  problem: string;
  solution: string;
  impact?: string;
  tags?: string[];
  industry?: string;
  department?: string;
  systemName?: string;
  subtitle?: string;
  description?: string;
  recommendation?: string;
  // Enhanced template fields
  problemOverview?: string; // 2-3 sentence business problem explanation
  whyThisMatters?: string; // Industry rationale with benchmarks
  nextSteps?: string[]; // Practical steps before building
  // ROI/metrics fields
  roi?: number;
  potentialRoiPercent?: number; // Potential ROI percentage
  timeToValueWeeks?: number; // Time to value in weeks
  expectedEfficiencyLift?: string; // Expected efficiency/conversion lift
  annualSavings?: number;
  timeSavedPerWeek?: number;
  accuracyImprovement?: number;
  // Model/config fields
  model?: string;
  vendor?: string;
  contextWindow?: string;
  topK?: number;
  topN?: number;
  temperature?: number;
  workflowCount?: number;
  connectedToolsCount?: number;
  optimizations?: string[];
  // Ranking/scoring fields
  relevanceScore?: number; // 0-1 score indicating relevance to company
  totalCount?: number; // Total recommendations before filtering to top N
  // Raw data if needed
  raw?: unknown;
}
