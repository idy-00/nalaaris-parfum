import { Link } from 'react-router-dom';
import { useSeo } from '../hooks/useSeo';
import { ROUTES } from '../lib/routes';
import { buildWhatsAppLink, messageConseil } from '../lib/whatsapp';
import { IconeWhatsApp } from '../components/IconesReseaux';

export function NotFound() {
  useSeo({ title: 'Page introuvable · Nal’Aaris Perfumes', description: 'Cette page n’existe pas ou plus.' });
  return (
    <div className="shell flex min-h-[80svh] items-center justify-center pt-24">
      <div className="verre-rose max-w-lg rounded-[28px] px-8 py-12 text-center">
        <p className="label text-rose-doux">Page introuvable</p>
        <h1 className="mt-4 text-3xl">Ce parfum s’est envolé.</h1>
        <p className="mt-4 text-sourdine">Le lien est peut-être ancien. Retrouve toute la sélection ou demande-nous directement.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to={ROUTES.catalogue} className="btn btn-rose">
            Voir la sélection
          </Link>
          <a href={buildWhatsAppLink(messageConseil())} target="_blank" rel="noopener noreferrer" className="btn btn-verre">
            <IconeWhatsApp /> WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
