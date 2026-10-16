import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { parfums } from '../data/parfums';
import { CarteParfum } from '../components/CarteParfum';
import { gsap, useGSAP, ScrollTrigger, MQ } from '../lib/gsap';
import { ROUTES } from '../lib/routes';

/** Accueil : coups de cœur et nouveautés, puis renvoi vers le catalogue complet. */
export function SelectionMoment({ numero }: { numero?: string }) {
  const root = useRef<HTMLElement>(null);
  // Coups de cœur et nouveautés en alternance, 4 au maximum
  const coeur = parfums.filter((p) => p.coupDeCoeur);
  const nouveaux = parfums.filter((p) => p.nouveau && !p.coupDeCoeur);
  const liste = coeur.flatMap((p, i) => [p, nouveaux[i]]).filter(Boolean).slice(0, 4);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        gsap.from('.moment-entete > *', {
          opacity: 0,
          y: 24,
          stagger: 0.08,
          scrollTrigger: { trigger: '.moment-entete', start: 'top 85%', once: true },
        });
        gsap.set('.carte', { opacity: 0, y: 24 });
        ScrollTrigger.batch('.carte', {
          start: 'top 92%',
          once: true,
          onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'expo.out', overwrite: true }),
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="moment-titre" className="shell py-20 md:py-28">
      <div className="moment-entete mb-10 flex flex-col justify-between gap-6 md:mb-14 md:flex-row md:items-end">
        <div>
          <p className="repere mb-4" data-n={numero}>
            En ce moment
          </p>
          <h2 id="moment-titre" className="text-[2.6rem] leading-[1.02] md:text-5xl">
            Nos coups de <em className="text-rose-doux">cœur</em>
          </h2>
        </div>
        <Link to={ROUTES.catalogue} className="btn btn-trait self-start md:self-auto">
          Voir les {parfums.length} parfums
          <ArrowRight size={18} strokeWidth={1.5} aria-hidden="true" />
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
        {liste.map((p) => (
          <li key={p.slug} className="flex">
            <CarteParfum parfum={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}
