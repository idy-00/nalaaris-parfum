import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { Check, Plus } from 'lucide-react';
import {
  categorieLabel,
  contenanceParDefaut,
  dispoGlobale,
  styleLabel,
  type Parfum,
} from '../data/parfums';
import { SceneParfum, VisuelParfum } from './FlaconPlaceholder';
import { BadgeDispo } from './Dispo';
import { useSelection } from '../hooks/useSelection';
import { gsap, useGSAP, MQ } from '../lib/gsap';
import { useReflet } from '../hooks/useReflet';

export function CarteParfum({ parfum }: { parfum: Parfum }) {
  const root = useRef<HTMLElement>(null);
  const { ajouter, contient, ouvrir } = useSelection();
  const c = contenanceParDefaut(parfum);
  const dejaLa = contient(parfum.slug, c.ml);
  const dispo = dispoGlobale(parfum);
  useReflet(root, 10);

  // Survol desktop : légère montée, flacon +3 %. Mobile : retour tactile via :active (CSS).
  const { contextSafe } = useGSAP({ scope: root });
  const entrer = contextSafe(() => {
    if (!window.matchMedia(`${MQ.desktop} and ${MQ.motion}`).matches) return;
    gsap.to(root.current, { y: -4, duration: 0.3, overwrite: 'auto' });
    gsap.to('.flacon', { scale: 1.03, duration: 0.35, overwrite: 'auto' });
    gsap.to('.scene-photo', { scale: 1.16, duration: 0.9, ease: 'power2.out', overwrite: 'auto' });
  });
  const sortir = contextSafe(() => {
    gsap.to(root.current, { y: 0, scale: 1, duration: 0.25, overwrite: 'auto' });
    gsap.to('.flacon', { scale: 1, duration: 0.25, overwrite: 'auto' });
    gsap.to('.scene-photo', { scale: 1.1, duration: 0.5, overwrite: 'auto' });
  });
  const presser = contextSafe((e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse') return;
    gsap.to(root.current, { scale: 0.985, duration: 0.12, overwrite: 'auto' });
  });
  const relacher = contextSafe(() => gsap.to(root.current, { scale: 1, duration: 0.2, overwrite: 'auto' }));

  return (
    <article
      ref={root}
      data-flip-id={parfum.slug}
      onPointerEnter={entrer}
      onPointerLeave={sortir}
      onPointerDown={presser}
      onPointerUp={relacher}
      onPointerCancel={relacher}
      className="carte verre-carte relative flex w-full flex-col overflow-hidden rounded-card"
    >
      <span className="reflet" aria-hidden="true" />
      <Link
        to={`/parfum/${parfum.slug}`}
        className="flex flex-1 flex-col rounded-card focus-visible:outline-offset-[-2px]"
        aria-label={`${parfum.nom}, ${parfum.marque}`}
      >
        <div className="relative m-1.5 aspect-[4/5] overflow-hidden rounded-[19px]">
          <SceneParfum parfum={parfum} />
          <div className="flacon absolute inset-0 px-5 pb-3 pt-6 will-change-transform" data-flip-flacon={parfum.slug}>
            <VisuelParfum parfum={parfum} />
          </div>
          {(parfum.nouveau || parfum.coupDeCoeur) && (
            <span className="label absolute bottom-2.5 left-2.5 rounded-full border border-encre/15 bg-fond/70 px-2.5 py-1.5 text-xs text-rose-brume md:text-[0.8125rem]">
              {parfum.nouveau ? 'Nouveau' : 'Coup de cœur'}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 px-3.5 pb-4 pt-2.5 md:px-4">
          <p className="label text-xs text-sourdine">
            {categorieLabel(parfum.categorie)} · {styleLabel(parfum.styles[0])}
          </p>
          <h3 className="text-xl leading-tight text-encre md:text-[1.5rem]">{parfum.nom}</h3>
          <p className="text-sm text-sourdine">{parfum.marque}</p>
          <BadgeDispo dispo={dispo} className="mt-auto pt-2 text-[0.8125rem]" />
        </div>
      </Link>

      {dispo !== 'epuise' && (
        <button
          type="button"
          onClick={() => (dejaLa ? ouvrir() : ajouter(parfum.slug, c.ml))}
          className={`absolute right-3.5 top-3.5 grid h-11 w-11 place-items-center rounded-full border transition-colors ${
            dejaLa
              ? 'border-rose-doux/60 bg-rose text-white'
              : 'border-encre/25 bg-fond/55 text-encre hover:border-rose-doux hover:bg-rose hover:text-white'
          }`}
          aria-label={
            dejaLa
              ? `${parfum.nom} est dans ta sélection — ouvrir ma sélection`
              : `Ajouter ${parfum.nom} (${c.ml} ml) à ma sélection`
          }
        >
          {dejaLa ? <Check size={18} strokeWidth={2} /> : <Plus size={18} strokeWidth={1.5} />}
        </button>
      )}
    </article>
  );
}
