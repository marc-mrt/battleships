import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig(
	{
		ignores: ['dist/**/*'],
	},
	{
		files: ['**/*.{js,ts}'],
		extends: [js.configs.recommended, ...tseslint.configs.recommended],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.node,
			sourceType: 'module',
			parserOptions: {
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
);
