import { Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import AuthPage from "@/pages/AuthPage";
import WelcomePage from "@/pages/WelcomePage";
import OnboardingFlow from "@/pages/OnboardingFlow";
import ProfileSetup from "@/pages/ProfileSetup";
import Dashboard from "@/pages/Dashboard";
import JournalPage from "@/pages/JournalPage";
import RepasPage from "@/pages/RepasPage";
import ChatPage from "@/pages/ChatPage";
import SymptomHistoryPage from "@/pages/SymptomHistoryPage";
import PersonalJournalPage from "@/pages/PersonalJournalPage";
import SavedMenusPage from "@/pages/SavedMenusPage";
import BottomNav from "@/components/BottomNav";
import OnboardingTutorial from "@/components/OnboardingTutorial";
import FeedbackButton from "@/components/FeedbackButton";
import NotFound from "@/pages/NotFound";

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

  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/journal" element={<JournalPage />} />
        <Route path="/repas" element={<RepasPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/symptomes" element={<SymptomHistoryPage />} />
        <Route path="/notes" element={<PersonalJournalPage />} />
        <Route path="/menus" element={<SavedMenusPage />} />
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
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/onboarding" element={<OnboardingFlow />} />
        <Route path="*" element={<OnboardingFlow />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
}
