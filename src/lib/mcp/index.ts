import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listFoodLogs from "./tools/list-food-logs";
import logFood from "./tools/log-food";
import listSymptoms from "./tools/list-symptoms";
import listJournalEntries from "./tools/list-journal-entries";
import getProfile from "./tools/get-profile";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "nutrimeno-mcp",
  title: "NutriMéno",
  version: "0.1.0",
  instructions:
    "Outils pour NutriMéno, l'app de nutrition personnalisée pour la ménopause. Permet à un assistant IA de lire le profil, les repas loggés, les symptômes et le journal personnel de l'utilisatrice, et d'ajouter des aliments à son journal. Toutes les données sont limitées à l'utilisatrice connectée.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getProfile, listFoodLogs, logFood, listSymptoms, listJournalEntries],
});
