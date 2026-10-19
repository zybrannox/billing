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
])
