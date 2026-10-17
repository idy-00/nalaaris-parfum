import { Hero } from '../sections/Hero';
import { Humeurs } from '../sections/Humeurs';
import { SelectionMoment } from '../sections/SelectionMoment';
import { Maison } from '../sections/Maison';
import { Manifeste } from '../sections/Manifeste';
import { Commander } from '../sections/Commander';
import { Goutte } from '../components/Goutte';
import { useSeo } from '../hooks/useSeo';

/** Accueil : une vitrine qui donne envie et renvoie vers les pages Catalogue, La maison et Commander. */
export function Accueil() {
  useSeo({
    title: 'Nal’Aaris Perfumes — Parfums authentiques à Dakar',
    description:
      'Parfums authentiques pour elle et lui, à Dakar. Choisis ton parfum, envoie ta sélection sur WhatsApp, on s’occupe du reste. By Yannick & Laetitia.',
  });
  return (
    <>
      {/* La goutte tombe du monogramme du hero jusqu'au titre « Choisis ton humeur » */}
      <div className="relative">
        <Hero />
        <Humeurs numero="01" />
        <Goutte cible="#humeurs-titre" />
      </div>
      {/* Fonds alternés blanc / blanc rosé : rythme les sections sans ajouter de couleur */}
      <div className="border-y border-encre/5 bg-fond-2/85">
        <SelectionMoment numero="02" />
      </div>
      <Maison numero="03" apercu />
      <Manifeste />
      <div className="border-t border-encre/5 bg-fond-2/85">
        <Commander numero="04" lienInfos />
      </div>
    </>
  );
}
