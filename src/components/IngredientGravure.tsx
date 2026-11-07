import type { CSSProperties } from 'react';
import type { Ingredient } from '../data/parfums';
import { gravure } from '../lib/ingredients';

/** Gravure au trait d'un ingrédient (décorative). Couleurs : classes `.gravure` dans index.css, suivent le thème. */
export function IngredientGravure({ nom, className = '', style }: { nom: Ingredient; className?: string; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
      className={`gravure ${className}`}
      style={style}
      // Le balisage vient de notre propre bibliothèque (src/lib/ingredients.ts), calculé à partir de constantes :
      // jamais d'une saisie utilisateur ni d'une donnée externe, donc pas de risque d'injection ici.
      dangerouslySetInnerHTML={{ __html: gravure(nom) }}
    />
  );
}
