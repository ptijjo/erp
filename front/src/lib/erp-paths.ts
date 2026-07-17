/**
 * Chemins ERP polymorphes : maison mère (`hq`) vs filiale (`subsidiary`).
 * Les anciennes URLs `/dashboard/...` redirigent via `next.config.js`.
 */

export const ERP_PATHS = {
  home: "/dashboard",
  hqHome: "/dashboard/hq",
  subsidiaryHome: "/dashboard/subsidiary",
  organisations: "/dashboard/hq/organisations",
  fournisseurs: "/dashboard/hq/fournisseurs",
  categories: "/dashboard/hq/categories",
  caisse: "/dashboard/subsidiary/caisse",
  compte: "/dashboard/subsidiary/compte",
  unauthorized: "/dashboard/unauthorized",
  firstLogin: "/dashboard/first-login",
} as const;

export function erpHomeForOrganizationType(
  organizationType: "MAIN" | "SUBSIDIARY",
): string {
  return organizationType === "MAIN"
    ? ERP_PATHS.hqHome
    : ERP_PATHS.subsidiaryHome;
}
