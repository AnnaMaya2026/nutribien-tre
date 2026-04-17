/** Maps symptom keys to suggested foods (with ciqual search term + helpful nutrient note) */
export interface ReliefFood {
  name: string;
  ciqualSearch: string;
  nutrient: string;
}

export const SYMPTOM_RELIEF_FOODS: Record<string, { label: string; foods: ReliefFood[] }> = {
  bouffees_chaleur: {
    label: "Bouffées de chaleur",
    foods: [
      { name: "Tofu", ciqualSearch: "tofu", nutrient: "Phytoestrogènes" },
      { name: "Graines de lin", ciqualSearch: "lin", nutrient: "Phytoestrogènes (lignanes)" },
      { name: "Soja (edamame)", ciqualSearch: "soja", nutrient: "Isoflavones" },
      { name: "Lentilles", ciqualSearch: "lentille", nutrient: "Phytoestrogènes" },
      { name: "Pois chiches", ciqualSearch: "pois chiche", nutrient: "Phytoestrogènes" },
    ],
  },
  fatigue: {
    label: "Fatigue",
    foods: [
      { name: "Lentilles", ciqualSearch: "lentille", nutrient: "Fer + protéines" },
      { name: "Épinards", ciqualSearch: "épinard", nutrient: "Fer + magnésium" },
      { name: "Sardines", ciqualSearch: "sardine", nutrient: "Vitamine B12" },
      { name: "Quinoa", ciqualSearch: "quinoa", nutrient: "Fer + magnésium" },
      { name: "Amandes", ciqualSearch: "amande", nutrient: "Magnésium" },
    ],
  },
  insomnie: {
    label: "Insomnie",
    foods: [
      { name: "Banane", ciqualSearch: "banane", nutrient: "Magnésium + tryptophane" },
      { name: "Amandes", ciqualSearch: "amande", nutrient: "Magnésium" },
      { name: "Noix", ciqualSearch: "noix", nutrient: "Mélatonine naturelle" },
      { name: "Graines de citrouille", ciqualSearch: "citrouille", nutrient: "Magnésium + tryptophane" },
      { name: "Yaourt nature", ciqualSearch: "yaourt", nutrient: "Tryptophane" },
    ],
  },
  anxiete: {
    label: "Anxiété",
    foods: [
      { name: "Saumon", ciqualSearch: "saumon", nutrient: "Oméga-3" },
      { name: "Sardines", ciqualSearch: "sardine", nutrient: "Oméga-3" },
      { name: "Noix", ciqualSearch: "noix", nutrient: "Oméga-3 (ALA)" },
      { name: "Chocolat noir", ciqualSearch: "chocolat noir", nutrient: "Magnésium" },
      { name: "Épinards", ciqualSearch: "épinard", nutrient: "Magnésium" },
    ],
  },
  douleurs_articulaires: {
    label: "Douleurs articulaires",
    foods: [
      { name: "Saumon", ciqualSearch: "saumon", nutrient: "Oméga-3 + vitamine D" },
      { name: "Sardines", ciqualSearch: "sardine", nutrient: "Oméga-3 + vitamine D" },
      { name: "Maquereau", ciqualSearch: "maquereau", nutrient: "Oméga-3" },
      { name: "Œufs", ciqualSearch: "oeuf", nutrient: "Vitamine D" },
      { name: "Curcuma", ciqualSearch: "curcuma", nutrient: "Anti-inflammatoire" },
    ],
  },
  brain_fog: {
    label: "Troubles de la mémoire",
    foods: [
      { name: "Saumon", ciqualSearch: "saumon", nutrient: "Oméga-3 (DHA)" },
      { name: "Noix", ciqualSearch: "noix", nutrient: "Oméga-3" },
      { name: "Œufs", ciqualSearch: "oeuf", nutrient: "Choline + vitamines B" },
      { name: "Myrtilles", ciqualSearch: "myrtille", nutrient: "Antioxydants" },
      { name: "Épinards", ciqualSearch: "épinard", nutrient: "Folates (B9)" },
    ],
  },
  prise_de_poids: {
    label: "Prise de poids",
    foods: [
      { name: "Lentilles", ciqualSearch: "lentille", nutrient: "Fibres + protéines" },
      { name: "Poulet", ciqualSearch: "poulet", nutrient: "Protéines maigres" },
      { name: "Brocoli", ciqualSearch: "brocoli", nutrient: "Fibres + faible calorie" },
      { name: "Quinoa", ciqualSearch: "quinoa", nutrient: "Protéines + fibres" },
      { name: "Fromage blanc", ciqualSearch: "fromage blanc", nutrient: "Protéines satiantes" },
    ],
  },
  secheresse_cutanee: {
    label: "Sécheresse cutanée",
    foods: [
      { name: "Avocat", ciqualSearch: "avocat", nutrient: "Vitamine E + bons gras" },
      { name: "Amandes", ciqualSearch: "amande", nutrient: "Vitamine E" },
      { name: "Saumon", ciqualSearch: "saumon", nutrient: "Oméga-3" },
      { name: "Huile d'olive", ciqualSearch: "huile olive", nutrient: "Vitamine E" },
      { name: "Graines de tournesol", ciqualSearch: "tournesol", nutrient: "Vitamine E" },
    ],
  },
  sautes_humeur: {
    label: "Sautes d'humeur",
    foods: [
      { name: "Saumon", ciqualSearch: "saumon", nutrient: "Oméga-3" },
      { name: "Banane", ciqualSearch: "banane", nutrient: "Vitamine B6" },
      { name: "Amandes", ciqualSearch: "amande", nutrient: "Magnésium" },
      { name: "Avocat", ciqualSearch: "avocat", nutrient: "Vitamine B6" },
      { name: "Chocolat noir", ciqualSearch: "chocolat noir", nutrient: "Magnésium" },
    ],
  },
};
