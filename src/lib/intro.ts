/**
 * Intro du hero, sans jamais bloquer la lecture.
 *
 * index.html pose la classe `intro` sur <html> (le texte [data-intro] est masqué)
 * et la retire d'office au bout de 900 ms. Donc :
 * - JS rapide : GSAP trouve encore `intro` → il anime le texte « depuis invisible », puis retire la classe ;
 * - JS lent ou absent : à 900 ms le texte s'affiche tout seul, et l'intro est sautée (rien ne disparaît).
 */
const html = () => (typeof document === 'undefined' ? null : document.documentElement);

export const introAutorisee = () => !!html()?.classList.contains('intro');

export function introTerminee() {
  const h = html();
  if (!h) return;
  h.classList.remove('intro');
  h.classList.add('js-ready');
}
