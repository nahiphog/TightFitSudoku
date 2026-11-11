import { defineConfig } from 'vite';
export default defineConfig({ build: { rollupOptions: { input: { main: 'index.html', nine: 'nine/index.html', techniques: 'techniques/index.html', custom: 'custom-build/index.html' } } } });
