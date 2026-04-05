/** Aligné sur `FULL_ACCESS_ROLE_NAMES` côté Nest (`define-ability.ts`). */
export const FULL_ACCESS_ROLE_NAMES = new Set([
  "ADMIN",
  "DIRECTOR_GENERAL",
  "DIRECTOR_OPERATIONS",
]);

export function isFullAccessRole(roleName: string): boolean {
  return FULL_ACCESS_ROLE_NAMES.has(roleName);
}
