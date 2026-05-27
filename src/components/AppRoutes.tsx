import { Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import AuthPage from "@/pages/AuthPage";
import WelcomePage from "@/pages/WelcomePage";
import OnboardingFlow from "@/pages/OnboardingFlow";
import ProfileSetup from "@/pages/ProfileSetup";
import IntroPage from "@/pages/IntroPage";
import Dashboard from "@/pages/Dashboard";
import JournalPage from "@/pages/JournalPage";
import RepasPage from "@/pages/RepasPage";
import ChatPage from "@/pages/ChatPage";
import SymptomHistoryPage from "@/pages/SymptomHistoryPage";
import PersonalJournalPage from "@/pages/PersonalJournalPage";
import SavedMenusPage from "@/pages/SavedMenusPage";
import ProfilePage from "@/pages/ProfilePage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import TermsPage from "@/pages/TermsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import BottomNav from "@/components/BottomNav";
import OnboardingTutorial from "@/components/OnboardingTutorial";
import FeedbackButton from "@/components/FeedbackButton";
import NotFound from "@/pages/NotFound";
import SEOLayout from "@/components/SEOLayout";

const SEO = {
  dashboard: { title: "NutriMéno — Tableau de bord nutritionnel", description: "Suivez votre nutrition personnalisée pour la ménopause", path: "/" },
  journal: { title: "Journal alimentaire — NutriMéno", description: "Loggez vos repas et suivez vos apports nutritionnels", path: "/journal" },
  repas: { title: "Suggestions de repas — NutriMéno", description: "Recettes et idées de repas adaptées à vos besoins nutritionnels", path: "/repas" },
  chat: { title: "Sophie, votre nutritionniste IA — NutriMéno", description: "Conseils nutritionnels personnalisés pour la ménopause", path: "/chat" },
  symptomes: { title: "Suivi des symptômes — NutriMéno", description: "Suivez l'évolution de vos symptômes ménopausiques", path: "/symptomes" },
  notes: { title: "Journal personnel — NutriMéno", description: "Notes, routines et habitudes pour votre bien-être", path: "/notes" },
  menus: { title: "Menus sauvegardés — NutriMéno", description: "Retrouvez vos menus et plans de repas favoris", path: "/menus" },
  profil: { title: "Mon profil — NutriMéno", description: "Gérez votre profil et vos préférences nutritionnelles", path: "/profil" },
  cgu: { title: "Conditions d'utilisation — NutriMéno", description: "Conditions générales d'utilisation de NutriMéno", path: "/cgu" },
  confidentialite: { title: "Politique de confidentialité — NutriMéno", description: "Politique de confidentialité et RGPD de NutriMéno", path: "/confidentialite" },
  reset: { title: "Réinitialiser le mot de passe — NutriMéno", description: "Réinitialisez votre mot de passe NutriMéno", path: "/reset-password" },
  auth: { title: "Connexion — NutriMéno", description: "Connectez-vous à votre compte NutriMéno", path: "/auth" },
  welcome: { title: "NutriMéno — Nutrition personnalisée pour la ménopause", description: "Suivez votre nutrition, gérez vos symptômes et consultez Sophie, votre nutritionniste IA spécialisée en ménopause.", path: "/" },
  onboarding: { title: "Bienvenue — NutriMéno", description: "Personnalisez votre expérience NutriMéno", path: "/onboarding" },
};

function withSEO(seo: { title: string; description: string; path: string }, element: JSX.Element) {
  return <SEOLayout {...seo}>{element}</SEOLayout>;
}

function ProtectedLayout() {
  const { profile, isLoading } = useProfile();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  if (!isLoading && showOnboarding === null && profile) {
    if (!(profile as any).feature_tour_completed) {
      setTimeout(() => setShowOnboarding(true), 500);
    } else {
      setShowOnboarding(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile?.profile_completed) {
    return <ProfileSetup />;
  }

  if (!(profile as any).seen_welcome) {
    return <IntroPage />;
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Aller au contenu principal
      </a>
      <Routes>
        <Route path="/" element={withSEO(SEO.dashboard, <Dashboard />)} />
        <Route path="/journal" element={withSEO(SEO.journal, <JournalPage />)} />
        <Route path="/repas" element={withSEO(SEO.repas, <RepasPage />)} />
        <Route path="/chat" element={withSEO(SEO.chat, <ChatPage />)} />
        <Route path="/symptomes" element={withSEO(SEO.symptomes, <SymptomHistoryPage />)} />
        <Route path="/notes" element={withSEO(SEO.notes, <PersonalJournalPage />)} />
        <Route path="/menus" element={withSEO(SEO.menus, <SavedMenusPage />)} />
        <Route path="/profil" element={withSEO(SEO.profil, <ProfilePage />)} />
        <Route path="/cgu" element={withSEO(SEO.cgu, <TermsPage />)} />
        <Route path="/confidentialite" element={withSEO(SEO.confidentialite, <PrivacyPage />)} />
        <Route path="/reset-password" element={withSEO(SEO.reset, <ResetPasswordPage />)} />
        <Route path="/auth" element={<Navigate to="/" replace />} />
        <Route path="/onboarding" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
      <FeedbackButton />
      {showOnboarding && (
        <OnboardingTutorial onComplete={() => setShowOnboarding(false)} />
      )}
    </>
  );
}

export default function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={withSEO(SEO.welcome, <WelcomePage />)} />
        <Route path="/auth" element={withSEO(SEO.auth, <AuthPage />)} />
        <Route path="/onboarding" element={withSEO(SEO.onboarding, <OnboardingFlow />)} />
        <Route path="/reset-password" element={withSEO(SEO.reset, <ResetPasswordPage />)} />
        <Route path="/cgu" element={withSEO(SEO.cgu, <TermsPage />)} />
        <Route path="/confidentialite" element={withSEO(SEO.confidentialite, <PrivacyPage />)} />
        <Route path="*" element={withSEO(SEO.welcome, <WelcomePage />)} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
}
