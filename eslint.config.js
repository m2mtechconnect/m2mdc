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
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
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
