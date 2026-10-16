import { useRef } from 'react';
import { gsap, useGSAP, ScrollTrigger, SplitText, MQ } from '../lib/gsap';
import { marque } from '../data/infos';
import silhouette from '../data/ombre-silhouette.json';

/**
 * « L'ombre » : la femme du logo, à contre-jour, se parfume.
 * À l'entrée de la section, le flacon libère une brume fine (canvas, ≤ 120 particules, ~1,2 s, une seule fois)
 * qui file vers la devise puis se dissipe. Le canvas s'arrête ensuite. Reduced-motion : image fixe.
 */
const NB = 110;
const DUREE = 1.25;

interface Particule { x: number; y: number; vx: number; vy: number; r: number; vie: number; t: number; c: string }

export function Ombre() {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const devise = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        gsap.from('.ombre-image', {
          opacity: 0,
          y: 30,
          duration: 1.2,
          ease: 'expo.out',
          scrollTrigger: { trigger: root.current, start: 'top 75%', once: true },
        });
        SplitText.create('.ombre-devise', {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: 1,
              stagger: 0.1,
              ease: 'expo.out',
              delay: 0.55,
              scrollTrigger: { trigger: root.current, start: 'top 60%', once: true },
            }),
        });

        // Brume : démarre une fois, quand la section est bien visible
        const st = ScrollTrigger.create({ trigger: root.current, start: 'top 55%', once: true, onEnter: () => brume() });
        return () => st.kill();
      });

      function brume() {
        const cv = canvas.current, img = image.current, cible = devise.current, zone = root.current;
        if (!cv || !img || !cible || !zone) return;
        const ctx = cv.getContext('2d');
        if (!ctx) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const z = zone.getBoundingClientRect();
        cv.width = z.width * dpr;
        cv.height = z.height * dpr;
        ctx.scale(dpr, dpr);

        const ri = img.getBoundingClientRect();
        const rc = cible.getBoundingClientRect();
        const ox = ri.left - z.left + (ri.width * silhouette.flacon.x) / 100;
        const oy = ri.top - z.top + (ri.height * silhouette.flacon.y) / 100;
        // Direction : vers la devise (sur mobile elle est en dessous, sur desktop à droite)
        const tx = rc.left - z.left + rc.width * 0.3;
        const ty = rc.top - z.top + rc.height * 0.4;
        const ang = Math.atan2(ty - oy, tx - ox);
        const dist = Math.hypot(tx - ox, ty - oy);
        const couleurs = ['242,198,214', '229,139,174', '218,8,98'];

        const parts: Particule[] = Array.from({ length: NB }, (_, i) => {
          const a = ang + gsap.utils.random(-0.35, 0.35) - 0.25; // légère montée : la brume flotte
          const v = (dist / DUREE) * gsap.utils.random(0.35, 1.05);
          return {
            x: ox,
            y: oy,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            r: gsap.utils.random(0.6, 2.4),
            vie: gsap.utils.random(0.6, DUREE),
            t: -(i / NB) * 0.35, // émission étalée sur 0,35 s (un « pschitt »)
            c: couleurs[i % 3],
          };
        });

        let fini = false;
        const tick = (_temps: number, dt: number) => {
          const s = dt / 1000;
          ctx.clearRect(0, 0, z.width, z.height);
          let vivantes = 0;
          for (const p of parts) {
            p.t += s;
            if (p.t < 0 || p.t > p.vie) continue;
            vivantes++;
            const k = p.t / p.vie;
            p.vx *= 0.985; // freinage de l'air
            p.vy = p.vy * 0.985 - 6 * s; // la brume monte un peu
            p.x += p.vx * s;
            p.y += p.vy * s;
            const alpha = Math.sin(Math.PI * k) * 0.55;
            ctx.beginPath();
            ctx.fillStyle = `rgba(${p.c},${alpha})`;
            ctx.arc(p.x, p.y, p.r * (1 + k * 1.8), 0, Math.PI * 2);
            ctx.fill();
          }
          if (!vivantes && parts.every((p) => p.t > 0) && !fini) {
            fini = true;
            ctx.clearRect(0, 0, z.width, z.height);
            gsap.ticker.remove(tick); // le canvas s'arrête : plus aucun calcul
          }
        };
        gsap.ticker.add(tick);
      }
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="ombre-titre" className="relative isolate overflow-hidden bg-noir py-20 md:py-28">
      {/* Halo bordeaux derrière la silhouette : la lumière vient de l'arrière */}
      <div
        className="pointer-events-none absolute left-[10%] top-1/2 -z-10 h-[620px] w-[620px] -translate-y-1/2 rounded-full max-md:left-1/2 max-md:top-[30%] max-md:-translate-x-1/2"
        style={{ background: 'radial-gradient(closest-side, rgba(74,6,32,0.9), transparent)' }}
        aria-hidden="true"
      />
      <canvas ref={canvas} className="pointer-events-none absolute inset-0 z-10 h-full w-full" aria-hidden="true" />

      <div className="shell grid items-center gap-12 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
        <div className="ombre-image relative mx-auto w-full max-w-[420px]">
          <img
            ref={image}
            src="/media/ombre-silhouette.webp"
            alt="Illustration de la marque : une femme de profil, chignon haut, se parfume à contre-jour"
            width={silhouette.taille[0]}
            height={silhouette.taille[1]}
            loading="lazy"
            decoding="async"
            // Fondu à droite et en bas : l'illustration est coupée net par le médaillon du logo
            className="h-auto w-full [mask-image:linear-gradient(to_right,#000_50%,transparent_96%),linear-gradient(to_top,transparent,#000_18%)] [mask-composite:intersect] [-webkit-mask-composite:source-in]"
          />
        </div>
        <div>
          <p className="repere mb-6">Le geste</p>
          <h2 id="ombre-titre" className="sr-only">
            Notre devise
          </h2>
          <p
            ref={devise}
            className="ombre-devise font-serif text-[2.3rem] italic leading-[1.08] text-ivoire sm:text-5xl md:text-[3.6rem]"
          >
            « {marque.devise} »
          </p>
          <p className="mt-8 flex items-center gap-4">
            <span className="h-px w-10 bg-rose-logo" aria-hidden="true" />
            <span className="font-serif text-xl italic text-rose-brume">Yannick &amp; Laetitia</span>
          </p>
        </div>
      </div>
    </section>
  );
}
