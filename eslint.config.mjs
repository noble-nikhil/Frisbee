import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['**/dist', '**/dev-dist', '**/node_modules', 'design', '.emulator-data']),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    rules: {
      // Context providers, ui primitives and pages legitimately export a hook/helper next to the component.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true, allowExportNames: ['useAuth', 'useMe', 'useToast', 'useTabParam', 'controlClass', 'threadTitle', 'threadPhoto'] }],
    },
  },
  {
    files: ['apps/server/**/*.ts', 'scripts/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
])
