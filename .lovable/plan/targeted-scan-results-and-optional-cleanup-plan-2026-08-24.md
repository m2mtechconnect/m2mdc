# Targeted Scan Results and Optional Cleanup Plan

Read-only scan of current synced `main`. No files were changed.

## (a) Provider / technology names in `src/` (tests and generated types excluded)

| Term | Total hits | Notes |
| --- | --- | --- |
| Lovable | 19 | All in auto-generated integration files plus one snapshot URL |
| Supabase | 732 | Client imports, mostly not user-visible |
| PostHog | 9 | Analytics config only |
| Sentry | 3 | Docs file inside `src/components/aoc/AOC_DEPLOYMENT.md` |
| Vercel | 1 | Same docs file |
| Netlify / UiPath / C3.ai / DataRobot | 0 | Clean |
| OpenAI | 21 | Model pickers and marketplace labels |
| Anthropic | 8 | Model marketplace labels |
| Copilot | 540 across 80 files | Legacy naming, not yet fully renamed to AURA Assistant |
| NVIDIA | 873 across 120 files | Deliberate DSX positioning plus capability policy |
| Omniverse | 268 across 53 files | Deliberate |
| DSX | 1015 across 75 files | Deliberate |

User-visible evidence samples:
- `src/integrations/lovable/index.ts:1`, `src/integrations/supabase/previewAuthStorage.ts:3` - auto-generated, must not be edited.
- `src/validation/cloudGpu/baselineSnapshot.ts:12` - hardcoded published URL.
- `src/components/builder/ModelMarketplace.tsx:102,147,327,328` - "OpenAI" / "Anthropic" labels and remote logo URLs.
- `src/components/workflow/NodeInspector.tsx:54`, `src/components/builder/steps/Step2Intelligence.tsx:435`, `src/components/builder/dc-steps/DCStep3Integrations.tsx:348` - raw provider model IDs in dropdowns.
- `src/components/agent-preview/AgentSummaryCard.tsx:70`, `src/pages/SystemManage.tsx:227`, `src/components/marketplace/IndustryAgentPreviewModal.tsx:82` - `llmCompatible: ['Gemini', 'OpenAI']`.
- `src/lib/playbook/playbookGenerator.ts:235` - "Google Gemini / OpenAI GPT" in generated output.
- `src/components/aoc/AOC_DEPLOYMENT.md:154-155` - Vercel and Sentry references shipped inside `src/`.
- NVIDIA/DSX user-facing copy: `src/components/connections/DsxExchangeTab.tsx:28,37,40`, `src/components/copilot/assistantSuggestions.ts:42`, `src/config/dsxClaimsPolicy.ts:58,83,142`.

## (b) Placeholder / demo / mock strings in `src/` (tests excluded)

| Term | Hits | Files |
| --- | --- | --- |
| coming soon | 2 | 2 |
| TODO | 5 | 4 |
| FIXME | 0 | 0 |
| placeholder | 293 | 111 |
| mock | 265 | 69 |
| sample | 155 | 42 |
| demo | 511 | 104 |
| simulated | 487 | 132 |
| reference facility | 35 | 18 |
| canary | 144 | 24 |
| lorem | 1 | 1 (a detection regex, not content) |

Reachable-to-UI evidence:
- `src/i18n/locales/en.ts:1050` - `comingSoon: 'integration coming soon!'`.
- `src/auth/ssoProviders.ts:6` - SSO buttons emit a "coming soon" toast.
- `src/components/agents/AgentScenarioModal.tsx:28`, `src/components/aoc/AOCSimulationTab.tsx:57`, `src/lib/digitalTwin/runtime.ts:434,442` - TODOs, one of which emits `[TODO] Would send notification to ...` at runtime.
- 33 files under `src/components`, `src/pages`, `src/workspace` contain `mock` identifiers, including `src/pages/InfrastructurePage.tsx`, `src/pages/DataCentreTwin.tsx`, `src/components/data-centre-twin/domains/PowerDomainView.tsx`, `src/components/telemetry/SovereigntyAnalyticsTab.tsx`.
- Most `simulated` hits are intentional provenance labelling, not defects.

## (c) Hardcoded KPI / ROI / uptime numbers and named facilities

- `src/pages/IntelligenceDashboard.tsx:273-279` - hardcoded weekly PUE series (1.22-1.28) with narrative comments.
- `src/pages/IntelligenceDashboard.tsx:585,595` - uptime literal `99.97` used as the simulated fallback.
- `src/pages/IntelligenceDashboard.tsx:123,563,709,714` - Tier III `99.982%` thresholds and SLA labels.
- `src/pages/IntelligenceDashboard.tsx:252` - "Industry average PUE: 1.58".
- `src/pages/ManageAgents.tsx:242-244` - "Avg ROI" percentage tile.
- ROI/savings/payback vocabulary: 570 hits across 103 files.
- Named sample facilities: `Montreal` 78 hits, `Montréal` 1, `Sovereign AI DC` 6, `Acme` 4. No Contoso/Example Corp.

## (d) Zero-reference source files under `src/`

1140 non-test source files scanned; 109 have no import reference from any other source or test file.

SAFE_TO_DELETE candidates (unused shadcn primitives and orphaned feature clusters):
- shadcn/ui never imported: `accordion-section`, `aspect-ratio`, `breadcrumb`, `calendar`, `carousel`, `chart`, `context-menu`, `drawer`, `input-otp`, `menubar`, `navigation-menu`, `pagination`, `resizable`, `section-header`, `sidebar`, `toggle-group` (16 files).
- Orphaned `src/components/search/*` cluster (12 files).
- Orphaned `src/components/workflow/*` cluster (12 files: EmptyCanvasPlaceholder, EnhancedValidationFeedback, EnhancedWorkflowPalette, NodeInspector, NodeTooltip, TestRunModal, ValidationModal, WorkflowAISuggestions, WorkflowEditorWithSync, WorkflowExamplesDropdown, WorkflowHelpPanel, WorkflowOnboardingHeader/Tour).

Uncertain (route-level or infra; verify before removal):
- `src/pages/AdminSignupsDashboard.tsx`, `src/pages/AdminUserApproval.tsx` - admin pages that may be intentionally staged.
- `src/test/setup.ts` - referenced by Vitest config, not by imports; must be kept.
- Hooks and libs: `useBuilderAutosave`, `useRealtimeActionLogs`, `useRealtimeAgentStatus`, `useRoleTourAutoStart`, `useKeyboardShortcuts`, `useCopilotHistory`, `lib/digitalTwin/runtime.ts`, `lib/metrics.ts`, `lib/retry.ts`, `lib/validation.ts`, `truth/canonicalDecisions.ts`, `config/roleDashboardConfig.ts` (about 30 files).
- Never touch: `src/integrations/lovable/index.ts`, `src/integrations/supabase/previewAuthStorage.ts`, generated types.

## Optional next step (not executed)

If you want remediation, the smallest high-value slice would be:
1. Remove `src/components/aoc/AOC_DEPLOYMENT.md` provider leakage from the shipped bundle path.
2. Replace the `[TODO]` runtime notification string and the "coming soon" locale string with truthful states.
3. Label the hardcoded PUE/uptime series in `IntelligenceDashboard` explicitly as simulated in the UI.
4. Retire only the 40 SAFE_TO_DELETE files above, in one commit, with the test suite as the gate.

Approve if you want that slice implemented; otherwise this stands as a report only.
