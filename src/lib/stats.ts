/**
 * Statistiques du site, sans cookie ni identifiant : navigator.sendBeacon vers /api/evt (même domaine, CSP intacte).
 * Le serveur ne garde que le type d'événement, le parfum, la contenance, la recherche normalisée, le type d'appareil,
 * le domaine d'origine et la date. Robots et navigateurs automatisés : rien n'est envoyé.
 */
export type Evenement =
  | { t: 'vue_fiche'; s: string }
  | { t: 'clic_commander'; s: string; ml?: number }
  | { t: 'clic_whatsapp_general' }
  | { t: 'recherche'; q: string; n: number }
  | { t: 'ajout_selection'; s: string; ml?: number }
  | { t: 'me_prevenir'; s: string; ml?: number };

/** Domaine d'arrivée sur le site (instagram.com…), seulement s'il est extérieur. */
function origine(): string | undefined {
  try {
    const h = document.referrer ? new URL(document.referrer).hostname : '';
    return h && h !== location.hostname ? h : undefined;
  } catch {
    return undefined;
  }
}

export function suivre(e: Evenement) {
  if (typeof navigator === 'undefined' || navigator.webdriver || !navigator.sendBeacon) return;
  try {
    const corps = JSON.stringify({ ...e, ml: 'ml' in e && e.ml ? e.ml : undefined, o: origine() });
    // text/plain : requête « simple », pas de pré-vol CORS
    navigator.sendBeacon('/api/evt', new Blob([corps], { type: 'text/plain' }));
  } catch {
    /* jamais bloquant */
  }
}

/**
 * Un seul écouteur pour tous les liens WhatsApp du site : un lien porte data-evt="clic_commander|me_prevenir"
 * (+ data-slug, data-ml) ; sans attribut, c'est un contact général (conseil, menu, pied de page…).
 */
export function ecouterLiensWhatsApp() {
  document.addEventListener(
    'click',
    (ev) => {
      const a = (ev.target as Element | null)?.closest?.('a[href^="https://wa.me/"]') as HTMLAnchorElement | null;
      if (!a) return;
      const type = a.dataset.evt;
      const slugs = (a.dataset.slug ?? '').split(',').filter(Boolean);
      const ml = Number(a.dataset.ml) || undefined;
      if ((type === 'clic_commander' || type === 'me_prevenir') && slugs.length) slugs.forEach((s) => suivre({ t: type, s, ml }));
      else suivre({ t: 'clic_whatsapp_general' });
    },
    { capture: true },
  );
}
