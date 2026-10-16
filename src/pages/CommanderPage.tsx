import { EntetePage } from '../components/EntetePage';
import { Commander } from '../sections/Commander';
import { Infos } from '../sections/Infos';
import { Faq } from '../sections/Faq';
import { AppelWhatsApp } from '../sections/AppelWhatsApp';
import { useSeo } from '../hooks/useSeo';
import { ROUTES } from '../lib/routes';

export function CommanderPage() {
  useSeo({
    title: 'Commander & livraison · Nal’Aaris Perfumes',
    description:
      'Comment commander chez Nal’Aaris Perfumes : choisis, envoie ta sélection sur WhatsApp, on s’occupe du reste avec toi.',
    path: ROUTES.commander,
  });

  return (
    <>
      <EntetePage
        fil="Commander"
        surtitre="Commande & livraison"
        titre={
          <>
            Trois gestes, <em className="text-rose-doux">et c’est chez toi</em>
          </>
        }
        intro="Pas de compte à créer, pas de paiement en ligne : tout se règle en quelques messages sur WhatsApp."
        photo={{
          src: '/media/humeur-doux-900.webp',
          srcSet: '/media/humeur-doux-480.webp 480w, /media/humeur-doux-900.webp 900w',
          position: 'center',
        }}
      />
      <Commander enPage />
      <Infos />
      <Faq />
      <AppelWhatsApp />
    </>
  );
}
