import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, BookOpen, ChefHat, Bot, Sun, Moon, Activity, NotebookPen, Pill, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Cinq onglets dans la barre ; le reste est dans le menu « Plus ». */
const tabs = [
  { path: "/", label: "Accueil", icon: LayoutDashboard },
  { path: "/journal", label: "Repas", icon: BookOpen },
  { path: "/chat", label: "Sophie", icon: Bot },
  { path: "/symptomes", label: "Symptômes", icon: Activity },
  { path: "/notes", label: "Notes", icon: NotebookPen },
];

const moreLinks = [
  { path: "/complements", label: "Compléments", icon: Pill },
  { path: "/repas", label: "Idées de repas", icon: ChefHat },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const moreActive = moreLinks.some((l) => l.path === location.pathname);
  const tabClass = (active: boolean) =>
    `flex flex-1 min-w-0 flex-col items-center gap-1 px-0.5 py-2 rounded-lg transition-all min-h-[56px] ${
      active ? "text-tab-active" : "text-tab-inactive"
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-tab-bar tab-bar-shadow border-t border-border">
      <div className="flex items-center justify-between gap-0 px-0.5 py-2 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button key={tab.path} onClick={() => navigate(tab.path)} className={tabClass(active)} aria-current={active ? "page" : undefined}>
              <tab.icon className="w-[26px] h-[26px]" />
              <span className="text-[13px] font-medium leading-none truncate max-w-full">{tab.label}</span>
            </button>
          );
        })}
        <Popover open={moreOpen} onOpenChange={setMoreOpen}>
          <PopoverTrigger asChild>
            <button className={tabClass(moreActive)} aria-label="Plus de rubriques">
              <Menu className="w-[26px] h-[26px]" />
              <span className="text-[13px] font-medium leading-none">Plus</span>
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="w-56 p-2">
            {moreLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => { setMoreOpen(false); navigate(link.path); }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-[15px] hover:bg-muted ${
                  location.pathname === link.path ? "text-tab-active font-semibold" : "text-foreground"
                }`}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </button>
            ))}
            <button
              onClick={() => setDark(!dark)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-[15px] text-foreground hover:bg-muted"
            >
              {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              {dark ? "Thème clair" : "Thème sombre"}
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </nav>
  );
}
