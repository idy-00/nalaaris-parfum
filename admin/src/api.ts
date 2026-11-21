/**
 * Appels à /api/admin/*. En ligne, Cloudflare Access joint lui-même le jeton (cookie de session) : rien à gérer ici.
 * Écritures : en-tête X-Nalaaris (protection contre les requêtes venues d'un autre site, vérifiée par le serveur).
 * En local uniquement (localhost), l'en-tête X-Dev-Admin remplace Access (voir server/base.ts).
 */
const local = ['localhost', '127.0.0.1'].includes(location.hostname);

export const emailDev = () => {
  try {
    return localStorage.getItem('nalaaris:dev-admin') || 'laetitia@test.local';
  } catch {
    return 'laetitia@test.local';
  }
};

export class ErreurApi extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function requete(methode: string, chemin: string, corps?: unknown, brut?: Blob): Promise<Response> {
  const entetes: Record<string, string> = {};
  if (local) entetes['X-Dev-Admin'] = emailDev();
  if (methode !== 'GET') entetes['X-Nalaaris'] = '1';
  if (corps !== undefined) entetes['Content-Type'] = 'application/json';
  if (brut) entetes['Content-Type'] = brut.type || 'application/octet-stream';
  let r: Response;
  try {
    r = await fetch(`/api/admin/${chemin}`, {
      method: methode,
      headers: entetes,
      body: brut ?? (corps !== undefined ? JSON.stringify(corps) : undefined),
      credentials: 'same-origin',
    });
  } catch {
    throw new ErreurApi(0, 'Pas de connexion internet. Vérifie le réseau et réessaie.');
  }
  if (!r.ok) {
    const d = (await r.json().catch(() => ({}))) as { erreur?: string };
    if (r.status === 401) {
      window.dispatchEvent(new Event('nalaaris:deconnexion'));
      throw new ErreurApi(401, 'Session expirée : reconnecte-toi.');
    }
    throw new ErreurApi(r.status, d.erreur ?? `Erreur ${r.status}. Réessaie.`);
  }
  return r;
}

export const api = {
  get: async <T>(chemin: string) => (await (await requete('GET', chemin)).json()) as T,
  post: async <T>(chemin: string, corps: unknown = {}) => (await (await requete('POST', chemin, corps)).json()) as T,
  put: async <T>(chemin: string, corps: unknown) => (await (await requete('PUT', chemin, corps)).json()) as T,
  patch: async <T>(chemin: string, corps: unknown) => (await (await requete('PATCH', chemin, corps)).json()) as T,
  del: async <T>(chemin: string) => (await (await requete('DELETE', chemin)).json()) as T,
  envoyer: async <T>(chemin: string, fichier: Blob) => (await (await requete('POST', chemin, undefined, fichier)).json()) as T,
  /** Téléchargement (CSV, JSON) : récupéré avec les bons en-têtes puis enregistré. */
  telecharger: async (chemin: string, nom: string) => {
    const blob = await (await requete('GET', chemin)).blob();
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: nom });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },
};
