export interface RecipeIngredient {
  name: string;
  grams: number;
  ciqualSearch: string; // term to search in aliments_ciqual
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  tags: string[];
  ingredients: RecipeIngredient[];
  menopauseNutrients: string[];
  description: string;
}

export const RECIPES: Recipe[] = [
  {
    id: "salade-saumon",
    name: "Salade de saumon et avocat",
    category: "salade",
    tags: ["salade", "saumon", "avocat", "rapide"],
    ingredients: [
      { name: "Saumon cuit", grams: 150, ciqualSearch: "saumon" },
      { name: "Avocat", grams: 80, ciqualSearch: "avocat" },
      { name: "Épinards frais", grams: 60, ciqualSearch: "épinard" },
      { name: "Tomates cerises", grams: 80, ciqualSearch: "tomate" },
      { name: "Huile d'olive", grams: 15, ciqualSearch: "huile olive" },
    ],
    menopauseNutrients: ["Oméga-3", "Vitamine D", "Magnésium"],
    description: "Riche en oméga-3 et vitamine D, idéale pour la santé osseuse.",
  },
  {
    id: "pates-legumes",
    name: "Pâtes complètes aux légumes",
    category: "pâtes",
    tags: ["pâtes", "légumes", "végétarien", "complet"],
    ingredients: [
      { name: "Pâtes complètes", grams: 80, ciqualSearch: "pâtes" },
      { name: "Brocoli", grams: 100, ciqualSearch: "brocoli" },
      { name: "Champignons", grams: 80, ciqualSearch: "champignon" },
      { name: "Parmesan", grams: 20, ciqualSearch: "parmesan" },
      { name: "Huile d'olive", grams: 10, ciqualSearch: "huile olive" },
    ],
    menopauseNutrients: ["Calcium", "Magnésium", "Fibres"],
    description: "Source de calcium et magnésium grâce au brocoli et au parmesan.",
  },
  {
    id: "soupe-lentilles",
    name: "Soupe de lentilles corail",
    category: "soupe",
    tags: ["soupe", "lentilles", "légumes", "végétarien"],
    ingredients: [
      { name: "Lentilles corail", grams: 100, ciqualSearch: "lentille" },
      { name: "Carottes", grams: 80, ciqualSearch: "carotte" },
      { name: "Oignon", grams: 50, ciqualSearch: "oignon" },
      { name: "Épinards", grams: 50, ciqualSearch: "épinard" },
      { name: "Huile de colza", grams: 10, ciqualSearch: "huile colza" },
    ],
    menopauseNutrients: ["Fer", "Protéines", "Magnésium"],
    description: "Riche en fer et protéines végétales, parfaite pour l'énergie.",
  },
  {
    id: "poulet-quinoa",
    name: "Bowl poulet quinoa",
    category: "bowl",
    tags: ["poulet", "quinoa", "bowl", "protéiné"],
    ingredients: [
      { name: "Poulet grillé", grams: 150, ciqualSearch: "poulet" },
      { name: "Quinoa cuit", grams: 100, ciqualSearch: "quinoa" },
      { name: "Avocat", grams: 60, ciqualSearch: "avocat" },
      { name: "Épinards", grams: 40, ciqualSearch: "épinard" },
      { name: "Graines de lin", grams: 10, ciqualSearch: "lin" },
    ],
    menopauseNutrients: ["Protéines", "Fer", "Oméga-3"],
    description: "Bowl protéiné avec des oméga-3 des graines de lin.",
  },
  {
    id: "omelette-champignons",
    name: "Omelette aux champignons et fromage",
    category: "oeuf",
    tags: ["oeuf", "omelette", "champignon", "fromage", "rapide"],
    ingredients: [
      { name: "Œufs", grams: 120, ciqualSearch: "oeuf" },
      { name: "Champignons", grams: 80, ciqualSearch: "champignon" },
      { name: "Gruyère râpé", grams: 30, ciqualSearch: "gruyère" },
      { name: "Épinards", grams: 40, ciqualSearch: "épinard" },
      { name: "Beurre", grams: 10, ciqualSearch: "beurre" },
    ],
    menopauseNutrients: ["Vitamine D", "Calcium", "Vitamine B12"],
    description: "Source de vitamine D et B12, riche en calcium avec le gruyère.",
  },
  {
    id: "sardines-tomates",
    name: "Sardines grillées sur toast",
    category: "poisson",
    tags: ["sardine", "poisson", "toast", "rapide"],
    ingredients: [
      { name: "Sardines", grams: 120, ciqualSearch: "sardine" },
      { name: "Pain complet", grams: 60, ciqualSearch: "pain complet" },
      { name: "Tomates", grams: 80, ciqualSearch: "tomate" },
      { name: "Huile d'olive", grams: 10, ciqualSearch: "huile olive" },
      { name: "Citron", grams: 15, ciqualSearch: "citron" },
    ],
    menopauseNutrients: ["Oméga-3", "Calcium", "Vitamine D"],
    description: "Les sardines sont riches en calcium, oméga-3 et vitamine D.",
  },
  {
    id: "yaourt-granola",
    name: "Yaourt grec aux noix et fruits",
    category: "petit-déjeuner",
    tags: ["yaourt", "petit-déjeuner", "noix", "fruits", "rapide"],
    ingredients: [
      { name: "Yaourt grec", grams: 150, ciqualSearch: "yaourt" },
      { name: "Noix", grams: 20, ciqualSearch: "noix" },
      { name: "Banane", grams: 80, ciqualSearch: "banane" },
      { name: "Miel", grams: 10, ciqualSearch: "miel" },
      { name: "Amandes", grams: 15, ciqualSearch: "amande" },
    ],
    menopauseNutrients: ["Calcium", "Magnésium", "Protéines"],
    description: "Petit-déjeuner riche en calcium et magnésium.",
  },
  {
    id: "salade-lentilles",
    name: "Salade tiède de lentilles et chèvre",
    category: "salade",
    tags: ["salade", "lentilles", "chèvre", "végétarien"],
    ingredients: [
      { name: "Lentilles vertes cuites", grams: 120, ciqualSearch: "lentille" },
      { name: "Fromage de chèvre", grams: 40, ciqualSearch: "chèvre" },
      { name: "Noix", grams: 20, ciqualSearch: "noix" },
      { name: "Betterave cuite", grams: 60, ciqualSearch: "betterave" },
      { name: "Huile de noix", grams: 10, ciqualSearch: "huile noix" },
    ],
    menopauseNutrients: ["Fer", "Calcium", "Oméga-3"],
    description: "Riche en fer végétal et calcium du fromage de chèvre.",
  },
  {
    id: "soupe-legumes",
    name: "Soupe de légumes verts au curcuma",
    category: "soupe",
    tags: ["soupe", "légumes", "végétarien", "anti-inflammatoire"],
    ingredients: [
      { name: "Brocoli", grams: 100, ciqualSearch: "brocoli" },
      { name: "Courgette", grams: 100, ciqualSearch: "courgette" },
      { name: "Épinards", grams: 60, ciqualSearch: "épinard" },
      { name: "Pomme de terre", grams: 80, ciqualSearch: "pomme de terre" },
      { name: "Huile de colza", grams: 10, ciqualSearch: "huile colza" },
    ],
    menopauseNutrients: ["Calcium", "Magnésium", "Fer"],
    description: "Soupe anti-inflammatoire riche en minéraux essentiels.",
  },
  {
    id: "thon-riz",
    name: "Riz complet au thon et légumes",
    category: "plat",
    tags: ["thon", "riz", "légumes", "complet"],
    ingredients: [
      { name: "Thon en conserve", grams: 120, ciqualSearch: "thon" },
      { name: "Riz complet cuit", grams: 120, ciqualSearch: "riz" },
      { name: "Haricots verts", grams: 80, ciqualSearch: "haricot vert" },
      { name: "Tomates", grams: 60, ciqualSearch: "tomate" },
      { name: "Huile d'olive", grams: 10, ciqualSearch: "huile olive" },
    ],
    menopauseNutrients: ["Protéines", "Oméga-3", "Vitamine B12"],
    description: "Plat complet riche en protéines et vitamine B12.",
  },
];

export function searchRecipes(query: string): Recipe[] {
  const lower = query.toLowerCase().trim();
  if (lower.length < 2) return RECIPES.slice(0, 5);

  const scored = RECIPES.map((r) => {
    let score = 0;
    if (r.name.toLowerCase().includes(lower)) score += 10;
    if (r.category.toLowerCase().includes(lower)) score += 8;
    if (r.tags.some((t) => t.includes(lower))) score += 5;
    if (r.ingredients.some((i) => i.name.toLowerCase().includes(lower))) score += 3;
    return { recipe: r, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.recipe)
    .slice(0, 5);
}
