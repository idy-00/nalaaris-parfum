import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { gsap, useGSAP, MQ } from '../lib/gsap';
import { useFocusTrap } from '../hooks/useFocusTrap';

/**
 * Tiroir de verre accessible (dialog modal) : bas sur mobile, côté droit dès 768px.
 * Reste monté ; GSAP gère l'entrée/sortie (opacité + transform), `inert` quand il est fermé.
 */
export function Panneau({
  ouvert,
  onClose,
  titre,
  children,
  pied,
  id,
}: {
  ouvert: boolean;
  onClose: () => void;
  titre: string;
  children: ReactNode;
  pied?: ReactNode;
  id: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  useFocusTrap(root, ouvert, onClose);

  useGSAP(
    () => {
      // Lu au moment de l'ouverture : pas de matchMedia persistant qui rejouerait un ancien état
      const desktop = window.matchMedia('(min-width: 768px)').matches;
      const reduce = window.matchMedia(MQ.reduce).matches;
      const ferme = desktop ? { xPercent: 100, yPercent: 0 } : { xPercent: 0, yPercent: 100 };
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      if (ouvert) {
        gsap.set(root.current, { autoAlpha: 1 });
        tl.fromTo('.voile', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0);
        if (reduce) tl.fromTo('.tiroir', { opacity: 0, xPercent: 0, yPercent: 0 }, { opacity: 1, duration: 0.2 }, 0);
        else tl.fromTo('.tiroir', { ...ferme, opacity: 1 }, { xPercent: 0, yPercent: 0, duration: 0.5 }, 0);
      } else {
        // Sortie plus rapide que l'entrée
        tl.to('.voile', { opacity: 0, duration: 0.22 }, 0);
        if (reduce) tl.to('.tiroir', { opacity: 0, duration: 0.15 }, 0);
        else tl.to('.tiroir', { ...ferme, duration: 0.32, ease: 'power2.in' }, 0);
        tl.set(root.current, { autoAlpha: 0 });
      }
    },
    { scope: root, dependencies: [ouvert] },
  );

  // Portail vers <body> : aucun ancêtre transformé ou en verre ne peut casser le position: fixed
  return createPortal(
    <div
      ref={root}
      className="invisible fixed inset-0 z-tiroir opacity-0"
      // @ts-expect-error — `inert` est un attribut HTML valide, pas encore typé dans React 18
      inert={ouvert ? undefined : ''}
    >
      <div className="voile absolute inset-0 bg-noir/60" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-titre`}
        className="tiroir verre-fume absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-drawer md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[440px] md:rounded-l-drawer md:rounded-tr-none"
        style={{ background: 'rgba(20,17,22,0.82)' }}
      >
        <span className="mx-auto mt-3 block h-1 w-10 rounded-full bg-white/20 md:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between gap-4 px-5 pt-3 md:px-7 md:pt-7">
          <h2 id={`${id}-titre`} className="text-2xl">
            {titre}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-ivoire hover:border-rose-doux/60"
            aria-label="Fermer"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="filet mx-5 mt-4 md:mx-7" />
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 md:px-7">{children}</div>
        {pied && <div className="safe-bottom border-t border-white/10 px-5 pt-4 md:px-7">{pied}</div>}
      </div>
    </div>,
    document.body,
  );
}
