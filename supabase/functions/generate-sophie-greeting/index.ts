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
    const summary = `Prénom: ${p.display_name || "inconnu"}, Âge: ${p.age ?? "?"}, Stade: ${p.menopause_stage ?? "?"}, Symptômes: ${(p.symptoms || []).join(", ") || "aucun"}, Activité: ${p.activity_level ?? "?"}`;
    const prompt = `Tu es Sophie, nutritionniste en ménopause. L'utilisatrice vient de créer son compte. Son profil: ${summary}.
Génère un premier message chaleureux qui:
- Montre que tu connais son profil (mentionne 1 élément concret)
- Pose UNE question pertinente sur ses habitudes
- Donne envie de répondre
Max 3 phrases. Tutoie-la.`;

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
