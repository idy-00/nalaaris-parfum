import { useEffect, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Piège de focus pour tiroirs et menus : Tab circule à l'intérieur, Échap ferme,
 * le focus revient sur l'élément déclencheur à la fermeture, le défilement de la page est bloqué.
 */
export function useFocusTrap(ref: RefObject<HTMLElement>, actif: boolean, onClose: () => void) {
  useEffect(() => {
    if (!actif || !ref.current) return;
    const root = ref.current;
    const precedent = document.activeElement as HTMLElement | null;
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    const items = () => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    // Laisse l'animation d'ouverture démarrer avant de déplacer le focus
    const t = window.setTimeout(() => (root.querySelector<HTMLElement>('[data-autofocus]') ?? items()[0])?.focus(), 60);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = items();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = overflow;
      precedent?.focus?.();
    };
  }, [actif, ref, onClose]);
}
