import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { buildSymptomContext, parisDate, symptomLabel, symptomsOfLog, SYMPTOM_RULE, TUTOIEMENT_RULE } from "../_shared/symptomContext.ts";
import { buildProfileRestrictionsContext } from "../_shared/profileRestrictions.ts";
import { NUTRIENT_REFERENCES, FIBRES_GOAL_G, PHYTOESTROGENS_MAX_MG_PER_KG, PROTEIN_G_PER_KG, type ReferenceKey } from "../_shared/nutrientReferences.ts";
import { matchCiqual } from "../_shared/ciqualMatch.ts";
import {
  computeRecipeTotals,
  detectMeal,
  formatRecipe,
  isOverBudget,
  mealBudget,
  MEAL_LABELS,
  parseRecipe,
  pickRotation,
  scaleToBudget,
  type MealKey,
  type ProposedDish,
  type Recipe,
  type RecipeTotals,
} from "../_shared/sophieRecipe.ts";
import { requireUser } from "../_shared/requireUser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAILY_LIMIT = 20;
/** Conversation courante : modèle léger. Recettes : modèle plus fort (décision du 12/11/2026). */
const CHAT_MODEL = "gpt-4o-mini";
const RECIPE_MODEL = "gpt-4o";
const CHAT_MAX_TOKENS = 350;
const RECIPE_MAX_TOKENS = 900;
/** Nombre de plats proposés gardés en mémoire pour ne pas se répéter. */
const DISH_MEMORY = 15;
/** Sous ce budget, on ne propose pas de recette. */
const MIN_RECIPE_BUDGET = 100;

const parisHour = () =>
  Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hour12: false }).format(new Date()));

/** Chiffres du jour envoyés par l'écran (mêmes que l'accueil), ou null s'ils sont absents ou incomplets. */
function readDashboard(raw: any) {
  if (!raw || typeof raw.calories !== "number" || typeof raw.calorieGoal !== "number" || !Array.isArray(raw.nutrients) || !Array.isArray(raw.meals)) return null;
  return raw as {
    calories: number;
    calorieGoal: number;
    caloriesRemaining: number;
    foodCount: number;
    macros?: Record<string, { value: number; goal: number }>;
    nutrients: { key: string; label: string; value: number; goal: number; unit: string; reached: boolean }[];
    meals: { key: string; label: string; target: number; eaten: number }[];
  };
}

const HEALTH_LABELS: Record<string, string> = {
  cholesterol: "Cholestérol élevé",
  diabete: "Diabète ou prédiabète",
  hypertension: "Hypertension",
  osteoporose: "Ostéoporose ou ostéopénie",
  surpoids: "Surpoids",
  syndrome_metabolique: "Syndrome métabolique",
  thyroide: "Troubles thyroïdiens",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Seule une utilisatrice connectée peut appeler cette fonction.
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Clé API manquante — vérifiez la configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id ?? null;
    }

    const { messages, dashboard: rawDashboard } = await req.json();
    const dash = readDashboard(rawDashboard);
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let profileContext = "";
    let nutritionContext = "";
    let healthContext = "";
    let memoryContext = "";
    let trendsContext = "";
    let recentConversation: Array<{ role: string; content: string }> = [];
    let profileForMemory: any = null;
    let remaining = DAILY_LIMIT;
    const today = parisDate(0);
    let symptomContext = "";
    let logsRes: any = null;
    let countToStore: number | null = null;
    let restrictionsBlock = "";
    let recentDishes: ProposedDish[] = [];
    let eatenLast7Days: string[] = [];
    let calorieGoalKnown: number | null = dash?.calorieGoal ?? null;
    let caloriesRemainingKnown: number | null = dash ? Math.max(0, dash.caloriesRemaining) : null;

    if (userId) {
      // 14-day window for trends aggregation
      const trendsFrom = parisDate(-14);
      // 3-day window for recent chat context
      const chatFromIso = new Date(Date.now() - 3 * 86400_000).toISOString();

      const [profileRes, logsResLocal, prevChatRes, trendsFoodRes, trendsSymptomsRes, trendsHabitsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        supabase.from("food_logs").select("*").eq("user_id", userId).eq("logged_at", today),
        supabase
          .from("sophie_conversations")
          .select("role, message, created_at")
          .eq("user_id", userId)
          .gte("created_at", chatFromIso)
          .order("created_at", { ascending: false })
          .limit(12),
        supabase
          .from("food_logs")
          .select("food_name, calories, logged_at, meal_type, created_at")
          .eq("user_id", userId)
          .gte("logged_at", trendsFrom),
        supabase
          .from("symptom_logs")
          .select("selected_symptoms, symptom_scores, fatigue, bouffees_chaleur, insomnie, sautes_humeur, logged_at")
          .eq("user_id", userId)
          .gte("logged_at", trendsFrom),
        supabase
          .from("habit_logs")
          .select("habit_key, completed, logged_at")
          .eq("user_id", userId)
          .gte("logged_at", trendsFrom),
      ]);
      logsRes = logsResLocal;

      // ============ MÉMOIRE SOPHIE ============
      // 1. Préférences persistantes (aliments aimés/évités, notes)
      const prefs = (profileRes.data as any)?.sophie_preferences || {};
      const disliked: string[] = Array.isArray(prefs.disliked) ? prefs.disliked : [];
      const liked: string[] = Array.isArray(prefs.liked) ? prefs.liked : [];
      const avoided: string[] = Array.isArray(prefs.avoided) ? prefs.avoided : [];
      const notes: string[] = Array.isArray(prefs.notes) ? prefs.notes : [];
      if (disliked.length || liked.length || avoided.length || notes.length) {
        memoryContext = `\n🧠 MÉMOIRE PERSISTANTE (préférences déclarées par l'utilisatrice au fil des échanges):
${disliked.length ? `- N'aime pas / à éviter dans les suggestions: ${disliked.join(", ")}` : ""}
${avoided.length ? `- Évite pour raisons personnelles: ${avoided.join(", ")}` : ""}
${liked.length ? `- Aime particulièrement: ${liked.join(", ")}` : ""}
${notes.length ? `- Autres notes: ${notes.join(" ; ")}` : ""}
RÈGLE ABSOLUE: ne propose JAMAIS un aliment listé dans "n'aime pas" ou "évite". Privilégie les aliments "aime" quand c'est pertinent.`.replace(/\n\n+/g, "\n");
      }

      // 2. Tendances longue durée (calculées en JS, rafraîchies max 1x/24h)
      const trendsUpdated = (profileRes.data as any)?.sophie_trends_updated_at;
      const trendsSummaryDb = (profileRes.data as any)?.sophie_trends_summary;
      const trendsFresh = trendsUpdated && (Date.now() - new Date(trendsUpdated).getTime()) < 24 * 3600_000;
      try { symptomContext = (await buildSymptomContext(supabase, userId)).text; } catch { symptomContext = "\n🩺 SYMPTÔMES : données indisponibles — ne conclus rien sur les symptômes.\n"; }
      let trendsSummary = trendsFresh && trendsSummaryDb ? trendsSummaryDb : "";
      if (!trendsFresh) {
        const foods = (trendsFoodRes.data || []) as any[];
        const symptoms = (trendsSymptomsRes.data || []) as any[];
        const habits = (trendsHabitsRes.data || []) as any[];
        const bits: string[] = [];
        // L'heure du repas n'est pas enregistrée : on prend l'heure de saisie (Paris),
        // seulement quand la saisie a eu lieu le jour même du repas.
        const sameDayTime = (f: any): string | null => {
          if (!f.created_at) return null;
          const d = new Date(f.created_at);
          const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(d);
          if (day !== f.logged_at) return null;
          return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
        };
        const daysWhere = (pred: (f: any) => boolean) => new Set(foods.filter(pred).map((f) => f.logged_at)).size;
        const lateDinners = daysWhere((f) => f.meal_type === "diner" && (sameDayTime(f) ?? "") > "21:00");
        if (lateDinners >= 3) bits.push(`dîners saisis après 21 h ${lateDinners} jours sur 14`);
        const eveSnacks = daysWhere((f) => f.meal_type === "collation" && (sameDayTime(f) ?? "") >= "20:00");
        if (eveSnacks >= 3) bits.push(`collations saisies après 20 h ${eveSnacks} jours sur 14`);
        // Jours avec des repas saisis mais sans petit-déjeuner (aujourd'hui exclu : journée en cours)
        const daysWithFood = new Set(foods.filter((f) => f.logged_at !== today).map((f) => f.logged_at));
        const daysWithBreakfast = new Set(foods.filter((f) => f.meal_type === "petit-dejeuner").map((f) => f.logged_at));
        const skippedBreakfasts = [...daysWithFood].filter((d) => !daysWithBreakfast.has(d)).length;
        if (skippedBreakfasts >= 4) bits.push(`aucun petit-déjeuner saisi ${skippedBreakfasts} jours sur ${daysWithFood.size}`);
        // Top recurring symptoms
        const symptomAvg: Record<string, { sum: number; n: number }> = {};
        for (const row of symptoms) {
          for (const s of symptomsOfLog(row)) {
            if (s.score === null) continue;
            symptomAvg[s.key] = symptomAvg[s.key] || { sum: 0, n: 0 };
            symptomAvg[s.key].sum += s.score;
            symptomAvg[s.key].n += 1;
          }
        }
        const topSymptoms = Object.entries(symptomAvg)
          .filter(([, v]) => v.n >= 4)
          .map(([k, v]) => ({ k, avg: v.sum / v.n }))
          .sort((a, b) => b.avg - a.avg)
          .slice(0, 2);
        for (const t of topSymptoms) {
          if (t.avg >= 5) bits.push(`symptôme récurrent: ${symptomLabel(t.k)} (intensité moyenne ${t.avg.toFixed(1)}/10)`);
        }
        // Habits missed
        const habitStats: Record<string, { done: number; total: number }> = {};
        for (const h of habits) {
          if (!h.habit_key) continue;
          habitStats[h.habit_key] = habitStats[h.habit_key] || { done: 0, total: 0 };
          habitStats[h.habit_key].total += 1;
          if (h.completed) habitStats[h.habit_key].done += 1;
        }
        for (const [k, v] of Object.entries(habitStats)) {
          if (v.total >= 7 && v.done / v.total < 0.4) bits.push(`habitude "${k}" peu suivie (${v.done}/${v.total} jours)`);
        }
        trendsSummary = bits.length ? bits.join(" ; ") : "";
        // Persist (fire-and-forget)
        supabase
          .from("profiles")
          .update({ sophie_trends_summary: trendsSummary, sophie_trends_updated_at: new Date().toISOString() })
          .eq("user_id", userId)
          .then(() => {}, () => {});
      }
      if (trendsSummary) {
        trendsContext = `\n📊 TENDANCES OBSERVÉES SUR LES 14 DERNIERS JOURS (à intégrer subtilement dans tes conseils quand pertinent):\n${trendsSummary}`;
      }
      // ========================================


      const profile = profileRes.data as any;
      profileForMemory = profile;

      // Plats déjà proposés (les plus récents d'abord) et aliments mangés sur 7 jours.
      recentDishes = (Array.isArray(prefs.proposed_dishes) ? prefs.proposed_dishes : []).slice(0, DISH_MEMORY);
      const weekAgo = parisDate(-7);
      eatenLast7Days = [...new Set(
        ((trendsFoodRes.data || []) as any[])
          .filter((f) => f.logged_at >= weekAgo && (f.meal_type === "dejeuner" || f.meal_type === "diner"))
          .map((f) => String(f.food_name || "").trim())
          .filter(Boolean),
      )].slice(0, 40);

      // Recent conversation (chronological, oldest first)
      recentConversation = (prevChatRes.data || [])
        .slice()
        .reverse()
        .map((row: any) => ({
          role: row.role === "user" ? "user" : "assistant",
          content: String(row.message || "").slice(0, 600),
        }));




      // ── Daily message limit enforcement ──
      if (profile) {
        const lastDate = profile.last_message_date;
        const currentCount: number =
          lastDate === today ? Number(profile.daily_message_count || 0) : 0;

        if (currentCount >= DAILY_LIMIT) {
          return new Response(
            JSON.stringify({
              error: "limit_reached",
              message:
                "Tu as utilisé tes 20 messages gratuits aujourd'hui 💬 Reviens demain pour continuer à discuter avec Sophie !",
              remaining: 0,
              limit: DAILY_LIMIT,
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        // Le compteur n'est enregistré qu'une fois la réponse obtenue (voir plus bas).
        countToStore = currentCount + 1;
        remaining = Math.max(0, DAILY_LIMIT - countToStore);

        // Dietary + health restrictions (centralized helper with alternatives)
        const restrictionsCtx = buildProfileRestrictionsContext(profile);

        profileContext = `
Profil utilisatrice:
- Prénom: ${profile.display_name || "Non renseigné"}
- Stade: ${profile.menopause_stage || "Non renseigné"}
- Symptômes déclarés au profil: ${(profile.symptoms || []).map(symptomLabel).join(", ") || "Aucun renseigné"}
- Régimes/restrictions alimentaires: ${restrictionsCtx.dietaryLabels.length ? restrictionsCtx.dietaryLabels.join(", ") : "Aucune"}

${restrictionsCtx.promptBlock}

Rappelle si pertinent : "Ces conseils ne remplacent pas un suivi médical."`;

        healthContext = ""; // merged inside promptBlock above
        restrictionsBlock = restrictionsCtx.promptBlock;
        if (calorieGoalKnown == null && Number(profile.daily_calorie_goal) > 0) calorieGoalKnown = Number(profile.daily_calorie_goal);
      }

      if (dash) {
        // Chiffres identiques à ceux de l'accueil : alimentation + compléments cochés.
        const fmt = (n: number) => String(n).replace(".", ",");
        const line = (n: any) => `${n.label} ${fmt(n.value)}/${fmt(n.goal)} ${n.unit}`;
        const below = dash.nutrients.filter((n) => !n.reached);
        const reached = dash.nutrients.filter((n) => n.reached);
        const m = dash.macros;
        nutritionContext = `
Données du jour (identiques à l'écran d'accueil de l'utilisatrice, compléments alimentaires inclus) :
- Calories : ${dash.calories} kcal sur ${dash.calorieGoal} kcal d'objectif. Reste : ${caloriesRemainingKnown} kcal.
${m ? `- Protéines ${m.proteins?.value}/${m.proteins?.goal} g, glucides ${m.carbs?.value}/${m.carbs?.goal} g, lipides ${m.fats?.value}/${m.fats?.goal} g` : ""}
- Par repas (mangé / cible) : ${dash.meals.map((x) => `${x.label} ${x.eaten}/${x.target} kcal`).join(" ; ")}
- Nutriments SOUS l'objectif : ${below.length ? below.map(line).join(", ") : "aucun"}
- Nutriments atteints : ${reached.length ? reached.map(line).join(", ") : "aucun"}
- Aliments enregistrés aujourd'hui : ${dash.foodCount}
Ne parle d'un manque QUE pour un nutriment de la liste « SOUS l'objectif ». N'annonce jamais d'autres chiffres que ceux-ci.`;
      } else {
        // Ancienne version de l'écran : pas de chiffres transmis. On ne devine rien.
        const eaten = Math.round(((logsRes.data || []) as any[]).reduce((a, l) => a + (Number(l.calories) || 0), 0));
        if (calorieGoalKnown != null) caloriesRemainingKnown = Math.max(0, calorieGoalKnown - eaten);
        nutritionContext = `
Données du jour (partielles : les compléments alimentaires ne sont pas comptés) :
- Calories mangées : ${eaten} kcal${calorieGoalKnown != null ? ` sur ${calorieGoalKnown} kcal d'objectif. Reste : ${caloriesRemainingKnown} kcal.` : ". Objectif calorique non disponible."}
Tu ne connais pas les apports en vitamines et minéraux du jour : n'annonce aucun manque chiffré.`;
      }
    }

    // Detect industrial/processed foods in today's logs
    const INDUSTRIAL_PATTERNS = [
      /lasagne/i, /pizza/i, /quiche/i, /hachis\s*parmentier/i, /gratin/i,
      /cordon\s*bleu/i, /nugget/i, /cheeseburger/i, /hamburger/i, /burger/i,
      /kebab/i, /tacos?/i, /sushi\s*box/i, /plat\s*pr[ée]par[ée]/i,
      /plat\s*cuisin[ée]/i, /micro[-\s]*onde/i, /surgel[ée]\s*pr[ée]par/i,
      /raviolis?\s*(en\s*)?bo[iî]te/i, /cassoulet\s*(en\s*)?bo[iî]te/i,
      /paella\s*(en\s*)?bo[iî]te/i, /saucisse/i, /merguez/i, /knack/i,
      /chipolata/i, /charcuterie/i, /jambon\s*industriel/i, /p[âa]t[ée]/i,
      /rillettes/i, /croque[-\s]monsieur\s*industriel/i, /friand/i,
      /samoussa/i, /nem\s*industriel/i, /bo[uû]ch[ée]e\s*ap[ée]ritive/i,
      /chips?/i, /frites?\s*surgel/i, /bo[iî]te\s*conserve\s*plat/i,
      /soupe\s*en\s*brique/i, /soupe\s*industrielle/i,
      /barre\s*chocolat/i, /c[ée]r[ée]ales?\s*chocolat/i,
      /mc\s*do/i, /mcdo/i, /kfc/i, /quick/i, /fast[-\s]*food/i,
      /tortellini\s*frais/i, /gnocchi\s*po[êe]l/i,
    ];
    const detectedIndustrial: string[] = [];
    if (logsRes?.data) {
      for (const log of logsRes.data as any[]) {
        const name = String(log.food_name || "");
        if (INDUSTRIAL_PATTERNS.some((re) => re.test(name))) {
          detectedIndustrial.push(name);
        }
      }
    }
    const industrialContext = detectedIndustrial.length > 0
      ? `\n\n🍔 Aliments industriels détectés aujourd'hui : ${detectedIndustrial.join(", ")}.
Si pertinent dans le contexte de la conversation (et seulement si tu n'as pas encore fait cette suggestion plus tôt), termine ta réponse par EXACTEMENT ce format :
"💡 J'ai remarqué que tu as mangé ${detectedIndustrial[0]} aujourd'hui — souvent riche en sel et additifs. Tu veux que je te propose une version maison rapide et plus nutritive ?"
Si l'utilisatrice répond oui (ou équivalent : "oui", "vas-y", "ok", "volontiers"), appelle l'outil proposer_recette pour une version maison simple du plat détecté.`
      : "";

    // Fiche de connaissances : Sophie n'affirme que ce qui figure ici.
    const ref = (key: ReferenceKey) => {
      const r = NUTRIENT_REFERENCES[key];
      return `${r.label} ${r.target} ${r.unit}`;
    };
    const knowledgeSheet = `FICHE DE CONNAISSANCES (tu n'affirmes rien de chiffré ou de médical en dehors de cette fiche et des données du jour) :
- Repères journaliers ANSES pour une femme ménopausée : ${(["calcium", "vitamin_d", "magnesium", "iron", "zinc", "vitamin_b12", "vitamin_b9", "potassium"] as ReferenceKey[]).map(ref).join(", ")}, fibres ${FIBRES_GOAL_G} g. Protéines : ${PROTEIN_G_PER_KG} g par kg de poids.
- Fer : le besoin baisse après la ménopause. Ne conseille jamais de complément de fer sans avis médical.
- Soja et phytoestrogènes : ne les présente jamais comme prioritaires et ne les conseille pas pour un symptôme. L'ANSES (2025) fixe un seuil à ne pas dépasser de ${PHYTOESTROGENS_MAX_MG_PER_KG} mg d'isoflavones par kg de poids et par jour, et conseille de varier les sources de protéines végétales.
- Liens habitudes ou alimentation → symptômes que tu peux évoquer : caféine → bouffées de chaleur, insomnie ; alcool → bouffées de chaleur, sommeil ; écrans le soir → insomnie ; oméga-3 → inflammation, douleurs articulaires ; magnésium → sommeil, crampes ; calcium + vitamine D → os ; protéines → masse musculaire.
- Tout autre lien : ne l'établis pas. Dis : « Je ne peux pas établir de lien direct entre ces deux éléments. »
- Tu ne cites pas d'étude, pas de pourcentage et pas de mécanisme biologique qui ne figure pas dans cette fiche. Si tu ne sais pas, dis-le.
- Allergènes : n'affirme jamais qu'un aliment en contient ou n'en contient pas sans certitude ; en cas de doute, renvoie à l'étiquette du produit. Les boissons végétales et le tofu ne contiennent pas de lactose.`;

    const systemPrompt = `Tu es Sophie, nutritionniste spécialisée dans la nutrition pour la ménopause. Tu as accès au profil de l'utilisatrice et à ses chiffres du jour.
${TUTOIEMENT_RULE}
${profileContext}
${memoryContext}
${trendsContext}
${symptomContext}
${SYMPTOM_RULE}
${nutritionContext}
${healthContext}
${industrialContext}

${knowledgeSheet}

RECETTES ET IDÉES DE REPAS :
Dès que l'utilisatrice demande une idée de repas, de collation, de plat ou une recette (ou accepte une proposition de recette), appelle l'outil proposer_recette. N'écris jamais toi-même une recette, une liste d'ingrédients ou les calories d'un plat : c'est l'outil qui les calcule. Pour un menu de plusieurs repas, propose un repas à la fois, en commençant par le prochain.

STYLE (conversation) :
- Réponds en français, en 3 à 4 phrases courtes, sans liste à puces.
- Sois chaleureuse et concrète. Appuie-toi sur les chiffres du jour quand ils répondent à la question.
- Calories : donne le fait, sans féliciter et sans pousser à manger plus ou moins. Ne félicite pour un nutriment que s'il figure dans « Nutriments atteints ».
- Si tu connais le prénom de l'utilisatrice, utilise-le naturellement, sans la saluer à chaque message.
- Tu ne remplaces pas un médecin : rappelle-le quand la question est médicale.
- Ne termine jamais par une formule de politesse ou de clôture.`;

    const lastUserText = String([...(messages as any[])].reverse().find((m) => m.role === "user")?.content || "");
    const clientContents = new Set((messages as any[]).map((m) => String(m.content || "").trim()).filter(Boolean));
    // Historique persistant récent, dédupliqué avec les messages envoyés par l'écran.
    const history = [...recentConversation.filter((m) => !clientContents.has(String(m.content).trim())), ...messages];

    const callOpenAI = async (payload: Record<string, unknown>) => {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const errorText = await r.text();
        console.error("OpenAI error:", r.status, errorText);
        throw Object.assign(new Error(`OpenAI ${r.status}`), { status: r.status });
      }
      return (await r.json()).choices?.[0]?.message;
    };

    let content = "";
    let recipePayload: { recipe: Recipe; totals: RecipeTotals; meal: MealKey; budget: number | null } | null = null;

    const first = await callOpenAI({
      model: CHAT_MODEL,
      messages: [{ role: "system", content: systemPrompt }, ...history],
      temperature: 0.5,
      max_tokens: CHAT_MAX_TOKENS,
      tools: [{
        type: "function",
        function: {
          name: "proposer_recette",
          description: "Propose une recette adaptée au budget calorique du repas ; les calories sont calculées par le serveur.",
          parameters: {
            type: "object",
            properties: {
              repas: { type: "string", enum: ["petit-dejeuner", "dejeuner", "collation", "diner"], description: "Repas visé, seulement s'il est précisé dans la conversation" },
              demande: { type: "string", description: "Ce que l'utilisatrice souhaite (envie, ingrédient, contrainte), en quelques mots" },
            },
            required: ["demande"],
          },
        },
      }],
    });

    const toolCall = first?.tool_calls?.find((t: any) => t?.function?.name === "proposer_recette");
    if (!toolCall) {
      content = String(first?.content || "").trim();
    } else {
      let args: any = {};
      try { args = JSON.parse(toolCall.function.arguments || "{}"); } catch { args = {}; }
      const meal: MealKey = (["petit-dejeuner", "dejeuner", "collation", "diner"] as MealKey[]).includes(args.repas)
        ? args.repas
        : detectMeal(lastUserText, parisHour());
      // Budget du repas : cible du repas, limitée par le reste du jour moins la part des repas à venir.
      const budget = dash
        ? mealBudget(meal, Math.max(0, dash.caloriesRemaining), dash.meals)
        : caloriesRemainingKnown;

      if (budget != null && budget < MIN_RECIPE_BUDGET) {
        content = `Il te reste ${caloriesRemainingKnown ?? budget} kcal sur ton objectif du jour${budget !== caloriesRemainingKnown ? `, dont ${budget} kcal pour ${MEAL_LABELS[meal] === "collation" ? "une collation" : `le ${MEAL_LABELS[meal]}`} une fois gardée la part des repas à venir` : ""}. C'est trop peu pour une vraie recette : une tisane, quelques crudités ou un petit fruit conviennent mieux.`;
      } else {
        const rotation = pickRotation(recentDishes);
        const below = dash ? dash.nutrients.filter((n) => !n.reached).map((n) => n.label) : [];
        const avoid = [...recentDishes.map((d) => d.dish_name), ...eatenLast7Days].filter(Boolean);
        const recipeSystem = `Tu composes UNE recette pour une femme ménopausée et tu réponds UNIQUEMENT en JSON, avec ce schéma exact :
{"intro": "une phrase courte qui présente le plat, en tutoyant", "nom": "nom du plat", "proteine_principale": "un mot", "cuisine": "type de cuisine", "cuisson": "mode de cuisson", "ingredients": [{"nom": "ingrédient", "grammes": nombre}], "etapes": ["étape courte"]}

Règles :
- Repas : ${MEAL_LABELS[meal]}.
${budget != null ? `- Budget : ${budget} kcal au maximum pour le plat entier, pour une personne. Vise entre ${Math.round(budget * 0.85)} et ${budget} kcal.` : "- Portion pour une personne."}
- Tous les ingrédients en grammes, poids CRUS (riz, pâtes, légumineuses, viande et poisson avant cuisson), liquides compris. N'oublie pas la matière grasse de cuisson et d'assaisonnement.
- Nomme chaque ingrédient simplement, comme dans une table de composition des aliments (« blanc de poulet », « riz basmati cru », « huile d'olive », « courgette »). Uniquement des ingrédients courants, pas de produit de marque ni de plat préparé.
- 3 à 5 étapes courtes, matériel de cuisine courant, 30 minutes au plus.
- N'écris aucune calorie ni aucune valeur nutritionnelle : elles sont calculées après.
- Type de cuisine imposé : ${rotation.cuisine}. Mode de cuisson imposé : ${rotation.cuisson}.${rotation.proteinesRecentes.length ? ` Protéine principale différente de : ${rotation.proteinesRecentes.join(", ")}.` : ""}
${avoid.length ? `- Ne propose aucun de ces plats ni une simple variante : ${avoid.slice(0, 40).join(" ; ")}.` : ""}
${below.length ? `- Si le budget le permet, apporte des aliments riches en : ${below.join(", ")}.` : ""}
- Soja : pas de tofu ni de produit au soja, sauf si l'utilisatrice le demande.
- ${TUTOIEMENT_RULE}
${restrictionsBlock}
${memoryContext}`;
        const recipeMessages: any[] = [
          { role: "system", content: recipeSystem },
          { role: "user", content: `Demande de l'utilisatrice : ${String(args.demande || lastUserText).slice(0, 400)}` },
        ];

        let intro = "";
        let best: { recipe: Recipe; totals: RecipeTotals } | null = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          const msg = await callOpenAI({
            model: RECIPE_MODEL,
            messages: recipeMessages,
            temperature: 0.8,
            max_tokens: RECIPE_MAX_TOKENS,
            response_format: { type: "json_object" },
          });
          let raw: any = null;
          try { raw = JSON.parse(msg?.content || ""); } catch { raw = null; }
          const recipe = parseRecipe(raw);
          if (!recipe) {
            recipeMessages.push({ role: "assistant", content: String(msg?.content || "") }, { role: "user", content: "Réponse inutilisable. Renvoie le JSON complet demandé, avec les grammes de chaque ingrédient." });
            continue;
          }
          intro = String(raw?.intro || "").trim();
          // Calories calculées par le serveur à partir de la table CIQUAL (poids crus).
          const compute = async (r: Recipe) => {
            const rows = await Promise.all(r.ingredients.map(async (ing) => {
              try { return (await matchCiqual(supabase, ing.nom, { ingredientsBruts: true }))?.row ?? null; } catch { return null; }
            }));
            return { rows, totals: computeRecipeTotals(r, rows) };
          };
          const { rows, totals } = await compute(recipe);
          let candidate = { recipe, totals };
          if (budget != null && totals.missing.length === 0 && isOverBudget(totals.kcal, budget)) {
            const scaled = scaleToBudget(recipe, totals.kcal, budget);
            if (scaled) candidate = { recipe: scaled, totals: computeRecipeTotals(scaled, rows) };
          }
          const ok = candidate.totals.missing.length === 0 && (budget == null || !isOverBudget(candidate.totals.kcal, budget));
          if (!best || ok || candidate.totals.missing.length < best.totals.missing.length) best = candidate;
          if (ok) break;
          recipeMessages.push(
            { role: "assistant", content: String(msg?.content || "") },
            {
              role: "user",
              content: totals.missing.length
                ? `Ces ingrédients sont introuvables dans la table de composition : ${totals.missing.join(", ")}. Propose une autre recette avec des ingrédients plus courants, nommés plus simplement.`
                : `Cette recette fait ${totals.kcal} kcal une fois calculée, pour un budget de ${budget} kcal. Propose une recette plus légère, entièrement différente si besoin.`,
            },
          );
        }

        if (!best) {
          content = "Je n'ai pas réussi à composer une recette fiable cette fois. Redemande-moi en précisant un ingrédient ou une envie.";
        } else {
          const over = budget != null && isOverBudget(best.totals.kcal, budget);
          content = formatRecipe(best.recipe, best.totals, intro);
          if (over) content += `\nAttention : ce plat dépasse ton budget ${meal === "collation" ? "de la collation" : `du ${MEAL_LABELS[meal]}`} (${budget} kcal).`;
          else if (budget != null && best.totals.missing.length === 0) content += `\nBudget ${meal === "collation" ? "de la collation" : `du ${MEAL_LABELS[meal]}`} : ${budget} kcal.`;
          recipePayload = { recipe: best.recipe, totals: best.totals, meal, budget };
          // Mémoire des plats proposés, pour ne pas se répéter.
          if (userId) {
            const dish: ProposedDish & { date: string } = {
              dish_name: best.recipe.nom,
              main_protein: best.recipe.proteine_principale ?? null,
              cuisine: best.recipe.cuisine ?? rotation.cuisine,
              cooking: best.recipe.cuisson ?? rotation.cuisson,
              date: today,
            };
            const current = profileForMemory?.sophie_preferences || {};
            const updatedPrefs = { ...current, proposed_dishes: [dish, ...recentDishes].slice(0, DISH_MEMORY) };
            const { error: dishErr } = await supabase.from("profiles").update({ sophie_preferences: updatedPrefs }).eq("user_id", userId);
            if (dishErr) console.error("proposed dish not saved:", dishErr.message);
            else if (profileForMemory) profileForMemory.sophie_preferences = updatedPrefs;
          }
        }
      }
    }

    if (!content) {
      return new Response(JSON.stringify({ error: "Réponse OpenAI vide" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Le message n'est décompté qu'une fois la réponse obtenue.
    if (userId && countToStore != null) {
      await supabase.from("profiles").update({ daily_message_count: countToStore, last_message_date: today }).eq("user_id", userId);
    }

    // ============ EXTRACTION PRÉFÉRENCES (déclenchée uniquement si le dernier message
    // utilisateur contient un signal de préférence, pour limiter les coûts) ============
    try {
      const userText = lastUserText;
      const PREF_TRIGGERS = /\b(j['e ]?aime pas|je n['e ]?aime pas|je déteste|je deteste|j['e ]?adore|j['e ]?aime|je préfère|je prefere|j['e ]?évite|j['e ]?evite|allergique|intolérant|intolerant|jamais de|pas de|sans )/i;
      if (userId && userText && PREF_TRIGGERS.test(userText) && OPENAI_API_KEY) {
        const extract = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: CHAT_MODEL,
            messages: [
              { role: "system", content: `Tu extrais les préférences alimentaires exprimées dans le message d'une utilisatrice. Réponds UNIQUEMENT en JSON strict avec ce schéma: {"disliked":[],"liked":[],"avoided":[],"notes":[]}. Mets chaque aliment en minuscules, un mot ou expression courte. "disliked"=aliments qu'elle n'aime pas / déteste. "liked"=qu'elle aime / adore. "avoided"=qu'elle évite pour raison santé/éthique. "notes"=autres préférences (ex: "préfère végétarien le soir"). Si rien à extraire, renvoie toutes les listes vides.` },
              { role: "user", content: userText.slice(0, 500) },
            ],
            temperature: 0,
            max_tokens: 200,
            response_format: { type: "json_object" },
          }),
        });
        if (extract.ok) {
          const j = await extract.json();
          const parsed = JSON.parse(j.choices?.[0]?.message?.content || "{}");
          const merge = (a: string[] = [], b: string[] = []) =>
            Array.from(new Set([...(a || []), ...((b || []).map((x) => String(x).toLowerCase().trim()))]))
              .filter(Boolean)
              .slice(0, 30);
          const current = profileForMemory?.sophie_preferences || {};
          const updated = {
            ...current,
            disliked: merge(current.disliked, parsed.disliked),
            liked: merge(current.liked, parsed.liked),
            avoided: merge(current.avoided, parsed.avoided),
            notes: merge(current.notes, parsed.notes),
          };
          const changed = JSON.stringify(updated) !== JSON.stringify(current);
          if (changed) {
            await supabase.from("profiles").update({ sophie_preferences: updated }).eq("user_id", userId);
          }
        }
      }
    } catch (prefErr) {
      console.error("preference extraction failed:", prefErr);
    }

    return new Response(
      JSON.stringify({ reply: content, remaining, limit: DAILY_LIMIT, recipe: recipePayload }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (e) {
    console.error("chat-nutritionist error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: Number((e as any)?.status) || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
