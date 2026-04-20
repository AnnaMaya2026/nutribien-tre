import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart } from "lucide-react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  ONBOARDING_STORAGE_KEY,
  OnboardingAnswers,
  calcCalories,
} from "@/lib/onboardingMessages";

export default function AuthPage() {
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") === "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  // Has the user gone through the onboarding journey?
  const hasOnboardingAnswers =
    typeof window !== "undefined" &&
    !!sessionStorage.getItem(ONBOARDING_STORAGE_KEY);

  // After session becomes available (post-signup), apply onboarding answers to profile
  useEffect(() => {
    const apply = async () => {
      if (!user) return;
      const raw = sessionStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!raw) return;
      try {
        const a: OnboardingAnswers = JSON.parse(raw);
        const calories = calcCalories(a.age, a.weight, a.height);
        await supabase
          .from("profiles")
          .update({
            age: a.age,
            weight: a.weight,
            height: a.height,
            daily_calorie_goal: calories,
            symptoms: a.main_symptom ? [a.main_symptom] : [],
            main_symptom: a.main_symptom,
            duration_of_changes: a.duration_of_changes,
            selected_statements: a.selected_statements,
            profile_completed: true,
          } as any)
          .eq("user_id", user.id);
        sessionStorage.removeItem(ONBOARDING_STORAGE_KEY);
      } catch (e) {
        console.error("Failed to apply onboarding answers", e);
      }
    };
    apply();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const { error } = isLogin
      ? await signIn(email, password)
      : await signUp(email, password);

    if (error) {
      setError(error.message);
    } else if (!isLogin) {
      setSuccess("Vérifiez votre e-mail pour confirmer votre inscription !");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/30 mb-4">
            <Heart className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            {hasOnboardingAnswers && !isLogin
              ? "Crée ton compte pour voir ton aperçu"
              : "NutriMéno"}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {hasOnboardingAnswers && !isLogin
              ? "Tes réponses sont prêtes — encore une étape."
              : "Votre nutrition adaptée à la ménopause"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="Adresse e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 rounded-lg bg-card border-border"
          />
          <Input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="h-12 rounded-lg bg-card border-border"
          />

          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          {success && <p className="text-sm text-success text-center">{success}</p>}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-lg text-base font-semibold"
          >
            {loading ? "..." : isLogin ? "Se connecter" : "Créer mon compte"}
          </Button>
        </form>

        <p className="text-center mt-6 text-sm text-muted-foreground">
          {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setSuccess("");
            }}
            className="text-foreground font-medium underline underline-offset-2"
          >
            {isLogin ? "S'inscrire" : "Se connecter"}
          </button>
        </p>

        {!hasOnboardingAnswers && !isLogin && (
          <p className="text-center mt-4 text-xs text-muted-foreground">
            <Link to="/onboarding" className="underline">
              Découvrir NutriMéno avant de m'inscrire
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
