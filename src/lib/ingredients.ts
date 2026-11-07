/**
 * Bibliothèque d'ingrédients — gravures au trait (viewBox 0 0 120 120).
 *
 * Chaque entrée renvoie le balisage SVG intérieur. Classes (stylées dans index.css, sous `.gravure`) :
 *   .ln  = trait principal   .fl = remplissage teinté   .dt = détails fins   .dot = point plein
 * Pour ajouter un ingrédient : même style, viewBox 120, ces quatre classes et aucune autre couleur.
 */
import type { Ingredient } from '../data/parfums';

const P = (d: string, c = 'ln') => `<path class="${c}" d="${d}"/>`;
const C = (x: number, y: number, r: number, c = 'ln') => `<circle class="${c}" cx="${x}" cy="${y}" r="${r}"/>`;
const E = (x: number, y: number, rx: number, ry: number, rot = 0, c = 'ln') =>
  `<ellipse class="${c}" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})"/>`;
const r2 = (n: number) => Math.round(n * 10) / 10;

// pétale en goutte, base au centre, pointe vers le haut, puis tourné
function petal(cx: number, cy: number, len: number, w: number, ang: number, off = 0, c = 'ln fl') {
  const d = `M0 ${-off} C${w} ${-off - len * 0.25} ${w * 0.9} ${-off - len * 0.8} 0 ${-off - len} C${-w * 0.9} ${-off - len * 0.8} ${-w} ${-off - len * 0.25} 0 ${-off}Z`;
  return `<path class="${c}" d="${d}" transform="translate(${cx} ${cy}) rotate(${ang})"/>`;
}
function flower(cx: number, cy: number, n: number, len: number, w: number, rot = 0, off = 0, c?: string) {
  let s = '';
  for (let i = 0; i < n; i++) s += petal(cx, cy, len, w, rot + (i * 360) / n, off, c);
  return s;
}
// feuille (option dentelée) le long d'un angle
function leaf(x: number, y: number, len: number, w: number, ang: number, serr = 0, veins = true) {
  const L: number[][] = [];
  const R: number[][] = [];
  const N = serr ? 22 : 14;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    let hw = w * Math.pow(Math.sin(Math.PI * t), 0.85) * (1 - t * 0.25);
    if (serr && i % 2 && i < N) hw *= 1 + serr;
    L.push([r2(-hw), r2(-t * len)]);
    R.push([r2(hw), r2(-t * len)]);
  }
  const pts = [...L, ...R.reverse()];
  const d = 'M' + pts.map((p) => p.join(' ')).join(' L') + 'Z';
  let v = '';
  if (veins) {
    v += `<path class="dt" d="M0 0 L0 ${-len * 0.95}"/>`;
    for (let k = 1; k <= 4; k++) {
      const yy = (-len * k) / 5.2;
      const hw = w * 0.62 * Math.sin((Math.PI * k) / 5.2);
      v += `<path class="dt" d="M0 ${yy} Q${hw * 0.5} ${yy - len * 0.05} ${hw} ${yy - len * 0.12} M0 ${yy} Q${-hw * 0.5} ${yy - len * 0.05} ${-hw} ${yy - len * 0.12}"/>`;
    }
  }
  return `<g transform="translate(${x} ${y}) rotate(${ang})"><path class="ln fl" d="${d}"/>${v}</g>`;
}

const ING: Record<Ingredient, () => string> = {
  agrume: () => {
    let s = C(60, 60, 48, 'ln fl') + C(60, 60, 42) + C(60, 60, 45.5, 'dt');
    for (let i = 0; i < 10; i++) s += petal(60, 60, 33, 7.5, i * 36, 6, 'ln');
    for (let i = 0; i < 10; i++) {
      const a = ((i * 36 + 18) * Math.PI) / 180;
      s += C(r2(60 + Math.sin(a) * 30), r2(60 - Math.cos(a) * 30), 0.9, 'dot');
    }
    return s + C(60, 60, 4, 'ln');
  },
  pomme: () =>
    P('M60 38 C48 28 22 30 20 58 C18 84 38 104 52 102 C56 101 58 99 60 99 C62 99 64 101 68 102 C82 104 102 84 100 58 C98 30 72 28 60 38Z', 'ln fl') +
    P('M60 38 C60 30 62 22 66 15') +
    leaf(64, 27, 30, 9, 62, 0, true) +
    P('M32 58 C32 48 37 43 44 41', 'dt') +
    P('M30 66 C31 76 36 84 42 88', 'dt'),
  poire: () =>
    P('M60 30 C52 30 51 40 51 48 C51 60 30 66 30 86 C30 102 44 110 60 110 C76 110 90 102 90 86 C90 66 69 60 69 48 C69 40 68 30 60 30Z', 'ln fl') +
    P('M60 30 C60 22 58 16 62 9') +
    leaf(61, 20, 26, 8, 58, 0, true) +
    P('M40 84 C40 94 46 100 52 102', 'dt') +
    P('M56 44 C55 52 52 58 48 62', 'dt'),
  cannelle: () => {
    let s = '';
    (
      [
        [-24, 46],
        [-18, 62],
        [-30, 78],
      ] as const
    ).forEach(([a, y]) => {
      s += `<g transform="rotate(${a} 60 ${y})"><path class="ln fl" d="M18 ${y - 7} L102 ${y - 7} C106 ${y - 7} 106 ${y + 7} 102 ${y + 7} L18 ${y + 7}"/>${E(18, y, 4.5, 7, 0, 'ln fl')}<path class="dt" d="M18 ${y - 3} C15.5 ${y - 2} 15.5 ${y + 2} 18 ${y + 3} C20 ${y + 2} 20 ${y - 1} 18 ${y - 1}"/><path class="dt" d="M30 ${y - 3} L96 ${y - 3} M38 ${y + 3} L92 ${y + 3}"/></g>`;
    });
    return s;
  },
  lavande: () => {
    let s = '';
    (
      [
        [-24, 10],
        [0, 0],
        [22, -8],
      ] as const
    ).forEach(([dx, rot]) => {
      const x = 60 + dx;
      s += `<g transform="rotate(${rot} 60 114)"><path class="ln" d="M60 114 C60 92 ${x} 70 ${x} 22"/>`;
      for (let k = 0; k < 7; k++) {
        const y = 22 + k * 6.4;
        const side = k % 2 ? 1 : -1;
        s += E(x + side * 3, y, 2.2, 4, side * 26, 'ln fl');
      }
      s += E(x, 17, 1.8, 3.4, 0, 'ln fl') + '</g>';
    });
    return s;
  },
  fleurOranger: () =>
    leaf(30, 104, 34, 11, -40, 0, true) +
    leaf(92, 106, 30, 10, 38, 0, true) +
    flower(60, 58, 5, 34, 14, 10, 3) +
    C(60, 58, 7, 'ln fl') +
    Array.from({ length: 9 }, (_, i) => {
      const a = (i * 40 * Math.PI) / 180;
      const x = r2(60 + Math.sin(a) * 15);
      const y = r2(58 - Math.cos(a) * 15);
      return `<path class="dt" d="M60 58 L${x} ${y}"/>` + C(x, y, 1.6, 'dot');
    }).join(''),
  jasmin: () =>
    leaf(38, 108, 36, 10, -28, 0, true) +
    P('M60 112 C60 100 62 84 60 60') +
    flower(60, 52, 5, 30, 7.5, 18, 2) +
    C(60, 52, 3.5, 'ln') +
    petal(92, 30, 20, 4.5, 30, 0) +
    P('M92 30 C88 40 80 50 70 56', 'ln'),
  tubereuse: () => {
    let s = P('M58 116 C60 90 60 60 62 14');
    (
      [
        [61, 26, 14],
        [52, 50, 15],
        [70, 62, 16],
        [50, 82, 15],
      ] as const
    ).forEach(([x, y, l], i) => {
      s +=
        P(`M${i % 2 ? 60 : 61} ${y + 6} Q${(x + 60) / 2} ${y + 8} ${x} ${y}`, 'dt') +
        flower(x, y, 6, l, 4.6, i * 12, 1.5) +
        C(x, y, 2.2, 'ln');
    });
    s += E(64, 12, 2.5, 6, 12, 'ln fl') + E(57, 16, 2.4, 5.5, -18, 'ln fl');
    return s + leaf(58, 116, 34, 6, -14, 0, false);
  },
  rose: () =>
    P('M34 56 C30 38 44 28 57 34 C50 46 48 60 52 76 C42 74 36 66 34 56Z', 'ln fl') +
    P('M86 56 C90 38 76 28 63 34 C70 46 72 60 68 76 C78 74 84 66 86 56Z', 'ln fl') +
    P('M52 76 C45 58 49 34 60 24 C71 34 75 58 68 76 C64 80 56 80 52 76Z', 'ln fl') +
    P('M60 24 C57 32 57 40 62 46 M55 42 C59 50 61 60 59 70 M66 44 C67 52 66 62 64 70', 'dt') +
    P('M51 78 C55 86 65 86 69 78 M53 82 C47 88 41 90 35 90 M67 82 C73 88 79 90 85 90', 'ln') +
    P('M60 86 C60 98 58 108 56 118') +
    leaf(58, 104, 28, 10, -62, 0.2, true) +
    leaf(57, 112, 24, 9, 58, 0.2, true),
  ylang: () => {
    let s = P('M60 8 C60 16 60 22 60 28') + C(60, 30, 3.5, 'ln fl');
    [-68, -42, -16, 14, 40, 66].forEach((a, i) => {
      const L = 62 + (i % 2) * 10;
      s += `<g transform="translate(60 30) rotate(${a})"><path class="ln fl" d="M0 0 C6 ${L * 0.25} -4 ${L * 0.5} 4 ${L * 0.75} C6 ${L * 0.85} 2 ${L} 0 ${L} C-3 ${L * 0.9} -1 ${L * 0.8} -3 ${L * 0.72} C-8 ${L * 0.5} 2 ${L * 0.28} -3 2Z"/><path class="dt" d="M0 3 C3 ${L * 0.3} -2 ${L * 0.55} 1 ${L * 0.9}"/></g>`;
    });
    return s;
  },
  vanille: () =>
    P('M26 14 C36 44 46 78 52 110 C53 113 57 113 57 110 C51 78 40 44 31 13 C30 10 26 11 26 14Z', 'ln fl') +
    P('M38 18 C50 48 58 80 64 108 C65 111 69 110 69 107 C62 79 54 47 43 17 C42 14 38 15 38 18Z', 'ln fl') +
    P('M32 30 C38 50 44 72 48 92 M45 32 C52 52 58 74 62 94', 'dt') +
    flower(88, 34, 5, 20, 6.5, 0, 2) +
    E(88, 40, 6, 8, 0, 'ln fl') +
    C(88, 36, 2.2, 'ln') +
    P('M88 50 C88 66 82 80 72 92', 'ln'),
  tonka: () => {
    let s = '';
    (
      [
        [44, 46, -28],
        [76, 58, 18],
        [54, 84, -6],
      ] as const
    ).forEach(([x, y, r]) => {
      s += `<g transform="rotate(${r} ${x} ${y})"><path class="ln fl" d="M${x - 26} ${y} C${x - 20} ${y - 12} ${x + 18} ${y - 12} ${x + 26} ${y} C${x + 18} ${y + 10} ${x - 20} ${y + 10} ${x - 26} ${y}Z"/><path class="dt" d="M${x - 18} ${y - 2} C${x - 12} ${y - 6} ${x - 6} ${y + 2} ${x} ${y - 3} C${x + 6} ${y - 7} ${x + 10} ${y + 1} ${x + 17} ${y - 2} M${x - 14} ${y + 4} C${x - 6} ${y + 1} ${x + 2} ${y + 6} ${x + 12} ${y + 3}"/></g>`;
    });
    return s;
  },
  cacao: () =>
    P('M58 10 C82 20 90 66 76 98 C70 112 50 112 44 98 C30 66 36 20 58 10Z', 'ln fl') +
    P('M58 10 C50 40 50 74 58 108 M58 10 C68 40 70 74 62 108 M50 16 C38 44 40 76 48 104 M66 16 C80 44 80 76 72 104', 'dt') +
    P('M58 10 C58 6 60 3 63 1', 'ln') +
    E(96, 92, 9, 13, 24, 'ln fl') +
    P('M92 82 C96 90 98 96 98 104', 'dt') +
    E(22, 96, 8, 12, -20, 'ln fl'),
  patchouli: () => {
    let s = P('M60 116 C60 90 58 60 60 20');
    s +=
      leaf(60, 32, 24, 13, 0, 0.3, true) +
      leaf(60, 60, 30, 17, -60, 0.3, true) +
      leaf(60, 64, 30, 17, 60, 0.3, true) +
      leaf(60, 94, 30, 17, -64, 0.3, true) +
      leaf(60, 98, 30, 17, 64, 0.3, true);
    return s;
  },
  vetiver: () => {
    let s = '';
    [-40, -26, -12, 0, 12, 26, 40].forEach((a, i) => {
      const L = 50 + (i % 3) * 8;
      s += `<g transform="translate(60 70) rotate(${a})"><path class="ln fl" d="M-2 0 C-3 ${-L * 0.5} -1 ${-L * 0.8} 0 ${-L} C2 ${-L * 0.8} 3 ${-L * 0.5} 2 0Z"/></g>`;
    });
    s += E(60, 72, 9, 4, 0, 'ln fl');
    for (let k = 0; k < 9; k++) {
      const x = 52 + k * 2;
      const dx = (k - 4) * 6;
      s += `<path class="dt" d="M${x} 75 C${x + dx * 0.3} 88 ${x + dx * 0.8} 98 ${x + dx} 114"/>`;
    }
    return s;
  },
  menthe: () =>
    P('M60 116 C60 92 60 60 60 22') +
    leaf(60, 30, 30, 9, 0, 0.18, true) +
    leaf(60, 56, 38, 10, -46, 0.18, true) +
    leaf(60, 60, 38, 10, 46, 0.18, true) +
    leaf(60, 90, 36, 10, -50, 0.18, true) +
    leaf(60, 94, 36, 10, 50, 0.18, true),
  ambre: () =>
    P('M38 28 L74 18 L100 44 L94 86 L60 104 L26 80 L22 46Z', 'ln fl') +
    P('M38 28 L54 48 L74 18 M54 48 L100 44 M54 48 L60 104 M54 48 L22 46 M54 48 L94 86 M54 48 L26 80', 'dt') +
    P('M86 100 C86 92 92 86 92 86 C92 86 98 92 98 100 C98 104 95 107 92 107 C89 107 86 104 86 100Z', 'ln fl'),
  bois: () =>
    E(60, 60, 46, 40, -8, 'ln fl') +
    E(60, 60, 34, 29, -8, 'dt') +
    E(60, 60, 23, 19, -8, 'dt') +
    E(60, 60, 12, 10, -8, 'dt') +
    C(60, 60, 3, 'ln') +
    P('M60 20 L62 40 M96 44 L80 52', 'dt'),
};

/** Balisage calculé une seule fois par ingrédient (les dessins sont déterministes). */
const cache = new Map<Ingredient, string>();
export function gravure(nom: Ingredient): string {
  let s = cache.get(nom);
  if (s == null) {
    s = ING[nom]();
    cache.set(nom, s);
  }
  return s;
}
