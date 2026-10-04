import { describe, it, expect } from "vitest";
import { genericDrink, isAlcoholicDrink, stripOrigin } from "../../supabase/functions/_shared/ciqualMatch";
import { isIgnorableHerb, STANDARD_WEIGHTS, matchesKeyword, norm, toGrams } from "../../supabase/functions/_shared/portionWeights";

/**
 * Ces tests protègent la conversion « 2 cuisses de canard » → grammes.
 * Un ingrédient mal reconnu est écarté du calcul et le plat ressort
 * silencieusement sous-évalué : c'est ce qui a donné 146 kcal au lieu de 450
 * sur une fiche Quitoque du 26/09/2026.
 */

const lookup = (name: string) => {
  const n = norm(name);
  const hit = STANDARD_WEIGHTS.find((w) => w.keywords.some((k) => matchesKeyword(n, k)));
  return hit ? hit.label : null;
};

describe("poids standards — reconnaissance de l'ingrédient", () => {
  it("reconnaît le singulier et le pluriel", () => {
    expect(lookup("aubergine")).toBe("aubergine");
    expect(lookup("aubergines")).toBe("aubergine");
    expect(lookup("2 cuisses de canard")).toBe("cuisse de canard");
    expect(lookup("oeufs")).toBe("œuf (sans coquille)");
  });

  it("préfère l'entrée la plus spécifique", () => {
    expect(lookup("pommes de terre")).toBe("pomme de terre");
    expect(lookup("pomme")).toBe("pomme");
    expect(lookup("tomates cerises")).toBe("tomate cerise");
    expect(lookup("tomate")).toBe("tomate");
    expect(lookup("citron vert")).toBe("citron vert");
    expect(lookup("citron")).toBe("citron");
  });

  it("ne correspond que sur un mot entier", () => {
    // « ail » est contenu dans « volaille » : un includes() naïf comptait
    // une escalope de volaille pour 4 g.
    expect(lookup("escalope de volaille")).toBeNull();
    expect(lookup("gousse d'ail")).toBe("gousse d'ail");
    expect(lookup("3 gousses d'ail")).toBe("gousse d'ail");
  });

  it("renvoie null pour un ingrédient inconnu plutôt que de deviner", () => {
    expect(lookup("riz basmati")).toBeNull();
    expect(lookup("creme fraiche")).toBeNull();
    expect(lookup("ailerons de poulet")).toBeNull();
  });
});

describe("toGrams", () => {
  it("lit les grammes et les volumes tels quels", () => {
    expect(toGrams("riz", 120, "g").grams).toBe(120);
    expect(toGrams("lait", 20, "cl").grams).toBe(200);
  });

  it("convertit les pièces via la table de poids", () => {
    expect(toGrams("cuisse de canard", 2, "piece").grams).toBe(400);
    expect(toGrams("aubergine", 1, "piece").grams).toBe(300);
  });

  it("refuse d'estimer ce qu'elle ne connaît pas", () => {
    expect(toGrams("riz basmati", 1, "piece").grams).toBeNull();
    expect(toGrams("carotte", null, "piece").grams).toBeNull();
  });
});

describe("fiche Quitoque suprême de poulet", () => {
  it("« Suprême de poulet » × 2 pièces donne 300 g", () => {
    expect(toGrams("Suprêmes de poulet", 2, "piece").grams).toBe(300);
    expect(toGrams("suprême de volaille", 1, "piece").grams).toBe(150);
  });
  it("le romarin « qq brins » est ignoré", () => {
    expect(isIgnorableHerb("romarin", null, "qq brins")).toBe(true);
    expect(isIgnorableHerb("Romarin", 2, "brins")).toBe(true);
    expect(isIgnorableHerb("persil", 10, "g")).toBe(false);
    expect(isIgnorableHerb("topinambours", 300, "g")).toBe(false);
  });
});

describe("vin blanc du Vaucluse IGP", () => {
  const n = "vin blanc du Vaucluse IGP";
  it("retire l'origine et le label", () => {
    expect(stripOrigin(n)).toBe("vin blanc");
    expect(stripOrigin("cuisse de canard")).toBe("cuisse de canard");
  });
  it("pointe vers l'entrée générique CIQUAL et est reconnu comme alcool", () => {
    expect(genericDrink(n)).toBe("Vin blanc sec");
    expect(isAlcoholicDrink(n)).toBe(true);
    expect(isAlcoholicDrink("vinaigre balsamique")).toBe(false);
  });
});
