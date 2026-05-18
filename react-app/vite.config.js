import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    // Build directly into docs/react-app/ so the output is committed to git
    // and accessible via GitHub Pages at /training/react-app/ and via
    // Live Server when serving the docs/ folder.
    outDir: '../docs/react-app',
    emptyOutDir: true
  }
});
