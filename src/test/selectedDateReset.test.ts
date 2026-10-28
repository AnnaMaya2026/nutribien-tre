import { describe, it, expect } from "vitest";
import { shouldResetToToday, RESET_TO_TODAY_AFTER_MS, toYMD } from "@/hooks/useSelectedDate";

const MIN = 60 * 1000;
const now = new Date(2026, 9, 28, 20, 0).getTime();
const today = toYMD(new Date(now));

describe("shouldResetToToday", () => {
  it("délai de 15 minutes", () => expect(RESET_TO_TODAY_AFTER_MS).toBe(15 * MIN));
  it("caché 2 minutes sur un jour passé : inchangé", () => {
    expect(shouldResetToToday(now - 2 * MIN, now, RESET_TO_TODAY_AFTER_MS, "2026-10-25", today)).toBe(false);
  });
  it("caché 20 minutes sur un jour passé : retour à aujourd'hui", () => {
    expect(shouldResetToToday(now - 20 * MIN, now, RESET_TO_TODAY_AFTER_MS, "2026-10-25", today)).toBe(true);
  });
  it("passage de minuit depuis aujourd'hui : suit le nouveau jour", () => {
    const after = new Date(2026, 9, 29, 0, 5).getTime();
    expect(shouldResetToToday(after - 1 * MIN, after, RESET_TO_TODAY_AFTER_MS, "2026-10-28", "2026-10-28")).toBe(true);
  });
  it("jour passé consulté, minuit franchi, caché peu de temps : inchangé", () => {
    const after = new Date(2026, 9, 29, 0, 5).getTime();
    expect(shouldResetToToday(after - 1 * MIN, after, RESET_TO_TODAY_AFTER_MS, "2026-10-20", "2026-10-28")).toBe(false);
  });
  it("jour passé consulté, caché longtemps : retour à aujourd'hui", () => {
    expect(shouldResetToToday(now - 3 * 60 * MIN, now, RESET_TO_TODAY_AFTER_MS, "2026-10-01", today)).toBe(true);
  });
});
