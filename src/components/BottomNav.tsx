import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, BookOpen, ChefHat, Bot, Sun, Moon, Activity, NotebookPen } from "lucide-react";
import { useState, useEffect } from "react";

const tabs = [
  { path: "/", label: "Accueil", icon: LayoutDashboard },
  { path: "/journal", label: "Repas", icon: BookOpen },
  { path: "/chat", label: "Nutritionniste", icon: Bot },
  { path: "/symptomes", label: "Symptômes", icon: Activity },
  { path: "/notes", label: "Notes", icon: NotebookPen },
  { path: "/repas", label: "Idées", icon: ChefHat },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-tab-bar tab-bar-shadow border-t border-border">
      <div className="flex items-center justify-around px-1 py-2 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all ${
                active ? "text-tab-active" : "text-tab-inactive"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[9px] font-medium">{tab.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setDark(!dark)}
          className="flex flex-col items-center gap-0.5 px-2 py-1.5 text-tab-inactive"
        >
          {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          <span className="text-[9px] font-medium">{dark ? "Clair" : "Sombre"}</span>
        </button>
      </div>
    </nav>
  );
}
