// Browser notification scheduler for routine reminders.
// Notifications only fire while the app is open (or installed as PWA in the
// background, depending on the OS). For each routine with reminder_enabled,
// we compute the next "HH:MM" occurrence and schedule a setTimeout that
// shows a Notification, then re-schedules for the next day.

interface ReminderRoutine {
  id: string;
  name: string;
  reminder_enabled?: boolean;
  reminder_time?: string | null;
}

const timers = new Map<string, number>();

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const res = await Notification.requestPermission();
    return res === "granted";
  } catch {
    return false;
  }
}

function nextOccurrence(time: string): number {
  const [h, m] = time.split(":").map((n) => parseInt(n, 10));
  const now = new Date();
  const next = new Date();
  next.setHours(h || 0, m || 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

function schedule(routine: ReminderRoutine) {
  if (!routine.reminder_time) return;
  const delay = nextOccurrence(routine.reminder_time);
  const handle = window.setTimeout(() => {
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("NutriMéno 💊", {
          body: `N'oubliez pas: ${routine.name}`,
          icon: "/favicon.svg",
          tag: `routine-${routine.id}`,
        });
      }
    } catch (e) {
      console.warn("Notification failed:", e);
    }
    // Re-schedule for next day
    schedule(routine);
  }, delay);
  timers.set(routine.id, handle);
}

export function scheduleAllReminders(routines: ReminderRoutine[]) {
  // Clear all existing
  for (const h of timers.values()) clearTimeout(h);
  timers.clear();
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  for (const r of routines) {
    if (r.reminder_enabled && r.reminder_time) schedule(r);
  }
}
