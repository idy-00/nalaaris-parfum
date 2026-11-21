/**
 * Limitation de débit en mémoire, par instance. L'adresse IP n'est jamais stockée : seule une empreinte
 * (hash de l'IP + sel du jour) sert de clé, et la table est vidée chaque minute.
 * Limite connue : chaque instance a sa propre mémoire. Suffisant contre un script naïf, pas contre un attaquant
 * déterminé (qui ne peut de toute façon que gonfler des statistiques).
 */
const fenetres = new Map<string, number>();
let minute = 0;

export async function limiter(req: Request, espace: string, parMinute: number): Promise<boolean> {
  const m = Math.floor(Date.now() / 60_000);
  if (m !== minute) {
    fenetres.clear();
    minute = m;
  }
  const ip = req.headers.get('CF-Connecting-IP') ?? 'local';
  const jour = new Date().toISOString().slice(0, 10);
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${espace}|${jour}|${ip}`));
  const cle = btoa(String.fromCharCode(...new Uint8Array(h).slice(0, 12)));
  const n = (fenetres.get(cle) ?? 0) + 1;
  fenetres.set(cle, n);
  return n <= parMinute;
}

/** Robots, aperçus de liens, outils de mesure : ignorés par les statistiques. */
export const estRobot = (ua: string) =>
  !ua || /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp|curl|wget|python|node-fetch|axios/i.test(ua);

export const appareil = (ua: string): 'mobile' | 'tablette' | 'ordinateur' =>
  /ipad|tablet|android(?!.*mobi)/i.test(ua) ? 'tablette' : /mobi|iphone|android/i.test(ua) ? 'mobile' : 'ordinateur';
