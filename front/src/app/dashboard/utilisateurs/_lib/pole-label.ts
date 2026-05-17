import type { RolePoleSummaryDto } from "~/lib/api-types";

/** Libellé affiché pour le pôle d’un rôle (null = hors pôle). */
export function rolePoleLabel(pole: RolePoleSummaryDto | null | undefined): string {
  if (!pole) return "Hors pôle";
  return pole.name.trim() || pole.code;
}
