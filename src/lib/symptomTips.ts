// Tips to reduce / mitigate symptoms shown when score >= 5
export const SYMPTOM_TIPS: Record<string, string[]> = {
  bouffees_chaleur: [
    "Réduire caféine et alcool",
    "Éviter les aliments épicés le soir",
    "Manger des aliments riches en phytoestrogènes (soja, graines de lin, légumineuses)",
    "Pratiquer la cohérence cardiaque",
    "Porter des vêtements en fibres naturelles",
  ],
  fatigue: [
    "Vérifier vos apports en fer, vitamine D et magnésium",
    "Maintenir des horaires de sommeil réguliers",
    "Activité physique modérée 30 min/jour",
    "Éviter les sucres rapides",
  ],
  insomnie: [
    "Magnésium le soir (banane, noix, chocolat noir)",
    "Éviter caféine après 14h",
    "Yoga ou méditation avant le coucher",
    "Chambre fraîche (18-19°C)",
    "Pas d'écrans 1h avant le coucher",
  ],
  anxiete: [
    "Oméga-3 (saumon, sardines, noix)",
    "Magnésium (chocolat noir, épinards)",
    "Cohérence cardiaque 5 min/jour",
    "Réduire caféine et sucres raffinés",
  ],
  douleurs_articulaires: [
    "Oméga-3 anti-inflammatoires",
    "Vitamine D (soleil + alimentation)",
    "Curcuma + poivre noir",
    "Activité physique douce (natation, yoga)",
    "Éviter les aliments pro-inflammatoires (sucre, alcool, charcuterie)",
  ],
  brain_fog: [
    "Oméga-3 (DHA surtout)",
    "Vitamines B (B6, B9, B12)",
    "Myrtilles et fruits rouges",
    "Activité physique régulière",
    "Jeux de mémoire / apprentissage",
  ],
  prise_de_poids: [
    "Privilégier protéines et fibres",
    "Réduire sucres raffinés et alcool",
    "Activité physique 150 min/semaine",
    "Éviter de manger tard le soir",
    "Manger lentement et consciemment",
  ],
  secheresse_cutanee: [
    "Oméga-3 et vitamine E",
    "Avocat, noix, huile d'olive",
    "Boire 1.5-2L d'eau par jour",
    "Réduire alcool et caféine",
  ],
};

export const TIPS_DISCLAIMER =
  "⚠️ Ces conseils sont informatifs et ne remplacent pas un avis médical.";
