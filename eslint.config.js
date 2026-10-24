import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Architecture boundaries (see docs/architecture.md). Layers, bottom to top:
//   shared  : ui, format, domain, messages, theme, hooks, utils, api, store, types
//   features: one folder per business area under src/features
//   shells  : layouts, portal, App - they wire features together
// Shared code may not import features or shells; features may not import
// shells; and a feature may only import the features listed here. Keeping
// this a one-way graph is what lets a feature be changed or removed without
// the rest of the app noticing - add an edge only when the dependency is real.
const FEATURE_DEPENDENCIES = {
  auth: [],
  documents: [],
  dashboard: [],
  'job-requests': [],
  billing: ['documents'],
  customers: ['billing', 'documents'],
  companies: ['billing'],
  employees: ['auth'],
  projects: ['customers', 'documents'],
  system: ['billing', 'documents'],
}
const SHARED_LAYERS = ['ui', 'format', 'domain', 'messages', 'theme', 'hooks', 'utils', 'api', 'store', 'types']

const restrict = (group, message) => ({ group, message })
const SHELL_MESSAGE = 'Layouts, portal and App compose features; nothing below them may import them.'

const boundaryConfigs = [
  {
    files: SHARED_LAYERS.map((l) => `src/${l}/**/*.{ts,tsx}`),
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          restrict(['**/features/**', '**/features'], 'Shared code (ui, utils, store, ...) must not depend on a feature. Move the shared piece down, or pass it in as a prop.'),
          restrict(['**/layouts/**', '**/portal/**', '**/App'], SHELL_MESSAGE),
        ],
      }],
    },
  },
  ...Object.entries(FEATURE_DEPENDENCIES).map(([feature, allowed]) => ({
    files: [`src/features/${feature}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          restrict(['**/layouts/**', '**/portal/**', '**/App'], SHELL_MESSAGE),
          ...Object.keys(FEATURE_DEPENDENCIES)
            .filter((other) => other !== feature && !allowed.includes(other))
            .map((other) => restrict([`../${other}`, `../${other}/**`, `**/features/${other}/**`],
              `features/${feature} may not import features/${other}. Allowed: ${allowed.join(', ') || 'shared code only'} (edit FEATURE_DEPENDENCIES if this is a real new dependency).`)),
        ],
      }],
    },
  })),
]

export default defineConfig([
  globalIgnores(['dist', 'src/api/schema.d.ts']),
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
    // printed documents (src/features/documents) are exempt: a document's sizes are
    // part of its print layout, not of the app's UI scale.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/theme/**', 'src/features/documents/**', 'src/**/*.test.{ts,tsx}'],
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
    files: ['src/features/documents/**/*.{ts,tsx}'],
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
  ...boundaryConfigs,
])
