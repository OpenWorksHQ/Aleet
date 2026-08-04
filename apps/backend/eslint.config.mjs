import js from "@eslint/js";
import globals from "globals";

/**
 * Backend lint config.
 *
 * The root runs `turbo run lint`, but this workspace had no `lint` script, so
 * ~19k lines of backend code were never linted while both frontends were.
 *
 * Scope is deliberately narrow: rules that catch real defects (undefined
 * identifiers, unreachable code, shadowed declarations) rather than style.
 * Formatting is intentionally not enforced — retrofitting a style guide onto an
 * existing codebase produces a large, review-hostile diff and hides the bugs.
 */
export default [
  {
    ignores: ["node_modules/**", "uploads/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Unused args are common in Express middleware signatures — the 4-arg
      // error handler must keep `next` to be recognised as one at all.
      "no-unused-vars": [
        "error",
        {
          args: "none",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      // Real-defect rules.
      "no-undef": "error",
      "no-unreachable": "error",
      "no-dupe-keys": "error",
      "no-dupe-args": "error",
      "no-duplicate-case": "error",
      "no-self-assign": "error",
      "no-constant-condition": ["error", { checkLoops: false }],
      "require-atomic-updates": "off",
    },
  },
];
