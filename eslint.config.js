import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // 77 existing uses, mostly in the generic form/table components. A
      // warning (not an error) so the backlog doesn't block work, but the
      // `lint` script caps the warning count at today's number
      // (--max-warnings 77): it can only go down. Lower both together as
      // types are tightened.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Text sizes come from the type scale (--fs-2xs ... --fs-6xl, defined in
    // src/theme/tokens.ts) so the whole app stays on one set of sizes. The
    // printed documents (src/documents) are exempt: a document's sizes are
    // part of its print layout, not of the app's UI scale.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/theme/**', 'src/documents/**', 'src/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Property[key.name='fontSize'] > Literal[value=/^[0-9.]+(rem|px)$/]",
          message: 'Use a type-scale token: fontSize: "var(--fs-md)" (see src/theme/tokens.ts).',
        },
        {
          selector: 'Literal[value=/#[0-9a-fA-F]{3,8}\\b/]',
          message: 'Use a design token (var(--...) or an import from src/theme/tokens) instead of a raw hex colour.',
        },
        {
          selector: 'TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b/]',
          message: 'Use a design token (var(--...) or an import from src/theme/tokens) instead of a raw hex colour.',
        },
      ],
    },
  },
  {
    // Colours come from the design tokens (src/theme/tokens.ts) - as CSS
    // variables in styles (var(--blue-600), var(--text-muted)) or imported
    // values where a real colour string is required. A raw hex literal means
    // a colour that won't follow a token change or a theme.
    files: ['src/documents/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/#[0-9a-fA-F]{3,8}\\b/]',
          message: 'Use a design token (var(--...) or an import from src/theme/tokens) instead of a raw hex colour.',
        },
        {
          selector: 'TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b/]',
          message: 'Use a design token (var(--...) or an import from src/theme/tokens) instead of a raw hex colour.',
        },
      ],
    },
  },
])
