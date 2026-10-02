import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Absolute site URL for link-preview tags in index.html (e.g. https://user.github.io/repo).
// Without it (local builds) the tags fall back to root-relative URLs.
process.env.VITE_SITE_URL = (process.env.VITE_SITE_URL || '').replace(/\/$/, '');

export default defineConfig({
  // GitHub Pages serves project sites from /<repo>/; the deploy workflow sets VITE_BASE.
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 2100,
    rollupOptions: {
      output: {
        manualChunks: {
          globe: ['react-globe.gl', 'three'],
        },
      },
    },
  },
});
