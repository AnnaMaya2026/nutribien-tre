import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");

    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles").select("*").eq("user_id", user.id).single();

    if (profile?.sophie_first_message) {
      return new Response(JSON.stringify({ message: profile.sophie_first_message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const p: any = profile || {};

    // Récupère les TOP 2 symptômes de l'utilisatrice avec leur score
    const SYMPTOM_LABELS: Record<string, string> = {
      fatigue: "fatigue",
      bouffees_chaleur: "bouffées de chaleur",
      insomnie: "insomnie",
      sautes_humeur: "sautes d'humeur",
      anxiete: "anxiété",
      douleurs_articulaires: "douleurs articulaires",
      prise_poids: "prise de poids",
      brouillard_mental: "brouillard mental",
      secheresse: "sécheresse",
      libido: "baisse de libido",
    };

    const { data: recentLogs } = await supabase
      .from("symptom_logs")
      .select("symptom_scores, fatigue, bouffees_chaleur, insomnie, sautes_humeur, logged_at")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false })
      .limit(14);

    const scoreSum: Record<string, { total: number; count: number }> = {};
    for (const log of recentLogs || []) {
      const scores: Record<string, number> = {
        ...(log.symptom_scores || {}),
        fatigue: log.fatigue ?? undefined,
        bouffees_chaleur: log.bouffees_chaleur ?? undefined,
        insomnie: log.insomnie ?? undefined,
        sautes_humeur: log.sautes_humeur ?? undefined,
      } as any;
      for (const [k, v] of Object.entries(scores)) {
        if (typeof v !== "number" || v <= 0) continue;
        if (!scoreSum[k]) scoreSum[k] = { total: 0, count: 0 };
        scoreSum[k].total += v;
        scoreSum[k].count += 1;
      }
    }

    let top = Object.entries(scoreSum)
      .map(([k, s]) => ({ key: k, avg: s.total / s.count }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 2);

    // Fallback : utilise les symptômes déclarés dans le profil
    if (top.length < 2) {
      const declared: string[] = (p.symptoms || []).filter(
        (s: string) => !top.some((t) => t.key === s)
      );
      for (const s of declared) {
        if (top.length >= 2) break;
        top.push({ key: s, avg: 5 });
      }
    }

    if (top.length === 0) {
      const message = `Bonjour ${p.display_name || ""} 👋 Je suis Sophie, votre nutritionniste spécialisée en ménopause. Pour démarrer, dites-moi : quel symptôme vous gêne le plus en ce moment ?`.trim();
      await supabase.from("profiles").update({ sophie_first_message: message }).eq("user_id", user.id);
      return new Response(JSON.stringify({ message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sympText = top
      .map((t) => `${SYMPTOM_LABELS[t.key] || t.key} (${t.avg.toFixed(1)}/10)`)
      .join(" et ");

    const prompt = `Tu es Sophie, nutritionniste spécialisée en ménopause. L'utilisatrice ${p.display_name ? `(${p.display_name})` : ""} vient de créer son compte.

Génère un message d'accueil pour une femme dont les symptômes principaux sont : ${sympText}.

Le message doit :
- Mentionner DIRECTEMENT ses symptômes (${top.map((t) => SYMPTOM_LABELS[t.key] || t.key).join(", ")}) par leur nom
- Proposer un angle nutritionnel SPÉCIFIQUE à CES symptômes (pas générique)
- Poser UNE question d'expert ciblée sur ces symptômes
- Max 3 phrases, ton chaleureux mais expert

INTERDICTIONS ABSOLUES :
- Ne JAMAIS parler d'oméga-3 / poissons gras / douleurs articulaires si ce n'est pas dans ses symptômes
- Ne JAMAIS mentionner d'autres symptômes que les siens
- Pas de message générique réutilisable pour une autre utilisatrice`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 200,
      }),
    });
    if (!response.ok) throw new Error(`OpenAI ${response.status}`);
    const result = await response.json();
    const message = result.choices?.[0]?.message?.content?.trim();
    if (!message) throw new Error("Réponse vide");

    await supabase.from("profiles").update({ sophie_first_message: message }).eq("user_id", user.id);

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-sophie-greeting:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
