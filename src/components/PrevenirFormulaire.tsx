import { useState, type FormEvent } from 'react';
import { Bell, Check } from 'lucide-react';

/**
 * « Me prévenir quand il revient » sans passer par WhatsApp : numéro laissé VOLONTAIREMENT, avec mention claire
 * (finalité, durée, suppression). Rien n'est envoyé tant que la personne n'a pas validé le formulaire.
 */
export function PrevenirFormulaire({ slug, ml }: { slug: string; ml: number }) {
  const [etat, setEtat] = useState<'repos' | 'envoi' | 'ok' | 'erreur'>('repos');
  const [message, setMessage] = useState('');

  async function envoyer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setEtat('envoi');
    try {
      const r = await fetch('/api/public/prevenir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, ml: ml || null, prenom: f.get('prenom') || null, telephone: f.get('telephone') }),
      });
      const d = (await r.json().catch(() => ({}))) as { erreur?: string };
      if (!r.ok) throw new Error(d.erreur ?? 'Enregistrement impossible, réessaie.');
      setEtat('ok');
    } catch (err) {
      setMessage((err as Error).message);
      setEtat('erreur');
    }
  }

  if (etat === 'ok')
    return (
      <p role="status" className="flex items-center gap-2 rounded-2xl border border-rose-doux/30 px-4 py-3 text-sm">
        <Check size={18} strokeWidth={2} aria-hidden="true" className="shrink-0 text-rose-doux" />
        C’est noté : on t’écrit sur WhatsApp dès qu’il revient.
      </p>
    );

  return (
    <details className="group rounded-2xl border border-encre/10 px-4">
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-2 text-sm [&::-webkit-details-marker]:hidden">
        <Bell size={16} strokeWidth={1.5} aria-hidden="true" className="text-rose-doux" />
        Laisser mon numéro pour être prévenue
      </summary>
      <form onSubmit={envoyer} className="flex flex-col gap-3 pb-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Prénom <span className="text-sourdine">(facultatif)</span>
            <input name="prenom" maxLength={40} autoComplete="given-name" className="min-h-[44px] rounded-xl border border-encre/20 bg-transparent px-3 text-base" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Numéro WhatsApp
            <input
              name="telephone"
              required
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="77 123 45 67"
              pattern="[\d\s+.\-]{9,20}"
              className="min-h-[44px] rounded-xl border border-encre/20 bg-transparent px-3 text-base"
            />
          </label>
        </div>
        <p className="text-xs text-sourdine">
          Ton numéro sert uniquement à te prévenir du retour de ce parfum. Il est gardé 6 mois au plus, jamais partagé ;
          écris-nous sur WhatsApp pour le faire supprimer à tout moment.
        </p>
        {etat === 'erreur' && (
          <p role="alert" className="text-sm text-dispo-epuise">
            {message}
          </p>
        )}
        <button type="submit" disabled={etat === 'envoi'} className="btn btn-verre self-start">
          {etat === 'envoi' ? 'Envoi…' : 'Me prévenir'}
        </button>
      </form>
    </details>
  );
}
