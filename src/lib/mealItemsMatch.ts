const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/œ/g, "oe").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const stem = (w: string) => w.replace(/(s|x)$/, "");

/** Noms de la liste qui n'ont produit aucune entrée enregistrée (comparaison souple : accents, pluriel). */
export function findMissingItems(listNames: string[], insertedNames: string[]): string[] {
  const inserted = insertedNames.map((n) => norm(n).split(" ").map(stem).join(" "));
  return listNames.filter((name) => {
    const words = norm(name).split(" ").filter((w) => w.length > 2).map(stem);
    if (!words.length) return false;
    return !inserted.some((ins) => words.every((w) => ins.includes(w)) || (ins.length > 2 && norm(name).includes(ins)));
  });
}
