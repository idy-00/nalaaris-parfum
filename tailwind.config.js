/** Design system « Le Sillage » — tokens partagés avec src/styles/index.css */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: { sm: '480px', md: '768px', lg: '1024px', xl: '1280px' },
    extend: {
      colors: {
        /*
         * Version « Rose & blanc » — règle 60/30/10 :
         * 60 % blancs (fond), 30 % rose poudré (fond.3, photos, brume), 10 % magenta/framboise maximum.
         *  fond         surfaces : blanc, blanc rosé (2), rose poudré (3, sections alternées)
         *  encre        texte principal, prune très sombre
         *  sourdine     texte secondaire (AA sur blanc et sur rose poudré)
         */
        fond: { DEFAULT: '#FFFFFF', 2: '#FFF7F9', 3: '#FBEAF0' },
        encre: '#2B1620',
        sourdine: '#6E5A64',
        /*
         * Rôle de chaque rose (aucune autre teinte rose en dehors de ces tokens) :
         *  rose        boutons (fond) — blanc dessus 6.4:1
         *  rose.vif    survol des boutons (plus sombre sur fond clair)
         *  rose.logo   marque : monogramme, goutte, liserés, états actifs (magenta échantillonné dans le logo) — graphismes seulement
         *  rose.doux   titres en italique, liens, icônes (framboise lisible sur blanc)
         *  rose.brume  petits textes d'accent (plus sombre que rose.doux)
         *  rose.profond  rose poudré soutenu, réservé aux grands aplats (manifeste, pied de page)
         */
        rose: {
          DEFAULT: '#A8124F',
          vif: '#8E0F43',
          logo: '#DA0862',
          doux: '#B3175A',
          brume: '#8A2550',
          profond: '#F6D7E2',
        },
        cuivre: '#9A5A3F',
        dispo: { ok: '#1F7A4D', limite: '#A55A00', epuise: '#7A6F78' },
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
        douce: '0 20px 60px -24px rgba(122,28,66,0.22)',
        cta: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 12px 28px -14px rgba(168,18,79,0.55)',
      },
      transitionTimingFunction: { sillage: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    },
  },
  plugins: [],
};
