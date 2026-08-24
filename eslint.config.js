import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // Pin the repository's pre-upgrade React Hooks policy. Plugin v7's
      // `recommended` preset adds compiler-opinion rules that are a separate
      // migration and would turn 172 untouched legacy findings into errors.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // ESLint 10 added these rules to `eslint:recommended`. Keep the existing
      // lint contract stable while the dependency receives security fixes;
      // enabling them is a dedicated repository-wide cleanup, not a CI repair.
      "no-useless-assignment": "off",
      "no-unassigned-vars": "off",
      "preserve-caught-error": "off",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Phase 13 - `any` burn-down ratchet.
      // The baseline carried 1202 `any` uses across legacy surfaces. Removing
      // them wholesale is not a mechanical change, so the rule reports as a
      // warning repo-wide (visible, counted, never silenced) and is escalated
      // to an error in the consolidated truth-critical modules below. New
      // code in those modules cannot reintroduce `any`.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // Truth-critical modules produced by the consolidation phases: identity,
    // run envelope, telemetry, decisions, connections and asset validation.
    // These must stay fully typed - `any` here can hide a provenance or
    // ownership defect.
    files: [
      "src/dsx/**/*.{ts,tsx}",
      "src/workspace/**/*.{ts,tsx}",
      "src/telemetry/**/*.{ts,tsx}",
      "src/connections/**/*.{ts,tsx}",
      "src/validation/**/*.{ts,tsx}",
      "src/config/**/*.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    // Phase 2 - orchestrator bypass guard.
    // Simulation engines may only be constructed by the orchestrator's own
    // providers. Application code must dispatch through
    // `simulationOrchestrator` so seeding, readiness and provenance are
    // always recorded.
    //
    // Scope: the whole repository (app, tests, e2e specs, scripts, Edge
    // Functions), not just `src/`. Every exemption is listed explicitly in
    // `ignores` below and mirrored in
    // `src/simulation/orchestrator/__tests__/bypassGuard.test.ts`.
    //
    // Exemptions and why each one exists:
    //   1. the orchestrator itself, which owns dispatch;
    //   2. the three frozen legacy engine modules, which the orchestrator's
    //      providers adapt (they may not import each other's entry points);
    //   3. the compat facade bridge, which is the orchestrator-backed shim
    //      kept for legacy call sites;
    //   4. characterization tests, which pin the frozen engines' behaviour
    //      and must call them directly to do so.
    files: ["**/*.{ts,tsx}"],
    ignores: [
      // 1. orchestrator (owns dispatch)
      "src/simulation/orchestrator/**/*.{ts,tsx}",
      // 2. frozen legacy engines (adapted by orchestrator providers)
      "src/simulation/generateSimulationResult.ts",
      "src/simulation/compat/sovereignDataCenterEngine.ts",
      "src/components/builder/step5/BuilderPreviewEngine.ts",
      "src/components/builder/step5/fixtures/builderMock.ts",
      // 3. orchestrator-backed compatibility shim
      "src/simulation/compat/facadeBridge.ts",
      // 4. characterization tests pinning frozen engine behaviour
      "src/simulation/__tests__/characterization/**/*.{ts,tsx}",
      "src/simulation/compat/__tests__/**/*.{ts,tsx}",
      "src/simulation/orchestrator/__tests__/**/*.{ts,tsx}",
      "src/twins/sovereignDataCenter/__tests__/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/components/builder/step5/BuilderPreviewEngine",
              message:
                "Do not construct simulation engines directly. Use simulationOrchestrator.openPreviewSession() from @/simulation/orchestrator.",
            },
            {
              name: "@/components/builder/step5/fixtures/builderMock",
              importNames: ["MockSimulationEngine"],
              message:
                "Do not construct simulation engines directly. Use simulationOrchestrator.openPreviewSession() from @/simulation/orchestrator.",
            },
            {
              name: "@/simulation/generateSimulationResult",
              importNames: ["generateSimulationResult"],
              message:
                "Do not call the summary engine directly. Use simulationOrchestrator.runSync() with the 'aura-panel-summary' provider.",
            },
            {
              name: "@/simulation/compat/sovereignDataCenterEngine",
              importNames: ["runSimulation"],
              message:
                "Do not call the sovereign engine directly. Use simulationOrchestrator.runSync() with the 'sovereign-scenario' provider.",
            },
          ],
          patterns: [
            {
              group: [
                "**/simulation/orchestrator/providers/*",
                "!**/simulation/orchestrator/providers",
              ],
              message:
                "Do not import orchestrator providers directly. Dispatch through simulationOrchestrator from @/simulation/orchestrator.",
            },
          ],
        },
      ],
    },
  },
  {
    // Cypress specs use chai assertion expressions (`expect(x).to.exist`),
    // which are statements by design.
    files: ["cypress/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
  {
    // Phase 3 truth chain — the legacy simulation snapshot store is a
    // compatibility selector, not a source of run identity. Only the
    // enumerated adapters below may import it; everything else must read the
    // canonical persisted run from @/truth/canonicalRunStore.
    files: ["src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"],
    ignores: [
      "src/capabilities/runProvenance.ts",
      "src/components/simulation/DCSimulationPanel.tsx",
      "src/components/simulation/ScenarioSimulationPanel.tsx",
      "src/components/simulation/SimulationBlueprintSnapshotPanel.tsx",
      "src/stores/simulationSnapshotStore.ts",
      "**/__tests__/**/*.{ts,tsx}",
      "**/*.test.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/stores/simulationSnapshotStore",
              message:
                "The legacy snapshot store is a compatibility selector. Read the canonical persisted run from @/truth/canonicalRunStore (simulation_runs.id is the only run identity).",
            },
          ],
        },
      ],
    },
  },
  {
    // Lovable owns this generated preview-auth bridge and can regenerate it.
    // Keep the repository lint contract strict everywhere else while allowing
    // the provider's canonical declaration style in this one generated file.
    files: ["src/integrations/supabase/previewAuthStorage.ts"],
    rules: {
      "prefer-const": "off",
    },
  },
  {
    // Test doubles legitimately model untyped third-party surfaces.
    files: ["**/__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // Phase 1A.3.g.1 — narrow override. Playwright's `test.extend`
    // fixture callbacks use argument names like `context`, `page`, and
    // `guard`, and call `use(...)` inside them. `eslint-plugin-react-hooks`
    // misidentifies `use(...)` as the React 19 `use` hook and reports
    // `rules-of-hooks` violations. These are false positives — the code
    // never renders React. Scope the disable to the truth-in-UI fixtures
    // folder only; do NOT relax the rule globally or under `src/`.
    files: ["tests/truth-in-ui/_setup/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
);
