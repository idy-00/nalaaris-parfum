import { useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bell, Check, Heart, Plus } from 'lucide-react';
import {
  categorieLabel,
  contenanceParDefaut,
  formatPrix,
  getParfum,
  libelleMl,
  styleInfo,
  styleLabel,
  suggestions,
  type ChoixContenance,
  type Parfum,
} from '../data/parfums';
import { SceneParfum, VisuelParfum } from '../components/FlaconPlaceholder';
import { PhotoHumeur } from '../components/Photo';
import { BadgeDispo } from '../components/Dispo';
import { CarteParfum } from '../components/CarteParfum';
import { QuandLePorter } from '../components/QuandLePorter';
import { IconeWhatsApp } from '../components/IconesReseaux';
import { useSelection } from '../hooks/useSelection';
import { useSeo } from '../hooks/useSeo';
import { buildWhatsAppLink, messageAlerte, messageFiche } from '../lib/whatsapp';
import { gsap, useGSAP, MQ, sousLaLigne } from '../lib/gsap';
import { ROUTES, catalogueStyle } from '../lib/routes';
import { NotFound } from './NotFound';

export function Fiche() {
  const { slug = '' } = useParams();
  const parfum = getParfum(slug);
  if (!parfum) return <NotFound />;
  // key : réinitialise l'état (contenance, animations) quand on passe d'une fiche à une autre
  return <FicheParfum key={parfum.slug} parfum={parfum} />;
}

function FicheParfum({ parfum }: { parfum: Parfum }) {
  const root = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [contenance, setContenance] = useState<ChoixContenance>(() => contenanceParDefaut(parfum));
  const [image, setImage] = useState(0);
  const { ajouter, contient, ouvrir, count } = useSelection();
  const proches = useMemo(() => suggestions(parfum), [parfum]);

  useSeo({
    title: `${parfum.nom} — ${parfum.marque} · Nal’Aaris Perfumes`,
    description: `${parfum.description.split('. ')[0]}. Commande sur WhatsApp, livraison à Dakar.`,
    path: `/parfum/${parfum.slug}`,
    image: parfum.images[0]?.replace('1122.webp', '800.webp'),
  });

  // Arrivée sur la fiche : fondu + léger zoom du flacon, puis le texte
  useGSAP(
    (_ctx, _safe, { tardif }) => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        // Entrée seulement lors d'une navigation (au premier chargement, la fiche est déjà affichée par le HTML).
        // Le flacon (élément LCP) : transform uniquement, jamais d'opacité.
        if (!tardif) {
          gsap
            .timeline({ defaults: { ease: 'expo.out' } })
            .from('.fiche-visuel', { scale: 0.94, duration: 1 }, 0)
            .from('.fiche-info > :first-child > :not(h1), .fiche-info > :not(:first-child)', { opacity: 0, y: 20, duration: 0.8, stagger: 0.05 }, 0.15);
        }
        // « Quand le porter » : les trois cartes montent doucement à leur arrivée à l'écran (une fois)
        const cartes = gsap.utils.toArray<HTMLElement>('.porter-carte').filter((el) => !tardif || sousLaLigne(el));
        if (cartes.length) {
          gsap.from(cartes, {
            opacity: 0,
            y: 12,
            duration: 0.6,
            stagger: 0.08,
            ease: 'power3.out',
            scrollTrigger: { trigger: cartes[0], start: 'top 90%', once: true },
          });
        }
        gsap.utils.toArray<HTMLElement>('.fiche-proches').filter((el) => !tardif || sousLaLigne(el)).forEach((el) =>
          gsap.from(el, { opacity: 0, y: 24, duration: 0.9, scrollTrigger: { trigger: el, start: 'top 88%', once: true } }),
        );
      });
      if (!tardif) mm.add(MQ.reduce, () => gsap.from('.fiche-info > :first-child > :not(h1), .fiche-info > :not(:first-child)', { opacity: 0, duration: 0.3 }));
    },
    { scope: root },
  );

  const epuise = contenance.dispo === 'epuise';
  // Pas encore de prix : l'action principale devient « Demander le prix »
  const sansPrix = contenance.prix == null;
  const dejaLa = contient(parfum.slug, contenance.ml);
  const lienWa = buildWhatsAppLink(epuise ? messageAlerte(parfum, contenance.ml) : messageFiche(parfum, contenance.ml));
  const retour = () => (location.key !== 'default' ? navigate(-1) : navigate(ROUTES.catalogue));

  // barre = barre collée en bas sur mobile : libellé court avec la contenance + accès direct à Ma sélection
  const actions = (barre: boolean) => (
    <>
      <a
        href={lienWa}
        target="_blank"
        rel="noopener noreferrer"
        className={`btn min-w-0 flex-1 px-3 min-[360px]:px-4 lg:flex-[1.4] ${epuise ? 'btn-verre' : 'btn-rose'}`}
      >
        <span className={barre ? 'contents max-[359px]:hidden' : 'contents'}>
          {epuise ? <Bell size={18} strokeWidth={1.5} aria-hidden="true" /> : <IconeWhatsApp />}
        </span>
        <span className="truncate">
          {barre
            ? epuise
              ? ['Me prévenir', libelleMl(contenance.ml)].filter(Boolean).join(' · ')
              : sansPrix
                ? 'Demander le prix'
                : ['Commander', libelleMl(contenance.ml)].filter(Boolean).join(' · ')
            : epuise
              ? 'Me prévenir quand il revient'
              : sansPrix
                ? 'Demander le prix sur WhatsApp'
                : 'Commander sur WhatsApp'}
        </span>
      </a>
      {!epuise && (
        <button
          type="button"
          onClick={() => (dejaLa ? ouvrir() : ajouter(parfum.slug, contenance.ml))}
          className="btn btn-verre w-11 shrink-0 px-0 min-[360px]:w-12 lg:w-auto lg:flex-1 lg:px-4"
          aria-label={dejaLa ? 'Déjà dans ma sélection — ouvrir ma sélection' : `Ajouter ${parfum.nom}${contenance.ml ? ` (${contenance.ml} ml)` : ''} à ma sélection`}
        >
          {dejaLa ? <Check size={18} strokeWidth={2} aria-hidden="true" /> : <Plus size={18} strokeWidth={1.5} aria-hidden="true" />}
          <span className="hidden truncate lg:inline">{dejaLa ? 'Dans ma sélection' : 'Ajouter à ma sélection'}</span>
        </button>
      )}
      {barre && count > 0 && (
        <button
          type="button"
          onClick={ouvrir}
          className="btn btn-verre relative w-11 shrink-0 px-0 min-[360px]:w-12"
          aria-label={`Ouvrir ma sélection (${count} parfum${count > 1 ? 's' : ''})`}
        >
          <Heart size={18} strokeWidth={1.5} aria-hidden="true" />
          <span
            className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose px-1 text-xs font-semibold tabular-nums text-white"
            aria-hidden="true"
          >
            {count}
          </span>
        </button>
      )}
    </>
  );

  return (
    <div ref={root} className="pb-28 pt-24 md:pt-28 lg:pb-10">
      <div className="shell">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={retour}
            className="inline-flex min-h-[44px] items-center gap-2 text-sm text-sourdine transition-colors hover:text-encre"
          >
            <ArrowLeft size={18} strokeWidth={1.5} aria-hidden="true" /> Retour
          </button>
          <nav aria-label="Fil d’Ariane" className="hidden sm:block">
            <ol className="flex items-center gap-1.5 text-sm text-sourdine">
              <li>
                <Link to={ROUTES.accueil} className="inline-flex min-h-[44px] items-center hover:text-encre">
                  Accueil
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link to={ROUTES.catalogue} className="inline-flex min-h-[44px] items-center hover:text-encre">
                  Catalogue
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-encre/90">
                {parfum.nom}
              </li>
            </ol>
          </nav>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-16">
          {/* Visuel */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            {parfum.images.length ? (
              // Le visuel a son propre décor (mur, table) : aucun fond, cadre, ombre ni verre par-dessus
              <div className="fiche-visuel relative mx-auto aspect-[4/5] max-w-[560px] overflow-hidden rounded-[20px]">
                {/* sizes = largeur réelle : 560 px max, sinon l'écran moins les marges (40 px mobile, 96 px tablette) */}
                <VisuelParfum
                  parfum={parfum}
                  index={image}
                  priority
                  sizes="(min-width: 1024px) 560px, (min-width: 768px) min(560px, calc(100vw - 96px)), calc(100vw - 40px)"
                />
              </div>
            ) : (
              // Repli si le visuel manque : flacon dessiné sur la photo d'humeur
              <div className="fiche-visuel relative mx-auto aspect-[4/5] max-w-[560px] overflow-hidden rounded-[20px] ring-1 ring-encre/10">
                <SceneParfum parfum={parfum} sizes="(min-width: 1024px) 560px, 100vw" priorite />
                <div className="absolute inset-0 px-16 pb-8 pt-14 md:px-20 md:pb-12 md:pt-20">
                  <VisuelParfum parfum={parfum} index={image} priority />
                </div>
              </div>
            )}
            {parfum.images.length > 1 && (
              <div className="mt-3 flex gap-2" role="group" aria-label="Photos du parfum">
                {parfum.images.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setImage(i)}
                    aria-label={`Photo ${i + 1}`}
                    aria-pressed={image === i}
                    className="h-16 w-14 overflow-hidden rounded-xl border border-encre/15 aria-pressed:border-rose-doux"
                  >
                    <img src={src} alt="" width={56} height={64} loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Informations */}
          <div className="fiche-info flex flex-col gap-5 sm:gap-6">
            <div>
              {(parfum.nouveau || parfum.coupDeCoeur) && (
                <p className="label mb-3 inline-flex rounded-full border border-rose-doux/30 px-3 py-1.5 text-xs text-rose-brume">
                  {parfum.nouveau ? 'Nouveau' : 'Coup de cœur'}
                </p>
              )}
              <p className="label text-rose-doux">
                {categorieLabel(parfum.categorie)} · {parfum.marque}
              </p>
              <h1 className="mt-2 text-[2.25rem] leading-[1.02] sm:mt-3 sm:text-[2.75rem] md:text-5xl">{parfum.nom}</h1>
              {parfum.concentration ? (
                <p className="mt-2 text-lg text-sourdine">{parfum.concentration}</p>
              ) : (
                // Concentration non confirmée : on le dit, on ne devine pas
                <p className="mt-2 text-sm text-sourdine">Concentration à confirmer</p>
              )}
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Style d’odeur">
                {parfum.styles.map((s) => (
                  <li key={s}>
                    <Link
                      to={catalogueStyle(s)}
                      className="inline-flex min-h-[44px] items-center rounded-full border border-rose-doux/30 px-4 text-sm text-rose-brume hover:border-rose-doux"
                    >
                      {styleLabel(s)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {parfum.contenances.length ? (
            <fieldset>
              <legend className="label mb-3 text-sourdine">Contenance</legend>
              <div role="radiogroup" aria-label="Contenance" className="flex flex-wrap gap-2">
                {parfum.contenances.map((c) => (
                  <button
                    key={c.ml}
                    type="button"
                    role="radio"
                    aria-checked={contenance.ml === c.ml}
                    onClick={() => setContenance(c)}
                    className={`puce min-w-[88px] justify-center ${c.dispo === 'epuise' ? 'text-sourdine line-through decoration-encre/30' : ''}`}
                  >
                    {c.ml} ml
                    {c.dispo === 'epuise' && <span className="sr-only"> (épuisé)</span>}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="font-serif text-2xl tabular-nums">{formatPrix(contenance.prix)}</p>
                <BadgeDispo dispo={contenance.dispo} long className="text-base" />
              </div>
            </fieldset>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <a
                  href={lienWa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center font-serif text-2xl underline decoration-rose-doux/40 underline-offset-[6px] transition-colors hover:text-rose-doux"
                >
                  Demander le prix
                </a>
                <BadgeDispo dispo={parfum.dispo} long className="text-base" />
              </div>
            )}

            {/* Actions : intégrées en desktop, barre collée en bas sur mobile */}
            <div className="hidden flex-col gap-3 lg:flex xl:flex-row">{actions(false)}</div>

            <p className="max-w-prose text-lg text-encre/90">{parfum.description}</p>

            {/* Les notes, présentées comme une carte de parfumeur : début → cœur → ce qui reste */}
            <div className="verre-carte verre-voile rounded-card p-5 md:p-7">
              <h2 className="label mb-2 text-sourdine">Ce que tu sens</h2>
              <dl>
                {(
                  'bouquet' in parfum.notes
                    ? [['Notes principales', 'la pyramide détaillée n’est pas publiée', parfum.notes.bouquet] as const]
                    : ([
                        ['Au début', 'les premières minutes', parfum.notes.tete],
                        ['Au cœur', 'les heures qui suivent', parfum.notes.coeur],
                        ['Ce qui reste', 'le sillage, jusqu’au soir', parfum.notes.fond],
                      ] as const)
                ).filter(([, , notes]) => notes.length).map(([titre, quand, notes], i) => (
                  <div key={titre} className={`grid gap-2 py-4 sm:grid-cols-[150px_1fr] sm:gap-6 ${i ? 'border-t border-encre/10' : ''}`}>
                    <dt>
                      <span className="block font-serif text-xl italic text-rose-brume">{titre}</span>
                      <span className="text-xs text-sourdine">{quand}</span>
                    </dt>
                    <dd className="flex flex-wrap items-center gap-1.5">
                      {notes.map((n) => (
                        <span key={n} className="rounded-full border border-encre/10 bg-encre/[0.04] px-3 py-1 text-sm text-encre/90">
                          {n}
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {parfum.ingredients.length > 0 && (
              <div>
                <h2 className="label mb-3 text-sourdine">Ses notes en images</h2>
                <ul className="flex flex-wrap gap-x-2 gap-y-1 text-lg text-encre/90">
                  {parfum.ingredients.map((n, i) => (
                    <li key={n}>
                      {n}
                      {i < parfum.ingredients.length - 1 && <span className="ml-2 text-rose-doux" aria-hidden="true">·</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {parfum.porter && <QuandLePorter porter={parfum.porter} />}

            <p className="text-sm text-sourdine">
              Un écran ne transmet pas une odeur. Pour un conseil, écris-nous sur WhatsApp : on te répond avec plaisir.
            </p>
          </div>
        </div>

        {/* Son univers : les humeurs du parfum en images, chacune ouvre le catalogue filtré */}
        {parfum.styles.length > 0 && (
        <section aria-labelledby="univers-titre" className="fiche-proches mt-20 md:mt-28">
          <p className="repere mb-4" data-n="—">
            Son univers
          </p>
          <h2 id="univers-titre" className="mb-8 text-[2.2rem] leading-[1.05] md:text-[2.75rem]">
            {parfum.styles.map(styleLabel).join(' & ')}, <em className="text-rose-doux">en images</em>
          </h2>
          <ul className={`grid gap-3 sm:gap-5 ${parfum.styles.length > 1 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {parfum.styles.map((s) => {
              const info = styleInfo(s);
              return (
                <li key={s}>
                  <Link
                    to={catalogueStyle(s)}
                    className="group relative block aspect-[4/5] overflow-hidden rounded-card ring-1 ring-encre/10 sm:aspect-[16/10]"
                  >
                    <PhotoHumeur
                      photo={info.photo}
                      sizes="(min-width: 768px) 600px, 50vw"
                      className="absolute inset-0 transition-transform duration-[900ms] ease-sillage group-hover:scale-[1.05]"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-fond via-fond/30 to-transparent" aria-hidden="true" />
                    <span className="absolute inset-x-0 bottom-0 p-4 md:p-6">
                      <span className="block font-serif text-2xl md:text-4xl">{info.label}</span>
                      <span className="mt-1 block text-sm text-encre/80 md:text-base">
                        {info.humeur} <span className="text-rose-doux">— voir tous</span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
        )}

        {proches.length > 0 && (
          <section aria-labelledby="proches-titre" className="fiche-proches mt-20 md:mt-28">
            <h2 id="proches-titre" className="mb-8 text-[2.2rem] leading-[1.05] md:text-[2.75rem]">
              Tu aimeras <em className="text-rose-doux">aussi</em>
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-5">
              {proches.map((p) => (
                <li key={p.slug} className="flex">
                  <CarteParfum parfum={p} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Barre d'action mobile (hors de tout conteneur animé pour garder position: fixed) */}
      <div className="verre-fume safe-bottom fixed inset-x-0 bottom-0 z-barre flex gap-2 rounded-t-[24px] px-3 pt-3 lg:hidden">
        {actions(true)}
      </div>
    </div>
  );
}
