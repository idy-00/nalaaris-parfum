/**
 * Build de l'espace admin — séparé du site public : aucun octet de l'admin n'est chargé par le site.
 * Sortie : dist/admin.html (servi sur /admin et /admin/*) + dist/admin-assets/.
 * Développement : `npm run dev:admin` (Vite, port 5174) avec l'API servie par `npm run dev:api` (wrangler, port 8788).
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  publicDir: false, // public/ est déjà copié par le build du site
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    assetsDir: 'admin-assets',
    rollupOptions: { input: 'admin.html' },
  },
  server: {
    port: 5174,
    proxy: { '/api': 'http://127.0.0.1:8788', '/parfums': 'http://127.0.0.1:8788', '/brand': 'http://127.0.0.1:8788' },
  },
});
