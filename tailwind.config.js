/** Design system « Le Sillage » — tokens partagés avec src/styles/index.css */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: { sm: '480px', md: '768px', lg: '1024px', xl: '1280px' },
    extend: {
      colors: {
        noir: { DEFAULT: '#0B0A0C', 2: '#141116', 3: '#1D181F' },
        /*
         * Rôle de chaque rose (aucune autre teinte rose en dehors de ces tokens) — règle 70/20/10 :
         * 70 % noirs, 20 % ivoire/gris, 10 % rose maximum à l'écran.
         *  rose        boutons (fond) — ivoire dessus 6.43:1
         *  rose.vif    survol des boutons
         *  rose.logo   marque : monogramme, goutte, liserés, états actifs (magenta échantillonné dans le logo)
         *  rose.doux   titres en italique, liens, icônes (8.1:1 sur noir)
         *  rose.brume  reflets, petits textes d'accent clairs
         *  rose.profond  bordeaux réservé au hero et au manifeste
         */
        rose: {
          DEFAULT: '#A8124F',
          vif: '#BE1A5C',
          logo: '#DA0862',
          doux: '#E58BAE',
          brume: '#F2C6D6',
          profond: '#4A0620',
        },
        cuivre: '#C9876A',
        ivoire: '#F5EFEA',
        gris: '#A99EA5',
        dispo: { ok: '#6FCF97', limite: '#F2B66D', epuise: '#8A8089' },
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
        douce: '0 20px 60px -20px rgba(0,0,0,0.6)',
        cta: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 14px 34px -14px rgba(168,18,79,0.9)',
      },
      transitionTimingFunction: { sillage: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    },
  },
  plugins: [],
};
