import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Undo2 } from 'lucide-react';
import { useSelection, type LigneSelection } from '../hooks/useSelection';
import { Panneau } from './Panneau';
import { VisuelParfum } from './FlaconPlaceholder';
import { IconeWhatsApp } from './IconesReseaux';
import { buildWhatsAppLink, messageSelection } from '../lib/whatsapp';
import { gsap, useGSAP, MQ } from '../lib/gsap';
import { DISPO_LABEL } from '../data/parfums';
import { ROUTES } from '../lib/routes';

/**
 * Pastille flottante + tiroir « Ma sélection ».
 * La pastille ne recouvre jamais de contenu utile : elle est cachée
 *  - quand la sélection est vide,
 *  - sur une fiche parfum (l'accès est intégré à la barre d'action),
 *  - en haut de l'accueil (bandeau d'assurances), pendant la FAQ et au niveau du pied de page.
 */
export function MaSelection({ page }: { page: string }) {
  const { lignes, count, ouvert, ouvrir, fermer, retirer, changerMl, vider, restaurer } = useSelection();
  const pastille = useRef<HTMLButtonElement>(null);
  const zone = useRef<HTMLDivElement>(null);
  const precedent = useRef(count);
  const [gene, setGene] = useState(true); // vrai = un élément à ne pas recouvrir est à l'écran
  const [annulable, setAnnulable] = useState<LigneSelection[] | null>(null);

  const surFiche = page.startsWith('/parfum/');

  // Zones à ne pas recouvrir
  useEffect(() => {
    const visibles = new Set<Element>();
    const enHautAccueil = () => page === ROUTES.accueil && window.scrollY < window.innerHeight * 0.6;
    const maj = () => setGene(enHautAccueil() || visibles.size > 0);
    const io = new IntersectionObserver(
      (entrees) => {
        entrees.forEach((e) => (e.isIntersecting ? visibles.add(e.target) : visibles.delete(e.target)));
        maj();
      },
      { rootMargin: '0px 0px -80px 0px' },
    );
    // Laisse la page (chargée à la demande) se rendre avant d'observer
    const t = window.setTimeout(() => document.querySelectorAll('#questions, footer').forEach((el) => io.observe(el)), 300);
    window.addEventListener('scroll', maj, { passive: true });
    maj();
    return () => {
      window.clearTimeout(t);
      io.disconnect();
      window.removeEventListener('scroll', maj);
    };
  }, [page]);

  const cachee = surFiche || count === 0 || gene;

  useGSAP(
    () => {
      const reduce = window.matchMedia(MQ.reduce).matches;
      gsap.to(zone.current, {
        autoAlpha: cachee ? 0 : 1,
        y: cachee && !reduce ? 24 : 0,
        duration: cachee ? 0.22 : 0.45,
        ease: 'power3.out',
      });
    },
    { dependencies: [cachee] },
  );

  // À l'ajout : la pastille pulse une fois et le compteur défile verticalement
  useGSAP(
    () => {
      const avant = precedent.current;
      precedent.current = count;
      if (count === avant || !pastille.current || window.matchMedia(MQ.reduce).matches) return;
      if (count > avant) {
        gsap.fromTo(pastille.current, { scale: 1 }, { scale: 1.08, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' });
        gsap.fromTo('.halo-pastille', { opacity: 0.7, scale: 1 }, { opacity: 0, scale: 1.6, duration: 0.7, ease: 'power2.out' });
      }
      gsap.fromTo('.compteur', { yPercent: count > avant ? 100 : -100 }, { yPercent: 0, duration: 0.35, ease: 'power3.out' });
    },
    { scope: pastille, dependencies: [count] },
  );

  // « Vider » est annulable pendant 5 s
  useEffect(() => {
    if (!annulable) return;
    const t = window.setTimeout(() => setAnnulable(null), 5000);
    return () => window.clearTimeout(t);
  }, [annulable]);

  const toutVider = () => {
    setAnnulable(lignes.map(({ slug, ml }) => ({ slug, ml })));
    vider();
  };
  const annuler = () => {
    if (annulable) restaurer(annulable);
    setAnnulable(null);
  };

  const lien = buildWhatsAppLink(messageSelection(lignes.map((l) => ({ parfum: l.parfum, ml: l.ml }))));

  return (
    <>
      <div ref={zone} className="invisible fixed bottom-[calc(16px+env(safe-area-inset-bottom))] right-4 z-pastille opacity-0 md:bottom-6 md:right-6">
        <button
          ref={pastille}
          type="button"
          onClick={ouvrir}
          aria-haspopup="dialog"
          aria-label={`Ma sélection : ${count} parfum${count > 1 ? 's' : ''}`}
          className="verre-rose flex h-14 items-center gap-3 rounded-full pl-5 pr-2 text-sm font-semibold text-encre"
        >
          <span className="halo-pastille pointer-events-none absolute inset-0 rounded-full border border-rose-logo opacity-0" aria-hidden="true" />
          <span className="label text-[0.75rem]">Ma sélection</span>
          <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-rose text-white" aria-hidden="true">
            <span className="compteur block tabular-nums">{count}</span>
          </span>
        </button>
      </div>

      <Panneau
        id="selection"
        titre="Ma sélection"
        ouvert={ouvert}
        onClose={fermer}
        pied={
          count > 0 ? (
            <div className="space-y-3">
              <a href={lien} target="_blank" rel="noopener noreferrer" className="btn btn-rose w-full" data-autofocus>
                <IconeWhatsApp /> Envoyer ma sélection sur WhatsApp
              </a>
              <p className="text-center text-sm text-sourdine">On te confirme la disponibilité, le prix et la livraison.</p>
            </div>
          ) : undefined
        }
      >
        {/* Toast d'annulation, annoncé aux lecteurs d'écran sans voler le focus */}
        <div role="status" aria-live="polite">
          {annulable && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-encre/15 bg-fond-3 px-4 py-2">
              <span className="text-sm text-encre/90">Sélection vidée</span>
              <button
                type="button"
                onClick={annuler}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-3 text-sm font-semibold text-rose-doux hover:text-rose-brume"
              >
                <Undo2 size={16} strokeWidth={1.5} aria-hidden="true" /> Annuler
              </button>
            </div>
          )}
        </div>

        {count === 0 ? (
          <div className="py-8 text-center">
            <p className="font-serif text-2xl">Ta sélection est vide.</p>
            <p className="mt-3 text-sourdine">Ajoute des parfums depuis le catalogue pour les envoyer ensemble sur WhatsApp.</p>
            <Link to={ROUTES.catalogue} onClick={fermer} className="btn btn-verre mt-7">
              Voir le catalogue
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {lignes.map(({ parfum, ml }) => {
                const c = parfum.contenances.find((x) => x.ml === ml);
                return (
                  <li key={`${parfum.slug}-${ml}`} className="flex gap-4 rounded-2xl border border-encre/10 bg-encre/[0.03] p-3">
                    <div className="h-24 w-20 shrink-0">
                      <VisuelParfum parfum={parfum} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            to={ROUTES.parfum(parfum.slug)}
                            onClick={fermer}
                            className="block font-serif text-xl leading-tight hover:text-rose-doux"
                          >
                            {parfum.nom}
                          </Link>
                          <p className="text-sm text-sourdine">{parfum.marque}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => retirer(parfum.slug, ml)}
                          className="-mr-1 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-sourdine hover:text-rose-doux"
                          aria-label={`Retirer ${parfum.nom} ${ml} ml`}
                        >
                          <Trash2 size={18} strokeWidth={1.5} />
                        </button>
                      </div>
                      {/* Contenance : puces, comme sur la fiche */}
                      <div role="radiogroup" aria-label={`Contenance pour ${parfum.nom}`} className="mt-2 flex flex-wrap gap-1.5">
                        {parfum.contenances.map((x) => (
                          <button
                            key={x.ml}
                            type="button"
                            role="radio"
                            aria-checked={x.ml === ml}
                            onClick={() => x.ml !== ml && changerMl(parfum.slug, ml, x.ml)}
                            className={`puce min-w-[64px] justify-center px-3 ${x.dispo === 'epuise' ? 'text-sourdine line-through decoration-encre/30' : ''}`}
                          >
                            {x.ml} ml
                            {x.dispo !== 'disponible' && <span className="sr-only"> ({DISPO_LABEL[x.dispo].toLowerCase()})</span>}
                          </button>
                        ))}
                      </div>
                      {c?.dispo === 'epuise' && (
                        <p className="mt-2 text-sm text-dispo-limite">Cette contenance est épuisée : on te proposera une alternative.</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={toutVider}
              className="mt-5 min-h-[44px] text-sm text-sourdine underline-offset-4 hover:text-encre hover:underline"
            >
              Vider la sélection
            </button>
          </>
        )}
      </Panneau>
    </>
  );
}
