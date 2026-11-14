import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  NUTRIENT_REFERENCES,
  FIBRES_GOAL_G,
  PROTEIN_G_PER_KG,
  PHYTOESTROGENS_MAX_MG_PER_KG,
  type ReferenceKey,
} from "@/lib/nutrientReferences";

const fr = (n: number) => n.toLocaleString("fr-FR");

/** « Repère : 950 mg/jour (RNP ANSES) », lu dans la table unique. */
function repere(key: ReferenceKey): string {
  const r = NUTRIENT_REFERENCES[key];
  return `Repère : ${fr(r.target)} ${r.unit}/jour (${r.type} ANSES${r.note ? `, ${r.note}` : ""}).`;
}

export type NutrientKey =
  | "calcium" | "vitamin_d" | "magnesium" | "iron" | "omega3" | "phytoestrogens"
  | "vitamin_b12" | "potassium" | "zinc" | "vitamin_k" | "vitamin_b6"
  | "vitamin_b9" | "vitamin_e" | "fibres" | "proteins";

export const NUTRIENT_INFO: Record<NutrientKey, { text: string; disclaimer?: string }> = {
  calcium: {
    text: `🦴 Essentiel pour la santé osseuse. Après la ménopause, le risque d'ostéoporose augmente. ${repere("calcium")}\n\nSources : produits laitiers, sardines, brocoli.`,
  },
  vitamin_d: {
    text: `☀️ Favorise l'absorption du calcium. 65-77% des femmes ménopausées sont déficientes. ${repere("vitamin_d")}\n\nSources : saumon, sardines, œufs, soleil.`,
  },
  magnesium: {
    text: `😴 Réduit fatigue, anxiété et troubles du sommeil — symptômes fréquents en ménopause. ${repere("magnesium")}\n\nSources : chocolat noir, noix, épinards, banane.`,
  },
  iron: {
    text: `⚡ Transport de l'oxygène et énergie. Les besoins diminuent après la ménopause. ${repere("iron")}\n\nSources : lentilles, viande rouge, épinards.`,
  },
  omega3: {
    text: "🐟 Anti-inflammatoires, cardioprotecteurs et bons pour le cerveau. Repère ANSES : acide alpha-linolénique (ALA) = 1 % de l'énergie, plus 250 mg de DHA et 250 mg d'EPA. Ton objectif est calculé à partir de ton objectif calorique.\n\nSources : saumon, sardines, noix, huile de colza, graines de lin.",
  },
  phytoestrogens: {
    text: `🌱 Composés végétaux à effet œstrogénique. Les isoflavones viennent surtout du soja. Ce n'est pas un objectif : l'ANSES (2025) fixe un seuil à ne pas dépasser de ${fr(PHYTOESTROGENS_MAX_MG_PER_KG)} mg par kg de poids et par jour, et conseille de varier les sources de protéines végétales.\n\nSources : tofu, desserts et boissons au soja.`,
    disclaimer: "Consultez votre médecin avant toute supplémentation.",
  },
  vitamin_b12: {
    text: `🧠 Essentielle pour le système nerveux et la prévention de la démence. Risque de carence augmente avec l'âge. ${repere("vitamin_b12")}\n\nSources : viandes, poissons, œufs, produits laitiers.`,
  },
  potassium: {
    text: `❤️ Régule la tension artérielle et prévient les crampes musculaires. ${repere("potassium")}\n\nSources : banane, pomme de terre, légumineuses.`,
  },
  zinc: {
    text: `💪 Immunité, peau, cheveux et ongles. ${repere("zinc")}\n\nSources : viande, fruits de mer, noix, graines.`,
  },
  vitamin_k: {
    text: `🦴 Essentielle pour la coagulation et la santé osseuse. Travaille en synergie avec la vitamine D. ${repere("vitamin_k")}\n\nSources : légumes verts, brocoli, épinards.`,
  },
  vitamin_b6: {
    text: `😊 Régule l'humeur via la sérotonine. Peut réduire les symptômes dépressifs en ménopause. ${repere("vitamin_b6")}\n\nSources : poulet, poisson, banane, céréales complètes.`,
  },
  vitamin_b9: {
    text: `🧬 Prévention cardiovasculaire et fonction cognitive. ${repere("vitamin_b9")}\n\nSources : légumes verts, légumineuses, foie.`,
  },
  vitamin_e: {
    text: `✨ Antioxydant — protège la peau et réduit la sécheresse cutanée. ${repere("vitamin_e")}\n\nSources : huile de tournesol, noix, amandes.`,
  },
  fibres: {
    text: `🌿 Régulent le transit, réduisent le cholestérol et stabilisent la glycémie. Repère : ${fr(FIBRES_GOAL_G)} g/jour (ANSES).\n\nSources : légumes, fruits, céréales complètes, légumineuses.`,
  },
  proteins: {
    text: `💪 Essentielles pour préserver la masse musculaire (sarcopénie). La perte musculaire s'accélère après la ménopause — priorité absolue ! Objectif : ${fr(PROTEIN_G_PER_KG)} g par kg de poids et par jour.\n\nSources : viandes, poissons, œufs, légumineuses.`,
  },
};

export default function NutrientInfo({ nutrient }: { nutrient: NutrientKey }) {
  const info = NUTRIENT_INFO[nutrient];
  if (!info) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-center text-pink-deep/70 hover:text-pink-deep transition-colors"
          aria-label="Plus d'informations"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="max-w-[280px] w-[280px] py-3 px-4 rounded-xl"
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #F8BBD9",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 9999,
        }}
        side="top"
        align="center"
      >
        <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">{info.text}</p>
        {info.disclaimer && (
          <p className="mt-2 text-[11px] text-pink-deep font-medium">⚠️ {info.disclaimer}</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
