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
  name: "log_food",
  title: "Ajouter un aliment au journal",
  description:
    "Enregistre un aliment dans le journal alimentaire de l'utilisatrice avec ses macros optionnelles.",
  inputSchema: {
    food_name: z.string().describe("Nom de l'aliment."),
    portion_size: z.number().describe("Quantité en grammes ou ml.").optional(),
    meal_type: z
      .enum(["petit_dejeuner", "dejeuner", "diner", "collation"])
      .describe("Type de repas.")
      .optional(),
    calories: z.number().optional(),
    proteins: z.number().optional(),
    carbs: z.number().optional(),
    fats: z.number().optional(),
    logged_at: z.string().describe("ISO date. Défaut: maintenant.").optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("food_logs")
      .insert({
        user_id: ctx.getUserId(),
        food_name: input.food_name,
        portion_size: input.portion_size ?? null,
        meal_type: input.meal_type ?? null,
        calories: input.calories ?? null,
        proteins: input.proteins ?? null,
        carbs: input.carbs ?? null,
        fats: input.fats ?? null,
        logged_at: input.logged_at ?? new Date().toISOString(),
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Aliment enregistré (id: ${data.id}).` }],
      structuredContent: { row: data },
    };
  },
});
