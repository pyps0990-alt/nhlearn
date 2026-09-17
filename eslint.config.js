import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  // Cloud Functions / Vercel Serverless：Node 環境，可用 require、exports、process
  {
    files: ['functions/**/*.js', 'homework/**/*.js', 'api/**/*.js', '*.config.js', '**/.eslintrc.js'],
    languageOptions: {
      globals: { ...globals.node },
      sourceType: 'commonjs',
    },
  },
  // api/ 內為 ESM 格式的 Vercel Functions
  {
    files: ['api/**/*.js'],
    languageOptions: { sourceType: 'module' },
  },
  // Service Worker：可用 importScripts、self，以及 Firebase compat 全域物件
  {
    files: ['public/**/*.js'],
    languageOptions: {
      globals: { ...globals.serviceworker, firebase: 'readonly' },
    },
  },
])
