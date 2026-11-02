import { describe, it, expect } from "vitest";
import {
  isComposedQuery,
  scoreCandidate,
  CIQUAL_MATCH_THRESHOLD,
} from "../../supabase/functions/_shared/ciqualMatch";

// Lignes de test plausibles écrites à la main (aucune valeur nutritionnelle):
// la règle testée est purement textuelle (couverture des mots d'un plat composé).
const POULET_ROTI = { nom: "Poulet, rôti, viande", groupe: "viandes" };
const POULET_CUIT = { nom: "Poulet, cuit", groupe: "viandes" };
const CAFE_AU_LAIT = { nom: "Café au lait", groupe: "boissons" };
const PAIN_AU_CHOCOLAT = { nom: "Pain au chocolat", groupe: "produits céréaliers" };
const POULET_AU_FOUR = { nom: "Poulet au four", groupe: "plats composés" };

describe("plat composé introduit par « au »", () => {
  it("isComposedQuery détecte « soupe au poulet »", () => {
    expect(isComposedQuery("soupe au poulet")).toBe(true);
    expect(isComposedQuery("poulet au four")).toBe(true);
    expect(isComposedQuery("café au lait")).toBe(true);
  });

  it("« soupe au poulet » n'est PAS appariée à « poulet rôti » ni « poulet cuit »", () => {
    expect(scoreCandidate("soupe au poulet", POULET_ROTI.nom, POULET_ROTI.groupe))
      .toBeLessThan(CIQUAL_MATCH_THRESHOLD);
    expect(scoreCandidate("soupe au poulet", POULET_CUIT.nom, POULET_CUIT.groupe))
      .toBeLessThan(CIQUAL_MATCH_THRESHOLD);
  });

  it("une ligne qui couvre soupe ET poulet n'est pas pénalisée", () => {
    expect(scoreCandidate("soupe au poulet", "Soupe au poulet et légumes", "plats composés"))
      .toBeGreaterThanOrEqual(CIQUAL_MATCH_THRESHOLD);
  });

  it("« poulet rôti » reste apparié normalement", () => {
    expect(scoreCandidate("poulet rôti", POULET_ROTI.nom, POULET_ROTI.groupe))
      .toBeGreaterThanOrEqual(CIQUAL_MATCH_THRESHOLD);
  });

  it("café au lait, pain au chocolat et poulet au four ne régressent pas", () => {
    expect(scoreCandidate("café au lait", CAFE_AU_LAIT.nom, CAFE_AU_LAIT.groupe))
      .toBeGreaterThanOrEqual(CIQUAL_MATCH_THRESHOLD);
    expect(scoreCandidate("pain au chocolat", PAIN_AU_CHOCOLAT.nom, PAIN_AU_CHOCOLAT.groupe))
      .toBeGreaterThanOrEqual(CIQUAL_MATCH_THRESHOLD);
    expect(scoreCandidate("poulet au four", POULET_AU_FOUR.nom, POULET_AU_FOUR.groupe))
      .toBeGreaterThanOrEqual(CIQUAL_MATCH_THRESHOLD);
  });
});
