import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../hooks/useTheme';

/**
 * Vidéo d'ambiance du hero : le geste du parfum (« pschitt »), étalonnée en deux versions (voir scripts/video-hero.sh) :
 * clair (rose poudré, blancs) dans /media, sombre (noir + magenta) dans /media/sombre.
 * Fichiers stables (remplaçables par une vidéo IA sans toucher au code) :
 *   /media/hero-pschitt-desktop.{webm,mp4,webp}  — 1920×1080
 *   /media/hero-pschitt-mobile.{mp4,webp}        — 720×1280
 * Règles : décorative (aria-hidden), muette, en boucle ; jamais chargée avant le contenu (après l'événement load) ;
 * poster seul si « réduire les animations », économie de données ou réseau 2G/3G ; pause hors écran.
 * Lecture / pause : bouton dans le hero (WCAG 2.2.2), piloté par `enPause`. Si « réduire les animations » s'active
 * pendant la visite, la vidéo s'arrête et l'affiche revient.
 */
const MOBILE = '(max-width: 767px)';
const REDUIT = '(prefers-reduced-motion: reduce)';

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

/** `onDisponible` : true quand la vidéo est montée (le bouton pause a un sens), false sinon. */
export function VideoFond({ enPause = false, onDisponible }: { enPause?: boolean; onDisponible?: (ok: boolean) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [jouer, setJouer] = useState(false);
  // Thème réel connu juste après l'hydratation ; la vidéo, elle, n'est montée qu'après le chargement
  const { theme } = useTheme();
  const dossier = theme === 'sombre' ? '/media/sombre' : '/media';

  useEffect(() => {
    const mq = window.matchMedia(REDUIT);
    // Économie de données ou réseau lent (2G/3G) : l'affiche suffit, la vidéo n'est pas téléchargée
    const connexion = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const eco = connexion?.saveData || /(^|-)2g$|^3g$/.test(connexion?.effectiveType ?? '');
    if (eco) return;

    let t: number | undefined;
    const demarrer = () => {
      if (!mq.matches) setJouer(true);
    };
    if (document.readyState === 'complete') t = window.setTimeout(demarrer, 200);
    else window.addEventListener('load', demarrer, { once: true });

    // Préférence changée pendant la visite : on arrête (affiche seule) ou on reprend
    const changement = () => setJouer(!mq.matches && document.readyState === 'complete');
    mq.addEventListener('change', changement);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('load', demarrer);
      mq.removeEventListener('change', changement);
    };
  }, []);

  useEffect(() => onDisponible?.(jouer), [jouer, onDisponible]);

  // Lecture seulement quand le hero est à l'écran ET que le visiteur n'a pas mis en pause
  useEffect(() => {
    const v = video.current;
    if (!jouer || !v) return;
    if (enPause) {
      v.pause();
      return;
    }
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.05 });
    io.observe(v);
    return () => io.disconnect();
  }, [jouer, theme, enPause]);

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
          autoPlay={!enPause}
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
