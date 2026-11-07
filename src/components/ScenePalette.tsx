import type { CSSProperties } from 'react';
import { nomComplet, type Parfum } from '../data/parfums';
import { IngredientGravure } from './IngredientGravure';

/**
 * Scène « palette » d'un parfum (sans texte) : flacon détouré dans une arche, entouré des gravures
 * de ses ingrédients, ombre au sol et reflet.
 *
 * Toutes les mesures sont dans un repère fixe de 1080 × 830 (celui des cartes Instagram) et rendues
 * en % / cqw : la scène garde exactement ses proportions à toutes les tailles. Chaque variante ne
 * montre qu'une fenêtre de ce repère (recadrage par overflow) :
 *   - carte   : x 208 → 872 (4:5), 4 ingrédients plus petits, pas de reflet (catalogue : légèreté) ;
 *   - fiche   : x 120 → 960 (presque carré : arche plus grande, aussi sur mobile) ;
 *   - affiche : repère entier (route /carte/:slug, visuels Instagram).
 */

export type VarianteScene = 'carte' | 'fiche' | 'affiche';

const W = 1080;
const H = 830;
const pct = (v: number, total: number) => `${((v / total) * 100).toFixed(4)}%`;
const cqw = (v: number) => `${((v / W) * 100).toFixed(4)}cqw`;

/** Emplacements des ingrédients : centre x, centre y, taille, rotation (repère 1080 × 830). Derrière le flacon. */
const EMPLACEMENTS = [
  [330, 215, 250, -10],
  [752, 205, 250, 8],
  [292, 470, 225, -6],
  [790, 455, 225, 10],
  [372, 660, 185, -4],
  [712, 668, 185, 6],
] as const;

// Arche 540 × 740 centrée ; filet 18 px plus grand tout autour ; bas du flacon à 82 % de l'arche
const ARCHE = { x: 270, y: 50, w: 540, h: 740 };
const FILET = 18;
const SOL = ARCHE.y + ARCHE.h * 0.82; // 656.8
const FLACON = { w: 400, h: 520 };
const fx = (W - FLACON.w) / 2;

const FENETRE: Record<VarianteScene, { exterieur: string; interieur: string }> = {
  carte: {
    exterieur: 'absolute inset-0 overflow-hidden',
    // 1080 / 664 = 162.65 % ; décalage 208 / 664 = 31.33 %
    interieur: 'absolute inset-y-0 left-[-31.3253%] w-[162.6506%]',
  },
  fiche: {
    // x 120 → 960 : 1080 / 840 = 128.57 % ; décalage 120 / 840 = 14.29 %
    exterieur: 'relative aspect-[840/830] overflow-hidden',
    interieur: 'absolute inset-y-0 left-[-14.2857%] w-[128.5714%]',
  },
  affiche: {
    exterieur: 'relative aspect-[1080/830]',
    interieur: 'absolute inset-0',
  },
};

export function ScenePalette({
  parfum,
  variante,
  className = '',
}: {
  parfum: Parfum;
  variante: VarianteScene;
  className?: string;
}) {
  const carte = variante === 'carte';
  const slots = carte ? [0, 1, 4, 5] : [0, 1, 2, 3, 4, 5];
  const echelle = carte ? 0.82 : 1;
  const ingredients = parfum.ingredients ?? [];
  const f = FENETRE[variante];
  const alt = `Flacon ${parfum.marque} ${nomComplet(parfum)}`;

  return (
    <div className={`${f.exterieur} ${className}`}>
      <div className={`scene-palette ${f.interieur}`} style={{ '--halo': parfum.halo ?? 'transparent' } as CSSProperties}>
        {/* filet extérieur */}
        <div
          className="sp-filet absolute border border-[color:var(--verre-bord)]"
          style={{
            left: pct(ARCHE.x - FILET, W),
            top: pct(ARCHE.y - FILET, H),
            width: pct(ARCHE.w + 2 * FILET, W),
            height: pct(ARCHE.h + 2 * FILET, H),
            borderRadius: `${cqw(ARCHE.w / 2 + FILET)} ${cqw(ARCHE.w / 2 + FILET)} ${cqw(26 + FILET)} ${cqw(26 + FILET)}`,
          }}
          aria-hidden="true"
        />

        {/* arche : dégradé du thème + lueur teintée par le parfum ; le reflet reste à l'intérieur */}
        <div
          className="sp-arche absolute overflow-hidden"
          style={{
            left: pct(ARCHE.x, W),
            top: pct(ARCHE.y, H),
            width: pct(ARCHE.w, W),
            height: pct(ARCHE.h, H),
            borderRadius: `${cqw(ARCHE.w / 2)} ${cqw(ARCHE.w / 2)} ${cqw(26)} ${cqw(26)}`,
          }}
          aria-hidden="true"
        >
          {!carte && parfum.flacon && (
            <div
              className="sp-reflet absolute"
              style={{
                left: pct(fx - ARCHE.x, ARCHE.w),
                top: pct(SOL - ARCHE.y, ARCHE.h),
                width: pct(FLACON.w, ARCHE.w),
                height: pct(FLACON.h, ARCHE.h),
              }}
            >
              <img src={parfum.flacon} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain object-bottom" />
            </div>
          )}
        </div>

        {/* gravures des ingrédients, derrière le flacon */}
        {slots.map((i) => {
          const nom = ingredients[i];
          if (!nom) return null;
          const [x, y, s0, r] = EMPLACEMENTS[i];
          const s = s0 * echelle;
          return (
            <div
              key={i}
              className="sp-ing absolute"
              style={{ left: pct(x - s / 2, W), top: pct(y - s / 2, H), width: pct(s, W), height: pct(s, H) }}
            >
              <IngredientGravure nom={nom} className="h-full w-full" style={{ transform: `rotate(${r}deg)` }} />
            </div>
          );
        })}

        {/* ombre au sol */}
        <div
          className="sp-ombre absolute"
          style={{ left: pct(W / 2 - 170, W), top: pct(SOL - 18, H), width: pct(340, W), height: pct(36, H) }}
          aria-hidden="true"
        />

        {/* flacon */}
        {parfum.flacon && (
          <div
            className="sp-flacon flacon absolute"
            data-flip-flacon={parfum.slug}
            style={{ left: pct(fx, W), top: pct(SOL - FLACON.h, H), width: pct(FLACON.w, W), height: pct(FLACON.h, H) }}
          >
            <img
              src={parfum.flacon}
              alt={alt}
              loading={variante === 'fiche' ? 'eager' : 'lazy'}
              {...(variante === 'fiche' ? { fetchpriority: 'high' } : {})}
              decoding="async"
              className="h-full w-full object-contain object-bottom"
            />
          </div>
        )}
      </div>
    </div>
  );
}
