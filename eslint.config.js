import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist/**', 'docs/**', 'node_modules/**', 'src-tauri/**']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/essential'],
  {
    files: [
      'src/**/*.{js,ts,vue}',
      'e2e/**/*.js',
      'wdio.conf.js',
      'vite.config.ts',
      'vitest.config.ts'
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }
      ],
      'vue/multi-word-component-names': 'off'
    }
  },
  {
    files: ['src/**/*.test.js', 'src/test/**/*.js'],
    languageOptions: {
      globals: globals.vitest
    }
  },
  {
    files: ['e2e/**/*.js'],
    languageOptions: {
      globals: globals.mocha
    }
  }
)
