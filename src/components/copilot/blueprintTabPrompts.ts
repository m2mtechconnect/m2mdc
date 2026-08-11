/**
 * Tab-aware AURA Assistant quick prompts for the Blueprint workspace.
 *
 * Every prompt asks the assistant to explain, review or compare what is already
 * on screen. None of them request an action the user's role could not already
 * perform, and none change permissions, ownership or simulation state:
 * Blueprint owns design, Simulation owns execution.
 */

import type { CoPilotQuickAction } from '@/types/copilotContext';
import type { BlueprintTab } from '@/pages/blueprint/tabModel';

/** Prompts shown on every tab, after the tab-specific ones. */
export const BLUEPRINT_GENERAL_PROMPTS: CoPilotQuickAction[] = [
  {
    id: 'explain-design',
    label: 'Explain current design',
    icon: 'FileText',
    prompt:
      'Explain the current blueprint design including domains, agents, KPIs and workflows. Highlight the key architectural decisions and their rationale.',
  },
  {
    id: 'summarize-changes',
    label: 'Summarise recent changes',
    icon: 'FileText',
    prompt:
      'Summarise the recent changes made to this blueprint from the change log and explain their potential impact on the design.',
  },
];

export const BLUEPRINT_TAB_PROMPTS: Record<BlueprintTab, CoPilotQuickAction[]> = {
  model: [
    {
      id: 'model-topology',
      label: 'Explain this facility model',
      icon: 'Layers',
      prompt:
        'Describe the modelled facility: capacity, rack estimate, hall layout and how the rendered subset relates to the full design. State clearly which figures are modelled rather than measured.',
    },
    {
      id: 'model-capacity',
      label: 'Where does capacity come from?',
      icon: 'Gauge',
      prompt:
        'Trace the design capacity shown on this blueprint back to its stored record and canonical unit (kW). Note any value that is quarantined as unitless or conflicting.',
    },
    {
      id: 'model-density',
      label: 'Review rack density assumptions',
      icon: 'Gauge',
      prompt:
        'Review the rack count and per-rack density implied by the current design capacity, and explain whether they are consistent with the declared tier.',
    },
  ],
  assets: [
    {
      id: 'assets-coverage',
      label: 'Check asset coverage',
      icon: 'Wand2',
      prompt:
        'Review the assets and systems configured for this blueprint. Identify domains with no assets recorded and explain what that omission hides.',
    },
    {
      id: 'assets-agents',
      label: 'Suggest missing agents',
      icon: 'Wand2',
      prompt:
        'Based on the industry, tier and capacity of this facility, suggest agents that may be missing for the recorded assets, and explain what each one would monitor.',
    },
    {
      id: 'assets-data',
      label: 'Explain data sources',
      icon: 'FileText',
      prompt:
        'List the data sources bound to these assets, what each one supplies, and which assets currently have no telemetry source at all.',
    },
  ],
  controls: [
    {
      id: 'controls-kpis',
      label: 'Review KPI targets',
      icon: 'Gauge',
      prompt:
        'Review the KPI targets configured here (for example PUE, uptime, carbon intensity). Explain whether each target is realistic for this tier and capacity.',
    },
    {
      id: 'controls-workflows',
      label: 'Explain workflow coverage',
      icon: 'Zap',
      prompt:
        'Explain what the configured workflows automate, which are enabled, and which operational events currently have no workflow response.',
    },
    {
      id: 'controls-gaps',
      label: 'Find control gaps',
      icon: 'AlertTriangle',
      prompt:
        'Identify gaps between the KPIs being tracked and the workflows that would respond when a KPI breaches its target.',
    },
  ],
  validation: [
    {
      id: 'validation-fix',
      label: 'Explain validation issues',
      icon: 'AlertTriangle',
      prompt:
        'Review the current validation warnings and issues. Explain why each exists and the specific design change that would resolve it.',
    },
    {
      id: 'validation-quarantine',
      label: 'Why is capacity quarantined?',
      icon: 'ShieldAlert',
      prompt:
        'Explain the quarantined capacity records for this blueprint: what is stored, why the value cannot be published, and how it is corrected at source.',
    },
    {
      id: 'validation-readiness',
      label: 'What blocks readiness?',
      icon: 'CheckCircle2',
      prompt:
        'Explain the deployment readiness score for this blueprint: what raises it, what currently holds it down, and what remains owned by the Simulation workspace.',
    },
  ],
  versions: [
    {
      id: 'versions-diff',
      label: 'Compare with previous version',
      icon: 'GitBranch',
      prompt:
        'Compare this blueprint version with the previous one. Summarise what changed, who changed it and the design impact.',
    },
    {
      id: 'versions-history',
      label: 'Explain version history',
      icon: 'FileText',
      prompt:
        'Walk through the version history of this blueprint and describe how the design evolved.',
    },
    {
      id: 'versions-handoff',
      label: 'Which version should be simulated?',
      icon: 'Zap',
      prompt:
        'Explain which blueprint version is the most complete candidate to open in the Simulation workspace, and why. Do not start or queue a run.',
    },
  ],
};

/** Tab-specific prompts first, then the general ones. */
export function quickPromptsForTab(tab: BlueprintTab | string | undefined): CoPilotQuickAction[] {
  const specific =
    tab && tab in BLUEPRINT_TAB_PROMPTS
      ? BLUEPRINT_TAB_PROMPTS[tab as BlueprintTab]
      : [];
  return [...specific, ...BLUEPRINT_GENERAL_PROMPTS];
}
