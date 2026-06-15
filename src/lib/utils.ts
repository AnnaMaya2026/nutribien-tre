import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Nutrient progress bar color logic:
 *  0-50%   → red (insufficient)
 *  50-80%  → orange (getting there)
 *  80-100% → green (good)
 *  >100%   → blue (exceeded)
 */
export function getNutrientColor(pct: number) {
  if (pct > 100) return { bg: "bg-progress-exceeded", text: "text-progress-exceeded", emoji: "💧" };
  if (pct >= 80) return { bg: "bg-progress-high", text: "text-progress-high", emoji: "🟢" };
  if (pct >= 50) return { bg: "bg-progress-mid", text: "text-progress-mid", emoji: "🟠" };
  return { bg: "bg-progress-low", text: "text-progress-low", emoji: "🔴" };
}
