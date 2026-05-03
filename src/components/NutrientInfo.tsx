import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type NutrientKey =
  | "calcium" | "vitamin_d" | "magnesium" | "iron" | "omega3" | "phytoestrogens"
  | "vitamin_b12" | "potassium" | "zinc" | "vitamin_k" | "vitamin_b6"
  | "vitamin_b9" | "vitamin_e" | "fibres" | "proteins";

export const NUTRIENT_INFO: Record<NutrientKey, { text: string; disclaimer?: string }> = {
  calcium: {
    text: "🦴 Essentiel pour la santé osseuse. Après la ménopause, le risque d'ostéoporose augmente. Objectif : 1200mg/jour.\n\nSources : produits laitiers, sardines, brocoli.",
  },
  vitamin_d: {
    text: "☀️ Favorise l'absorption du calcium. 65-77% des femmes ménopausées sont déficientes. Objectif : 10-15µg/jour selon l'âge.\n\nSources : saumon, sardines, œufs, soleil.",
  },
  magnesium: {
    text: "😴 Réduit fatigue, anxiété et troubles du sommeil — symptômes fréquents en ménopause. Objectif : 320mg/jour.\n\nSources : chocolat noir, noix, épinards, banane.",
  },
  iron: {
    text: "⚡ Transport de l'oxygène et énergie. Les besoins diminuent après la ménopause (8mg vs 18mg avant).\n\nSources : lentilles, viande rouge, épinards.",
  },
  omega3: {
    text: "🐟 Anti-inflammatoire, cardioprotecteur et bon pour le cerveau. Recommandation générale : 250mg EPA+DHA/jour. En ménopause, certaines études suggèrent jusqu'à 2g/jour — consultez votre médecin.\n\nSources : saumon, sardines, noix, graines de lin.",
    disclaimer: "Objectif indicatif — avis médical recommandé.",
  },
  phytoestrogens: {
    text: "🌱 Composés végétaux à effet œstrogénique léger. Peuvent atténuer les bouffées de chaleur chez certaines femmes. Objectif affiché : indicatif, pas de dose officielle établie.\n\nSources : soja, tofu, graines de lin, légumineuses.",
    disclaimer: "Consultez votre médecin avant supplémentation.",
  },
  vitamin_b12: {
    text: "🧠 Essentielle pour le système nerveux et la prévention de la démence. Risque de carence augmente avec l'âge. Objectif : 2.4µg/jour.\n\nSources : viandes, poissons, œufs, produits laitiers.",
  },
  potassium: {
    text: "❤️ Régule la tension artérielle et prévient les crampes musculaires. Objectif : 3500mg/jour.\n\nSources : banane, pomme de terre, légumineuses.",
  },
  zinc: {
    text: "💪 Immunité, peau, cheveux et ongles. Objectif : 8mg/jour.\n\nSources : viande, fruits de mer, noix, graines.",
  },
  vitamin_k: {
    text: "🦴 Essentielle pour la coagulation et la santé osseuse. Travaille en synergie avec la vitamine D. Objectif : 90µg/jour.\n\nSources : légumes verts, brocoli, épinards.",
  },
  vitamin_b6: {
    text: "😊 Régule l'humeur via la sérotonine. Peut réduire les symptômes dépressifs en ménopause. Objectif : 1.5mg/jour.\n\nSources : poulet, poisson, banane, céréales complètes.",
  },
  vitamin_b9: {
    text: "🧬 Prévention cardiovasculaire et fonction cognitive. Objectif : 400µg/jour.\n\nSources : légumes verts, légumineuses, foie.",
  },
  vitamin_e: {
    text: "✨ Antioxydant — protège la peau et réduit la sécheresse cutanée. Objectif : 12mg/jour.\n\nSources : huile de tournesol, noix, amandes.",
  },
  fibres: {
    text: "🌿 Régulent le transit, réduisent le cholestérol et stabilisent la glycémie. Objectif : 25-30g/jour.\n\nSources : légumes, fruits, céréales complètes, légumineuses.",
  },
  proteins: {
    text: "💪 Essentielles pour préserver la masse musculaire (sarcopénie). La perte musculaire s'accélère après la ménopause — priorité absolue ! Objectif : 1.2g/kg/jour.\n\nSources : viandes, poissons, œufs, légumineuses.",
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
        className="max-w-[280px] w-[280px] p-3 bg-pink-deep/5 border-pink-deep/30"
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
