/**
 * Accueil « Aujourd'hui » — chaque bloc mène à une action. Un seul graphique (ventes par jour, 30 jours).
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, ChevronRight, PackageX, Search, Tag, Truck } from 'lucide-react';
import { api } from '../api';
import { dateLongue, fcfa, jourCourt, LIB_PAIEMENT, lienWa, nombre, pourcent, telAffiche, variation } from '../format';
import { Chiffre, ErreurBloc, Page, Pastille, Section, Squelette, Vide, useAction, useApparition, useDonnees } from '../ui';

interface Tableau {
  semaine: Record<'ventes' | 'ca' | 'demandes' | 'vues', { n: number; prec: number }>;
  catalogue: { total: number; avec_prix: number };
  stockBas: { slug: string; ml: number; stock: number; libelle: string }[];
  ruptures: number;
  livraisons: { n: number; aujourdhui: number | null };
  aPrevenir: { id: number; slug: string; ml: number | null; prenom: string | null; telephone: string; libelle: string }[];
  plusDemandes: { slug: string; clics: number; libelle: string; stock: number | null; suivi: number }[];
  recherchesSansResultat: { texte: string; n: number }[];
  mois: {
    nb: number;
    ca: number;
    panierMoyen: number;
    paiements: { paiement: string; nb: number; ca: number }[];
    marge: { montant: number; taux: number; couverture: number } | null;
  };
  parJour: { jour: string; nb: number; ca: number }[];
}

export function Accueil() {
  const { data: t, erreur, recharger } = useDonnees<Tableau>('accueil');
  const { data: moi } = useDonnees<{ prenom: string }>('moi');
  const zone = useApparition(t);

  return (
    <>
      <header className="mx-auto max-w-3xl px-4 pb-1 pt-[calc(env(safe-area-inset-top)+20px)]">
        <p className="text-sm capitalize text-sourdine">{dateLongue()}</p>
        <h1 tabIndex={-1} className="text-[2.25rem] leading-tight outline-none">
          Bonjour{moi ? ` ${moi.prenom}` : ''}
        </h1>
      </header>
      <Page className="pt-2">
        {erreur && <ErreurBloc message={erreur} reessayer={recharger} />}
        {!t && !erreur && <Squelette lignes={6} />}
        {t && (
          <div ref={zone}>
            <ChiffresSemaine t={t} />
            <AFaire t={t} onMaj={recharger} />
            <PlusDemandes t={t} />
            <Recherches t={t} />
            <Mois t={t} />
          </div>
        )}
      </Page>
    </>
  );
}

function ChiffresSemaine({ t }: { t: Tableau }) {
  const cartes = [
    { l: 'Ventes notées', v: t.semaine.ventes, f: nombre, to: '/admin/ventes?periode=semaine' },
    { l: 'Chiffre d’affaires', v: t.semaine.ca, f: (n: number) => nombre(n), unite: 'FCFA', to: '/admin/ventes?periode=semaine' },
    { l: 'Demandes WhatsApp', v: t.semaine.demandes, f: nombre, aide: 'clics « Commander » sur le site' },
    { l: 'Visites des fiches', v: t.semaine.vues, f: nombre },
  ];
  return (
    <Section titre="Cette semaine" action={<span className="text-xs text-sourdine">vs semaine dernière, même moment</span>}>
      <div className="grid grid-cols-2 gap-3">
        {cartes.map((c) => {
          const d = variation(c.v.n, c.v.prec);
          const contenu = (
            <>
              <p className="text-sm font-medium text-sourdine">{c.l}</p>
              <p className="mt-2 flex items-baseline gap-1.5">
                <Chiffre valeur={c.v.n} format={c.f} className="chiffre text-[2rem]" />
                {c.unite && <span className="text-sm text-sourdine">{c.unite}</span>}
              </p>
              <p className={`mt-1.5 inline-flex items-center gap-1 text-xs font-semibold ${d.sens === 'haut' ? 'text-dispo-ok' : d.sens === 'bas' ? 'text-dispo-limite' : 'text-sourdine'}`}>
                {d.sens === 'haut' ? <ArrowUpRight size={14} aria-hidden="true" /> : d.sens === 'bas' ? <ArrowDownRight size={14} aria-hidden="true" /> : null}
                {d.texte} <span className="font-normal text-sourdine">({c.f(c.v.prec)})</span>
              </p>
              {c.aide && <p className="mt-1 text-[0.6875rem] leading-tight text-sourdine">{c.aide}</p>}
            </>
          );
          return c.to ? (
            <Link key={c.l} to={c.to} data-apparition className="carte block p-4 transition-colors hover:border-rose-doux/40">
              {contenu}
            </Link>
          ) : (
            <div key={c.l} data-apparition className="carte p-4">
              {contenu}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function AFaire({ t, onMaj }: { t: Tableau; onMaj: () => void }) {
  const agir = useAction();
  const sansPrix = t.catalogue.total - t.catalogue.avec_prix;
  const progression = t.catalogue.total ? t.catalogue.avec_prix / t.catalogue.total : 0;
  const stockBas = t.stockBas.length - t.ruptures;
  const items = [];

  if (sansPrix > 0)
    items.push(
      <Link key="prix" to="/admin/catalogue?filtre=sans_prix" className="block px-4 py-3.5 hover:bg-fond-3/50">
        <span className="flex items-center gap-3">
          <Tag size={20} className="shrink-0 text-rose-doux" aria-hidden="true" />
          <span className="flex-1 font-medium">
            {sansPrix} parfum{sansPrix > 1 ? 's' : ''} sans prix
          </span>
          <span className="text-sm font-semibold text-rose-doux">Compléter</span>
          <ChevronRight size={18} className="text-sourdine" aria-hidden="true" />
        </span>
        <span className="mt-2.5 flex items-center gap-3 pl-8">
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-encre/[0.08]" role="progressbar" aria-valuemin={0} aria-valuemax={t.catalogue.total} aria-valuenow={t.catalogue.avec_prix} aria-label="Parfums avec un prix">
            <span className="block h-full rounded-full bg-rose" style={{ width: `${Math.max(progression * 100, 2)}%` }} />
          </span>
          <span className="text-xs font-semibold tabular-nums text-sourdine">
            {t.catalogue.avec_prix}/{t.catalogue.total}
          </span>
        </span>
      </Link>,
    );
  if (t.livraisons.n > 0)
    items.push(
      <LigneAFaire key="liv" to="/admin/ventes?periode=tout&livraison=a_faire" icone={<Truck size={20} aria-hidden="true" />} action="Voir">
        {t.livraisons.n} livraison{t.livraisons.n > 1 ? 's' : ''} à faire
        {t.livraisons.aujourdhui ? <span className="text-sourdine"> · {t.livraisons.aujourdhui} d’aujourd’hui</span> : null}
      </LigneAFaire>,
    );
  if (t.ruptures > 0)
    items.push(
      <LigneAFaire key="rup" to="/admin/catalogue?filtre=epuise" icone={<PackageX size={20} aria-hidden="true" />} action="Voir">
        {t.ruptures} format{t.ruptures > 1 ? 's' : ''} épuisé{t.ruptures > 1 ? 's' : ''}
      </LigneAFaire>,
    );
  if (stockBas > 0)
    items.push(
      <LigneAFaire key="bas" to="/admin/catalogue?filtre=stock_bas" icone={<AlertTriangle size={20} aria-hidden="true" />} action="Réassort">
        {stockBas} format{stockBas > 1 ? 's' : ''} en stock bas
      </LigneAFaire>,
    );
  for (const a of t.aPrevenir.slice(0, 5)) {
    const message = `Bonjour${a.prenom ? ` ${a.prenom}` : ''}, c’est Nal’Aaris Perfumes. Bonne nouvelle : ${a.libelle}${a.ml ? ` ${a.ml} ml` : ''} est de nouveau disponible. On te le met de côté ?`;
    items.push(
      <div key={`a${a.id}`} className="flex items-center gap-3 px-4 py-3">
        <span className="min-w-0 flex-1">
          <span className="block font-medium">
            {a.prenom ?? telAffiche(a.telephone)} attend {a.libelle}
          </span>
          <span className="text-sm text-sourdine">De retour en stock · {telAffiche(a.telephone)}</span>
        </span>
        <a
          href={lienWa(a.telephone, message)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => void agir(() => api.post(`alertes/${a.id}/prevenue`), 'Marquée comme prévenue').then(() => setTimeout(onMaj, 400))}
          className="btn btn-wa min-h-[44px] shrink-0 px-4 text-sm"
        >
          Prévenir
        </a>
      </div>,
    );
  }

  return (
    <Section titre="À faire maintenant">
      {items.length ? (
        <div data-apparition className="carte divide-y divide-encre/[0.06] overflow-hidden">
          {items}
        </div>
      ) : (
        <Vide titre="Rien d’urgent" texte="Prix, stock, livraisons : tout est à jour." />
      )}
    </Section>
  );
}

const LigneAFaire = ({ to, icone, action, children }: { to: string; icone: React.ReactNode; action: string; children: React.ReactNode }) => (
  <Link to={to} className="flex min-h-[56px] items-center gap-3 px-4 py-3 hover:bg-fond-3/50">
    <span className="shrink-0 text-rose-doux">{icone}</span>
    <span className="flex-1 font-medium">{children}</span>
    <span className="text-sm font-semibold text-rose-doux">{action}</span>
    <ChevronRight size={18} className="text-sourdine" aria-hidden="true" />
  </Link>
);

function PlusDemandes({ t }: { t: Tableau }) {
  return (
    <Section titre="Les plus demandés · 30 jours">
      {t.plusDemandes.length ? (
        <ol data-apparition className="carte divide-y divide-encre/[0.06] overflow-hidden">
          {t.plusDemandes.map((p, i) => {
            const epuise = p.suivi > 0 && (p.stock ?? 0) === 0;
            return (
              <li key={p.slug}>
                <Link to={`/admin/catalogue/${p.slug}`} className="flex min-h-[56px] items-center gap-3 px-4 py-2.5 hover:bg-fond-3/50">
                  <span className="chiffre w-5 text-xl text-rose-doux">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.libelle}</span>
                    <span className="text-sm text-sourdine">
                      {p.clics} demande{p.clics > 1 ? 's' : ''}
                    </span>
                  </span>
                  {p.suivi === 0 ? (
                    <Pastille>Stock non suivi</Pastille>
                  ) : epuise ? (
                    <Pastille ton="alerte">
                      <AlertTriangle size={12} aria-hidden="true" /> Épuisé
                    </Pastille>
                  ) : (
                    <Pastille ton="ok">{p.stock} en stock</Pastille>
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <Vide titre="Pas encore de demande" texte="Les clics « Commander » du site apparaîtront ici." />
      )}
    </Section>
  );
}

function Recherches({ t }: { t: Tableau }) {
  return (
    <Section titre="Ils cherchent, on ne l’a pas · 30 jours">
      {t.recherchesSansResultat.length ? (
        <div data-apparition className="carte overflow-hidden">
          <ul className="divide-y divide-encre/[0.06]">
            {t.recherchesSansResultat.map((r) => (
              <li key={r.texte} className="flex min-h-[48px] items-center gap-3 px-4 py-2">
                <Search size={16} className="shrink-0 text-sourdine" aria-hidden="true" />
                <span className="flex-1 font-medium">« {r.texte} »</span>
                <span className="text-sm tabular-nums text-sourdine">
                  {r.n} recherche{r.n > 1 ? 's' : ''}
                </span>
              </li>
            ))}
          </ul>
          <p className="border-t border-encre/[0.06] px-4 py-3 text-sm text-sourdine">
            Ta liste d’achat : des parfums demandés que le catalogue n’a pas.{' '}
            <Link to="/admin/catalogue/nouveau" className="font-semibold text-rose-doux underline-offset-4 hover:underline">
              Ajouter un parfum
            </Link>
          </p>
        </div>
      ) : (
        <Vide titre="Aucune recherche sans résultat" texte="Quand une cliente cherche un parfum absent du site, il apparaîtra ici." />
      )}
    </Section>
  );
}

function Mois({ t }: { t: Tableau }) {
  const m = t.mois;
  const totalPaiements = m.paiements.reduce((s, p) => s + p.ca, 0);
  return (
    <Section titre="Ventes du mois" action={<Link to="/admin/ventes?periode=mois" className="min-h-[32px] text-sm font-semibold text-rose-doux">Détail</Link>}>
      <div data-apparition className="carte p-4">
        <p className="flex items-baseline gap-1.5">
          <Chiffre valeur={m.ca} format={nombre} className="chiffre text-[2.5rem]" />
          <span className="text-sourdine">FCFA</span>
        </p>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div>
            <dt className="text-sourdine">Ventes</dt>
            <dd className="font-semibold tabular-nums">{m.nb}</dd>
          </div>
          <div>
            <dt className="text-sourdine">Panier moyen</dt>
            <dd className="font-semibold tabular-nums">{fcfa(m.panierMoyen)}</dd>
          </div>
          <div>
            <dt className="text-sourdine">Marge</dt>
            <dd className="font-semibold tabular-nums">{m.marge ? `${fcfa(m.marge.montant)}` : '—'}</dd>
          </div>
        </dl>
        {m.marge ? (
          <p className="mt-1 text-xs text-sourdine">
            Marge {pourcent(m.marge.taux)}, calculée sur {pourcent(m.marge.couverture)} des ventes (celles dont le prix d’achat est renseigné).
          </p>
        ) : (
          <p className="mt-1 text-xs text-sourdine">Renseigne les prix d’achat dans les fiches pour voir la marge.</p>
        )}
        {totalPaiements > 0 && (
          <div className="mt-4">
            <p className="label mb-2">Paiements</p>
            {/* Barre empilée : chaque segment est nommé dans la liste en dessous (jamais la couleur seule) */}
            <div className="flex h-2.5 gap-[2px] overflow-hidden rounded-full" aria-hidden="true">
              {m.paiements.map((p, i) => (
                <span key={p.paiement} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(p.ca / totalPaiements) * 100}%`, background: `rgb(var(--c-rose) / ${1 - i * 0.28})` }} />
              ))}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {m.paiements.map((p, i) => (
                <li key={p.paiement} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: `rgb(var(--c-rose) / ${1 - i * 0.28})` }} aria-hidden="true" />
                  {LIB_PAIEMENT[p.paiement]} <span className="font-semibold tabular-nums">{pourcent(p.ca / totalPaiements)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Barres parJour={t.parJour} />
      </div>
    </Section>
  );
}

/** Ventes par jour sur 30 jours : barres fines, une seule série, valeur au toucher, tableau pour les lecteurs d'écran. */
function Barres({ parJour }: { parJour: Tableau['parJour'] }) {
  const jours = useMemo(() => {
    const parCle = new Map(parJour.map((j) => [j.jour, j]));
    const auj = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(Date.UTC(auj.getUTCFullYear(), auj.getUTCMonth(), auj.getUTCDate() - 29 + i));
      const cle = d.toISOString().slice(0, 10);
      return { cle, ca: parCle.get(cle)?.ca ?? 0, nb: parCle.get(cle)?.nb ?? 0 };
    });
  }, [parJour]);
  const [actif, setActif] = useState<number | null>(null);
  const max = Math.max(...jours.map((j) => j.ca), 1);
  const H = 96;
  const total = jours.reduce((s, j) => s + j.ca, 0);
  const sel = actif != null ? jours[actif] : null;

  return (
    <figure className="mt-5">
      <figcaption className="mb-2 flex items-baseline justify-between gap-2">
        <span className="label">Chiffre d’affaires par jour · 30 jours</span>
        <span className="text-xs text-sourdine" aria-live="polite">
          {sel ? `${jourCourt(sel.cle + 'T12:00:00Z')} : ${fcfa(sel.ca)} · ${sel.nb} vente${sel.nb > 1 ? 's' : ''}` : `max ${fcfa(max === 1 ? 0 : max)}`}
        </span>
      </figcaption>
      {total === 0 ? (
        <p className="grid h-24 place-items-center rounded-xl bg-fond-2 text-sm text-sourdine">Pas encore de vente sur 30 jours.</p>
      ) : (
        <>
          <svg viewBox={`0 0 300 ${H + 14}`} className="h-auto w-full touch-pan-y" role="img" aria-label={`Ventes des 30 derniers jours : ${fcfa(total)} au total. Détail dans le tableau.`} onPointerLeave={() => setActif(null)}>
            <line x1="0" x2="300" y1={H} y2={H} stroke="rgb(var(--c-encre) / 0.15)" strokeWidth="1" />
            {jours.map((j, i) => {
              const h = j.ca ? Math.max((j.ca / max) * (H - 4), 3) : 0;
              const x = i * 10;
              return (
                <g key={j.cle} onPointerEnter={() => setActif(i)} onClick={() => setActif(actif === i ? null : i)}>
                  {/* zone de toucher plus large que la barre */}
                  <rect x={x} y="0" width="10" height={H + 14} fill="transparent" />
                  {h > 0 && (
                    <path
                      d={`M${x + 1},${H} V${H - h + 3} Q${x + 1},${H - h} ${x + 4},${H - h} H${x + 6} Q${x + 9},${H - h} ${x + 9},${H - h + 3} V${H} Z`}
                      fill={actif == null || actif === i ? 'rgb(var(--c-rose-doux))' : 'rgb(var(--c-rose-doux) / 0.35)'}
                    />
                  )}
                </g>
              );
            })}
            <text x="0" y={H + 12} fontSize="8" fill="rgb(var(--c-sourdine))">
              {jourCourt(jours[0].cle + 'T12:00:00Z')}
            </text>
            <text x="300" y={H + 12} fontSize="8" textAnchor="end" fill="rgb(var(--c-sourdine))">
              aujourd’hui
            </text>
          </svg>
          <table className="sr-only">
            <caption>Chiffre d’affaires par jour</caption>
            <tbody>
              {jours.filter((j) => j.ca).map((j) => (
                <tr key={j.cle}>
                  <th scope="row">{jourCourt(j.cle + 'T12:00:00Z')}</th>
                  <td>{fcfa(j.ca)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </figure>
  );
}
