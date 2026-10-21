import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // android/ i ios/ zawierają kopie wygenerowane przez Capacitora i Gradle (także
  // build/intermediates), marketing/ - zewnętrzne skrypty filmu promocyjnego.
  globalIgnores(['dist', 'android', 'ios', 'marketing', 'mobile/www', 'test-results', 'playwright-report']),
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
      // `_` na początku nazwy = świadomie nieużywane (jak noUnusedParameters w tsconfig),
      // a `const { pole: _, ...reszta } = obiekt` to zwykłe pominięcie pola.
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      // Konsola przeglądarki ma zostać pusta: błędy i ostrzeżenia idą przez
      // src/core/logger.ts, który na produkcji konsoli nie dotyka.
      'no-console': 'error',
      'no-debugger': 'error',
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**', 'e2e/**', '*.config.{ts,js}'],
    rules: { 'no-console': 'off' },
  },
])
