import { forwardRef } from 'react';

/**
 * Monogramme « Np » — N à empattements fins + p calligraphique entrelacé.
 * Tracés en traits (stroke) pour l'animation DrawSVG ; le remplissage du N apparaît ensuite.
 */
export const Monogramme = forwardRef<SVGSVGElement, { className?: string; title?: string }>(
  function Monogramme({ className, title = 'Nal’Aaris Perfumes' }, ref) {
    return (
      <svg
        ref={ref}
        viewBox="0 0 120 104"
        className={className}
        {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true })}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* N : fût gauche fin, diagonale épaisse, fût droit fin */}
        <path className="np-trait" strokeWidth="1.6" d="M20 20 V84 M11 84 H29" />
        <path className="np-trait np-diag" strokeWidth="1.6" d="M16 18 H29 L66 84 H53 Z" />
        <path className="np-remplissage" fill="currentColor" stroke="none" d="M16 18 H29 L66 84 H53 Z" />
        <path className="np-trait" strokeWidth="1.6" d="M62 18 V80 M53 18 H71" />
        {/* p : fût descendant + panse calligraphique qui s'enroule dans le N */}
        <path className="np-trait" strokeWidth="1.6" d="M80 44 V100 M73 100 H88" />
        <path
          className="np-trait"
          strokeWidth="2.2"
          d="M70 50 C 74 40, 82 36, 90 36 C 103 36, 110 46, 110 58 C 110 72, 99 80, 89 80 C 84 80, 81 78, 80 74"
        />
        <path className="np-trait" strokeWidth="1.2" d="M66 46 C 68 42, 70 41, 72 42" />
      </svg>
    );
  },
);
