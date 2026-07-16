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
  name: "list_food_logs",
  title: "Lister les repas loggés",
  description:
    "Liste les aliments enregistrés dans le journal de l'utilisatrice pour une plage de dates (défaut: 7 derniers jours).",
  inputSchema: {
    from: z.string().describe("Date de début YYYY-MM-DD (incluse). Optionnel.").optional(),
    to: z.string().describe("Date de fin YYYY-MM-DD (incluse). Optionnel.").optional(),
    limit: z.number().int().describe("Nombre max de lignes (défaut 100).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("food_logs")
      .select("id, food_name, meal_type, portion_size, calories, proteins, carbs, fats, logged_at")
      .order("logged_at", { ascending: false })
      .limit(limit ?? 100);
    if (from) q = q.gte("logged_at", from);
    if (to) q = q.lte("logged_at", to + "T23:59:59");
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { logs: data ?? [] },
    };
  },
});
