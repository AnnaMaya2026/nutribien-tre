// Service-worker-backed scheduler for routine reminders.
// Falls back to in-page setTimeout + Notification when no SW is available.

interface ReminderRoutine {
  id: string;
  name: string;
  reminder_enabled?: boolean;
  reminder_time?: string | null;
}

let swRegistration: ServiceWorkerRegistration | null = null;
const fallbackTimers = new Map<string, number>();

async function ensureSW(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  if (swRegistration) return swRegistration;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    swRegistration = reg;
    return reg;
  } catch (e) {
    console.warn("SW registration failed:", e);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  await ensureSW();
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const res = await Notification.requestPermission();
    return res === "granted";
  } catch {
    return false;
  }
}

function nextOccurrenceMs(time: string): number {
  const [h, m] = time.split(":").map((n) => parseInt(n, 10));
  const now = new Date();
  const next = new Date();
  next.setHours(h || 0, m || 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

function postToSW(msg: any) {
  if (swRegistration?.active) {
    swRegistration.active.postMessage(msg);
    return true;
  }
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage(msg);
    return true;
  }
  return false;
}

function scheduleFallback(r: ReminderRoutine) {
  if (!r.reminder_time) return;
  const delay = nextOccurrenceMs(r.reminder_time);
  const handle = window.setTimeout(() => {
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("NutriMéno 💊", {
          body: `N'oubliez pas: ${r.name}`,
          icon: "/favicon.svg",
          tag: `routine-${r.id}`,
        });
      }
    } catch (e) {
      console.warn("Notification failed:", e);
    }
    scheduleFallback(r);
  }, delay);
  fallbackTimers.set(r.id, handle);
}

export async function scheduleAllReminders(routines: ReminderRoutine[]) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  await ensureSW();

  // Clear previous
  for (const h of fallbackTimers.values()) clearTimeout(h);
  fallbackTimers.clear();
  postToSW({ type: "clear-all" });

  for (const r of routines) {
    if (!r.reminder_enabled || !r.reminder_time) continue;
    const delayMs = nextOccurrenceMs(r.reminder_time);
    const ok = postToSW({
      type: "schedule",
      payload: {
        id: `routine-${r.id}`,
        title: "NutriMéno 💊",
        body: `N'oubliez pas: ${r.name}`,
        delayMs,
      },
    });
    if (!ok) scheduleFallback(r);
  }
}

export async function sendTestNotification(name: string) {
  const granted = await requestNotificationPermission();
  if (!granted) {
    return false;
  }
  await ensureSW();
  const ok = postToSW({
    type: "show-now",
    title: "NutriMéno 💊 — Test",
    body: `Test du rappel : ${name}`,
    tag: `test-${Date.now()}`,
  });
  if (!ok && "Notification" in window) {
    new Notification("NutriMéno 💊 — Test", {
      body: `Test du rappel : ${name}`,
      icon: "/favicon.svg",
    });
  }
  return true;
}
