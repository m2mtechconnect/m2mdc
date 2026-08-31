/**
 * Governed UI/UX pattern and synthetic-data governance corpus
 * (v-pinned, original prose).
 *
 * Encodes the enterprise design and data-truth rules the product already
 * enforces, so retrieval grounding answers with the same rules the contract
 * tests check. See ADR-0010 for the governing decision record.
 */
import type { EngineeringKnowledgeEntry } from '../engineeringKnowledgeTypes';

export const UI_UX_SYNTHETIC_GOVERNANCE_CORPUS: EngineeringKnowledgeEntry[] = [
  {
    id: 'ux-truth-first-dashboards',
    domain: 'ui-ux-patterns',
    title: 'Truth-first dashboards: provenance labels over polish',
    guidance:
      'Every operational value on a dashboard carries a provenance label: design target, simulated ' +
      'estimate, demonstration fixture or measured value. Configured is not connected, connected is not ' +
      'healthy, and healthy is not verified; each state renders distinctly and absent evidence renders as ' +
      'unavailable, never as a fabricated number. Use the light enterprise canvas for prose, forms and ' +
      'tables, reserve dark graphite surfaces for the twin canvas and telemetry, and hold WCAG AA contrast ' +
      'on both. A dashboard that looks alive but reports unverified state as live is a defect, not a ' +
      'polish choice.',
    keywords: ['dashboard', 'provenance', 'labeling', 'truth', 'states', 'contrast', 'enterprise', 'badge'],
    citations: [
      {
        label: 'WCAG 2.2 recommendation',
        locator: 'https://www.w3.org/TR/WCAG22/',
        kind: 'public-specification',
      },
      {
        label: 'AURA truth-in-UI and metric provenance (ADR-0006)',
        locator: 'docs/adr/0006-truth-in-ui-and-metric-provenance.md',
        kind: 'repository-artifact',
      },
    ],
    restrictedClaimCategories: [],
    runtimeIntegrationClaim: 'none',
    provenance: 'engineering-guidance',
    tenantScope: 'global',
  },
  {
    id: 'ux-progressive-disclosure',
    domain: 'ui-ux-patterns',
    title: 'Progressive disclosure inside a fixed lifecycle navigation',
    guidance:
      'The permanent navigation holds exactly the five lifecycle destinations; every supporting tool is ' +
      'contextual to its owning workspace or reached through permission-aware account menus. Prefer one ' +
      'canonical page per user outcome with role-aware content: duplicated headers, routes or actions are ' +
      'a UX defect to consolidate, never a reason to add another page. Disclose advanced controls ' +
      'progressively (summary first, detail on demand) so expert density comes from grouping and layout ' +
      'rather than shrinking text below the accessible minimum.',
    keywords: ['navigation', 'lifecycle', 'disclosure', 'canonical', 'consolidation', 'progressive', 'menus'],
    citations: [
      {
        label: 'Nielsen Norman Group on progressive disclosure',
        locator: 'https://www.nngroup.com/articles/progressive-disclosure/',
        kind: 'public-research',
      },
      {
        label: 'Salesforce Lightning Design System patterns',
        locator: 'https://www.lightningdesignsystem.com/',
        kind: 'public-documentation',
      },
    ],
    restrictedClaimCategories: [],
    runtimeIntegrationClaim: 'none',
    provenance: 'engineering-guidance',
    tenantScope: 'global',
  },
  {
    id: 'sdg-synthetic-data-labeling',
    domain: 'synthetic-data-governance',
    title: 'Synthetic and demonstration data labelling rules',
    guidance:
      'Synthetic, demonstration and fixture data must be labelled at the record level with an explicit ' +
      'data-class marker and must keep that marker through every export, summary or transformation. ' +
      'Demonstration fixtures never appear as live telemetry, simulated output never appears as measured ' +
      'production data, and stripping a data-class marker is treated as a provenance defect. Synthetic ' +
      'datasets contain no tenant records, no personal data and no credential material, which the ' +
      'sensitive-material scanner checks before any dataset is indexed.',
    keywords: ['synthetic', 'demo', 'fixture', 'labeled', 'dataclass', 'telemetry', 'export', 'marker'],
    citations: [
      {
        label: 'NIST SP 800-188 de-identifying government data sets',
        locator: 'https://csrc.nist.gov/pubs/sp/800/188/final',
        kind: 'public-specification',
      },
      {
        label: 'AURA data provenance model (ADR-0004)',
        locator: 'docs/adr/0004-data-provenance-model.md',
        kind: 'repository-artifact',
      },
    ],
    restrictedClaimCategories: [],
    runtimeIntegrationClaim: 'none',
    provenance: 'engineering-guidance',
    tenantScope: 'global',
  },
  {
    id: 'sdg-eval-data-governance',
    domain: 'synthetic-data-governance',
    title: 'Evaluation datasets: synthetic-only and version-pinned',
    guidance:
      'Evaluation suites that exercise retrieval grounding or guardrails use synthetic cases exclusively, ' +
      'carry a suite version, and declare their data class in the suite header. Cases are reviewed like ' +
      'code: unique identifiers, expected outcomes stated before execution, and no case may embed tenant ' +
      'identifiers, personal data or secrets. When corpus content changes, the corpus version and checksum ' +
      'change with it, and evaluation expectations are re-reviewed against the new pin rather than silently ' +
      'regenerated.',
    keywords: ['evaluation', 'evals', 'suite', 'version', 'pinned', 'checksum', 'synthetic', 'cases'],
    citations: [
      {
        label: 'AURA governed UI patterns and synthetic evaluation data (ADR-0010)',
        locator: 'docs/adr/0010-governed-ui-patterns-and-synthetic-evaluation-data.md',
        kind: 'repository-artifact',
      },
    ],
    restrictedClaimCategories: [],
    runtimeIntegrationClaim: 'none',
    provenance: 'engineering-guidance',
    tenantScope: 'global',
  },
];
