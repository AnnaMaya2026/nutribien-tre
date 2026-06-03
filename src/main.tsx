import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import * as React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import App from "./App.tsx";
import "./index.css";

console.log("App mounting...");
console.log("React version:", React.version);

createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </TooltipProvider>
);

// Register service worker for routine reminders / push notifications
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("SW registration failed:", err);
    });
  });
}
