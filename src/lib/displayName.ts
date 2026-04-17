export function getDisplayName(displayName?: string | null, email?: string | null): string {
  if (displayName && displayName.trim()) return displayName.trim();
  if (!email) return "";
  const local = email.split("@")[0];
  const name = local.replace(/[._-]/g, " ").split(" ")[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}
