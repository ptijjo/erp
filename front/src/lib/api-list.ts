import type { PaginatedResponse } from "./api-types";
import { api } from "./api";
import type { CategoryDto, OrganizationDto } from "./api-types";

/** Extrait les items d'une réponse API paginée ou d'un tableau legacy. */
export function extractApiList<T>(data: T[] | PaginatedResponse<T>): T[] {
  if (Array.isArray(data)) {
    return data;
  }
  return data.items;
}

/** Paramètres de requête pour charger une liste complète (plafond API). */
export const FULL_LIST_QUERY = { params: { page: 1, limit: 100 } } as const;

export async function fetchOrganizations(): Promise<OrganizationDto[]> {
  const { data } = await api.get<
    OrganizationDto[] | PaginatedResponse<OrganizationDto>
  >("/organisation", FULL_LIST_QUERY);
  return extractApiList(data);
}

export async function fetchCategories(): Promise<CategoryDto[]> {
  const { data } = await api.get<
    CategoryDto[] | PaginatedResponse<CategoryDto>
  >("/category", FULL_LIST_QUERY);
  return extractApiList(data);
}
