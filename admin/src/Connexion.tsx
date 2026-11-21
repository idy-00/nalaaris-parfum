import { useEffect, useState, type ReactNode } from 'react';

export function Connexion({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<'chargement' | 'connecte' | 'connexion'>('chargement');
  const [identifiant, setIdentifiant] = useState('admin');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const verifier = async () => {
    try {
      const r = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' });
      if (!r.ok) throw new Error('Serveur de connexion indisponible.');
      const s = await r.json() as { connecte: boolean; configure: boolean };
      setEtat(s.connecte ? 'connecte' : 'connexion');
      if (!s.configure) setErreur('Le mot de passe administrateur doit être configuré sur le serveur.');
    } catch (e) { setErreur((e as Error).message); setEtat('connexion'); }
  };
  useEffect(() => {
    void verifier();
    const expire = () => { setEtat('connexion'); setErreur('Ta session a expiré. Connecte-toi à nouveau.'); };
    window.addEventListener('nalaaris:deconnexion', expire);
    return () => window.removeEventListener('nalaaris:deconnexion', expire);
  }, []);
  if (etat === 'connecte') return <>{children}</>;
  return <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
    <a href="/" className="mb-8 self-start font-serif text-2xl text-rose-doux">Nal’Aaris</a>
    <h1 className="text-4xl">Espace de gestion</h1><p className="mb-6 mt-3 text-sourdine">Connecte-toi avec ton identifiant et ton mot de passe.</p>
    {etat === 'chargement' ? <p role="status">Vérification de la session…</p> : <form className="carte grid gap-4 p-5" onSubmit={async(e) => {
      e.preventDefault(); if (envoi) return; setEnvoi(true); setErreur('');
      try {
        const r = await fetch('/api/auth/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Nalaaris': '1' }, body: JSON.stringify({ identifiant, motDePasse }) });
        const s = await r.json() as { erreur?: string };
        if (!r.ok) throw new Error(s.erreur ?? 'Connexion impossible.');
        setMotDePasse(''); await verifier();
      } catch(e) { setErreur((e as Error).message); } finally { setEnvoi(false); }
    }}>
      <label className="grid gap-2 font-medium">Identifiant<input className="champ" autoComplete="username" value={identifiant} onChange={(e)=>setIdentifiant(e.target.value)} required maxLength={80} autoCapitalize="none" spellCheck={false} /></label>
      <label className="grid gap-2 font-medium">Mot de passe<input className="champ" type="password" autoComplete="current-password" value={motDePasse} onChange={(e)=>setMotDePasse(e.target.value)} required maxLength={256} /></label>
      {erreur && <p role="alert" className="text-sm text-danger">{erreur}</p>}
      <button className="btn btn-rose w-full" disabled={envoi} type="submit">{envoi ? 'Connexion…' : 'Se connecter'}</button>
    </form>}
  </main>;
}
