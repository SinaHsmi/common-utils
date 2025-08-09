import typescriptEslint from '@typescript-eslint/eslint-plugin'
import prettier from 'eslint-plugin-prettier'
import node from 'eslint-plugin-node'
import globals from 'globals'
import tsParser from '@typescript-eslint/parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

export default [
  {
    ignores: ['**/test/', '**/dist', '**/src/_external'],
  },
  ...compat.extends('prettier', 'plugin:@typescript-eslint/recommended'),
  {
    plugins: {
      '@typescript-eslint': typescriptEslint,
      prettier,
      node,
    },

    languageOptions: {
      globals: {
        ...globals.node,
      },

      parser: tsParser,
      ecmaVersion: 2021,
      sourceType: 'commonjs',
    },

    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },

    rules: {
      'prefer-const': 'off',
      'no-await-in-loop': 'off',
      'operator-assignment': 'off',
      'lines-between-class-members': 'off',
      'no-restricted-syntax': 'off',
      'no-continue': 'off',
      'import/prefer-default-export': 'off',
      'class-methods-use-this': 'warn',
      'prefer-destructuring': 'warn',
      'no-underscore-dangle': 'warn',
      'guard-for-in': 'warn',
      'no-unused-vars': 'warn',
      'prefer-template': 'warn',
      'max-classes-per-file': 'warn',
      'no-shadow': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
]
