import { Link } from 'react-router-dom';
import { contacts, marque } from '../data/infos';
import { IconeWhatsApp, ICONES_RESEAUX } from './IconesReseaux';
import { buildWhatsAppLink, messageConseil } from '../lib/whatsapp';
import { PAGES, ROUTES } from '../lib/routes';

export function Footer() {
  return (
    <footer className="relative mt-16 overflow-hidden border-t border-white/10 bg-noir pb-28 pt-20 md:pb-10">
      {/* Halo bordeaux discret derrière le pied de page */}
      <div
        className="pointer-events-none absolute -bottom-40 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full"
        style={{ background: 'radial-gradient(closest-side, rgba(168,18,79,0.28), transparent)' }}
        aria-hidden="true"
      />

      <div className="shell relative grid gap-12 md:grid-cols-[auto_1fr_auto] md:items-start md:gap-16">
        <img
          src="/brand/logo-nalaaris-240.webp"
          alt="Nal’Aaris Perfumes — by Yannick et Laetitia"
          width={120}
          height={120}
          loading="lazy"
          decoding="async"
          className="h-28 w-28 rounded-full ring-1 ring-rose-doux/30"
        />
        <div>
          <p className="label text-ivoire">{marque.nom}</p>
          <p className="mt-3 max-w-sm font-serif text-xl italic text-rose-brume">« {marque.devise} »</p>
          <p className="mt-3 text-sm text-gris">
            {marque.signature} · {marque.ville}
          </p>
          <nav aria-label="Liens du pied de page" className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {[{ to: ROUTES.accueil, label: 'Accueil' }, ...PAGES, { to: `${ROUTES.commander}#questions`, label: 'Questions fréquentes' }].map((l) => (
              <Link key={l.to} to={l.to} className="inline-flex min-h-[44px] items-center text-ivoire/75 hover:text-rose-doux">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="space-y-5">
          <a
            href={buildWhatsAppLink(messageConseil())}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-3 text-lg text-ivoire hover:text-rose-doux"
          >
            <IconeWhatsApp className="text-rose-doux" /> {contacts.telephoneAffiche}
          </a>
          <ul className="flex flex-wrap gap-3" aria-label="Réseaux sociaux">
            {contacts.reseaux.map((r) => {
              const Icone = ICONES_RESEAUX[r.id];
              return (
                <li key={r.id}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/15 px-4 text-sm text-ivoire/90 transition-colors hover:border-rose-doux/60 hover:text-rose-doux"
                  >
                    <Icone width={18} height={18} />
                    <span>
                      <span className="sr-only">{r.label} : </span>
                      {r.handle}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Signature typographique monumentale */}
      <p
        className="relative mt-16 select-none whitespace-nowrap text-center font-serif text-[19vw] italic leading-[0.8] text-transparent md:mt-20 md:text-[15vw]"
        style={{ WebkitTextStroke: '1px rgba(229,139,174,0.28)' }}
        aria-hidden="true"
      >
        Nal’Aaris
      </p>

      <div className="shell relative mt-10 flex flex-col gap-2 border-t border-white/5 pt-6 text-xs text-gris sm:flex-row sm:justify-between">
        <p>
          © {new Date().getFullYear()} {marque.nom}. Parfums authentiques.
        </p>
        <p>
          Site réalisé par <span className="text-ivoire/80">IkDev</span>
        </p>
      </div>
    </footer>
  );
}
