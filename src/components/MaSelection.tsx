import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useSelection } from '../hooks/useSelection';
import { Panneau } from './Panneau';
import { VisuelParfum } from './FlaconPlaceholder';
import { IconeWhatsApp } from './IconesReseaux';
import { buildWhatsAppLink, messageSelection } from '../lib/whatsapp';
import { gsap, useGSAP, MQ } from '../lib/gsap';
import { DISPO_LABEL } from '../data/parfums';
import { ROUTES } from '../lib/routes';

/** Pastille de verre flottante + tiroir « Ma sélection ». */
export function MaSelection({ remonter = false, masquerEnHaut = false }: { remonter?: boolean; masquerEnHaut?: boolean }) {
  const { lignes, count, ouvert, ouvrir, fermer, retirer, changerMl, vider } = useSelection();
  const pastille = useRef<HTMLButtonElement>(null);
  const zone = useRef<HTMLDivElement>(null);
  const precedent = useRef(count);
  const [enHaut, setEnHaut] = useState(masquerEnHaut);

  // Sur l'accueil, la pastille s'efface tant que le hero occupe l'écran (elle couvrirait le bandeau d'assurances)
  useEffect(() => {
    if (!masquerEnHaut) {
      setEnHaut(false);
      return;
    }
    const maj = () => setEnHaut(window.scrollY < window.innerHeight * 0.6);
    maj();
    window.addEventListener('scroll', maj, { passive: true });
    return () => window.removeEventListener('scroll', maj);
  }, [masquerEnHaut]);

  useGSAP(
    () => {
      const reduce = window.matchMedia(MQ.reduce).matches;
      gsap.to(zone.current, { autoAlpha: enHaut ? 0 : 1, y: enHaut && !reduce ? 24 : 0, duration: enHaut ? 0.25 : 0.45, ease: 'power3.out' });
    },
    { dependencies: [enHaut] },
  );

  // À l'ajout : la pastille pulse une fois et le compteur défile verticalement
  useGSAP(
    () => {
      const avant = precedent.current;
      precedent.current = count;
      if (count === avant || !pastille.current) return;
      const reduce = window.matchMedia(MQ.reduce).matches;
      if (count > 0 && avant === 0) {
        gsap.fromTo(pastille.current, { opacity: 0, y: reduce ? 0 : 16 }, { opacity: 1, y: 0, duration: 0.5 });
      }
      if (reduce) return;
      if (count > avant) {
        gsap.fromTo(pastille.current, { scale: 1 }, { scale: 1.08, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' });
        gsap.fromTo('.halo-pastille', { opacity: 0.7, scale: 1 }, { opacity: 0, scale: 1.6, duration: 0.7, ease: 'power2.out' });
      }
      gsap.fromTo('.compteur', { yPercent: count > avant ? 100 : -100 }, { yPercent: 0, duration: 0.35, ease: 'power3.out' });
    },
    { scope: pastille, dependencies: [count] },
  );

  const lien = buildWhatsAppLink(messageSelection(lignes.map((l) => ({ parfum: l.parfum, ml: l.ml }))));

  return (
    <>
      <div
        ref={zone}
        className={`fixed right-4 z-pastille md:right-6 ${
          remonter
            ? 'bottom-[calc(96px+env(safe-area-inset-bottom))] lg:bottom-6'
            : 'bottom-[calc(16px+env(safe-area-inset-bottom))] md:bottom-6'
        }`}
      >
      <button
        ref={pastille}
        type="button"
        onClick={ouvrir}
        aria-haspopup="dialog"
        aria-label={`Ma sélection : ${count} parfum${count > 1 ? 's' : ''}`}
        className={`verre-rose flex h-14 items-center gap-3 rounded-full pl-5 pr-2 text-sm font-semibold text-ivoire ${
          count === 0 ? 'pointer-events-none invisible opacity-0' : ''
        }`}
      >
        <span className="halo-pastille pointer-events-none absolute inset-0 rounded-full border border-rose-doux opacity-0" aria-hidden="true" />
        <span className="label text-[0.75rem]">Ma sélection</span>
        <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-rose text-ivoire" aria-hidden="true">
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
              <p className="text-center text-sm text-gris">On te confirme la disponibilité, le prix et la livraison.</p>
            </div>
          ) : undefined
        }
      >
        {count === 0 ? (
          <div className="py-10 text-center">
            <p className="font-serif text-2xl">Ta sélection est vide.</p>
            <p className="mt-3 text-gris">Ajoute des parfums depuis le catalogue pour les envoyer ensemble sur WhatsApp.</p>
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
                  <li key={`${parfum.slug}-${ml}`} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="h-24 w-20 shrink-0">
                      <VisuelParfum parfum={parfum} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/parfum/${parfum.slug}`}
                        onClick={fermer}
                        className="block font-serif text-xl leading-tight hover:text-rose-doux"
                      >
                        {parfum.nom}
                      </Link>
                      <p className="text-sm text-gris">{parfum.marque}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <label className="sr-only" htmlFor={`ml-${parfum.slug}-${ml}`}>
                          Contenance pour {parfum.nom}
                        </label>
                        <select
                          id={`ml-${parfum.slug}-${ml}`}
                          value={ml}
                          onChange={(e) => changerMl(parfum.slug, ml, Number(e.target.value))}
                          className="min-h-[44px] rounded-full border border-white/15 bg-noir-2 px-3 text-base text-ivoire"
                        >
                          {parfum.contenances.map((x) => (
                            <option key={x.ml} value={x.ml}>
                              {x.ml} ml{x.dispo !== 'disponible' ? ` — ${DISPO_LABEL[x.dispo].toLowerCase()}` : ''}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => retirer(parfum.slug, ml)}
                          className="ml-auto grid h-11 w-11 place-items-center rounded-full text-gris hover:text-rose-doux"
                          aria-label={`Retirer ${parfum.nom} ${ml} ml`}
                        >
                          <Trash2 size={18} strokeWidth={1.5} />
                        </button>
                      </div>
                      {c?.dispo === 'epuise' && (
                        <p className="mt-1 text-sm text-dispo-limite">Cette contenance est épuisée : on te proposera une alternative.</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <button type="button" onClick={vider} className="mt-5 min-h-[44px] text-sm text-gris underline-offset-4 hover:text-ivoire hover:underline">
              Vider la sélection
            </button>
          </>
        )}
      </Panneau>
    </>
  );
}
