import type { SVGProps } from 'react';

/**
 * Icônes de marques dessinées au trait fin (1.5), même grammaire que Lucide,
 * pour un jeu d'icônes cohérent (Lucide ne fournit plus les logos de marques).
 */
const base = (props: SVGProps<SVGSVGElement>) => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
});

export const IconeWhatsApp = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M3.5 20.5l1.2-4.1A8.5 8.5 0 1 1 8 19.6z" />
    <path d="M9 8.6c.2-.5.5-.6.8-.6h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .5-.1.6l-.5.6c-.1.2-.1.4 0 .6.6 1.1 1.5 2 2.6 2.6.2.1.4.1.6 0l.6-.5c.2-.1.4-.2.6-.1l1.6.7c.3.1.4.3.4.5v.5c0 .3-.1.6-.6.8-.6.3-1.6.4-2.8-.1a9.5 9.5 0 0 1-4.6-4.6c-.5-1.2-.4-2.2-.1-2.8z" />
  </svg>
);

export const IconeInstagram = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
  </svg>
);

export const IconeTikTok = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M14 3.5v11.2a3.8 3.8 0 1 1-3.8-3.8" />
    <path d="M14 3.5c.4 2.6 2.3 4.4 5 4.6" />
  </svg>
);

export const IconeSnapchat = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 3.5c-2.8 0-4.6 2-4.6 4.6v2.3l-1.6.4c-.4.1-.4.6 0 .8l1.3.6c-.5 1.6-1.6 2.9-3.1 3.5-.3.1-.3.6 0 .7 1 .4 1.8.5 2.3.6l.4 1.3c.1.2.3.3.5.2.7-.2 1.5-.2 2.3.2.8.4 1.5 1 2.5 1s1.7-.6 2.5-1c.8-.4 1.6-.4 2.3-.2.2.1.4 0 .5-.2l.4-1.3c.5-.1 1.3-.2 2.3-.6.3-.1.3-.6 0-.7-1.5-.6-2.6-1.9-3.1-3.5l1.3-.6c.4-.2.4-.7 0-.8l-1.6-.4V8.1c0-2.6-1.8-4.6-4.6-4.6z" />
  </svg>
);

export const ICONES_RESEAUX = {
  instagram: IconeInstagram,
  tiktok: IconeTikTok,
  snapchat: IconeSnapchat,
} as const;
