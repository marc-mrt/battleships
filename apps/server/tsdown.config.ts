import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: ['src/index.ts'],
	format: 'esm',
	target: 'node22',
	outDir: 'dist',
	clean: true,
	sourcemap: true,
	dts: false,
	treeshake: true,
	minify: true,
	noExternal: ['game-messages', 'game-rules'],
});
