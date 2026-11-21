/** Tailwind de l'espace admin : mêmes tokens que le site, contenu séparé (le CSS du site ne grossit pas). */
import site from './tailwind.config.js';

/** @type {import('tailwindcss').Config} */
export default {
  ...site,
  content: ['./admin.html', './admin/**/*.{ts,tsx}'],
  theme: {
    ...site.theme,
    extend: {
      ...site.theme.extend,
      // Outil : texte un peu plus compact que le site vitrine
      fontSize: {
        ...site.theme.extend.fontSize,
        label: ['0.75rem', { lineHeight: '1.2', letterSpacing: '0.12em' }],
      },
      zIndex: { ...site.theme.extend.zIndex, barre: '50', feuille: '80', toast: '95' },
      colors: {
        ...site.theme.extend.colors,
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
      },
    },
  },
};
