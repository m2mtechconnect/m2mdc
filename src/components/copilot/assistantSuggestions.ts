/**
 * Page-aware AURA Assistant suggestions.
 *
 * A suggestion is only offered when it is answerable in the current state.
 * "Compare simulation runs" never appears with fewer than two recorded runs.
 */
export interface AssistantSuggestion {
  label: string;
  query: string;
}

export interface SuggestionInputs {
  pathname: string;
  runCount: number;
  hasSelectedRun: boolean;
  hasSelectedAsset: boolean;
}

export function assistantSuggestions(input: SuggestionInputs): AssistantSuggestion[] {
  const { pathname, runCount, hasSelectedRun, hasSelectedAsset } = input;
  const suggestions: AssistantSuggestion[] = [];

  if (pathname.startsWith('/blueprint') || pathname.startsWith('/builder')) {
    if (hasSelectedAsset) {
      suggestions.push({ label: 'Explain the selected asset', query: 'Explain the selected asset in this blueprint.' });
      suggestions.push({ label: 'Show dependencies', query: 'Show the upstream and downstream dependencies of the selected asset.' });
    }
    suggestions.push({ label: 'Largest layer constraint', query: 'Which model layer contains the largest constraint?' });
  } else if (pathname.startsWith('/simulation')) {
    if (hasSelectedRun) {
      suggestions.push({ label: 'Compare with baseline', query: 'Compare this run with the design baseline.' });
      suggestions.push({ label: 'Explain the PUE change', query: 'Explain why PUE changed in this run.' });
    }
    suggestions.push({ label: 'Assumptions behind this result', query: 'Show the assumptions driving this simulation result.' });
  } else if (pathname.startsWith('/dsx') || pathname.startsWith('/evidence')) {
    suggestions.push({ label: 'How was this calculated?', query: 'Explain how this value was calculated.' });
    suggestions.push({ label: 'Missing provenance', query: 'Identify values with missing provenance.' });
    suggestions.push({ label: 'Conflicting sources', query: 'Show conflicting source values in this evidence set.' });
  } else if (pathname.startsWith('/manage/integrations') || pathname.startsWith('/integrations') || pathname.startsWith('/settings/integrations')) {
    suggestions.push({ label: 'What blocks readiness?', query: 'What is blocking integration readiness?' });
    suggestions.push({ label: 'Fail-closed integrations', query: 'Which integrations are fail-closed?' });
    suggestions.push({ label: 'NVIDIA DSX requirements', query: 'What is required for NVIDIA DSX readiness?' });
  } else {
    suggestions.push({ label: 'Explain the modelled facility state', query: 'Explain the current modelled facility state.' });
    suggestions.push({ label: 'Largest design constraint', query: 'Identify the largest design constraint in this model.' });
    suggestions.push({ label: 'Metrics lacking evidence', query: 'Show which metrics lack supporting evidence.' });
  }

  if (runCount >= 2) {
    suggestions.push({ label: 'Compare simulation runs', query: 'Compare the two most recent simulation runs.' });
  }

  return suggestions.slice(0, 4);
}