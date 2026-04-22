import { Heart } from "lucide-react";
import { Link } from "react-router-dom";

export default function WelcomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm animate-fade-in text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/30 mb-6">
          <Heart className="w-10 h-10 text-primary-foreground" fill="currentColor" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">NutriMéno</h1>
        <p className="text-muted-foreground mb-10 text-sm">
          L'application nutritionnelle conçue pour les femmes de 45 ans et plus 💗
        </p>

        <div className="space-y-3">
          <Link
            to="/onboarding"
            className="block w-full h-12 leading-[3rem] rounded-lg bg-primary text-primary-foreground font-semibold text-base"
          >
            Créer mon compte
          </Link>
          <Link
            to="/auth?mode=login"
            className="block w-full h-12 leading-[3rem] rounded-lg bg-card border border-border text-foreground font-semibold text-base"
          >
            J'ai déjà un compte
          </Link>
        </div>
      </div>
    </div>
  );
}
