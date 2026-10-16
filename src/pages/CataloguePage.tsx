import { EntetePage } from '../components/EntetePage';
import { Catalogue } from '../sections/Catalogue';
import { useSeo } from '../hooks/useSeo';
import { parfums } from '../data/parfums';
import { ROUTES } from '../lib/routes';

export function CataloguePage() {
  useSeo({
    title: 'Catalogue · Nal’Aaris Perfumes',
    description: `Les ${parfums.length} parfums authentiques de Nal’Aaris à Dakar : cherche par nom ou marque, filtre par humeur, et commande sur WhatsApp.`,
    path: ROUTES.catalogue,
  });

  return (
    <>
      <EntetePage
        fil="Catalogue"
        surtitre="Le catalogue"
        titre={
          <>
            La <em className="text-rose-doux">sélection</em>
          </>
        }
        intro="Cherche par nom ou par marque, ou laisse-toi guider par ton humeur. Un écran ne transmet pas une odeur : si tu hésites, écris-nous."
        photo={{
          src: '/media/humeur-oriental-900.webp',
          srcSet: '/media/humeur-oriental-480.webp 480w, /media/humeur-oriental-900.webp 900w',
          position: 'center 35%',
        }}
      />
      <Catalogue />
    </>
  );
}
