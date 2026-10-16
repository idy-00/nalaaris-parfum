import { useId, type ReactNode } from 'react';
import { styleInfo, type Parfum, type Style } from '../data/parfums';

/**
 * Flacon dessiné — remplace la photo tant que `images` est vide.
 * 4 silhouettes (attribuées de façon stable selon le parfum), verre teinté selon le style d'odeur,
 * bouchon or rose, étiquette gravée au nom du parfum.
 */
export type Forme = 'colonne' | 'carre' | 'rond' | 'prisme';
const FORMES: Forme[] = ['colonne', 'carre', 'rond', 'prisme'];

export const formeDe = (slug: string): Forme =>
  FORMES[[...slug].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % FORMES.length];

interface Silhouette {
  corps: string; // contour du verre
  epaisseur?: string; // paroi intérieure (verre épais)
  jus: string; // zone remplie de parfum
  col: { x: number; y: number; w: number; h: number };
  bouchon: (metal: string, ombre: string) => ReactNode;
  etiquette: { cx: number; cy: number; w: number };
  reflet: string;
}

const SILHOUETTES: Record<Forme, Silhouette> = {
  colonne: {
    corps: 'M70 96 Q70 86 80 86 H120 Q130 86 130 96 V240 Q130 250 120 250 H80 Q70 250 70 240 Z',
    epaisseur: 'M76 100 Q76 93 83 93 H117 Q124 93 124 100 V232 Q124 238 118 238 H82 Q76 238 76 232 Z',
    jus: 'M76 128 H124 V232 Q124 238 118 238 H82 Q76 238 76 232 Z',
    col: { x: 90, y: 74, w: 20, h: 14 },
    bouchon: (m, o) => (
      <g>
        <rect x="80" y="22" width="40" height="54" rx="5" fill={m} />
        {[32, 42, 52, 62].map((y) => (
          <rect key={y} x="80" y={y} width="40" height="1.2" fill={o} opacity="0.5" />
        ))}
      </g>
    ),
    etiquette: { cx: 100, cy: 180, w: 46 },
    reflet: 'M78 102 V228',
  },
  carre: {
    corps: 'M52 120 Q52 104 68 104 H132 Q148 104 148 120 V234 Q148 250 132 250 H68 Q52 250 52 234 Z',
    epaisseur: 'M62 124 Q62 114 72 114 H128 Q138 114 138 124 V228 Q138 238 128 238 H72 Q62 238 62 228 Z',
    jus: 'M62 150 H138 V228 Q138 238 128 238 H72 Q62 238 62 228 Z',
    col: { x: 88, y: 92, w: 24, h: 14 },
    bouchon: (m, o) => (
      <g>
        <rect x="72" y="46" width="56" height="48" rx="7" fill={m} />
        <rect x="72" y="46" width="56" height="10" rx="5" fill="#fff" opacity="0.12" />
        <rect x="72" y="84" width="56" height="1.4" fill={o} opacity="0.5" />
      </g>
    ),
    etiquette: { cx: 100, cy: 188, w: 54 },
    reflet: 'M66 124 V226',
  },
  rond: {
    corps: 'M86 112 V104 H114 V112 C150 120 168 148 168 180 C168 220 138 250 100 250 C62 250 32 220 32 180 C32 148 50 120 86 112 Z',
    jus: 'M40 178 H160 C158 214 132 240 100 240 C68 240 42 214 40 178 Z',
    col: { x: 88, y: 90, w: 24, h: 16 },
    bouchon: (m) => (
      <g>
        <path d="M76 92 V74 C76 52 124 52 124 74 V92 Z" fill={m} />
        <ellipse cx="92" cy="66" rx="6" ry="9" fill="#fff" opacity="0.18" />
      </g>
    ),
    etiquette: { cx: 100, cy: 200, w: 50 },
    reflet: 'M50 160 C46 186 54 212 70 228',
  },
  prisme: {
    corps: 'M66 112 H134 L150 136 V226 L134 250 H66 L50 226 V136 Z',
    epaisseur: 'M68 120 H132 L142 138 V224 L132 242 H68 L58 224 V138 Z',
    jus: 'M58 156 H142 V224 L132 242 H68 L58 224 Z',
    col: { x: 88, y: 98, w: 24, h: 16 },
    bouchon: (m, o) => (
      <g>
        <rect x="88" y="26" width="24" height="12" rx="2" fill={m} />
        <rect x="82" y="38" width="36" height="16" rx="2" fill={m} />
        <rect x="76" y="54" width="48" height="46" rx="3" fill={m} />
        <rect x="76" y="54" width="48" height="1.2" fill={o} opacity="0.6" />
        <rect x="82" y="38" width="36" height="1.2" fill={o} opacity="0.6" />
      </g>
    ),
    etiquette: { cx: 100, cy: 190, w: 50 },
    reflet: 'M62 140 V222',
  },
};

export function FlaconPlaceholder({
  style,
  nom,
  forme = 'colonne',
  className = '',
}: {
  style: Style;
  nom?: string;
  forme?: Forme;
  className?: string;
}) {
  const id = useId().replace(/:/g, '');
  const t = styleInfo(style).teinte;
  const s = SILHOUETTES[forme];
  const u = (n: string) => `url(#${n}${id})`;
  const { cx, cy, w } = s.etiquette;
  const nomMaj = (nom ?? '').toUpperCase();
  const m = /^M(\d+) (\d+) H(\d+)/.exec(s.jus);
  const menisque = m ? { x: +m[1], y: +m[2], w: +m[3] - +m[1] } : null;

  return (
    <svg viewBox="0 0 200 280" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`v${id}`} x1="0" x2="1">
          <stop offset="0" stopColor={t} stopOpacity="0.62" />
          <stop offset="0.16" stopColor={t} stopOpacity="0.2" />
          <stop offset="0.48" stopColor="#ffffff" stopOpacity="0.07" />
          <stop offset="0.84" stopColor={t} stopOpacity="0.16" />
          <stop offset="1" stopColor={t} stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id={`j${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={t} stopOpacity="0.45" />
          <stop offset="1" stopColor={t} stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id={`m${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#4a1f1a" />
          <stop offset="0.22" stopColor="#b9786a" />
          <stop offset="0.42" stopColor="#f3d6ca" />
          <stop offset="0.6" stopColor="#c48a78" />
          <stop offset="1" stopColor="#3e1714" />
        </linearGradient>
        <radialGradient id={`o${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.7" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`h${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={t} stopOpacity="0.55" />
          <stop offset="1" stopColor={t} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`c${id}`}>
          <path d={s.corps} />
        </clipPath>
      </defs>

      {/* lumière derrière le flacon + ombre portée */}
      <ellipse cx="100" cy="190" rx="92" ry="96" fill={u('h')} opacity="0.5" />
      <ellipse cx="100" cy="254" rx="70" ry="9" fill={u('o')} />

      {/* col + bouchon */}
      <rect x={s.col.x} y={s.col.y} width={s.col.w} height={s.col.h} fill="#f2c6d6" opacity="0.35" />
      {s.bouchon(u('m'), '#2a0d0b')}

      {/* verre */}
      <path d={s.corps} fill={u('v')} stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <g clipPath={u('c')}>
        <path d={s.jus} fill={u('j')} />
        {/* ménisque : fine ligne claire à la surface du parfum */}
        {menisque && <rect x={menisque.x} y={menisque.y - 0.5} width={menisque.w} height="1.6" fill="#fff" opacity="0.4" />}
        {/* base de verre épaisse */}
        <rect x="0" y="236" width="200" height="20" fill="#fff" opacity="0.08" />
      </g>
      {s.epaisseur && <path d={s.epaisseur} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />}

      {/* étiquette gravée */}
      <g>
        <rect x={cx - w / 2} y={cy - 17} width={w} height={34} rx="1.5" fill="#0b0a0c" fillOpacity="0.28" stroke="#f2c6d6" strokeOpacity="0.7" strokeWidth="0.6" />
        <text x={cx} y={cy - 1} textAnchor="middle" fontFamily="'Bodoni Moda Variable', Didot, serif" fontStyle="italic" fontSize="13" fill="#f2c6d6">
          Np
        </text>
        {nomMaj && (
          <text
            x={cx}
            y={cy + 10}
            textAnchor="middle"
            fontFamily="'Manrope Variable', sans-serif"
            fontSize="4.2"
            fontWeight="600"
            letterSpacing="0.9"
            fill="#f2c6d6"
            fillOpacity="0.9"
            {...(nomMaj.length > 12 ? { textLength: w - 8, lengthAdjust: 'spacingAndGlyphs' } : {})}
          >
            {nomMaj}
          </text>
        )}
      </g>

      {/* reflets */}
      <path d={s.reflet} stroke="#fff" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d={s.reflet} stroke="#fff" strokeOpacity="0.18" strokeWidth="9" strokeLinecap="round" fill="none" transform="translate(6 0)" />
    </svg>
  );
}

/** Visuel d'un parfum : vraie photo si disponible, sinon flacon dessiné. */
export function VisuelParfum({
  parfum,
  className = '',
  priority = false,
  index = 0,
}: {
  parfum: Parfum;
  className?: string;
  priority?: boolean;
  index?: number;
}) {
  const src = parfum.images[index];
  if (src) {
    return (
      <img
        src={src}
        alt={`${parfum.nom} — ${parfum.marque}`}
        width={800}
        height={1000}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`h-full w-full object-contain ${className}`}
      />
    );
  }
  return (
    <FlaconPlaceholder
      style={parfum.styles[0]}
      nom={parfum.nom}
      forme={formeDe(parfum.slug)}
      className={`h-full w-full drop-shadow-[0_24px_30px_rgba(0,0,0,0.55)] ${className}`}
    />
  );
}

/**
 * Scène derrière le flacon : photo d'ambiance de l'humeur, assombrie, + halo.
 * Masquée automatiquement quand une vraie photo produit est fournie (elle a son propre fond).
 */
export function SceneParfum({ parfum, sizes = '(min-width: 1024px) 25vw, 50vw' }: { parfum: Parfum; sizes?: string }) {
  if (parfum.images.length) return null;
  const photo = styleInfo(parfum.styles[0]).photo;
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <img
        src={`/media/${photo}-480.webp`}
        srcSet={`/media/${photo}-480.webp 480w, /media/${photo}-900.webp 900w`}
        sizes={sizes}
        width={480}
        height={600}
        alt=""
        loading="lazy"
        decoding="async"
        className="scene-photo h-full w-full scale-110 object-cover opacity-50"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-noir/30 via-noir/10 to-noir/85" />
    </div>
  );
}
