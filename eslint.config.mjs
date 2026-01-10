import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import eslintConfigPrettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactRecommended from 'eslint-plugin-react/configs/recommended.js';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';
import cssImportOrder from 'eslint-plugin-css-import-order';

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      react,
      import: importPlugin,
      'unused-imports': unusedImports,
      'css-import-order': cssImportOrder,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...reactRecommended.rules,
      // "react/jsx-uses-react": "off",
      'react/react-in-jsx-scope': 'off',
      // "react/prop-types": "off",
      // "max-len": ["warn", { code: 120 }],
      'unused-imports/no-unused-imports': 'error',
      // "@typescript-eslint/semi": 0,
      // "@typescript-eslint/comma-dangle": 0,
      // "@typescript-eslint/no-misused-promises": 0,
      // "@typescript-eslint/no-floating-promises": 0,
      // "@typescript-eslint/member-delimiter-style": 0,
      // "@typescript-eslint/strict-boolean-expressions": 0,
      // "@typescript-eslint/space-before-function-paren": 0,
      // "@typescript-eslint/no-unsafe-argument": 0,
      // "react-hooks/exhaustive-deps": "off",
      'import/order': [
        'error',
        {
          groups: ['external', 'builtin', 'internal', 'sibling', 'parent', 'index'],
          pathGroups: [
            {
              pattern: 'react',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '@/**',
              group: 'internal',
            },
          ],
          pathGroupsExcludedImportTypes: ['react'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'css-import-order/css-import-order': 'error',
    },
  },
  // Disables ESLint rules that conflict with Prettier.
  eslintConfigPrettier,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
