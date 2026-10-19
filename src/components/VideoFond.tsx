import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../hooks/useTheme';

/**
 * Vidéo d'ambiance du hero : le geste du parfum (« pschitt »), étalonnée en deux versions (voir scripts/video-hero.sh) :
 * clair (rose poudré, blancs) dans /media, sombre (noir + magenta) dans /media/sombre.
 * Fichiers stables (remplaçables par une vidéo IA sans toucher au code) :
 *   /media/hero-pschitt-desktop.{webm,mp4,webp}  — 1920×1080
 *   /media/hero-pschitt-mobile.{mp4,webp}        — 720×1280
 * Règles : décorative (aria-hidden), muette, en boucle ; jamais chargée avant le contenu ;
 * poster seul si « réduire les animations » ou économie de données ; pause hors écran.
 */
const MOBILE = '(max-width: 767px)';

function Affiche({ dossier, variante }: { dossier: string; variante: string }) {
  return (
    <picture>
      <source media={MOBILE} srcSet={`${dossier}/hero-pschitt-mobile.webp`} />
      <img
        src={`${dossier}/hero-pschitt-desktop.webp`}
        alt=""
        width={1920}
        height={1080}
        // @ts-expect-error — fetchpriority est valide en HTML, pas encore typé dans React 18
        fetchpriority="high"
        data-variante={variante}
        className="video-fond absolute inset-0 h-full w-full object-cover"
      />
    </picture>
  );
}

export function VideoFond() {
  const video = useRef<HTMLVideoElement>(null);
  const [jouer, setJouer] = useState(false);
  // Thème réel connu juste après l'hydratation ; la vidéo, elle, n'est montée qu'après le chargement
  const { theme } = useTheme();
  const dossier = theme === 'sombre' ? '/media/sombre' : '/media';

  useEffect(() => {
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const eco = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (reduit || eco) return;
    // La vidéo attend que la page (texte, poster, polices) soit chargée
    const demarrer = () => setJouer(true);
    if (document.readyState === 'complete') {
      const t = window.setTimeout(demarrer, 200);
      return () => window.clearTimeout(t);
    }
    window.addEventListener('load', demarrer, { once: true });
    return () => window.removeEventListener('load', demarrer);
  }, []);

  // Pause dès que le hero sort de l'écran
  useEffect(() => {
    const v = video.current;
    if (!jouer || !v) return;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.05 });
    io.observe(v);
    return () => io.disconnect();
  }, [jouer, theme]);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Calque animé au défilement par le hero (reste le même quand la vidéo change de thème) */}
      <div className="video-calque absolute inset-0">
      {/* Poster : toujours présent, c'est lui qui s'affiche en premier (version du thème, voir ImageTheme) */}
      {/* Une balise par version (pas de changement de source sur place : le navigateur chargerait la version desktop au passage) */}
      {theme === 'clair' && <Affiche dossier="/media" variante="clair" />}
      {theme === 'sombre' && <Affiche dossier="/media/sombre" variante="sombre" />}
      {jouer && (
        <video
          key={theme}
          ref={video}
          className="video-fond absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
          aria-hidden="true"
          tabIndex={-1}
        >
          <source media="(min-width: 768px)" src={`${dossier}/hero-pschitt-desktop.webm`} type="video/webm" />
          <source media="(min-width: 768px)" src={`${dossier}/hero-pschitt-desktop.mp4`} type="video/mp4" />
          <source src={`${dossier}/hero-pschitt-mobile.mp4`} type="video/mp4" />
        </video>
      )}
      </div>
    </div>
  );
}
