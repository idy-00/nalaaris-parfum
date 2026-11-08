import type { Moment, Occasion, Porter, Saison } from './parfums';

/**
 * « Quand le porter » — conseils écrits à la main, par slug. Jamais écrasés par `npm run import-catalogue`.
 *
 * Pensés pour Dakar : saison fraîche = déc. → avril (harmattan, soirées plus fraîches),
 * saison chaude = mai → nov. (chaleur humide, hivernage).
 * Déduits uniquement des notes et de la concentration : aucune tenue chiffrée, aucun fait inventé.
 * Un parfum sans conseil n'affiche pas le bloc (le build liste les slugs manquants).
 * À faire relire par la cliente : docs/quand-le-porter-a-valider.md.
 */
const p = (
  moment: Moment,
  momentDetail: string,
  saison: Saison,
  saisonDetail: string,
  icone: Occasion,
  titre: string,
  detail: string,
): Porter => ({ moment, momentDetail, saison, saisonDetail, occasion: { icone, titre, detail } });

export const PORTER: Record<string, Porter> = {
  // Afnan
  'afnan-9pm': p('soir', 'Sorties, rendez-vous', 'fraiche', 'déc. → avril', 'sortie', 'Sillage marqué', 'tient la nuit'),
  'afnan-9pm-rebel': p('jourSoir', 'Journée comme soirée', 'annee', 'frais comme chaud', 'sortie', 'Entre amis', 'fruité puis caramel'),

  // Al Rehab
  'al-rehab-choco-musk': p('soir', 'Soirées douces', 'fraiche', 'déc. → avril', 'ceremonie', 'Korité, Tabaski', 'chocolat, musc et épices'),

  // Ard Al Zaafaran
  'ard-al-zaafaran-mousuf': p('jourSoir', 'Du bureau au soir', 'annee', 'toute l’année', 'bureau', 'Au bureau', 'boisé, sans excès'),
  'ard-al-zaafaran-mousuf-blanc': p('jourSoir', 'Journée, fin d’après-midi', 'annee', 'frais comme chaud', 'quotidien', 'Au quotidien', 'boisé et fruité'),
  'ard-al-zaafaran-mousuf-vert': p('jourSoir', 'Du matin au dîner', 'annee', 'en toute saison', 'bureau', 'Rendez-vous pro', 'net et assuré'),
  'ard-al-zaafaran-mousuf-wardi': p('jour', 'Lumineux, fruité', 'annee', 'toute l’année', 'quotidien', 'Tous les jours', 'rose et fruits rouges'),

  // Armaf
  'armaf-club-de-nuit-intense-man': p('jourSoir', 'Journée et soirée', 'annee', 'frais comme chaud', 'sortie', 'Sorties', 'fruité et boisé'),
  'armaf-odyssey-homme': p('jourSoir', 'Du bureau au dîner', 'annee', 'toute l’année', 'diner', 'Dîner', 'floral, chaud et ambré'),

  // Asdaaf
  'asdaaf-ameerat-al-arab': p('jourSoir', 'Du matin à la nuit', 'annee', 'en toute saison', 'ceremonie', 'Mariages, baptêmes', 'musc propre, oud doux'),
  'asdaaf-ameerat-al-arab-prive-rose': p('jourSoir', 'Après-midi, soirée', 'annee', 'toute l’année', 'diner', 'Dîner en famille', 'rose et fleurs blanches'),

  // Azzaro
  'azzaro-wanted': p('jour', 'Matin et après-midi', 'chaude', 'idéal mai → nov.', 'bureau', 'Au bureau', 'frais, épicé léger'),

  // Carolina Herrera
  'carolina-herrera-212-men': p('jour', 'Le matin, la journée', 'chaude', 'chaleur de l’hivernage', 'quotidien', 'Tous les jours', 'vert et propre'),

  // Chanel
  'chanel-bleu-de-chanel': p('jourSoir', 'Réunion, puis dîner', 'annee', 'toute l’année', 'bureau', 'Réunions, rendez-vous', 'net et élégant'),
  'chanel-coco-mademoiselle': p('jourSoir', 'Du bureau au dîner', 'annee', 'frais comme chaud', 'bureau', 'Au bureau', 'chic, sans en faire trop'),

  // Chloé
  'chloe-leau-de-parfum-intense': p('jourSoir', 'Plutôt en fin de journée', 'annee', 'toute l’année', 'diner', 'Dîner', 'rose boisée, plus intense'),

  // Dior
  'dior-fahrenheit': p('jourSoir', 'Du bureau à la soirée', 'annee', 'en toute saison', 'sortie', 'Soirées', 'cuir et violette'),
  'dior-hypnotic-poison': p('soir', 'Le soir venu', 'fraiche', 'soirées d’harmattan', 'diner', 'Dîner', 'amande et vanille'),
  'dior-jadore': p('jour', 'lumineux, solaire', 'chaude', 'idéal mai → nov.', 'ceremonie', 'Cérémonies', 'bureau, mariages'),
  'dior-miss-dior': p('jour', 'Matinées, après-midi', 'annee', 'toute l’année', 'quotidien', 'Au quotidien', 'floral et doux'),
  'dior-sauvage': p('jourSoir', 'Surtout en soirée', 'annee', 'frais comme chaud', 'sortie', 'Sillage présent', 'une ou deux pulvérisations'),

  // Giorgio Armani
  'giorgio-armani-armani-code-profumo': p('soir', 'Rendez-vous du soir', 'fraiche', 'déc. → avril', 'sortie', 'Rendez-vous', 'chaud et ambré'),
  'giorgio-armani-my-way-intense': p('soir', 'Soirées habillées', 'fraiche', 'déc. → avril', 'ceremonie', 'Mariages', 'tubéreuse, sillage dense'),
  'giorgio-armani-si': p('jourSoir', 'Toute la journée', 'annee', 'toute l’année', 'quotidien', 'Au quotidien', 'fruité et chic'),
  'giorgio-armani-si-intense': p('soir', 'Dîners, soirées', 'fraiche', 'soirées de janvier', 'diner', 'Dîner', 'rose et cassis profonds'),
  'giorgio-armani-si-passione-eclat': p('jour', 'Journée lumineuse', 'annee', 'en toute saison', 'bureau', 'Au bureau', 'rose fraîche, discrète'),

  // Givenchy
  'givenchy-irresistible': p('jour', 'Du matin au goûter', 'annee', 'toute l’année', 'quotidien', 'Tous les jours', 'rose légère, poudrée'),
  'givenchy-linterdit': p('jourSoir', 'Fin de journée, soirée', 'annee', 'frais comme chaud', 'diner', 'Dîner', 'fleurs blanches, fond boisé'),
  'givenchy-linterdit-rouge-ultime': p('soir', 'Dîners, soirées', 'fraiche', 'déc. → avril', 'diner', 'Audacieux', 'pour être remarquée'),

  // Gucci
  'gucci-bloom-intense': p('jourSoir', 'De la fête au dîner', 'annee', 'toute l’année', 'ceremonie', 'Baptêmes, mariages', 'jasmin et fleur d’oranger'),

  // Hermès
  'hermes-terre-dhermes': p('jourSoir', 'Du matin au soir', 'annee', 'en toute saison', 'bureau', 'Au bureau', 'minéral, une pulvérisation suffit'),

  // Jean Paul Gaultier
  'jean-paul-gaultier-le-male-elixir-absolu': p('soir', 'Grandes soirées', 'fraiche', 'déc. → avril', 'sortie', 'Sillage dense', 'une pulvérisation suffit'),
  'jean-paul-gaultier-le-male-le-parfum': p('soir', 'Dès la tombée de la nuit', 'fraiche', 'soirées d’harmattan', 'diner', 'Dîner, rendez-vous', 'vanillé, élégant'),
  'jean-paul-gaultier-scandal': p('soir', 'Soirées', 'fraiche', 'déc. → avril', 'sortie', 'Sorties', 'miel et caramel'),
  'jean-paul-gaultier-scandal-pour-homme': p('jourSoir', 'Après-midi, soirée', 'fraiche', 'saison fraîche', 'sortie', 'Entre amis', 'caramel et sauge'),

  // Kayali
  'kayali-fleur-majesty-rose-royale-31': p('jourSoir', 'Après-midi, soirée', 'annee', 'toute l’année', 'ceremonie', 'Baptêmes', 'rose fruitée, généreuse'),
  'kayali-vanilla-28': p('soir', 'Soirées cocooning', 'fraiche', 'déc. → avril', 'diner', 'Dîner', 'vanille et sucre brun'),

  // Lacoste
  'lacoste-essential': p('jour', 'Journées actives', 'chaude', 'idéal mai → nov.', 'quotidien', 'Tous les jours', 'vert, décontracté'),

  // Lancôme
  'lancome-idole': p('jour', 'Du matin à l’après-midi', 'annee', 'en toute saison', 'bureau', 'Au bureau', 'rose claire, propre'),
  'lancome-la-nuit-tresor': p('soir', 'Rendez-vous à deux', 'fraiche', 'déc. → avril', 'diner', 'Rendez-vous', 'rose noire et vanille'),
  'lancome-la-vie-est-belle': p('jourSoir', 'Du goûter au dîner', 'fraiche', 'saison fraîche', 'quotidien', 'Au quotidien', 'gourmand, réconfortant'),

  // Lattafa
  'lattafa-asad': p('soir', 'Soirées entre amis', 'fraiche', 'déc. → avril', 'sortie', 'Sorties', 'poivré, tabac doux'),
  'lattafa-asad-bourbon': p('soir', 'Soirées posées', 'fraiche', 'soirées de janvier', 'diner', 'Dîner', 'cacao et vanille bourbon'),
  'lattafa-eclaire': p('soir', 'Sorties du soir', 'fraiche', 'déc. → avril', 'sortie', 'Sorties', 'caramel au lait'),
  'lattafa-fakhar-black': p('jourSoir', 'Du bureau au soir', 'annee', 'toute l’année', 'bureau', 'Au bureau', 'aromatique et propre'),
  'lattafa-fakhar-gold-extrait': p('soir', 'Sillage marqué, une pulvérisation', 'fraiche', 'déc. → avril', 'ceremonie', 'Korité, Tabaski', 'ambre et cuir'),
  'lattafa-fakhar-rose': p('jourSoir', 'Journées de fête', 'annee', 'en toute saison', 'ceremonie', 'Mariages', 'bouquet blanc et rose'),
  'lattafa-khamrah': p('soir', 'Soirées et fêtes', 'fraiche', 'déc. → avril', 'ceremonie', 'Tabaski, Korité', 'dattes, épices et praliné'),
  'lattafa-khamrah-qahwa': p('soir', 'Après le dîner', 'fraiche', 'soirées de décembre', 'sortie', 'Sorties', 'café et cardamome'),
  'lattafa-yara': p('jour', 'Après-midi lumineux', 'annee', 'toute l’année', 'quotidien', 'Tous les jours', 'doux, fruité, poudré'),

  // Louis Vuitton
  'louis-vuitton-california-dream': p('jour', 'Journées ensoleillées', 'chaude', 'idéal mai → nov.', 'quotidien', 'Week-end', 'agrumes et musc'),
  'louis-vuitton-les-sables-roses': p('soir', 'Grandes occasions', 'fraiche', 'déc. → avril', 'ceremonie', 'Mariages, baptêmes', 'rose et oud'),

  // Mugler
  'mugler-alien': p('soir', 'Soirées habillées', 'annee', 'toute l’année', 'diner', 'Dîner', 'jasmin ambré, intense'),

  // Paco Rabanne / Rabanne
  'paco-rabanne-1-million': p('soir', 'sorties entre amis', 'fraiche', 'déc. → avril', 'sortie', 'Sillage marqué', 'chaud et sucré'),
  'paco-rabanne-invictus': p('jour', 'Sport, journée', 'chaude', 'chaleur de l’hivernage', 'quotidien', 'Au quotidien', 'marin et frais'),
  'rabanne-invictus-victory-elixir': p('soir', 'Sillage dense, une pulvérisation', 'fraiche', 'déc. → avril', 'sortie', 'Grandes soirées', 'encens et vanille'),

  // Paris Corner
  'paris-corner-marshmallow-blush': p('jourSoir', 'Après-midi gourmand', 'annee', 'frais comme chaud', 'sortie', 'Entre copines', 'fraise et guimauve'),
  'paris-corner-rifaaqat': p('soir', 'Fêtes du soir', 'fraiche', 'déc. → avril', 'ceremonie', 'Cérémonies', 'encens et safran'),
  'paris-corner-rifaaqat-adorn': p('jourSoir', 'Fin de journée', 'annee', 'toute l’année', 'sortie', 'Rendez-vous', 'boisé et ambré'),
  'paris-corner-taskeen-caramel-cascade': p('soir', 'Soirées tranquilles', 'fraiche', 'soirées d’harmattan', 'diner', 'Dîner en famille', 'caramel et miel'),

  // Pendora Scents
  'pendora-scents-intense-wayfarer-homme': p('jourSoir', 'Du travail aux sorties', 'annee', 'en toute saison', 'sortie', 'Sorties', 'fruité et ambré'),

  // Prada
  'prada-paradoxe': p('jourSoir', 'du bureau au dîner', 'annee', 'frais comme chaud', 'quotidien', 'Au quotidien', 'élégant sans forcer'),

  // Tom Ford
  'tom-ford-ombre-leather': p('soir', 'Soirées en ville', 'fraiche', 'déc. → avril', 'diner', 'Dîner', 'cuir doux, épicé'),

  // Valentino
  'valentino-uomo-born-in-roma': p('jour', 'Journée en ville', 'annee', 'toute l’année', 'bureau', 'Au bureau', 'vert et minéral'),

  // Versace
  'versace-eros': p('jourSoir', 'Journée, puis sorties', 'annee', 'frais comme chaud', 'sortie', 'Sorties', 'menthe et vanille'),
  'versace-eros-energy': p('jour', 'Journées chaudes', 'chaude', 'idéal mai → nov.', 'quotidien', 'Tous les jours', 'agrumes pétillants'),

  // Yves Saint Laurent
  'yves-saint-laurent-black-opium-over-red': p('soir', 'Soirées', 'fraiche', 'déc. → avril', 'sortie', 'Sorties', 'cerise et café'),
  'yves-saint-laurent-la-nuit-de-lhomme': p('soir', 'Rendez-vous du soir', 'annee', 'toute l’année', 'diner', 'Rendez-vous', 'cardamome, cuir doux'),
  'yves-saint-laurent-libre': p('jourSoir', 'Du bureau au dîner', 'annee', 'en toute saison', 'bureau', 'Au bureau', 'lavande et vanille'),
  'yves-saint-laurent-y': p('jour', 'Le matin, au travail', 'annee', 'toute l’année', 'bureau', 'Au bureau, sans déranger', 'frais et net'),

  // Zara
  'zara-blue-spirit': p('jour', 'Journées au soleil', 'chaude', 'idéal mai → nov.', 'quotidien', 'Tous les jours', 'léger, ensoleillé'),
  'zara-gardenia': p('jourSoir', 'Après-midi, soirée', 'annee', 'toute l’année', 'diner', 'Dîner', 'fleur d’oranger et café'),
  'zara-nude-bouquet': p('jour', 'L’après-midi', 'annee', 'en toute saison', 'quotidien', 'Au quotidien', 'fruité et doux'),
  'zara-orchid': p('jourSoir', 'Matin comme soir', 'annee', 'toute l’année', 'quotidien', 'Tous les jours', 'vanille florale'),
  'zara-oriental': p('soir', 'Dîners à deux', 'fraiche', 'déc. → avril', 'diner', 'Dîner', 'caramel et patchouli'),
  'zara-peony': p('jour', 'Du matin au déjeuner', 'annee', 'frais comme chaud', 'bureau', 'Au bureau', 'pivoine fraîche'),
  'zara-pink-flambe': p('jour', 'Après-midi détente', 'annee', 'toute l’année', 'quotidien', 'Week-end', 'praliné léger'),
  'zara-red-vanilla': p('jourSoir', 'Après-midi, soirée', 'fraiche', 'saison fraîche', 'sortie', 'Entre amis', 'framboise et praliné'),
  'zara-seoul-532-8-sinsa-dong-gangnam-gu': p('jour', 'Matin et midi', 'chaude', 'idéal mai → nov.', 'bureau', 'Au bureau', 'marin et discret'),
  'zara-violet-blossom': p('jour', 'Matinées douces', 'annee', 'en toute saison', 'quotidien', 'Au quotidien', 'fleurs légères'),
  'zara-wonder-rose': p('jour', 'Après-midi entre amies', 'annee', 'toute l’année', 'quotidien', 'Tous les jours', 'fruité, vanillé doux'),
};
