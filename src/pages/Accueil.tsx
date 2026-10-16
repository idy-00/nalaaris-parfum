import { Hero } from '../sections/Hero';
import { Humeurs } from '../sections/Humeurs';
import { SelectionMoment } from '../sections/SelectionMoment';
import { Maison } from '../sections/Maison';
import { Manifeste } from '../sections/Manifeste';
import { Commander } from '../sections/Commander';
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
      <Hero />
      <Humeurs numero="01" />
      <SelectionMoment numero="02" />
      <Maison numero="03" apercu />
      <Manifeste />
      <Commander numero="04" lienInfos />
    </>
  );
}
