import { useEffect, useRef, useState } from 'react';
import { ScrollTrigger } from '../lib/gsap';

/**
 * Vidéo d'ambiance (fumée framboise) en fond de hero.
 * - muette, en boucle, sans contrôles : purement décorative (aria-hidden) ;
 * - pas de vidéo si « réduire les animations » ou économie de données : l'affiche suffit ;
 * - version carrée légère sur mobile, mise en pause quand le hero sort de l'écran.
 */
export function VideoFond({ declencheur }: { declencheur: React.RefObject<HTMLElement> }) {
  const video = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<'video' | 'affiche' | null>(null);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const eco = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    setMobile(window.matchMedia('(max-width: 767px)').matches);
    setMode(reduit || eco ? 'affiche' : 'video');
  }, []);

  // Lecture seulement quand le hero est visible (économise batterie et GPU)
  useEffect(() => {
    if (mode !== 'video' || !declencheur.current || !video.current) return;
    const v = video.current;
    const st = ScrollTrigger.create({
      trigger: declencheur.current,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => (self.isActive ? v.play().catch(() => {}) : v.pause()),
    });
    return () => st.kill();
  }, [mode, declencheur]);

  const affiche = mobile ? '/media/hero-fumee-poster-mobile.webp' : '/media/hero-fumee-poster.webp';

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {mode === 'video' ? (
        <video
          ref={video}
          className="video-fond h-full w-full object-cover"
          poster={affiche}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
        >
          {!mobile && <source src="/media/hero-fumee-720.webm" type="video/webm" />}
          <source src={mobile ? '/media/hero-fumee-mobile.mp4' : '/media/hero-fumee-720.mp4'} type="video/mp4" />
        </video>
      ) : (
        <img src={affiche} alt="" className="video-fond h-full w-full object-cover" width={1280} height={720} />
      )}
    </div>
  );
}
