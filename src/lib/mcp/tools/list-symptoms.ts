import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_symptom_logs",
  title: "Lister les symptômes enregistrés",
  description:
    "Retourne l'historique des symptômes ménopausiques (bouffées de chaleur, fatigue, insomnie, sautes d'humeur, scores personnalisés) sur une plage de dates.",
  inputSchema: {
    from: z.string().describe("Date de début YYYY-MM-DD.").optional(),
    to: z.string().describe("Date de fin YYYY-MM-DD.").optional(),
    limit: z.number().int().optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("symptom_logs")
      .select(
        "id, logged_at, bouffees_chaleur, fatigue, insomnie, sautes_humeur, selected_symptoms, symptom_scores, notes",
      )
      .order("logged_at", { ascending: false })
      .limit(limit ?? 60);
    if (from) q = q.gte("logged_at", from);
    if (to) q = q.lte("logged_at", to + "T23:59:59");
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { symptoms: data ?? [] },
    };
  },
});
