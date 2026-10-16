import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getParfum, type Parfum } from '../data/parfums';
import { ecrire, lire } from '../lib/storage';

/** Une ligne de « Ma sélection » — volontairement minimale pour brancher plus tard un vrai panier. */
export interface LigneSelection {
  slug: string;
  ml: number;
}

interface SelectionCtx {
  lignes: (LigneSelection & { parfum: Parfum })[];
  count: number;
  ajouter: (slug: string, ml: number) => void;
  retirer: (slug: string, ml: number) => void;
  changerMl: (slug: string, ancien: number, nouveau: number) => void;
  vider: () => void;
  restaurer: (lignes: LigneSelection[]) => void;
  contient: (slug: string, ml: number) => boolean;
  ouvert: boolean;
  ouvrir: () => void;
  fermer: () => void;
}

const CLE = 'nalaaris:selection:v1';
const Ctx = createContext<SelectionCtx | null>(null);

export function SelectionProvider({ children }: { children: ReactNode }) {
  // Vide au premier rendu (identique au HTML pré-rendu, donc hydratable), puis relu depuis le stockage
  const [brut, setBrut] = useState<LigneSelection[]>([]);
  const [charge, setCharge] = useState(false);
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    setBrut(lire<LigneSelection[]>(CLE, []));
    setCharge(true);
  }, []);
  // On n'écrit qu'après la lecture : sinon la liste vide initiale écraserait la sélection enregistrée
  useEffect(() => {
    if (charge) ecrire(CLE, brut);
  }, [brut, charge]);

  const lignes = useMemo(
    () =>
      brut.flatMap((l) => {
        const parfum = getParfum(l.slug);
        return parfum ? [{ ...l, parfum }] : []; // ignore les parfums retirés du catalogue
      }),
    [brut],
  );

  const ajouter = useCallback((slug: string, ml: number) => {
    setBrut((prev) => (prev.some((l) => l.slug === slug && l.ml === ml) ? prev : [...prev, { slug, ml }]));
  }, []);

  const retirer = useCallback((slug: string, ml: number) => {
    setBrut((prev) => prev.filter((l) => !(l.slug === slug && l.ml === ml)));
  }, []);

  const changerMl = useCallback((slug: string, ancien: number, nouveau: number) => {
    setBrut((prev) => {
      const sansDoublon = prev.filter((l) => !(l.slug === slug && l.ml === nouveau));
      return sansDoublon.map((l) => (l.slug === slug && l.ml === ancien ? { slug, ml: nouveau } : l));
    });
  }, []);

  const value: SelectionCtx = {
    lignes,
    count: lignes.length,
    ajouter,
    retirer,
    changerMl,
    vider: () => setBrut([]),
    restaurer: (l) => setBrut(l),
    contient: (slug, ml) => brut.some((l) => l.slug === slug && l.ml === ml),
    ouvert,
    ouvrir: () => setOuvert(true),
    fermer: () => setOuvert(false),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSelection() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSelection doit être utilisé dans <SelectionProvider>');
  return ctx;
}
