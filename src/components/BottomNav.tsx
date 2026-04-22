import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, BookOpen, ChefHat, Bot, Sun, Moon, Activity, NotebookPen } from "lucide-react";
import { useState, useEffect } from "react";

const tabs = [
  { path: "/", label: "Accueil", icon: LayoutDashboard },
  { path: "/journal", label: "Repas", icon: BookOpen },
  { path: "/repas", label: "Idées", icon: ChefHat },
  { path: "/chat", label: "Nutritionniste", icon: Bot },
  { path: "/symptomes", label: "Symptômes", icon: Activity },
  { path: "/notes", label: "Notes", icon: NotebookPen },
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
              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all min-h-[56px] ${
                active ? "text-tab-active" : "text-tab-inactive"
              }`}
            >
              <tab.icon className="w-[26px] h-[26px]" />
              <span className="text-[13px] font-medium leading-none">{tab.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setDark(!dark)}
          className="flex flex-col items-center gap-1 px-2 py-2 text-tab-inactive min-h-[56px]"
        >
          {dark ? <Sun className="w-[26px] h-[26px]" /> : <Moon className="w-[26px] h-[26px]" />}
          <span className="text-[13px] font-medium leading-none">{dark ? "Clair" : "Sombre"}</span>
        </button>
      </div>
    </nav>
  );
}
