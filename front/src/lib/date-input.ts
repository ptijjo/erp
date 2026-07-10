/** ISO ou Date → valeur `input[type=date]` (`YYYY-MM-DD`). */
export function toDateInputValue(
  value: string | Date | null | undefined,
): string {
  if (value == null) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return "";
}

/** Affichage date courte en français (`jj/mm/aaaa`). */
export function formatDisplayDate(
  value: string | Date | null | undefined,
): string {
  if (value == null || value === "") return "—";
  const date =
    value instanceof Date ? value : new Date(typeof value === "string" ? value : "");
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR");
}
