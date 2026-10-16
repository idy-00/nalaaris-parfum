import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Découpage en morceaux seulement pour le navigateur (le pré-rendu produit un seul fichier Node)
      output: isSsrBuild
        ? {}
        : {
            manualChunks: {
              gsap: ['gsap', '@gsap/react'],
              react: ['react', 'react-dom', 'react-router-dom'],
            },
          },
    },
  },
  // Pré-rendu : on embarque les dépendances pour éviter les soucis CJS/ESM côté Node
  ssr: { noExternal: ['gsap', '@gsap/react', 'lucide-react'] },
}));
