import { describe, it, expect, vi, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

// La fonction importe le client par URL et démarre un serveur Deno : on neutralise les deux.
vi.mock("https://esm.sh/@supabase/supabase-js@2.49.4", () => ({ createClient: () => null }));
vi.stubGlobal("Deno", { serve: () => {}, env: { get: () => undefined } });

// Lecture de la vraie table CIQUAL (aucune valeur nutritionnelle inventée).
const supabase = createClient(
  "https://rxiayqubsaufrxbcmspm.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4aWF5cXVic2F1ZnJ4YmNtc3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzODU5MDYsImV4cCI6MjA5MDk2MTkwNn0.Q-nm0CYkuZ7yCGGNEzw3Aj0Yyp6Ez2xcISYiwHYFA0g",
);

const I = (name: string, quantity: number, unit: string) => ({ name, quantity, unit, pantry: false });
const parsed = {
  servings: 2,
  ingredients: [
    I("cacahuètes grillées sans sel", 25, "g"),
    I("champignons de Paris blancs", 250, "g"),
    I("chou pak choy", 1, "piece"),
    I("cébette", 1, "piece"),
    I("gousse d'ail", 1, "piece"),
    I("huile de sésame toasté", 20, "ml"),
    I("nouilles asiatiques", 120, "g"),
    I("oignon jaune", 1, "piece"),
    I("piment oiseau", 1, "piece"),
    I("purée de cacahuètes", 30, "g"),
    I("sauce soja salée", 20, "ml"),
  ],
};

describe("fiche recette en colonnes par nombre de personnes (2 personnes)", () => {
  let r: any;
  beforeAll(async () => {
    // Chemin en variable : la vérification de types de l'appli ne doit pas suivre ce fichier Deno.
    const path = "../../supabase/functions/analyze-recipe-card/index.ts";
    const { buildResult } = await import(/* @vite-ignore */ path);
    r = await buildResult(supabase, parsed);
  }, 60000);

  it("calories et protéines ne sont plus vides", () => {
    expect(r.macros_per_portion.calories).not.toBeNull();
    expect(r.macros_per_portion.proteins).not.toBeNull();
  });
  it("seuls le chou pak choy et la cébette restent à saisir", () => {
    expect(r.needs_manual.map((m: any) => m.name).sort()).toEqual(["chou pak choy", "cébette"].sort());
  });
  it("le piment est ignoré", () => {
    expect(r.pantry_items).toContain("piment oiseau");
  });
});
