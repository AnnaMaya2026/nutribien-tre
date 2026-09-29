import { describe, it, expect } from "vitest";
import { STANDARD_WEIGHTS, matchesKeyword, norm, toGrams } from "../../supabase/functions/_shared/portionWeights";

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
