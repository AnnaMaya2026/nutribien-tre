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
  prepTime: number; // minutes
  cookTime: number; // minutes
  steps: string[];
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
    prepTime: 10,
    cookTime: 8,
    steps: [
      "Cuire le saumon à la poêle 3-4 min de chaque côté avec un filet d'huile d'olive.",
      "Laver les épinards et couper les tomates cerises en deux.",
      "Couper l'avocat en tranches fines.",
      "Émietter le saumon tiède sur le lit d'épinards.",
      "Ajouter avocat et tomates, arroser d'huile d'olive et de jus de citron.",
    ],
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
    prepTime: 5,
    cookTime: 12,
    steps: [
      "Faire bouillir une grande casserole d'eau salée.",
      "Cuire les pâtes complètes selon les indications du paquet (env. 10-12 min).",
      "Pendant ce temps, faire revenir les champignons émincés à l'huile d'olive.",
      "Ajouter le brocoli en bouquets et cuire 5 min à couvert.",
      "Mélanger les pâtes égouttées aux légumes.",
      "Parsemer de parmesan râpé et servir aussitôt.",
    ],
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
    prepTime: 10,
    cookTime: 20,
    steps: [
      "Émincer l'oignon et les carottes en petits dés.",
      "Faire revenir l'oignon dans l'huile de colza 2-3 min.",
      "Ajouter les carottes, les lentilles rincées et 1 L d'eau.",
      "Porter à ébullition puis laisser mijoter 15-20 min.",
      "Incorporer les épinards en fin de cuisson, mixer si désiré.",
      "Saler, poivrer et servir bien chaud.",
    ],
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
    prepTime: 10,
    cookTime: 15,
    steps: [
      "Rincer le quinoa et le cuire 15 min dans 2x son volume d'eau salée.",
      "Griller le poulet à la poêle 4-5 min de chaque côté, puis le découper en lamelles.",
      "Couper l'avocat en tranches.",
      "Disposer dans un bol : quinoa, épinards, poulet et avocat.",
      "Parsemer de graines de lin et arroser d'un filet d'huile d'olive.",
    ],
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
    prepTime: 5,
    cookTime: 8,
    steps: [
      "Émincer les champignons et les faire sauter au beurre 4-5 min.",
      "Ajouter les épinards et laisser tomber 1 min.",
      "Battre les œufs avec une pincée de sel et de poivre.",
      "Verser les œufs dans la poêle sur les légumes.",
      "Parsemer de gruyère râpé et cuire 2-3 min jusqu'à ce que l'omelette soit prise.",
      "Plier en deux et servir aussitôt.",
    ],
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
    prepTime: 5,
    cookTime: 5,
    steps: [
      "Toaster les tranches de pain complet.",
      "Couper les tomates en rondelles fines.",
      "Disposer les tomates sur le pain, ajouter les sardines.",
      "Arroser d'huile d'olive et d'un filet de jus de citron.",
      "Poivrer et servir immédiatement.",
    ],
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
    prepTime: 5,
    cookTime: 0,
    steps: [
      "Verser le yaourt grec dans un bol.",
      "Couper la banane en rondelles et l'ajouter sur le yaourt.",
      "Concasser grossièrement les noix et les amandes.",
      "Parsemer les fruits secs sur le yaourt.",
      "Arroser d'un filet de miel et déguster.",
    ],
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
    prepTime: 10,
    cookTime: 20,
    steps: [
      "Cuire les lentilles vertes 20 min dans de l'eau salée, puis égoutter.",
      "Couper la betterave cuite en petits dés.",
      "Émietter le fromage de chèvre et concasser les noix.",
      "Mélanger lentilles tièdes, betterave et noix.",
      "Parsemer de chèvre, arroser d'huile de noix et servir.",
    ],
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
    prepTime: 10,
    cookTime: 25,
    steps: [
      "Couper la pomme de terre, la courgette et le brocoli en morceaux.",
      "Faire revenir 1 min dans l'huile de colza avec une pincée de curcuma.",
      "Couvrir d'eau (1 L) et porter à ébullition.",
      "Laisser mijoter 20-25 min jusqu'à ce que les légumes soient tendres.",
      "Ajouter les épinards en fin de cuisson, puis mixer le tout.",
      "Saler, poivrer et servir bien chaud.",
    ],
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
    prepTime: 10,
    cookTime: 25,
    steps: [
      "Cuire le riz complet 20-25 min dans de l'eau salée.",
      "Faire bouillir les haricots verts 8-10 min, puis égoutter.",
      "Couper les tomates en dés et égoutter le thon.",
      "Mélanger riz, haricots, tomates et thon dans un saladier.",
      "Arroser d'huile d'olive, saler, poivrer et servir tiède.",
    ],
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
