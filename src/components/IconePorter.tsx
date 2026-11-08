import type { ReactNode } from 'react';

/**
 * Icônes « Quand le porter » : dessin au trait, 24 × 24, trait de 1,5 (comme les icônes du site),
 * couleur héritée (currentColor) : elles suivent les thèmes clair et sombre.
 */
const TRACES = {
  // Moment
  soleil: (
    <>
      <circle cx="12" cy="12" r="3.8" />
      <path d="M12 2.8v2.1M12 19.1v2.1M2.8 12h2.1M19.1 12h2.1M5.5 5.5 7 7M17 17l1.5 1.5M5.5 18.5 7 17M17 7l1.5-1.5" />
    </>
  ),
  lune: <path d="M19.5 14.6A8 8 0 1 1 9.4 4.5a6.4 6.4 0 0 0 10.1 10.1Z" />,
  // Soleil qui se couche à gauche, croissant de lune à droite
  jourSoir: (
    <>
      <path d="M3 17.5h18" />
      <path d="M5 17.5a4.2 4.2 0 0 1 8.4 0" />
      <path d="M9.2 9.6v1.6M4.3 12.2l1.1 1.1M14.1 12.2 13 13.3" />
      <path d="M19.8 9.9a3.4 3.4 0 1 1-3.6-4.9 2.7 2.7 0 0 0 3.6 4.9Z" />
    </>
  ),
  // Saison
  fraiche: (
    <>
      <path d="M3.5 8.5h11a2.5 2.5 0 1 0-2.5-2.5" />
      <path d="M3.5 12.5h15a2.5 2.5 0 1 1-2.5 2.5" />
      <path d="M3.5 16.5h7a2 2 0 1 1-2 2" />
    </>
  ),
  chaude: (
    <>
      <circle cx="12" cy="10" r="3.6" />
      <path d="M12 3v1.6M6.2 5.4l1.1 1.1M17.8 5.4l-1.1 1.1M4.4 10H6M18 10h1.6" />
      <path d="M4 17c1.3-1 2.7-1 4 0s2.7 1 4 0 2.7-1 4 0 2.7 1 4 0M6 20.5c1.2-.8 2.4-.8 3.6 0s2.4.8 3.6 0 2.4-.8 3.6 0" />
    </>
  ),
  annee: (
    <>
      <rect x="3.8" y="5.3" width="16.4" height="14.9" rx="2" />
      <path d="M3.8 9.8h16.4M8.3 3.3v3.8M15.7 3.3v3.8M8 13.3h.01M12 13.3h.01M16 13.3h.01M8 16.6h.01M12 16.6h.01" />
    </>
  ),
  // Occasion
  quotidien: <path d="M5.2 8.3h13.6l-1 11.4H6.2Z M9 8.3V7a3 3 0 0 1 6 0v1.3" />,
  bureau: (
    <>
      <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
      <path d="M9 7.5V5.8A1.3 1.3 0 0 1 10.3 4.5h3.4A1.3 1.3 0 0 1 15 5.8v1.7M3.5 12.5h17M11 12.5v1.6h2v-1.6" />
    </>
  ),
  sortie: <path d="M5 4.5h14l-7 7.8Z M12 12.3v7.4M8.2 19.7h7.6M8.6 8.3h6.8" />,
  // Bougie allumée
  diner: (
    <>
      <path d="M9 10.5h6v9.5H9Z" />
      <path d="M12 10.5V8.8" />
      <path d="M12 3.5c1.6 1.5 1.9 2.9.9 4a1.3 1.3 0 0 1-1.8 0c-1-1.1-.7-2.5.9-4Z" />
      <path d="M6.5 20h11" />
    </>
  ),
  ceremonie: (
    <path d="M11 4c.6 4 2.6 6 6.6 6.6-4 .6-6 2.6-6.6 6.6-.6-4-2.6-6-6.6-6.6 4-.6 6-2.6 6.6-6.6Z M18.5 3.2v3.4M16.8 4.9h3.4M18 17.5v2.6M16.7 18.8h2.6" />
  ),
} satisfies Record<string, ReactNode>;

export type NomIcone = keyof typeof TRACES;

export function IconePorter({ nom, className = 'h-6 w-6' }: { nom: NomIcone; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {TRACES[nom]}
    </svg>
  );
}
