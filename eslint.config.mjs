/**
 * @packageDocumentation
 * ESLint flat-config for the workspace (extension host + scarce-ui webview).
 * Three logical configs: shared TypeScript rules for extension/models, React-specific
 * rules for scarce-ui, and a lenient override for test files. Prettier is last.
 */
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  // Ignore build outputs and all JS/MJS files (configs, scripts, CI-generated).
  {
    ignores: ['dist/**', 'out/**', '**/*.js', '**/*.mjs'],
  },
  // Extension host + shared models: strict type-checked recommended + stylistic rules.
  {
    files: ['src/**/*.ts', 'models/**/*.ts'],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      'plugin:tsdoc/base',
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/naming-convention': [
        'warn',
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['PascalCase'] },
        { selector: 'import', format: ['camelCase', 'PascalCase'] },
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          modifiers: ['unused'],
        },
        { selector: 'objectLiteralProperty', format: null },
        { selector: 'typeProperty', format: null },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      curly: 'warn',
      eqeqeq: 'warn',
      // Extension code throws `Error` subclasses with `code` fields; literal-throw ban
      // stays off so plain `Error(code-string)` factory usage remains idiomatic.
      'no-throw-literal': 'off',
      '@typescript-eslint/only-throw-error': 'warn',
      semi: 'off',
    },
  },
  // Webview (React): same type-checked baseline plus React Hooks rules; uses the
  // scarce-ui tsconfig because it is a separate TS project from the extension.
  {
    files: ['scarce-ui/src/**/*.{ts,tsx}'],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      'plugin:tsdoc/base',
    ],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.app.json'],
        tsconfigRootDir: `${import.meta.dirname}/scarce-ui`,
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      curly: 'warn',
      eqeqeq: 'warn',
    },
  },
  // Test files: allow bare expressions (common `expect(...)` + assertion-library
  // patterns in the extension tests).
  {
    files: ['src/test/**/*.ts', '**/*.test.ts'],
    rules: { '@typescript-eslint/no-unused-expressions': 'off' },
  },
  // Must be last: disables formatting-conflicting rules in favour of Prettier.
  eslintConfigPrettier,
);
