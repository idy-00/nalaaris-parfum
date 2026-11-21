/** Fiche d'édition d'un parfum : contenances (prix, achat, stock, seuil, disponibilité), affichage, textes. */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { api } from '../api';
import { fcfa, LIB_DISPO, pourcent } from '../format';
import type { Contenance, ParfumFiche, Porter } from '../types';
import { ChampMontant, EnTete, ErreurBloc, Interrupteur, Page, Pastille, Puces, Section, Squelette, useAction, useDonnees, useToast } from '../ui';
import { AjoutContenance, Vignette, tonDispo } from './Catalogue';

const STYLES = [
  { v: 'frais', l: 'Frais' },
  { v: 'fleuri', l: 'Fleuri' },
  { v: 'boise', l: 'Boisé' },
  { v: 'doux', l: 'Doux' },
  { v: 'vanille', l: 'Vanillé' },
  { v: 'oriental', l: 'Oriental' },
];

export function FicheParfum() {
  const { slug = '' } = useParams();
  const { data: p, setData, erreur, recharger } = useDonnees<ParfumFiche>(`parfums/${slug}`);
  const [ajout, setAjout] = useState(false);
  const toast = useToast();
  const agir = useAction();

  const majContenance = (c: Contenance) =>
    setData((d) => d && { ...d, contenances: d.contenances.some((x) => x.ml === c.ml) ? d.contenances.map((x) => (x.ml === c.ml ? c : x)) : [...d.contenances, c].sort((a, b) => a.ml - b.ml) });

  /** Bascule immédiate (Nouveau, Coup de cœur, Masquer), annulable. */
  const basculer = (champ: 'nouveau' | 'coup_de_coeur' | 'masque', v: boolean, texte: string) =>
    agir(async () => {
      setData(await api.patch<ParfumFiche>(`parfums/${slug}`, { [champ]: v }));
      toast(texte, {
        annuler: async () => {
          setData(await api.patch<ParfumFiche>(`parfums/${slug}`, { [champ]: !v }));
          toast('Modification annulée');
        },
      });
    });

  if (erreur) return <Page><ErreurBloc message={erreur} reessayer={recharger} /></Page>;
  if (!p)
    return (
      <>
        <EnTete titre="…" retour="/admin/catalogue" />
        <Page>
          <Squelette />
        </Page>
      </>
    );
  const nom = p.nom_public ?? p.nom;
  return (
    <>
      <EnTete
        titre={nom}
        sousTitre={`${p.marque}${p.concentration ? ` · ${p.concentration}` : ''}`}
        retour="/admin/catalogue"
        actions={
          p.statut === 'publie' && !p.masque ? (
            <a href={`/parfum/${p.slug}`} target="_blank" rel="noopener noreferrer" aria-label="Voir sur le site" className="grid h-11 w-11 place-items-center rounded-full text-rose-doux hover:bg-fond-3">
              <ExternalLink size={20} aria-hidden="true" />
            </a>
          ) : undefined
        }
      />
      <Page>
        <div className="flex items-center gap-4">
          <Vignette parfum={p} taille={72} />
          <div className="flex flex-wrap gap-1.5">
            {p.statut === 'visuel_a_creer' ? <Pastille ton="rose">Visuel à créer · masqué du site</Pastille> : p.masque ? <Pastille>Masqué du site</Pastille> : <Pastille ton="ok">Visible sur le site</Pastille>}
            <Pastille>{p.categorie === 'femme' ? 'Femme' : p.categorie === 'homme' ? 'Homme' : 'Unisexe'}</Pastille>
          </div>
        </div>

        <Section
          titre="Contenances, prix et stock"
          action={
            <button type="button" onClick={() => setAjout(true)} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-rose-doux hover:bg-fond-3">
              <Plus size={16} aria-hidden="true" /> Ajouter
            </button>
          }
        >
          {p.contenances.length ? (
            <div className="space-y-3">
              {p.contenances.map((c) => (
                <EditionContenance
                  key={c.ml}
                  c={c}
                  libelle={`${p.marque} ${nom}`}
                  onMaj={majContenance}
                  onSuppr={() => setData((d) => d && { ...d, contenances: d.contenances.filter((x) => x.ml !== c.ml) })}
                />
              ))}
            </div>
          ) : (
            <button type="button" onClick={() => setAjout(true)} className="carte flex min-h-[72px] w-full items-center justify-center gap-2 font-semibold text-rose-doux">
              <Plus size={18} aria-hidden="true" /> Mettre un premier prix
            </button>
          )}
        </Section>

        <Section titre="Sur le site">
          <div className="carte divide-y divide-encre/[0.06] px-4">
            <Interrupteur actif={!!p.nouveau} onChange={(v) => void basculer('nouveau', v, v ? 'Marqué « Nouveau »' : '« Nouveau » retiré')} libelle="Nouveau" aide="Badge « Nouveau » sur la fiche" />
            <Interrupteur actif={!!p.coup_de_coeur} onChange={(v) => void basculer('coup_de_coeur', v, v ? 'Ajouté aux coups de cœur' : 'Retiré des coups de cœur')} libelle="Coup de cœur" />
            <Interrupteur
              actif={!!p.masque}
              onChange={(v) => {
                if (p.statut === 'visuel_a_creer' && !v) return toast('Ce parfum reste masqué tant que son visuel studio n’est pas prêt.', { type: 'erreur' });
                void basculer('masque', v, v ? 'Masqué du site (à la prochaine publication)' : 'Visible sur le site (à la prochaine publication)');
              }}
              libelle="Masquer du site"
              aide={p.statut === 'visuel_a_creer' ? 'Obligatoire tant que le visuel est à créer' : undefined}
            />
          </div>
        </Section>

        <Textes key={p.slug} p={p} onMaj={setData} />
      </Page>
      <AjoutContenance ouverte={ajout} onFermer={() => setAjout(false)} slug={p.slug} libelle={`${p.marque} ${nom}`} existantes={p.contenances.map((c) => c.ml)} onAjout={(c) => (majContenance(c), setAjout(false))} />
    </>
  );
}

/** Contenance complète : chaque champ s'enregistre en le quittant. */
function EditionContenance({ c, libelle, onMaj, onSuppr }: { c: Contenance; libelle: string; onMaj: (c: Contenance) => void; onSuppr: () => void }) {
  const [v, setV] = useState(c);
  const agir = useAction();
  const toast = useToast();
  useEffect(() => setV(c), [c]);
  const enregistrer = (champ: keyof Contenance, valeur: unknown) =>
    valeur === c[champ]
      ? undefined
      : void agir(async () => {
          const ancienne = c[champ];
          const maj = await api.put<Contenance>(`parfums/${c.slug}/contenances/${c.ml}`, { [champ]: valeur });
          onMaj(maj);
          toast(`Enregistré · ${c.ml} ml`, {
            annuler: async () => {
              onMaj(await api.put<Contenance>(`parfums/${c.slug}/contenances/${c.ml}`, { [champ]: ancienne }));
              toast('Modification annulée');
            },
          });
        });
  const entier = (s: string) => (s.replace(/\D/g, '') === '' ? null : Number(s.replace(/\D/g, '').slice(0, 5)));
  const marge = v.prix_vente != null && v.prix_achat != null && v.prix_vente > 0 ? (v.prix_vente - v.prix_achat) / v.prix_vente : null;

  return (
    <div className="carte p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="chiffre text-2xl">{c.ml} ml</p>
        <div className="flex items-center gap-2">
          {c.dispo ? <Pastille ton={tonDispo(c.dispo)}>{LIB_DISPO[c.dispo]}</Pastille> : <Pastille>Stock non suivi</Pastille>}
          <button
            type="button"
            aria-label={`Supprimer ${c.ml} ml`}
            onClick={() => {
              if (!confirm(`Supprimer la contenance ${c.ml} ml de ${libelle} ? Le prix et le stock seront effacés.`)) return;
              void agir(() => api.del(`parfums/${c.slug}/contenances/${c.ml}`), `${c.ml} ml supprimé`).then((ok) => ok && onSuppr());
            }}
            className="grid h-11 w-11 place-items-center rounded-full text-sourdine hover:bg-fond-3 hover:text-danger"
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label mb-1.5 block">Prix de vente</span>
          <ChampMontant valeur={v.prix_vente} onChange={(x) => setV({ ...v, prix_vente: x })} onBlur={() => enregistrer('prix_vente', v.prix_vente)} label="Prix de vente" placeholder="Sur demande" />
        </label>
        <label className="block">
          <span className="label mb-1.5 block">Prix d’achat</span>
          <ChampMontant valeur={v.prix_achat} onChange={(x) => setV({ ...v, prix_achat: x })} onBlur={() => enregistrer('prix_achat', v.prix_achat)} label="Prix d’achat (jamais affiché)" placeholder="Facultatif" />
        </label>
        <label className="block">
          <span className="label mb-1.5 block">En stock</span>
          <input inputMode="numeric" value={v.stock ?? ''} placeholder="Non suivi" onFocus={(e) => e.target.select()} onChange={(e) => setV({ ...v, stock: entier(e.target.value) })} onBlur={() => enregistrer('stock', v.stock)} className="champ-nb" />
        </label>
        <label className="block">
          <span className="label mb-1.5 block">Alerte à partir de</span>
          <input inputMode="numeric" value={v.seuil_alerte} onFocus={(e) => e.target.select()} onChange={(e) => setV({ ...v, seuil_alerte: entier(e.target.value) ?? 0 })} onBlur={() => enregistrer('seuil_alerte', v.seuil_alerte)} className="champ-nb" />
        </label>
      </div>
      <p className="mt-2 text-sm text-sourdine">
        {marge != null ? `Marge : ${fcfa(v.prix_vente! - v.prix_achat!)} (${pourcent(marge)}). ` : ''}Le prix d’achat n’apparaît jamais sur le site.
      </p>
      <fieldset className="mt-3">
        <legend className="label mb-2">Disponibilité</legend>
        <Puces
          label="Disponibilité"
          valeur={v.dispo_force ?? 'auto'}
          onChange={(x) => enregistrer('dispo_force', x === 'auto' ? null : x)}
          options={[
            { v: 'auto', l: 'Selon le stock' },
            { v: 'sur_commande', l: 'Sur commande' },
            { v: 'epuise', l: 'Épuisé' },
          ]}
        />
      </fieldset>
    </div>
  );
}

const PORTER_VIDE: Porter = { moment: 'jourSoir', momentDetail: '', saison: 'annee', saisonDetail: '', occasion: { icone: 'quotidien', titre: '', detail: '' } };

/** Textes (enregistrement explicite : on écrit, on relit, on enregistre). */
function Textes({ p, onMaj }: { p: ParfumFiche; onMaj: (p: ParfumFiche) => void }) {
  const [f, setF] = useState({
    nom_public: p.nom_public ?? '',
    description: p.description ?? '',
    styles: p.styles ?? [],
    porter: p.porter,
    marque: p.marque,
    nom: p.nom,
    concentration: p.concentration ?? '',
    categorie: p.categorie,
    notes: 'bouquet' in p.notes ? p.notes.bouquet.join(', ') : [...p.notes.tete, ...p.notes.coeur, ...p.notes.fond].join(', '),
  });
  const agir = useAction();
  const admin = p.source === 'admin';
  const porter = f.porter ?? PORTER_VIDE;
  const setPorter = (x: Partial<Porter>) => setF({ ...f, porter: { ...porter, ...x } });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const corps: Record<string, unknown> = {
          nom_public: f.nom_public.trim() || null,
          description: f.description.trim() || null,
          styles: f.styles,
          porter: f.porter && f.porter.occasion.titre.trim() ? f.porter : null,
        };
        if (admin) Object.assign(corps, { marque: f.marque, nom: f.nom, concentration: f.concentration || null, categorie: f.categorie, notes: f.notes });
        void agir(async () => onMaj(await api.patch<ParfumFiche>(`parfums/${p.slug}`, corps)), 'Textes enregistrés');
      }}
    >
      {admin && (
        <Section titre="Fiche (parfum ajouté ici)">
          <div className="carte grid gap-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <Champ label="Marque" value={f.marque} onChange={(v) => setF({ ...f, marque: v })} requis />
              <Champ label="Nom" value={f.nom} onChange={(v) => setF({ ...f, nom: v })} requis />
            </div>
            <Champ label="Concentration" value={f.concentration} onChange={(v) => setF({ ...f, concentration: v })} placeholder="Eau de parfum, Extrait…" />
            <Puces label="Catégorie" valeur={f.categorie} onChange={(v) => setF({ ...f, categorie: v })} options={[{ v: 'femme', l: 'Femme' }, { v: 'homme', l: 'Homme' }, { v: 'unisexe', l: 'Unisexe' }]} />
            <Champ label="Notes (séparées par des virgules)" value={f.notes} onChange={(v) => setF({ ...f, notes: v })} multi />
          </div>
        </Section>
      )}
      <Section titre="Textes du site">
        <div className="carte grid gap-4 p-4">
          <Champ label="Nom affiché" value={f.nom_public} onChange={(v) => setF({ ...f, nom_public: v })} placeholder={p.nom} aide="Vide = nom du catalogue" />
          <Champ label="Description" value={f.description} onChange={(v) => setF({ ...f, description: v })} multi aide="Deux phrases : la sensation, puis quand le porter." />
          <fieldset>
            <legend className="label mb-2">Ambiances (3 maximum)</legend>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => {
                const actif = f.styles.includes(s.v);
                return (
                  <button
                    key={s.v}
                    type="button"
                    aria-pressed={actif}
                    disabled={!actif && f.styles.length >= 3}
                    onClick={() => setF({ ...f, styles: actif ? f.styles.filter((x) => x !== s.v) : [...f.styles, s.v] })}
                    className="puce disabled:opacity-40"
                  >
                    {s.l}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
      </Section>
      <Section titre="Quand le porter">
        <div className="carte grid gap-4 p-4">
          <Puces label="Moment" valeur={porter.moment} onChange={(v) => setPorter({ moment: v })} options={[{ v: 'jour', l: 'Jour' }, { v: 'soir', l: 'Soir' }, { v: 'jourSoir', l: 'Jour & soir' }]} />
          <Champ label="Détail du moment" value={porter.momentDetail} onChange={(v) => setPorter({ momentDetail: v })} placeholder="Sorties, rendez-vous" />
          <Puces label="Saison" valeur={porter.saison} onChange={(v) => setPorter({ saison: v })} options={[{ v: 'fraiche', l: 'Saison fraîche' }, { v: 'chaude', l: 'Saison chaude' }, { v: 'annee', l: 'Toute l’année' }]} />
          <Champ label="Détail de la saison" value={porter.saisonDetail} onChange={(v) => setPorter({ saisonDetail: v })} placeholder="déc. → avril" />
          <Puces
            label="Occasion"
            valeur={porter.occasion.icone}
            onChange={(v) => setPorter({ occasion: { ...porter.occasion, icone: v } })}
            options={[{ v: 'quotidien', l: 'Quotidien' }, { v: 'bureau', l: 'Bureau' }, { v: 'sortie', l: 'Sortie' }, { v: 'diner', l: 'Dîner' }, { v: 'ceremonie', l: 'Cérémonie' }]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Champ label="Occasion (titre)" value={porter.occasion.titre} onChange={(v) => setPorter({ occasion: { ...porter.occasion, titre: v } })} />
            <Champ label="Occasion (détail)" value={porter.occasion.detail} onChange={(v) => setPorter({ occasion: { ...porter.occasion, detail: v } })} />
          </div>
        </div>
      </Section>
      <div className="sticky bottom-[calc(68px+env(safe-area-inset-bottom))] mt-4 md:bottom-4">
        <button type="submit" className="btn btn-rose w-full shadow-lg">
          Enregistrer les textes
        </button>
      </div>
    </form>
  );
}

export function Champ({
  label,
  value,
  onChange,
  placeholder,
  aide,
  multi,
  requis,
  type = 'text',
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  aide?: string;
  multi?: boolean;
  requis?: boolean;
  type?: string;
  inputMode?: 'text' | 'tel' | 'numeric';
}) {
  return (
    <label className="block">
      <span className="label mb-1.5 block">
        {label}
        {requis && <span className="text-rose-doux"> *</span>}
      </span>
      {multi ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4} className="champ py-3 leading-relaxed" required={requis} />
      ) : (
        <input type={type} inputMode={inputMode} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="champ" required={requis} />
      )}
      {aide && <span className="mt-1 block text-sm text-sourdine">{aide}</span>}
    </label>
  );
}
