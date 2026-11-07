import { useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { STYLES, parfums, type Style } from '../data/parfums';
import { ecrireFiltres, lireFiltres } from '../lib/catalogue';
import { ROUTES } from '../lib/routes';
import { useTeinteBrume } from '../components/Brume';
import { PhotoHumeur } from '../components/Photo';
import { gsap, useGSAP, MQ } from '../lib/gsap';

/** « Choisis ton humeur » : 6 tuiles photographiques qui teintent la brume et filtrent le catalogue. */
export function Humeurs({ numero }: { numero?: string }) {
  const root = useRef<HTMLElement>(null);
  const setTeinte = useTeinteBrume();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const actifs = lireFiltres(params).styles;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        gsap.from('.humeur-entete > *', {
          opacity: 0,
          y: 24,
          stagger: 0.08,
          scrollTrigger: { trigger: '.humeur-entete', start: 'top 85%', once: true },
        });
        // Les tuiles montent en fondu, la photo se pose (scale 1.15 → 1) — transform + opacity uniquement
        gsap.utils.toArray<HTMLElement>('.tuile').forEach((el, i) => {
          gsap
            .timeline({ scrollTrigger: { trigger: el, start: 'top 92%', once: true }, delay: (i % 3) * 0.08 })
            .from(el, { opacity: 0, y: 40, duration: 1.1, ease: 'expo.out' })
            .from(el.querySelectorAll('img'), { scale: 1.15, duration: 1.4, ease: 'expo.out' }, 0)
            .from(el.querySelectorAll('.tuile-texte > *'), { opacity: 0, y: 14, stagger: 0.06, duration: 0.7 }, 0.35);
        });
      });
    },
    { scope: root },
  );

  const choisir = (s: Style) => {
    const f = { ...lireFiltres(params), styles: [s] };
    navigate({ pathname: ROUTES.catalogue, search: ecrireFiltres(f).toString() });
  };

  return (
    <section ref={root} id="humeurs" aria-labelledby="humeurs-titre" className="shell py-20 md:py-28">
      <div className="humeur-entete mb-10 grid gap-6 md:mb-14 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="repere mb-4" data-n={numero}>
            Par où commencer
          </p>
          <h2 id="humeurs-titre" className="text-[2.6rem] leading-[1.02] md:text-5xl">
            Choisis ton <em className="text-rose-doux">humeur</em>
          </h2>
        </div>
        <p className="max-w-sm text-encre/75 md:text-right">
          Commence par ce que tu aimes sentir. On filtre la sélection pour toi.
        </p>
      </div>

      <ul
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-5"
        onPointerLeave={() => setTeinte(null)}
      >
        {STYLES.map((s) => {
          const n = parfums.filter((p) => p.styles.includes(s.id)).length;
          const actif = actifs.includes(s.id);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => choisir(s.id)}
                onPointerEnter={() => setTeinte(s.id)}
                onFocus={() => setTeinte(s.id)}
                onBlur={() => setTeinte(null)}
                aria-pressed={actif}
                aria-label={`${s.label} — ${s.humeur}. ${n} parfum${n > 1 ? 's' : ''}`}
                className={`tuile group relative block aspect-[4/5] w-full overflow-hidden rounded-card text-left ring-1 ring-inset transition-shadow lg:aspect-[5/6] ${
                  actif ? 'ring-2 ring-rose-doux' : 'ring-encre/10 hover:ring-rose-doux/50'
                }`}
              >
                <PhotoHumeur
                  photo={s.photo}
                  sizes="(min-width: 1024px) 400px, 50vw"
                  className="absolute inset-0 transition-transform duration-[900ms] ease-sillage group-hover:scale-[1.06]"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-fond via-fond/35 to-fond/0" aria-hidden="true" />
                <span
                  className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full border border-encre/25 bg-fond/45 transition-colors group-hover:border-rose-doux group-hover:bg-rose md:right-4 md:top-4 md:h-11 md:w-11"
                  aria-hidden="true"
                >
                  <ArrowUpRight size={18} strokeWidth={1.5} />
                </span>
                <span className="tuile-texte absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4 md:p-6" aria-hidden="true">
                  <span className="label text-xs text-rose-brume/90">
                    {n} parfum{n > 1 ? 's' : ''}
                  </span>
                  <span className="font-serif text-[1.9rem] leading-none md:text-[2.6rem]">{s.label}</span>
                  <span className="text-sm leading-snug text-encre/80 md:text-base">{s.humeur}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
