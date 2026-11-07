import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { categorieLabel, getParfum, type Parfum } from '../data/parfums';
import { ScenePalette } from '../components/ScenePalette';
import { IconePorter, conseils } from '../components/QuandLePorter';
import { Monogramme } from '../components/Monogramme';
import { NotFound } from './NotFound';

/**
 * Carte parfum 1080 × 1350 — sert à générer les visuels Instagram et l'image de partage des fiches
 * (`npm run cartes`, capture Playwright). Page non indexée, sans navigation.
 * Thème : /carte/<slug>?theme=clair|sombre (lu par index.html avant l'affichage).
 */
export function CartePage() {
  const { slug = '' } = useParams();
  const parfum = getParfum(slug);
  useEffect(() => {
    if (parfum) document.title = `Carte · ${parfum.nom} — ${parfum.marque}`;
  }, [parfum]);
  if (!parfum?.flacon) return <NotFound />;
  return <Carte parfum={parfum} />;
}

/** « Pomme, cannelle, lavande » : liste en phrase, seule la première note garde sa majuscule. */
const enPhrase = (notes: string[]) => notes.map((n, i) => (i ? n.charAt(0).toLowerCase() + n.slice(1) : n)).join(', ');

function Carte({ parfum }: { parfum: Parfum }) {
  const lignes: [string, string[] | undefined][] = parfum.notes.bouquet?.length
    ? [['Bouquet', parfum.notes.bouquet]]
    : [
        ['Tête', parfum.notes.tete],
        ['Cœur', parfum.notes.coeur],
        ['Fond', parfum.notes.fond],
      ];

  return (
    <div className="carte-affiche relative mx-auto h-[1350px] w-[1080px] overflow-hidden bg-fond text-encre">
      <div className="pointer-events-none absolute inset-[28px] rounded-[44px] border border-[color:var(--verre-bord)]" aria-hidden="true" />

      <p className="absolute left-[72px] top-[74px] text-[17px] font-semibold uppercase tracking-[0.42em]">
        Nal’Aaris <span className="text-rose-logo">·</span> Sélection
      </p>
      <Monogramme className="absolute right-[64px] top-[56px] w-[62px] text-rose-logo" />

      <div className="absolute inset-x-0 top-[100px]">
        <ScenePalette parfum={parfum} variante="affiche" />
      </div>

      {/* Identité + notes */}
      <div className="absolute left-[72px] right-[72px] top-[948px] grid h-[238px] grid-cols-[1fr_1px_1.3fr] items-center gap-[36px]">
        <div>
          {parfum.famille && <p className="text-[15px] font-bold uppercase tracking-[0.3em] text-rose-doux">{parfum.famille}</p>}
          <p className="mt-[20px] text-[18px] uppercase tracking-[0.45em] text-sourdine">{parfum.marque}</p>
          <h1 className={`font-serif leading-[0.95] ${parfum.sousNom ? 'mt-[6px] text-[78px]' : 'mt-[8px] text-[92px]'}`}>{parfum.nom}</h1>
          {parfum.sousNom && <p className="font-serif text-[46px] italic leading-[1.05] text-rose-doux">{parfum.sousNom}</p>}
          <p className="mt-[12px] text-[20px] text-sourdine">
            {parfum.type} · {categorieLabel(parfum.categorie)}
          </p>
        </div>
        <span className="h-[190px] w-px bg-encre/10" aria-hidden="true" />
        <dl className="grid grid-cols-[96px_1fr] gap-x-[14px] gap-y-[20px]">
          {lignes.map(([titre, notes]) =>
            notes?.length ? (
              <div key={titre} className="contents">
                <dt className="pt-[6px] text-[13px] font-bold uppercase tracking-[0.3em] text-rose-doux">{titre}</dt>
                <dd className="text-[22px] leading-[1.3]">
                  {titre === 'Bouquet' ? notes.map((n) => <span key={n} className="block">{n}</span>) : enPhrase(notes)}
                </dd>
              </div>
            ) : null,
          )}
        </dl>
      </div>

      {/* Quand le porter */}
      {parfum.porter && (
        <div className="absolute left-[72px] right-[72px] top-[1208px] border-t border-encre/10 pt-[28px]">
          <ul className="grid grid-cols-[150px_1fr_1fr_1fr] items-center">
            <li className="text-[13px] font-bold uppercase leading-[1.6] tracking-[0.3em] text-sourdine">
              Quand
              <br />
              le porter
            </li>
            {conseils(parfum.porter).map((c) => (
              <li key={c.cle} className="flex items-center gap-[18px] border-l border-encre/10 pl-[24px]">
                <span className="h-[34px] w-[34px] shrink-0 text-rose-doux">
                  <IconePorter nom={c.icone} />
                </span>
                <span>
                  <span className="block text-[21px] font-medium leading-tight">{c.titre}</span>
                  <span className="block text-[16px] text-sourdine">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
