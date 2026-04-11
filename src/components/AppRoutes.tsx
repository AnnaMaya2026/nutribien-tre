import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import AuthPage from "@/pages/AuthPage";
import ProfileSetup from "@/pages/ProfileSetup";
import Dashboard from "@/pages/Dashboard";
import JournalPage from "@/pages/JournalPage";
import RepasPage from "@/pages/RepasPage";
import ChatPage from "@/pages/ChatPage";
import SymptomHistoryPage from "@/pages/SymptomHistoryPage";
import PersonalJournalPage from "@/pages/PersonalJournalPage";
import BottomNav from "@/components/BottomNav";
import NotFound from "@/pages/NotFound";

function ProtectedLayout() {
  const { profile, isLoading } = useProfile();

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
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
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
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
}
