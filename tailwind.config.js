/** Design system « Le Sillage » — tokens partagés avec src/styles/index.css */

/** Couleur pilotée par le thème : la valeur vit dans une variable CSS (triplet RGB), l'opacité reste réglable (`text-encre/80`). */
const v = (nom) => `rgb(var(--c-${nom}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // `dark:` = version sombre (noir & rose), choisie avec le bouton du header — voir src/lib/theme.ts
  darkMode: ['selector', '[data-theme="sombre"]'],
  theme: {
    screens: { sm: '480px', md: '768px', lg: '1024px', xl: '1280px' },
    extend: {
      colors: {
        /*
         * Deux versions, mêmes rôles (valeurs dans src/styles/index.css) :
         *  - « Rose & blanc » (défaut) — 60 % blancs, 30 % rose poudré, 10 % magenta/framboise maximum ;
         *  - « Noir & rose » — 70 % noirs, 20 % ivoire/gris, 10 % rose maximum.
         *  fond         surfaces : fond principal, (2) sections alternées, (3) aplats
         *  encre        texte principal
         *  sourdine     texte secondaire (AA sur tous les fonds)
         */
        fond: { DEFAULT: v('fond'), 2: v('fond-2'), 3: v('fond-3') },
        encre: v('encre'),
        sourdine: v('sourdine'),
        /*
         * Rôle de chaque rose (aucune autre teinte rose en dehors de ces tokens) :
         *  rose        boutons (fond) — blanc dessus 7.3:1
         *  rose.vif    survol des boutons
         *  rose.logo   marque : monogramme, goutte, liserés, états actifs (magenta échantillonné dans le logo) — graphismes seulement
         *  rose.doux   titres en italique, liens, icônes
         *  rose.brume  petits textes d'accent
         *  rose.profond  grands aplats (rose poudré en clair, bordeaux en sombre)
         */
        rose: {
          DEFAULT: v('rose'),
          vif: v('rose-vif'),
          logo: v('rose-logo'),
          doux: v('rose-doux'),
          brume: v('rose-brume'),
          profond: v('rose-profond'),
        },
        cuivre: v('cuivre'),
        dispo: { ok: v('dispo-ok'), limite: v('dispo-limite'), epuise: v('dispo-epuise') },
      },
      fontFamily: {
        serif: ['"Bodoni Moda Variable"', '"Bodoni Moda"', 'Didot', 'Georgia', 'serif'],
        sans: ['"Manrope Variable"', 'Manrope', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        label: ['0.8125rem', { lineHeight: '1.2', letterSpacing: '0.2em' }],
        sm: ['0.875rem', { lineHeight: '1.5' }],
        base: ['1rem', { lineHeight: '1.6' }],
        lg: ['1.125rem', { lineHeight: '1.6' }],
        xl: ['1.375rem', { lineHeight: '1.3' }],
        '2xl': ['1.75rem', { lineHeight: '1.15' }],
        '3xl': ['2.5rem', { lineHeight: '1.05' }],
        '4xl': ['3.5rem', { lineHeight: '1.02' }],
        '5xl': ['5rem', { lineHeight: '1' }],
      },
      spacing: { 18: '4.5rem', 28: '7rem' },
      borderRadius: { card: '24px', drawer: '28px' },
      maxWidth: { site: '1240px' },
      zIndex: { brume: '0', contenu: '10', nav: '40', barre: '50', pastille: '60', tiroir: '90', menu: '100' },
      boxShadow: {
        douce: 'var(--ombre-douce)',
        cta: 'var(--ombre-cta)',
      },
      transitionTimingFunction: { sillage: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    },
  },
  plugins: [],
};
