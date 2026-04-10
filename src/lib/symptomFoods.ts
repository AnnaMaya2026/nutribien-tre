/** Maps symptoms to the nutrients that help and food suggestions */
export const SYMPTOM_FOOD_MAP: Record<string, {
  label: string;
  nutrients: string[];
  description: string;
  foods: string[];
}> = {
  bouffees_chaleur: {
    label: "Bouffées de chaleur",
    nutrients: ["phytoestrogènes"],
    description: "Privilégiez les aliments riches en phytoestrogènes",
    foods: ["Tofu", "Soja (edamame)", "Graines de lin", "Lentilles", "Pois chiches"],
  },
  fatigue: {
    label: "Fatigue",
    nutrients: ["fer", "vitamine B12", "magnésium"],
    description: "Augmentez votre apport en fer, B12 et magnésium",
    foods: ["Épinards", "Lentilles", "Sardines", "Amandes", "Quinoa"],
  },
  insomnie: {
    label: "Insomnie",
    nutrients: ["magnésium", "tryptophane"],
    description: "Favorisez le magnésium et le tryptophane",
    foods: ["Banane", "Amandes", "Lait chaud", "Graines de citrouille", "Noix"],
  },
  anxiete: {
    label: "Anxiété",
    nutrients: ["oméga-3", "magnésium"],
    description: "Les oméga-3 et le magnésium aident à réduire l'anxiété",
    foods: ["Saumon", "Sardines", "Noix", "Graines de lin", "Épinards"],
  },
  douleurs_articulaires: {
    label: "Douleurs articulaires",
    nutrients: ["oméga-3", "vitamine D"],
    description: "Les oméga-3 et la vitamine D sont anti-inflammatoires",
    foods: ["Saumon", "Sardines", "Maquereau", "Huile de foie de morue", "Œufs"],
  },
  brain_fog: {
    label: "Troubles de la mémoire",
    nutrients: ["oméga-3", "vitamines B"],
    description: "Les oméga-3 et les vitamines B soutiennent le cerveau",
    foods: ["Saumon", "Noix", "Œufs", "Épinards", "Avocat"],
  },
  sautes_humeur: {
    label: "Sautes d'humeur",
    nutrients: ["oméga-3", "magnésium", "vitamine B6"],
    description: "Stabilisez votre humeur avec oméga-3 et magnésium",
    foods: ["Saumon", "Banane", "Amandes", "Avocat", "Chocolat noir"],
  },
  prise_de_poids: {
    label: "Prise de poids",
    nutrients: ["fibres", "protéines"],
    description: "Privilégiez fibres et protéines pour la satiété",
    foods: ["Lentilles", "Poulet", "Brocoli", "Quinoa", "Fromage blanc"],
  },
  secheresse_cutanee: {
    label: "Sécheresse cutanée",
    nutrients: ["oméga-3", "vitamine E"],
    description: "Les bons gras hydratent la peau de l'intérieur",
    foods: ["Avocat", "Amandes", "Saumon", "Huile d'olive", "Graines de tournesol"],
  },
  baisse_libido: {
    label: "Baisse de libido",
    nutrients: ["zinc", "oméga-3"],
    description: "Le zinc et les oméga-3 soutiennent la libido",
    foods: ["Huîtres", "Graines de citrouille", "Noix", "Chocolat noir", "Avocat"],
  },
  maux_de_tete: {
    label: "Maux de tête",
    nutrients: ["magnésium", "vitamine B2"],
    description: "Le magnésium peut prévenir les migraines",
    foods: ["Amandes", "Épinards", "Quinoa", "Banane", "Graines de chia"],
  },
  palpitations: {
    label: "Palpitations",
    nutrients: ["magnésium", "potassium"],
    description: "Magnésium et potassium pour le rythme cardiaque",
    foods: ["Banane", "Amandes", "Épinards", "Avocat", "Patate douce"],
  },
  ballonnements: {
    label: "Ballonnements",
    nutrients: ["probiotiques", "fibres douces"],
    description: "Privilégiez les fibres douces et les probiotiques",
    foods: ["Yaourt nature", "Gingembre", "Fenouil", "Banane", "Riz"],
  },
  irritabilite: {
    label: "Irritabilité",
    nutrients: ["magnésium", "oméga-3", "vitamine B6"],
    description: "Magnésium et oméga-3 pour calmer l'irritabilité",
    foods: ["Amandes", "Saumon", "Banane", "Chocolat noir", "Avoine"],
  },
  deprime: {
    label: "Déprime / mélancolie",
    nutrients: ["oméga-3", "vitamine D", "tryptophane"],
    description: "Boostez votre humeur avec oméga-3 et vitamine D",
    foods: ["Saumon", "Noix", "Œufs", "Banane", "Chocolat noir"],
  },
  transpiration_nocturne: {
    label: "Transpiration nocturne",
    nutrients: ["phytoestrogènes", "magnésium"],
    description: "Les phytoestrogènes peuvent aider à réguler",
    foods: ["Tofu", "Graines de lin", "Soja", "Sauge (infusion)", "Amandes"],
  },
  fragilite_ongles_cheveux: {
    label: "Fragilité ongles et cheveux",
    nutrients: ["biotine", "zinc", "fer"],
    description: "Fer, zinc et biotine renforcent ongles et cheveux",
    foods: ["Œufs", "Lentilles", "Amandes", "Épinards", "Sardines"],
  },
  secheresse_vaginale: {
    label: "Sécheresse vaginale",
    nutrients: ["phytoestrogènes", "oméga-3"],
    description: "Phytoestrogènes et bons gras pour l'hydratation",
    foods: ["Graines de lin", "Soja", "Avocat", "Huile d'olive", "Saumon"],
  },
};
