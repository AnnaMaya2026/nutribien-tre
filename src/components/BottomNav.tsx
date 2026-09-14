import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, BookOpen, ChefHat, Bot, Sun, Moon, Activity, NotebookPen, Pill } from "lucide-react";
import { useState, useEffect } from "react";

const tabs = [
  { path: "/", label: "Accueil", icon: LayoutDashboard },
  { path: "/journal", label: "Repas", icon: BookOpen },
  { path: "/complements", label: "Compléments", icon: Pill },
  { path: "/repas", label: "Idées", icon: ChefHat },
  { path: "/chat", label: "Sophie", icon: Bot },
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

  // Sur petit écran la barre peut dépasser la largeur : on recentre l'onglet actif.
  useEffect(() => {
    const el = document.querySelector<HTMLElement>("[data-tab-active='true']");
    const row = el?.parentElement;
    if (row && el) {
      row.scrollLeft = el.offsetLeft - row.clientWidth / 2 + el.clientWidth / 2;
    }
  }, [location.pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-tab-bar tab-bar-shadow border-t border-border">
      <div className="flex items-center justify-between gap-0 px-0.5 py-2 max-w-lg mx-auto overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              data-tab-active={active}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-1 px-1 py-2 rounded-lg transition-all min-h-[56px] shrink-0 ${
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
          className="flex flex-col items-center gap-1 px-1 py-2 text-tab-inactive min-h-[56px] shrink-0"
        >
          {dark ? <Sun className="w-[26px] h-[26px]" /> : <Moon className="w-[26px] h-[26px]" />}
          <span className="text-[13px] font-medium leading-none">{dark ? "Clair" : "Sombre"}</span>
        </button>
      </div>
    </nav>
  );
}
