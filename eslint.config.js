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
      globals: globals.browser,
    },
  },
  /* Os arquivos de fase (src/NN-*.jsx) são quase todo o app. Ainda dependem
     de globais do window (bootstrap-globals.ts), então no-undef ficaria
     ilegível; entram só as regras que pegam bug de verdade — hook depois de
     return condicional e chave duplicada em objeto (a de baixo apaga a de
     cima em silêncio). Varredura de 28/09/2026. */
  {
    files: ['src/**/*.jsx'],
    plugins: { 'react-hooks': reactHooks },
    // Os arquivos têm eslint-disable de exhaustive-deps, regra que aqui fica
    // de fora; sem isto, cada um viraria aviso de "diretiva sem uso".
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    /* Varredura de 02/10/2026: as regras abaixo de no-dupe-keys pegam bug de
       lógica (código inalcançável, comparação consigo mesmo, case repetido,
       `?.` que explode em spread...) e passavam sem nenhuma ocorrência —
       ficam como trava contra regressão. */
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'no-dupe-else-if': 'error',
      'no-duplicate-case': 'error',
      'no-fallthrough': 'error',
      'no-cond-assign': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-constant-binary-expression': 'error',
      'no-unsafe-negation': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'no-const-assign': 'error',
      'no-func-assign': 'error',
      'no-unmodified-loop-condition': 'error',
      'array-callback-return': 'error',
    },
  },
])
