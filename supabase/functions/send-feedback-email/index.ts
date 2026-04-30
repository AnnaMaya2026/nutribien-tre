import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

const CATEGORY_LABELS: Record<string, string> = {
  bug: "🐛 Bug",
  suggestion: "💡 Suggestion",
  compliment: "👍 Compliment",
  question: "❓ Question",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");

    const { rating, category, message, created_at, user_id } = await req.json();

    if (!rating || !category || !message) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const categoryLabel = CATEGORY_LABELS[category] ?? category;
    const subject = `💗 Nouveau feedback NutriMéno - ${categoryLabel}`;
    const dateStr = created_at
      ? new Date(created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })
      : new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });

    const text = `Nouveau feedback reçu !

Note: ${rating}/5 ⭐
Catégorie: ${categoryLabel}
Message: ${message}
Date: ${dateStr}
Utilisatrice ID: ${user_id ?? "anonyme"}`;

    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;color:#222">
      <h2 style="color:#d6336c">💗 Nouveau feedback NutriMéno</h2>
      <p><strong>Note :</strong> ${rating}/5 ⭐</p>
      <p><strong>Catégorie :</strong> ${categoryLabel}</p>
      <p><strong>Message :</strong><br/>${message.replace(/</g, "&lt;").replace(/\n/g, "<br/>")}</p>
      <p><strong>Date :</strong> ${dateStr}</p>
      <p style="color:#666;font-size:12px"><strong>Utilisatrice ID :</strong> ${user_id ?? "anonyme"}</p>
    </div>`;

    const resp = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "NutriMéno <onboarding@resend.dev>",
        to: ["abboost13@gmail.com"],
        subject,
        text,
        html,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.log("Error if any:", data);
      return new Response(JSON.stringify({ error: data }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Email sent successfully");
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.log("Error if any:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
