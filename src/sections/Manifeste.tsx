import { useRef } from 'react';
import { marque } from '../data/infos';
import { gsap, useGSAP, SplitText, MQ } from '../lib/gsap';

/** Bandeau manifeste : la devise en grand serif italique, sur un bouquet de roses en clair-obscur. */
export function Manifeste() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        // Parallaxe : la photo glisse plus lentement que la page
        gsap.fromTo(
          '.manifeste-photo',
          { yPercent: -10 },
          { yPercent: 10, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: 0.8 } },
        );
        SplitText.create('.devise', {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: 1.1,
              stagger: 0.12,
              ease: 'expo.out',
              scrollTrigger: { trigger: '.devise', start: 'top 80%', once: true },
            }),
        });
        gsap.from('.manifeste-filet', {
          scaleX: 0,
          duration: 1.2,
          ease: 'expo.out',
          scrollTrigger: { trigger: '.devise', start: 'top 80%', once: true },
        });
        gsap.from('.signature', {
          opacity: 0,
          y: 12,
          duration: 0.8,
          delay: 0.6,
          scrollTrigger: { trigger: '.devise', start: 'top 80%', once: true },
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-label="Notre devise" className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <picture>
          <source media="(max-width: 767px)" srcSet="/media/manifeste-roses-portrait-720.webp" />
          <img
            src="/media/manifeste-roses-1920.webp"
            srcSet="/media/manifeste-roses-960.webp 960w, /media/manifeste-roses-1920.webp 1920w"
            sizes="100vw"
            alt=""
            width={1920}
            height={1080}
            loading="lazy"
            decoding="async"
            className="manifeste-photo absolute inset-x-0 top-[-12%] h-[124%] w-full object-cover"
          />
        </picture>
        <div className="absolute inset-0 bg-fond/55" />
        <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-fond to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-fond to-transparent" />
      </div>

      <div className="shell flex min-h-[80svh] flex-col items-center justify-center py-28 text-center md:min-h-[90vh]">
        <p className="label mb-10 text-rose-brume">Notre devise</p>
        <div className="manifeste-filet filet mb-10 w-40 md:mb-14" aria-hidden="true" />
        <blockquote>
          <p className="devise mx-auto max-w-5xl font-serif text-[2.4rem] italic leading-[1.06] text-encre sm:text-5xl md:text-[4.25rem] [text-shadow:0_2px_28px_rgba(255,255,255,0.95)]">
            « {marque.devise} »
          </p>
          <footer className="signature mt-12 flex items-center justify-center gap-4">
            <span className="h-px w-10 bg-rose-doux/60" aria-hidden="true" />
            <span className="font-serif text-xl italic text-rose-brume">Yannick &amp; Laetitia</span>
            <span className="h-px w-10 bg-rose-doux/60" aria-hidden="true" />
          </footer>
        </blockquote>
      </div>
    </section>
  );
}
