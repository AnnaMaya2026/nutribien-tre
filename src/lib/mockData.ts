// Mock food database
export interface FoodItem {
  name: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  calcium: number;
  vitamin_d: number;
  magnesium: number;
  iron: number;
  omega3: number;
  phytoestrogens: number;
  vitamin_b12: number;
  portion: string;
}

export const FOOD_DATABASE: FoodItem[] = [
  { name: "Yaourt nature", calories: 60, proteins: 4, carbs: 5, fats: 3, calcium: 150, vitamin_d: 0.5, magnesium: 12, iron: 0.1, omega3: 0, phytoestrogens: 0, vitamin_b12: 0.4, portion: "125g" },
  { name: "Saumon grillé", calories: 208, proteins: 20, carbs: 0, fats: 13, calcium: 12, vitamin_d: 11, magnesium: 27, iron: 0.3, omega3: 2.2, phytoestrogens: 0, vitamin_b12: 3.2, portion: "100g" },
  { name: "Tofu ferme", calories: 144, proteins: 15, carbs: 3, fats: 9, calcium: 350, vitamin_d: 0, magnesium: 53, iron: 5.4, omega3: 0.4, phytoestrogens: 27, vitamin_b12: 0, portion: "100g" },
  { name: "Épinards cuits", calories: 23, proteins: 3, carbs: 4, fats: 0.3, calcium: 136, vitamin_d: 0, magnesium: 87, iron: 3.6, omega3: 0.1, phytoestrogens: 0.6, vitamin_b12: 0, portion: "100g" },
  { name: "Amandes", calories: 576, proteins: 21, carbs: 22, fats: 49, calcium: 269, vitamin_d: 0, magnesium: 270, iron: 3.7, omega3: 0, phytoestrogens: 0.1, vitamin_b12: 0, portion: "100g" },
  { name: "Lait demi-écrémé", calories: 46, proteins: 3.3, carbs: 4.8, fats: 1.6, calcium: 120, vitamin_d: 1, magnesium: 11, iron: 0, omega3: 0, phytoestrogens: 0, vitamin_b12: 0.4, portion: "200ml" },
  { name: "Œuf dur", calories: 155, proteins: 13, carbs: 1, fats: 11, calcium: 50, vitamin_d: 2.2, magnesium: 12, iron: 1.8, omega3: 0.1, phytoestrogens: 0, vitamin_b12: 1.1, portion: "100g" },
  { name: "Brocoli vapeur", calories: 35, proteins: 2.8, carbs: 7, fats: 0.4, calcium: 47, vitamin_d: 0, magnesium: 21, iron: 0.7, omega3: 0.1, phytoestrogens: 0.1, vitamin_b12: 0, portion: "100g" },
  { name: "Sardines en conserve", calories: 208, proteins: 25, carbs: 0, fats: 11, calcium: 382, vitamin_d: 4.8, magnesium: 39, iron: 2.9, omega3: 1.5, phytoestrogens: 0, vitamin_b12: 8.9, portion: "100g" },
  { name: "Quinoa cuit", calories: 120, proteins: 4.4, carbs: 21, fats: 1.9, calcium: 17, vitamin_d: 0, magnesium: 64, iron: 1.5, omega3: 0.1, phytoestrogens: 0, vitamin_b12: 0, portion: "100g" },
  { name: "Fromage blanc 0%", calories: 44, proteins: 7.7, carbs: 3.8, fats: 0.2, calcium: 111, vitamin_d: 0, magnesium: 9, iron: 0.1, omega3: 0, phytoestrogens: 0, vitamin_b12: 0.3, portion: "100g" },
  { name: "Graines de lin", calories: 534, proteins: 18, carbs: 29, fats: 42, calcium: 255, vitamin_d: 0, magnesium: 392, iron: 5.7, omega3: 22.8, phytoestrogens: 85.5, vitamin_b12: 0, portion: "100g" },
  { name: "Poulet grillé", calories: 165, proteins: 31, carbs: 0, fats: 3.6, calcium: 11, vitamin_d: 0.1, magnesium: 25, iron: 0.9, omega3: 0, phytoestrogens: 0, vitamin_b12: 0.3, portion: "100g" },
  { name: "Avocat", calories: 160, proteins: 2, carbs: 9, fats: 15, calcium: 12, vitamin_d: 0, magnesium: 29, iron: 0.6, omega3: 0.1, phytoestrogens: 0, vitamin_b12: 0, portion: "100g" },
  { name: "Lentilles cuites", calories: 116, proteins: 9, carbs: 20, fats: 0.4, calcium: 19, vitamin_d: 0, magnesium: 36, iron: 3.3, omega3: 0, phytoestrogens: 0.4, vitamin_b12: 0, portion: "100g" },
  { name: "Banane", calories: 89, proteins: 1.1, carbs: 23, fats: 0.3, calcium: 5, vitamin_d: 0, magnesium: 27, iron: 0.3, omega3: 0, phytoestrogens: 0, vitamin_b12: 0, portion: "1 moyenne" },
  { name: "Riz complet cuit", calories: 123, proteins: 2.7, carbs: 26, fats: 1, calcium: 3, vitamin_d: 0, magnesium: 39, iron: 0.6, omega3: 0, phytoestrogens: 0, vitamin_b12: 0, portion: "100g" },
  { name: "Soja (edamame)", calories: 121, proteins: 12, carbs: 9, fats: 5, calcium: 63, vitamin_d: 0, magnesium: 64, iron: 2.3, omega3: 0.4, phytoestrogens: 45, vitamin_b12: 0, portion: "100g" },
];

// Daily recommended values for menopausal women
export const DAILY_TARGETS = {
  calcium: 1200,      // mg
  vitamin_d: 10,      // µg (adjusted by age on dashboard)
  magnesium: 320,     // mg
  iron: 8,            // mg (post-menopause)
  omega3: 2.0,        // g
  phytoestrogens: 40, // mg
  vitamin_b12: 2.4,   // µg
  proteins: 60,       // g (adjusted per calorie goal)
  carbs: 250,         // g
  fats: 65,           // g
  potassium: 3500,    // mg
  zinc: 8,            // mg
  vitamin_k: 90,      // µg
  vitamin_b6: 1.5,    // mg
  vitamin_b9: 400,    // µg
  vitamin_e: 12,      // mg
};

// Mock meal suggestions
export interface MealSuggestion {
  name: string;
  description: string;
  calories: number;
  ingredients: string[];
  nutrients: { proteins: number; carbs: number; fats: number; calcium: number; vitamin_d: number };
}

export const MEAL_SUGGESTIONS: MealSuggestion[] = [
  {
    name: "Bowl de quinoa au saumon",
    description: "Quinoa, saumon grillé, avocat, épinards et graines de lin",
    calories: 520,
    ingredients: ["quinoa", "saumon", "avocat", "épinards", "graines de lin"],
    nutrients: { proteins: 32, carbs: 42, fats: 24, calcium: 180, vitamin_d: 11 },
  },
  {
    name: "Salade de lentilles méditerranéenne",
    description: "Lentilles, tomates, concombre, feta et huile d'olive",
    calories: 380,
    ingredients: ["lentilles", "tomates", "concombre", "feta"],
    nutrients: { proteins: 18, carbs: 45, fats: 14, calcium: 150, vitamin_d: 0 },
  },
  {
    name: "Smoothie ménopause boost",
    description: "Lait, banane, graines de lin, tofu soyeux et épinards",
    calories: 280,
    ingredients: ["lait", "banane", "graines de lin", "tofu", "épinards"],
    nutrients: { proteins: 15, carbs: 35, fats: 10, calcium: 350, vitamin_d: 1 },
  },
  {
    name: "Poulet grillé aux brocolis",
    description: "Poulet, brocoli vapeur, riz complet et amandes effilées",
    calories: 450,
    ingredients: ["poulet", "brocoli", "riz complet", "amandes"],
    nutrients: { proteins: 38, carbs: 40, fats: 15, calcium: 100, vitamin_d: 0.1 },
  },
  {
    name: "Tartine sardines-avocat",
    description: "Pain complet, sardines, avocat et citron",
    calories: 350,
    ingredients: ["pain complet", "sardines", "avocat", "citron"],
    nutrients: { proteins: 22, carbs: 25, fats: 18, calcium: 400, vitamin_d: 5 },
  },
  {
    name: "Soupe miso au tofu",
    description: "Bouillon miso, tofu ferme, algues wakame et oignon vert",
    calories: 180,
    ingredients: ["miso", "tofu", "algues", "oignon"],
    nutrients: { proteins: 14, carbs: 12, fats: 8, calcium: 200, vitamin_d: 0 },
  },
];

