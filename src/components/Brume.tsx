import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { gsap, useGSAP, MQ } from '../lib/gsap';
import { STYLES, type Style } from '../data/parfums';

/* ------------------------------------------------------------------
   La brume rose : ce qu'on voit à travers le verre.
   Halos en dégradés radiaux (pas de filter: blur → peu coûteux),
   dérive lente en transforms uniquement, teinte par humeur en fondu d'opacité.
------------------------------------------------------------------- */

const BrumeCtx = createContext<(s: Style | null) => void>(() => {});
export const useTeinteBrume = () => useContext(BrumeCtx);

export function BrumeProvider({ children }: { children: ReactNode }) {
  const [teinte, setTeinte] = useState<Style | null>(null);
  return (
    <BrumeCtx.Provider value={setTeinte}>
      <Brume teinte={teinte} />
      {children}
    </BrumeCtx.Provider>
  );
}

const HALOS = [
  { cls: 'left-[-25vw] top-[-15vh] h-[85vh] w-[85vw]', color: 'rgba(168,18,79,0.16)' },
  { cls: 'right-[-30vw] top-[25vh] h-[90vh] w-[90vw]', color: 'rgba(74,6,32,0.32)' },
  { cls: 'left-[10vw] bottom-[-35vh] h-[80vh] w-[80vw]', color: 'rgba(229,139,174,0.04)' },
];

function Brume({ teinte }: { teinte: Style | null }) {
  const root = useRef<HTMLDivElement>(null);

  // Dérive lente (20–30 s), figée si « réduire les animations »
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        gsap.utils.toArray<HTMLElement>('.halo').forEach((el, i) => {
          gsap.to(el, {
            xPercent: gsap.utils.random(-14, 14),
            yPercent: gsap.utils.random(-12, 12),
            scale: gsap.utils.random(0.9, 1.15),
            duration: 22 + i * 4,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
          });
        });
      });
    },
    { scope: root },
  );

  // Teinte d'humeur : fondu d'opacité (on n'anime jamais le flou ni la couleur)
  useGSAP(
    () => {
      gsap.to('.teinte', {
        opacity: (_i, el: HTMLElement) => (el.dataset.style === teinte ? 1 : 0),
        duration: 0.9,
        ease: 'power2.out',
        overwrite: true,
      });
    },
    { scope: root, dependencies: [teinte] },
  );

  return (
    <div ref={root} aria-hidden="true" className="pointer-events-none fixed inset-0 z-brume overflow-hidden bg-noir">
      {HALOS.map((h, i) => (
        <div
          key={i}
          className={`halo absolute rounded-full will-change-transform ${h.cls}`}
          style={{ background: `radial-gradient(closest-side, ${h.color}, transparent)` }}
        />
      ))}
      {STYLES.map((s) => (
        <div
          key={s.id}
          data-style={s.id}
          className="teinte absolute left-1/2 top-1/2 h-[110vmax] w-[110vmax] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0"
          style={{ background: `radial-gradient(closest-side, ${s.teinte}1f, transparent 70%)` }}
        />
      ))}
      {/* Grain très léger pour éviter le banding des dégradés sur écrans 8 bits */}
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      {/* Voile bas : assure la lisibilité du texte en bas de page */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-noir/70 to-transparent" />
    </div>
  );
}
