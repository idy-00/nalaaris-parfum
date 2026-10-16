import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { gsap, useGSAP, SplitText, MQ } from '../lib/gsap';

/**
 * En-tête de page intérieure : fil d'Ariane, grand titre serif, introduction,
 * photo d'ambiance en fond (assombrie) qui glisse lentement au défilement.
 */
export function EntetePage({
  fil,
  surtitre,
  titre,
  intro,
  photo,
  children,
}: {
  fil: string;
  surtitre: string;
  titre: ReactNode;
  intro?: ReactNode;
  photo?: { src: string; srcSet?: string; position?: string };
  children?: ReactNode;
}) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
        tl.from('.entete-fond', { opacity: 0, scale: 1.08, duration: 1.6 }, 0).from(
          '.entete-meta > *',
          { opacity: 0, y: 16, duration: 0.8, stagger: 0.06 },
          0.15,
        );
        SplitText.create('.entete-titre', {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self) => gsap.from(self.lines, { yPercent: 110, duration: 1, stagger: 0.1, ease: 'expo.out', delay: 0.2 }),
        });
        gsap.to('.entete-fond', {
          yPercent: 12,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 0.6 },
        });
      });
    },
    { scope: root },
  );

  return (
    <header ref={root} className="relative isolate overflow-hidden pb-14 pt-32 md:pb-20 md:pt-44">
      {photo && (
        // Masque en bas : la photo se fond dans la brume au lieu de s'arrêter net sur du noir
        <div className="absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,#000_45%,transparent)]" aria-hidden="true">
          <img
            src={photo.src}
            srcSet={photo.srcSet}
            sizes="100vw"
            alt=""
            width={1600}
            height={900}
            // @ts-expect-error — fetchpriority est valide en HTML, pas encore typé dans React 18
            fetchpriority="high"
            className="entete-fond h-[115%] w-full object-cover opacity-60"
            style={{ objectPosition: photo.position ?? 'center' }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,10,12,0.92)_0%,rgba(11,10,12,0.6)_60%,rgba(11,10,12,0.35)_100%)]" />
        </div>
      )}
      <div className="shell">
        <div className="entete-meta">
          <nav aria-label="Fil d’Ariane" className="mb-8">
            <ol className="flex items-center gap-1.5 text-sm text-gris">
              <li>
                <Link to="/" className="inline-flex min-h-[44px] items-center hover:text-ivoire">
                  Accueil
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight size={14} strokeWidth={1.5} />
              </li>
              <li aria-current="page" className="text-ivoire/90">
                {fil}
              </li>
            </ol>
          </nav>
          <p className="label mb-5 flex items-center gap-3 text-rose-doux">
            <span className="h-px w-10 bg-rose-doux/60" aria-hidden="true" />
            {surtitre}
          </p>
        </div>
        <h1 className="entete-titre max-w-4xl text-[3rem] leading-[0.98] sm:text-6xl md:text-[5.5rem]">{titre}</h1>
        {intro && <div className="entete-meta mt-7 max-w-2xl text-lg text-ivoire/80">{intro}</div>}
        {children && <div className="entete-meta mt-8">{children}</div>}
      </div>
    </header>
  );
}
