import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { gsap, useGSAP, SplitText, MQ } from '../lib/gsap';
import { ImageTheme } from './ImageTheme';

/** GIF transparent 1×1 : servi sur mobile à la place de la photo d'un en-tête compact (rien n'est téléchargé). */
const VIDE = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

/**
 * En-tête de page intérieure : fil d'Ariane, grand titre serif, introduction,
 * photo d'ambiance en fond (assombrie) qui glisse lentement au défilement.
 *
 * `compact` (catalogue) : sur mobile, en-tête resserré (titre 38 px, sans surtitre ni photo) pour que
 * les premiers parfums apparaissent dans le premier écran. Desktop inchangé.
 */
export function EntetePage({
  fil,
  surtitre,
  titre,
  intro,
  photo,
  compact = false,
  children,
}: {
  fil: string;
  surtitre: string;
  titre: ReactNode;
  intro?: ReactNode;
  photo?: { src: string; srcSet?: string; position?: string };
  compact?: boolean;
  children?: ReactNode;
}) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    (_ctx, _safe, { tardif }) => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        // Entrée seulement lors d'une navigation : au premier chargement, l'en-tête est déjà affiché par le HTML.
        // Photo et titre (candidats LCP) : transform uniquement, jamais d'opacité.
        if (!tardif) {
          const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
          tl.from('.entete-fond', { scale: 1.08, duration: 1.6 }, 0).from(
            '.entete-meta > *',
            { opacity: 0, y: 16, duration: 0.8, stagger: 0.06 },
            0.15,
          );
          SplitText.create('.entete-titre', {
            type: 'lines',
          aria: 'none', // découpe en lignes seulement : le texte reste lu tel quel (pas d'aria-label sur un <p>)
            mask: 'lines',
            autoSplit: true,
            onSplit: (self) => gsap.from(self.lines, { yPercent: 110, duration: 1, stagger: 0.1, ease: 'expo.out', delay: 0.2 }),
          });
        }
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
    <header
      ref={root}
      className={`relative isolate overflow-hidden md:pb-12 md:pt-36 ${compact ? 'pb-4 pt-[84px]' : 'pb-8 pt-28'}`}
    >
      {photo && (
        // Masque en bas : la photo se fond dans la brume au lieu de s'arrêter net sur le fond
        <div
          className={`absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,#000_45%,transparent)] ${compact ? 'hidden md:block' : ''}`}
          aria-hidden="true"
        >
          {/* En-tête compact : sur mobile, la <source> sert une image vide → la photo n'est pas téléchargée */}
          {compact ? (
            <picture>
              <source media="(max-width: 767px)" srcSet={VIDE} />
              <ImageTheme
                src={photo.src}
                srcSet={photo.srcSet}
                sizes="100vw"
                alt=""
                width={1600}
                height={900}
                priorite
                className="entete-fond h-[115%] w-full object-cover opacity-60"
                style={{ objectPosition: photo.position ?? 'center' }}
              />
            </picture>
          ) : (
          <ImageTheme
            src={photo.src}
            srcSet={photo.srcSet}
            sizes="100vw"
            alt=""
            width={1600}
            height={900}
            priorite
            className="entete-fond h-[115%] w-full object-cover opacity-60"
            style={{ objectPosition: photo.position ?? 'center' }}
          />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.94)_0%,rgba(255,255,255,0.7)_60%,rgba(255,255,255,0.4)_100%)] dark:bg-[linear-gradient(90deg,rgba(11,10,12,0.92)_0%,rgba(11,10,12,0.6)_60%,rgba(11,10,12,0.35)_100%)]" />
        </div>
      )}
      <div className="shell">
        <div className="entete-meta">
          <nav aria-label="Fil d’Ariane" className={compact ? 'mb-1 md:mb-8' : 'mb-8'}>
            <ol className="flex items-center gap-1.5 text-sm text-sourdine">
              <li>
                <Link to="/" className="inline-flex min-h-[44px] items-center hover:text-encre">
                  Accueil
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight size={14} strokeWidth={1.5} />
              </li>
              <li aria-current="page" className="text-encre/90">
                {fil}
              </li>
            </ol>
          </nav>
          <p className={`label mb-5 items-center gap-3 text-rose-doux ${compact ? 'hidden md:flex' : 'flex'}`}>
            <span className="h-px w-10 bg-rose-doux/60" aria-hidden="true" />
            {surtitre}
          </p>
        </div>
        <h1
          className={`entete-titre max-w-4xl leading-[0.98] sm:text-6xl md:text-[5.5rem] ${compact ? 'text-[2.375rem]' : 'text-[3rem]'}`}
        >
          {titre}
        </h1>
        {intro && (
          <div className={`entete-meta max-w-2xl text-encre/80 md:mt-7 md:text-lg ${compact ? 'mt-2 text-base' : 'mt-7 text-lg'}`}>{intro}</div>
        )}
        {children && <div className="entete-meta mt-8">{children}</div>}
      </div>
    </header>
  );
}
