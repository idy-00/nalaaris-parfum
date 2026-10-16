import { EntetePage } from '../components/EntetePage';
import { Maison } from '../sections/Maison';
import { Manifeste } from '../sections/Manifeste';
import { Humeurs } from '../sections/Humeurs';
import { AppelWhatsApp } from '../sections/AppelWhatsApp';
import { useSeo } from '../hooks/useSeo';
import { ROUTES } from '../lib/routes';

export function MaisonPage() {
  useSeo({
    title: 'La maison — Yannick & Laetitia · Nal’Aaris Perfumes',
    description:
      'Nal’Aaris Perfumes, c’est Yannick et Laetitia : une sélection de parfums authentiques choisis un par un à Dakar, et des conseils sincères sur WhatsApp.',
    path: ROUTES.maison,
    image: '/media/univers-bouquet-1100.webp',
  });

  return (
    <>
      <EntetePage
        fil="La maison"
        surtitre="By Yannick & Laetitia"
        titre={
          <>
            Sentir bon, <em className="text-rose-doux">simplement</em>
          </>
        }
        intro="Deux passionnés, une sélection courte et sincère, et le temps de te conseiller."
        photo={{
          src: '/media/humeur-fleuri-900.webp',
          srcSet: '/media/humeur-fleuri-480.webp 480w, /media/humeur-fleuri-900.webp 900w',
          position: 'center 40%',
        }}
      />
      <Maison />
      <Manifeste />
      <Humeurs />
      <AppelWhatsApp titre="Parlons parfum." />
    </>
  );
}
