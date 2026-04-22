import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAILY_LIMIT = 20;

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

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

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

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let profileContext = "";
    let nutritionContext = "";
    let healthContext = "";
    let remaining = DAILY_LIMIT;
    const today = new Date().toISOString().split("T")[0];
    let logsRes: any = null;

    if (userId) {
      const profileRes = await supabase.from("profiles").select("*").eq("user_id", userId).single();
      logsRes = await supabase.from("food_logs").select("*").eq("user_id", userId).eq("logged_at", today);
      const _unused = [profileRes, logsRes]; void _unused;
      const [_p, _l] = [profileRes, logsRes];
      void _p; void _l;
      const __dummy = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        supabase.from("food_logs").select("*").eq("user_id", userId).eq("logged_at", today),
      ]);

      const profile = profileRes.data as any;

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
                "Vous avez utilisé vos 20 messages gratuits aujourd'hui 💬 Revenez demain pour continuer à discuter avec Sophie !",
              remaining: 0,
              limit: DAILY_LIMIT,
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        // Increment counter (reset if new day)
        const nextCount = currentCount + 1;
        await supabase
          .from("profiles")
          .update({
            daily_message_count: nextCount,
            last_message_date: today,
          })
          .eq("user_id", userId);
        remaining = Math.max(0, DAILY_LIMIT - nextCount);

        profileContext = `
Profil utilisatrice:
- Prénom: ${profile.display_name || "Non renseigné"}
- Stade: ${profile.menopause_stage || "Non renseigné"}
- Symptômes principaux: ${(profile.symptoms || []).join(", ") || "Aucun renseigné"}
- Objectif calorique: ${profile.daily_calorie_goal || 1800} kcal`;

        // Health conditions
        const healthCodes: string[] = profile.health_conditions || [];
        const healthOther: string | null = profile.health_other || null;
        const labels = healthCodes
          .map((c) => HEALTH_LABELS[c] || c)
          .concat(healthOther ? [healthOther] : []);
        if (labels.length > 0) {
          healthContext = `

⚠️ Problèmes de santé déclarés par l'utilisatrice : ${labels.join(", ")}.
Tiens compte de ces contraintes dans tes recommandations :
- Cholestérol : limite les graisses saturées (charcuterie, fromages gras, beurre).
- Diabète/prédiabète : privilégie les aliments à index glycémique bas, évite les sucres rapides.
- Hypertension : limite le sel et les produits transformés.
- Ostéoporose : recommande des aliments riches en calcium et vitamine D.
- Surpoids : favorise les aliments rassasiants riches en protéines et fibres.
- Syndrome métabolique : combine les conseils diabète + cholestérol + surpoids.
- Troubles thyroïdiens : modère le soja cru et les crucifères crus, recommande iode et sélénium.
Rappelle si pertinent : "Ces conseils ne remplacent pas un suivi médical."`;
        }
      }

      if (logsRes.data && logsRes.data.length > 0) {
        const totals = logsRes.data.reduce((acc: any, log: any) => ({
          calories: acc.calories + (log.calories || 0),
          proteins: acc.proteins + (log.proteins || 0),
          calcium: acc.calcium + (log.calcium || 0),
          vitamin_d: acc.vitamin_d + (log.vitamin_d || 0),
          magnesium: acc.magnesium + (log.magnesium || 0),
          iron: acc.iron + (log.iron || 0),
          fibres: acc.fibres + (log.fibres || 0),
          potassium: acc.potassium + (log.potassium || 0),
          zinc: acc.zinc + (log.zinc || 0),
          vitamin_k: acc.vitamin_k + (log.vitamin_k || 0),
          vitamin_b6: acc.vitamin_b6 + (log.vitamin_b6 || 0),
          vitamin_b9: acc.vitamin_b9 + (log.vitamin_b9 || 0),
          vitamin_e: acc.vitamin_e + (log.vitamin_e || 0),
        }), { calories: 0, proteins: 0, calcium: 0, vitamin_d: 0, magnesium: 0, iron: 0, fibres: 0, potassium: 0, zinc: 0, vitamin_k: 0, vitamin_b6: 0, vitamin_b9: 0, vitamin_e: 0 });

        const calorieGoal = profile?.daily_calorie_goal || 1800;
        nutritionContext = `
Données nutritionnelles du jour:
- Calories consommées: ${Math.round(totals.calories)} kcal / ${calorieGoal} kcal
- Protéines: ${Math.round(totals.proteins)}g / 60g
- Calcium: ${Math.round(totals.calcium)}mg / 1200mg
- Vitamine D: ${totals.vitamin_d.toFixed(1)}µg / 20µg
- Magnésium: ${Math.round(totals.magnesium)}mg / 320mg
- Fer: ${Math.round(totals.iron)}mg / 18mg
- Fibres: ${Math.round(totals.fibres)}g / 25g
- Potassium: ${Math.round(totals.potassium)}mg / 3500mg
- Zinc: ${totals.zinc.toFixed(1)}mg / 8mg
- Vitamine K: ${totals.vitamin_k.toFixed(1)}µg / 90µg
- Vitamine B6: ${totals.vitamin_b6.toFixed(2)}mg / 1.5mg
- Vitamine B9 (folate): ${Math.round(totals.vitamin_b9)}µg / 400µg
- Vitamine E: ${totals.vitamin_e.toFixed(1)}mg / 12mg`;
      } else {
        nutritionContext = "\nAucun aliment enregistré aujourd'hui.";
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
Si l'utilisatrice répond oui (ou équivalent : "oui", "vas-y", "ok", "volontiers"), propose-lui une recette maison simple (5-7 ingrédients, étapes courtes, alternative saine et rapide à préparer) à la place du plat industriel détecté.`
      : "";

    const systemPrompt = `Tu es Sophie, une nutritionniste spécialisée dans la nutrition pour la ménopause. Tu as accès au profil de l'utilisatrice et à ses données nutritionnelles du jour.
${profileContext}
${nutritionContext}
${healthContext}
${industrialContext}

Règles:
- Réponds toujours en français
- Si tu connais le prénom de l'utilisatrice, utilise-le naturellement (ex: "Bonjour Anna,...")
- Sois chaleureuse, encourageante et bienveillante
- Donne des conseils pratiques et accessibles
- Base tes conseils sur les données du jour et les contraintes santé éventuelles
- Ne remplace pas un médecin, rappelle-le si besoin
- Réponds en maximum 3-4 phrases courtes (sauf si tu proposes une recette : alors structure clairement)
- IMPORTANT: Ne termine JAMAIS tes réponses par des formules de politesse comme "Prends soin de toi", "Bon appétit", "À bientôt", "N'hésite pas à revenir", "Belle journée" ou toute autre formule de clôture. Réponds naturellement comme dans une vraie conversation — laisse la porte ouverte à la question suivante sans la forcer.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", response.status, errorText);
      return new Response(JSON.stringify({ error: `OpenAI ${response.status}: ${errorText}` }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return new Response(JSON.stringify({ error: "Réponse OpenAI vide" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ reply: content, remaining, limit: DAILY_LIMIT }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("chat-nutritionist error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
