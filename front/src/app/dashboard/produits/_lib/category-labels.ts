import type { CategoryDto } from "~/lib/api-types";

/**
 * Résout le parent réel (évite les sous-catégories traitées à tort comme racines
 * si la clé JSON diffère ou est absente).
 */
export function getParentId(c: CategoryDto): string | null {
  const raw = c as CategoryDto & {
    parent_id?: string | null;
  };
  const v = c.parentId ?? raw.parent_id;
  if (v === undefined || v === null) {
    return null;
  }
  const s = String(v).trim();
  return s === "" ? null : s;
}

export function normalizeCategory(c: CategoryDto): CategoryDto {
  const parentId = getParentId(c);
  return { ...c, parentId };
}

/** Déduplique par id (dernier gagne) puis normalise. */
export function normalizeCategories(cats: CategoryDto[]): CategoryDto[] {
  const byId = new Map<string, CategoryDto>();
  for (const c of cats) {
    const n = normalizeCategory(c);
    byId.set(n.id, n);
  }
  return Array.from(byId.values());
}

function labelForCategory(
  c: CategoryDto,
  byId: Map<string, CategoryDto>,
): string {
  const parts: string[] = [];
  let cur: CategoryDto | undefined = c;
  const visited = new Set<string>();
  while (cur) {
    if (visited.has(cur.id)) {
      break;
    }
    visited.add(cur.id);
    parts.unshift(cur.name);
    const pid = getParentId(cur);
    cur = pid ? byId.get(pid) : undefined;
  }
  return parts.join(" › ");
}

/** Libellés du type « Parent › Enfant » pour les listes déroulantes. */
export function categoryOptionsForSelect(
  categories: CategoryDto[],
): { id: string; label: string }[] {
  const normalized = normalizeCategories(categories);
  const byId = new Map(normalized.map((c) => [c.id, c]));

  return [...normalized]
    .sort((a, b) =>
      labelForCategory(a, byId).localeCompare(labelForCategory(b, byId), "fr"),
    )
    .map((c) => ({ id: c.id, label: labelForCategory(c, byId) }));
}
