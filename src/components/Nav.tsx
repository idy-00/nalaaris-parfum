import { useCallback, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Heart, Menu, X } from 'lucide-react';
import { PAGES } from '../lib/routes';
import { useSelection } from '../hooks/useSelection';
import { Monogramme } from './Monogramme';
import { IconeWhatsApp, ICONES_RESEAUX } from './IconesReseaux';
import { buildWhatsAppLink, messageConseil } from '../lib/whatsapp';
import { contacts } from '../data/infos';
import { gsap, useGSAP, MQ } from '../lib/gsap';
import { useFocusTrap } from '../hooks/useFocusTrap';

const LIENS = PAGES;

/** Lien de navigation : NavLink pose aria-current="page" sur la page active. */
const classeLien = ({ isActive }: { isActive: boolean }) =>
  `relative inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-medium transition-colors hover:text-rose-doux ${
    isActive
      ? 'text-ivoire after:absolute after:inset-x-4 after:bottom-2 after:h-px after:bg-rose-doux'
      : 'text-ivoire/75'
  }`;

export function Nav() {
  const [menu, setMenu] = useState(false);
  const { count, ouvrir } = useSelection();
  const fermer = useCallback(() => setMenu(false), []);
  const menuRef = useRef<HTMLDivElement>(null);
  useFocusTrap(menuRef, menu, fermer);

  useGSAP(
    () => {
      if (menu) {
        gsap.set(menuRef.current, { autoAlpha: 1 });
        const reduce = window.matchMedia(MQ.reduce).matches;
        gsap
          .timeline()
          .fromTo('.menu-fond', { opacity: 0 }, { opacity: 1, duration: 0.35 })
          .fromTo(
            '.menu-item',
            { opacity: 0, y: reduce ? 0 : 24 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: 'expo.out' },
            '-=0.15',
          );
      } else {
        gsap.to(menuRef.current, { autoAlpha: 0, duration: 0.2 });
      }
    },
    { scope: menuRef, dependencies: [menu] },
  );

  return (
    <>
      <a href="#contenu" className="sr-only-focusable btn btn-rose fixed left-4 top-3 z-menu">
        Aller au contenu
      </a>
      <header className="fixed inset-x-0 top-0 z-nav px-3 pt-3 md:px-6">
        <nav
          aria-label="Navigation principale"
          className="verre-fume mx-auto flex h-[var(--nav-h)] max-w-site items-center justify-between rounded-full pl-4 pr-2 md:pl-6"
        >
          <Link to="/" className="flex items-center gap-3 rounded-full py-1 pr-2" aria-label="Nal’Aaris Perfumes — accueil">
            <Monogramme className="h-9 w-auto text-rose-logo" title="" />
            <span className="label text-ivoire">Nal’Aaris</span>
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {LIENS.map((l) => (
              <li key={l.label}>
                <NavLink to={l.to} className={classeLien}>
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={ouvrir}
              aria-haspopup="dialog"
              aria-label={`Ma sélection : ${count} parfum${count > 1 ? 's' : ''}`}
              className="relative grid h-11 w-11 place-items-center rounded-full text-ivoire transition-colors hover:text-rose-doux"
            >
              <Heart size={20} strokeWidth={1.5} aria-hidden="true" />
              {count > 0 && (
                <span
                  className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose px-1 text-xs font-semibold tabular-nums text-ivoire"
                  aria-hidden="true"
                >
                  {count}
                </span>
              )}
            </button>
            <a
              href={buildWhatsAppLink(messageConseil())}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-rose-brume transition-colors hover:text-rose-doux md:border md:border-rose-doux/40 md:px-4"
              aria-label="Écrire sur WhatsApp"
            >
              <IconeWhatsApp />
              <span className="hidden lg:inline">WhatsApp</span>
            </a>
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-full text-ivoire md:hidden"
              aria-label="Ouvrir le menu"
              aria-expanded={menu}
              aria-controls="menu-mobile"
              onClick={() => setMenu(true)}
            >
              <Menu size={22} strokeWidth={1.5} />
            </button>
          </div>
        </nav>
      </header>

      {/* Menu mobile plein écran sur verre */}
      <div
        ref={menuRef}
        id="menu-mobile"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="invisible fixed inset-0 z-menu opacity-0 md:hidden"
        // @ts-expect-error — `inert` est un attribut HTML valide, pas encore typé dans React 18
        inert={menu ? undefined : ''}
      >
        <div className="menu-fond verre-fume absolute inset-0 rounded-none border-0" style={{ background: 'rgba(11,10,12,0.72)' }} />
        <div className="relative flex h-full flex-col px-6 pb-10 pt-5">
          <div className="flex items-center justify-between">
            <Monogramme className="h-10 w-auto text-rose-logo" title="" />
            <button
              type="button"
              onClick={fermer}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/15"
              aria-label="Fermer le menu"
            >
              <X size={22} strokeWidth={1.5} />
            </button>
          </div>
          <ul className="mt-14 space-y-1">
            {[{ to: '/', label: 'Accueil' }, ...LIENS].map((l, i) => (
              <li key={l.label} className="menu-item">
                <NavLink
                  to={l.to}
                  end
                  onClick={fermer}
                  className={({ isActive }) =>
                    `flex items-baseline gap-4 py-2.5 font-serif text-[2.6rem] leading-tight ${isActive ? 'text-rose-doux' : 'text-ivoire'}`
                  }
                >
                  <span className="font-sans text-xs tabular-nums text-gris">0{i + 1}</span>
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="mt-auto space-y-6">
            <a
              href={buildWhatsAppLink(messageConseil())}
              target="_blank"
              rel="noopener noreferrer"
              className="menu-item btn btn-rose w-full"
            >
              <IconeWhatsApp /> Écrire sur WhatsApp
            </a>
            <ul className="menu-item flex justify-center gap-3">
              {contacts.reseaux.map((r) => {
                const Icone = ICONES_RESEAUX[r.id];
                return (
                  <li key={r.id}>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${r.label} ${r.handle}`}
                      className="grid h-12 w-12 place-items-center rounded-full border border-white/15 text-ivoire"
                    >
                      <Icone />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
